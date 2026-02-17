# 🔴 ERRORES ENCONTRADOS EN DEPLOY - HOSHIKO BOT

## 🎯 PROBLEMA RAÍZ IDENTIFICADO

**ERROR 429 - Discord Rate Limiting**
```
"Max number of daily application command creates has been reached (200)"
"retry_after": 70.661 segundos
```

**CAUSA:** Discord limita a **200 cambios de comandos por día en modo GLOBAL**. Ya habías ejecutado deploys previos y agotaste el límite.

**POR QUÉ SE QUEDA COLGADA LA SOLICITUD:**
- Discord devuelve HTTP 429 (Too Many Requests)
- Discord.js no maneja correctamente este error
- La solicitud se queda esperando indefinidamente
- Sin respuesta = timeout

---

## Soluciones Inmediatas

### ✅ **SOLUCIÓN 1: Usa modo GUILD (Recomendado)**
```bash
npm run deploy
```
- Deploy a servidor privado (GUILD_ID)
- SIN límite de 200/día
- Cambios visibles al instante en el servidor
- **Recomendado para desarrollo**

### ✅ **SOLUCIÓN 2: Espera y reintenta el deploy global**
```bash
# Espera ~75 segundos (Discord te dice cuánto esperar)
sleep 75
npm run deploy:global
```
- El límite se resetea después del tiempo indicado
- Luego puedes hacer deploy global
- **Recomendado para producción**

### ⚠️ **SOLUCIÓN 3: Agregar reintentos automáticos**
Implementado en el script - ahora detecta 429 y muestra:
- Tiempo de espera exacto
- Cuál es el límite (200/día)
- Recomendaciones de acción

---

## Errores Anteriores (También Fixeados)

### 1. ❌ **CRÍTICO: Script se queda colgado**
- Faltaba `process.exit()`
- ✅ **ARREGLADO:** Agregué exit(0) en éxito, exit(1) en error

### 2. ❌ **GRAVE: Timeout de REST API muy corto**
- Timeout: 20s → muy corto para 39 comandos
- ✅ **ARREGLADO:** Aumenté a 120s

### 3. ⚠️ **MODERADO: Validación incompleta**
- No validaba tamaño JSON
- ✅ **ARREGLADO:** Agregué validación de 4000 bytes

### 4. ⚠️ **MODERADO: Manejo de errores deficiente**
- No diferenciaba tipos de error
- ✅ **ARREGLADO:** Ahora detecta 429, conexión, etc.

---

## Archivos Modificados

✅ [src/scripts/deploy-commands.ts](src/scripts/deploy-commands.ts)
- Detección de error 429
- Timeout aumentado a 120s
- process.exit() agregado
- Mejor manejo de Rate Limiting

---

## Comandos Disponibles

```bash
# Modo GUILD (sin límite, recomendado dev)
npm run deploy

# Modo GLOBAL (200/día, producción)
npm run deploy:global

# Build solamente
npm run build
```

---

## Próximos Pasos

1. **Inmediato:** Usa `npm run deploy` para development
2. **Espera:** Si necesitas deploy global, espera 75s
3. **Ejecuta:** `npm run deploy:global`
4. **Verifica:** Los comandos aparecen en Discord

