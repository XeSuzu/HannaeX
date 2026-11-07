/**
 * Pruebas de estrés e integración con MongoDB real para createCase() y GuildSequenceModel.
 *
 * Ejecuta:
 * - Verificación de conexión (ping) e índices reales en base aislada `hoshiko_stress_test`
 * - Escenario A: Secuencia existente (10, 20 y 50 operaciones concurrentes)
 * - Escenario B: Secuencia inexistente (10, 20 y 50 operaciones concurrentes)
 * - Escenario C: Inicialización simultánea (C1: sin casos previos; C2: con casos previos sin secuencia)
 * - Verificación cruzada entre retornos de createCase() y documentos persistidos en MongoDB
 * - Limpieza estricta por testRunId en bloque finally
 */

const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { loadEnvironment } = require("../../dist/config/loadEnvironment");
const { AppConfig } = require("../../dist/App/config/AppConfig");
const {
  CaseModel,
  GuildSequenceModel,
  createCase,
} = require("../../dist/Database/moderation/case.model");

const ISOLATED_DB_NAME = "hoshiko_stress_test";

async function runStressSuite() {
  loadEnvironment();
  AppConfig.load();

  const testRunId = `stress_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const createdGuildIds = new Set();
  let mongodServer = null;

  // Instrumentación no invasiva para contabilizar E11000, $inc, $setOnInsert y reintentos reales
  const telemetry = {
    seqIncCalls: 0,
    seqSetOnInsertCalls: 0,
    seqE11000Count: 0,
    caseCreateCalls: 0,
    caseE11000Count: 0,
    retriesCount: 0,
    reset() {
      this.seqIncCalls = 0;
      this.seqSetOnInsertCalls = 0;
      this.seqE11000Count = 0;
      this.caseCreateCalls = 0;
      this.caseE11000Count = 0;
      this.retriesCount = 0;
    },
  };

  const origFindOneAndUpdate = GuildSequenceModel.findOneAndUpdate.bind(GuildSequenceModel);
  GuildSequenceModel.findOneAndUpdate = async function (filter, update, options) {
    if (update && update.$inc) telemetry.seqIncCalls++;
    if (update && update.$setOnInsert) telemetry.seqSetOnInsertCalls++;
    try {
      return await origFindOneAndUpdate(filter, update, options);
    } catch (err) {
      if (err?.code === 11000 || (typeof err?.message === "string" && err.message.includes("E11000"))) {
        telemetry.seqE11000Count++;
      }
      throw err;
    }
  };

  const origCaseCreate = CaseModel.create.bind(CaseModel);
  CaseModel.create = async function (...args) {
    telemetry.caseCreateCalls++;
    try {
      return await origCaseCreate(...args);
    } catch (err) {
      if (err?.code === 11000 || (typeof err?.message === "string" && err.message.includes("E11000"))) {
        telemetry.caseE11000Count++;
        telemetry.retriesCount++;
      }
      throw err;
    }
  };

  try {
    console.log("=================================================================");
    console.log(`[FASE 3 & 4] Iniciando entorno MongoDB real aislado (${ISOLATED_DB_NAME})`);
    console.log(`[TestRunId] ${testRunId}`);
    console.log("=================================================================");

    mongodServer = await MongoMemoryServer.create({
      binary: {
        downloadDir: path.resolve(__dirname, "../../node_modules/.cache/mongodb-binaries"),
      },
      instance: {
        dbName: ISOLATED_DB_NAME,
      },
    });

    const memoryUri = mongodServer.getUri(ISOLATED_DB_NAME);
    await mongoose.connect(memoryUri, {
      dbName: ISOLATED_DB_NAME,
      maxPoolSize: 20,
    });

    // Verificación de conexión y ping (Fase 3)
    const db = mongoose.connection.db;
    const pingResult = await db.admin().ping();
    const activeDbName = mongoose.connection.name;

    if (activeDbName !== ISOLATED_DB_NAME) {
      throw new Error(
        `ABORTADO POR SEGURIDAD: La base conectada (${activeDbName}) no coincide con ${ISOLATED_DB_NAME}`,
      );
    }

    // Sincronizar y verificar índices únicos en MongoDB real
    await CaseModel.syncIndexes();
    await GuildSequenceModel.syncIndexes();

    const caseIndexes = await db.collection("cases").indexes();
    const seqIndexes = await db.collection("guildsequences").indexes();

    console.log(
      JSON.stringify(
        {
          connectionVerified: true,
          ping: pingResult,
          database: activeDbName,
          sameConnectionCases: CaseModel.db === mongoose.connection,
          sameConnectionSeq: GuildSequenceModel.db === mongoose.connection,
          connectionsCount: mongoose.connections.length,
          caseIndexes: caseIndexes.map((idx) => ({
            name: idx.name,
            key: idx.key,
            unique: Boolean(idx.unique),
          })),
          seqIndexes: seqIndexes.map((idx) => ({
            name: idx.name,
            key: idx.key,
            unique: Boolean(idx.unique),
          })),
        },
        null,
        2,
      ),
    );

    /**
     * Ejecuta un lote concurrente de createCase() y contrasta resultados con MongoDB
     */
    async function executeBatch({
      scenarioName,
      guildId,
      concurrency,
      expectedStartCaseId,
    }) {
      createdGuildIds.add(guildId);
      telemetry.reset();

      const batchTag = `${testRunId}:${scenarioName}:n${concurrency}`;
      const startTime = Date.now();

      const tasks = Array.from({ length: concurrency }, (_, i) =>
        createCase({
          guildId,
          userId: `synth_user_${i + 1}`,
          modId: `synth_mod_${(i % 3) + 1}`,
          action: "warn",
          reason: `[${batchTag}] Synthetic stress case #${i + 1}`,
          source: "manual",
        }),
      );

      const settled = await Promise.allSettled(tasks);
      const totalTimeMs = Date.now() - startTime;

      const fulfilled = settled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      const rejected = settled.filter((r) => r.status === "rejected");

      // Consultar documentos realmente persistidos en MongoDB para este lote
      const persistedDocs = await CaseModel.find({
        guildId,
        reason: { $regex: `^\\[${batchTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]` },
      })
        .sort({ caseId: 1 })
        .lean();

      const persistedIds = persistedDocs.map((d) => d.caseId);
      const returnedIds = fulfilled.map((d) => d.caseId).sort((a, b) => a - b);
      const uniquePersistedIds = new Set(persistedIds);
      const duplicateIdsCount = persistedIds.length - uniquePersistedIds.size;
      const lostCasesCount = concurrency - persistedDocs.length;

      // Verificar que los IDs devueltos por createCase() coinciden exactamente con los persistidos en MongoDB
      const returnedMatchesPersisted =
        returnedIds.length === persistedIds.length &&
        returnedIds.every((id, idx) => id === persistedIds[idx]);

      // Verificar que la secuencia es estrictamente consecutiva desde expectedStartCaseId
      const expectedIds = Array.from(
        { length: concurrency },
        (_, idx) => expectedStartCaseId + idx,
      );
      const isConsecutive =
        persistedIds.length === expectedIds.length &&
        persistedIds.every((id, idx) => id === expectedIds[idx]);

      const seqDocAfter = await GuildSequenceModel.findOne({
        guildId,
        name: "cases",
      }).lean();

      const result = {
        scenarioName,
        concurrency,
        requested: concurrency,
        succeeded: fulfilled.length,
        failed: rejected.length,
        persisted: persistedDocs.length,
        uniqueIds: uniquePersistedIds.size,
        duplicateIds: duplicateIdsCount,
        lostCases: lostCasesCount,
        e11000Errors: telemetry.seqE11000Count + telemetry.caseE11000Count,
        seqE11000Errors: telemetry.seqE11000Count,
        caseE11000Errors: telemetry.caseE11000Count,
        retries: telemetry.retriesCount,
        seqIncCalls: telemetry.seqIncCalls,
        seqSetOnInsertCalls: telemetry.seqSetOnInsertCalls,
        totalTimeMs,
        returnedMatchesPersisted,
        isConsecutive,
        minCaseId: persistedIds[0] ?? null,
        maxCaseId: persistedIds[persistedIds.length - 1] ?? null,
        finalSeqValue: seqDocAfter?.seq ?? null,
        errors: rejected.map((r) => r.reason?.message || String(r.reason)),
      };

      if (
        result.failed > 0 ||
        result.duplicateIds > 0 ||
        result.lostCases > 0 ||
        !result.returnedMatchesPersisted ||
        !result.isConsecutive
      ) {
        console.error(`❌ FALLO EN ESCENARIO ${scenarioName}:`, result);
      }

      return result;
    }

    const allResults = [];

    // =========================================================================
    // ESCENARIO A: Secuencia existente (10, 20 y 50 operaciones concurrentes)
    // =========================================================================
    console.log("\n--- Ejecutando ESCENARIO A: Secuencia existente (10, 20, 50) ---");
    const guildScenarioA = `guild_scenA_${testRunId}`;
    createdGuildIds.add(guildScenarioA);

    // Pre-inicializar secuencia creando 1 caso semilla
    const seedCase = await createCase({
      guildId: guildScenarioA,
      userId: "synth_seed_user",
      modId: "synth_seed_mod",
      action: "warn",
      reason: `[${testRunId}:seedA] Seed case`,
      source: "manual",
    });
    if (seedCase.caseId !== 1) {
      throw new Error(`Semilla de Escenario A esperaba caseId=1, obtuvo ${seedCase.caseId}`);
    }

    let nextExpectedA = 2;
    for (const n of [10, 20, 50]) {
      const resA = await executeBatch({
        scenarioName: `A_existing_seq_${n}`,
        guildId: guildScenarioA,
        concurrency: n,
        expectedStartCaseId: nextExpectedA,
      });
      nextExpectedA += n;
      allResults.push(resA);
    }

    // =========================================================================
    // ESCENARIO B: Secuencia inexistente (10, 20 y 50 operaciones concurrentes)
    // =========================================================================
    console.log("\n--- Ejecutando ESCENARIO B: Secuencia inexistente (10, 20, 50) ---");
    for (const n of [10, 20, 50]) {
      const guildScenarioB = `guild_scenB_n${n}_${testRunId}`;
      const resB = await executeBatch({
        scenarioName: `B_missing_seq_${n}`,
        guildId: guildScenarioB,
        concurrency: n,
        expectedStartCaseId: 1,
      });
      allResults.push(resB);
    }

    // =========================================================================
    // ESCENARIO C: Inicialización simultánea (C1: desde 0; C2: servidor con casos previos sin secuencia)
    // =========================================================================
    console.log("\n--- Ejecutando ESCENARIO C: Inicialización simultánea (C1 y C2) ---");
    // C1: 50 operaciones simultáneas intentando crear el primer documento de secuencia al mismo tiempo
    const guildScenarioC1 = `guild_scenC1_50_${testRunId}`;
    const resC1 = await executeBatch({
      scenarioName: "C1_simultaneous_init_fresh_50",
      guildId: guildScenarioC1,
      concurrency: 50,
      expectedStartCaseId: 1,
    });
    allResults.push(resC1);

    // C2: Servidor que ya tenía 5 casos históricos pero NO tenía documento en GuildSequenceModel
    const guildScenarioC2 = `guild_scenC2_legacy_50_${testRunId}`;
    createdGuildIds.add(guildScenarioC2);
    await CaseModel.insertMany(
      Array.from({ length: 5 }, (_, idx) => ({
        caseId: idx + 1,
        guildId: guildScenarioC2,
        userId: `synth_legacy_user_${idx + 1}`,
        modId: "synth_legacy_mod",
        action: "warn",
        reason: `[${testRunId}:legacyC2] Legacy case #${idx + 1}`,
        source: "manual",
      })),
    );
    // Asegurar que no existe secuencia previa
    await GuildSequenceModel.deleteOne({ guildId: guildScenarioC2, name: "cases" });

    const resC2 = await executeBatch({
      scenarioName: "C2_simultaneous_init_legacy_50",
      guildId: guildScenarioC2,
      concurrency: 50,
      expectedStartCaseId: 6,
    });
    allResults.push(resC2);

    // C3: Colisión real E11000 bajo concurrencia (secuencia desfasada seq=0 con 15 casos existentes + 50 llamadas concurrentes)
    const guildScenarioC3 = `guild_scenC3_e11000_50_${testRunId}`;
    createdGuildIds.add(guildScenarioC3);
    await CaseModel.insertMany(
      Array.from({ length: 15 }, (_, idx) => ({
        caseId: idx + 1,
        guildId: guildScenarioC3,
        userId: `synth_collision_user_${idx + 1}`,
        modId: "synth_collision_mod",
        action: "warn",
        reason: `[${testRunId}:seedC3] Pre-existing case #${idx + 1}`,
        source: "manual",
      })),
    );
    await GuildSequenceModel.create({
      guildId: guildScenarioC3,
      name: "cases",
      seq: 0,
    });

    const resC3 = await executeBatch({
      scenarioName: "C3_e11000_recovery_50",
      guildId: guildScenarioC3,
      concurrency: 50,
      expectedStartCaseId: 16,
    });
    allResults.push(resC3);

    console.log("\n================ RESULTADOS CONSOLIDADOS ================");
    console.log(JSON.stringify(allResults, null, 2));

    const anyFailure = allResults.some(
      (r) =>
        r.failed > 0 ||
        r.duplicateIds > 0 ||
        r.lostCases > 0 ||
        !r.returnedMatchesPersisted ||
        !r.isConsecutive,
    );

    if (anyFailure) {
      process.exitCode = 1;
    }
  } finally {
    // =========================================================================
    // FASE 7: Limpieza exclusiva por testRunId y cierre seguro de conexiones
    // =========================================================================
    console.log("\n--- [FASE 7] Ejecutando limpieza segura por testRunId ---");
    try {
      if (mongoose.connection.readyState === 1) {
        const guildIdsArray = Array.from(createdGuildIds);
        const deletedCases = await CaseModel.deleteMany({
          guildId: { $in: guildIdsArray },
          reason: { $regex: testRunId },
        });
        const deletedSeqs = await GuildSequenceModel.deleteMany({
          guildId: { $in: guildIdsArray },
        });
        const remainingForTestRun = await CaseModel.countDocuments({
          reason: { $regex: testRunId },
        });

        console.log(
          JSON.stringify(
            {
              cleanupCompleted: true,
              testRunId,
              deletedCasesCount: deletedCases.deletedCount,
              deletedSequencesCount: deletedSeqs.deletedCount,
              remainingDocumentsForTestRun: remainingForTestRun,
            },
            null,
            2,
          ),
        );
      }
    } catch (cleanupErr) {
      console.error("Error durante limpieza:", cleanupErr);
    }

    try {
      await mongoose.disconnect();
      console.log("[Fase 7] Conexión Mongoose cerrada correctamente.");
    } catch (discErr) {
      console.error("Error al cerrar Mongoose:", discErr);
    }

    if (mongodServer) {
      await mongodServer.stop();
      console.log("[Fase 7] Instancia MongoMemoryServer detenida correctamente.");
    }
  }
}

runStressSuite().catch((err) => {
  console.error("Fallo crítico en suite de estrés:", err);
  process.exit(1);
});
