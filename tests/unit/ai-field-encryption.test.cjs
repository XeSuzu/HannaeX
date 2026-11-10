const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

// Configurar entorno de prueba con clave válida de 256 bits (64 hex)
const TEST_KEY_HEX = crypto.randomBytes(32).toString("hex");
process.env.DATABASE_ENCRYPTION_KEY = TEST_KEY_HEX;

const {
  FieldEncryptionService,
} = require("../../apps/hoshiko/dist/Security/Encryption/FieldEncryptionService.js");
const {
  PersonalMemoryService,
} = require("../../apps/hoshiko/dist/Core/AI/Memory/PersonalMemoryService.js");

test("FieldEncryptionService: Cifrado y Descifrado AES-256-GCM", () => {
  FieldEncryptionService.resetKeyCache();
  assert.equal(FieldEncryptionService.hasKey(), true, "Debe detectar la clave configurada");

  const original = "Le gusta programar bots en TypeScript y Discord.js";
  const encrypted = FieldEncryptionService.encrypt(original);

  assert.notEqual(encrypted, original, "El texto cifrado no debe ser igual al original");
  assert.equal(encrypted.startsWith("enc:v1:"), true, "Debe tener prefijo enc:v1:");
  assert.equal(FieldEncryptionService.isEncrypted(encrypted), true);

  const parts = encrypted.split(":");
  assert.equal(parts.length, 5, "Debe tener formato enc:v1:iv:tag:ciphertext");

  const decrypted = FieldEncryptionService.decrypt(encrypted);
  assert.equal(decrypted, original, "El descifrado debe recuperar exactamente el texto original");

  // Idempotencia
  assert.equal(FieldEncryptionService.encrypt(encrypted), encrypted, "Cifrar lo ya cifrado no debe duplicar");
  assert.equal(FieldEncryptionService.decrypt(original), original, "Descifrar texto plano debe retornarlo intacto");
});

test("FieldEncryptionService: Retrocompatibilidad con datos legados y degradación ante manipulación", () => {
  FieldEncryptionService.resetKeyCache();
  
  // Texto legado sin prefijo enc:v1:
  const legacyFact = "Usuario es streamer de Minecraft";
  assert.equal(FieldEncryptionService.decrypt(legacyFact), legacyFact, "Datos legados pasan transparentes");

  // Cadena corrupta o manipulada (alterar tag de autenticación)
  const validEncrypted = FieldEncryptionService.encrypt("Dato confidencial");
  const parts = validEncrypted.split(":");
  parts[3] = "00000000000000000000000000000000";
  const tampered = parts.join(":");

  const recovered = FieldEncryptionService.decrypt(tampered);
  assert.equal(recovered, "[Dato cifrado no recuperable]", "Debe proteger ante manipulación de datos");
});

test("FieldEncryptionService: Comportamiento estricto fail-closed ante clave ausente o inválida", () => {
  const originalKey = process.env.DATABASE_ENCRYPTION_KEY;
  try {
    // 1. Clave ausente
    delete process.env.DATABASE_ENCRYPTION_KEY;
    FieldEncryptionService.resetKeyCache();
    assert.equal(FieldEncryptionService.hasKey(), false);

    assert.throws(
      () => FieldEncryptionService.validateOrThrow(),
      /DATABASE_ENCRYPTION_KEY no configurada/,
      "validateOrThrow debe fallar si la clave no está configurada",
    );

    assert.throws(
      () => FieldEncryptionService.encrypt("Dato que no debe guardarse en texto plano"),
      /Fallo fail-closed/,
      "encrypt debe fallar estrictamente (fail-closed) y nunca devolver texto plano",
    );

    // 2. Clave inválida (longitud incorrecta)
    process.env.DATABASE_ENCRYPTION_KEY = "clave_corta_insegura";
    FieldEncryptionService.resetKeyCache();
    assert.equal(FieldEncryptionService.hasKey(), false);

    assert.throws(
      () => FieldEncryptionService.validateOrThrow(),
      /DATABASE_ENCRYPTION_KEY inválida/,
      "validateOrThrow debe rechazar claves de longitud incorrecta",
    );

    assert.throws(
      () => FieldEncryptionService.encrypt("Otro dato sensible"),
      /Fallo fail-closed/,
      "encrypt debe rechazar claves con formato o tamaño inválido",
    );
  } finally {
    process.env.DATABASE_ENCRYPTION_KEY = originalKey;
    FieldEncryptionService.resetKeyCache();
  }
});

test("PersonalMemoryService: Recuerdos cifrados en almacenamiento y descifrados en consulta", async () => {
  FieldEncryptionService.resetKeyCache();
  const userId = `enc_user_${Date.now()}`;

  const res = await PersonalMemoryService.addAutoExtractedFact(
    userId,
    "Le gusta el café con leche y medialunas",
    "preference",
  );
  assert.equal(res.success, true);

  const facts = await PersonalMemoryService.getFacts(userId);
  assert.equal(facts.length, 1);
  assert.equal(facts[0], "Le gusta el café con leche y medialunas");

  // Deduplicación funciona reconociendo el hecho descifrado
  const duplicateRes = await PersonalMemoryService.addAutoExtractedFact(
    userId,
    "Le gusta el café con leche y medialunas",
    "preference",
  );
  assert.equal(duplicateRes.success, false, "Debe deduplicar correctamente");
});
