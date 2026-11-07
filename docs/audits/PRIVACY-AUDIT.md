# Auditoría de Privacidad y Flujo de Datos hacia Terceros (Gemini)

> **Destinatario:** Amy / Equipo Legal y de Privacidad de HannaeX (Hoshiko)  
> **Fecha:** 2026-10-21  
> **Estado:** Documentación Técnica de Salida de Datos (Fase 2 - IA en Sombra/Moderación)

---

## 1. Alcance y Terceros Involucrados
Para las funciones de moderación asistida por Inteligencia Artificial y detección de anomalías bajo estrés o raid, HannaeX utiliza el modelo **Gemini 2.5 Flash Lite** de Google (vía SDK `@google/generative-ai` o API REST).

---

## 2. Compuerta de Filtrado Previo (Data Minimization)
**No se envía el canal entero ni el historial masivo de mensajes.**  
Únicamente se evalúan mensajes que cruzan la compuerta determinista de seguridad:
1. Modo raid activo o estrés elevado del servidor ($\ge 70\%$ del umbral).
2. Mensajes de miembros recién ingresados (< 24 horas en el servidor o cuenta de Discord < 7 días).
3. Reportes manuales o mensajes con marcas de evasión heurística sin sanción dura directa.

---

## 3. Datos Específicos Transmitidos a Google Gemini
Para cada llamada de evaluación, los datos salientes están estrictamente delimitados e higienizados:

| Campo | Descripción / Límite | Propósito |
|---|---|---|
| `content` | Texto del mensaje a evaluar, truncado a un **máximo de 300 caracteres**. | Análisis de leetspeak, estafas, odio o evasión de filtros. |
| `channelContext` | Hasta **3 mensajes previos** inmediatos del canal, truncados a **100 caracteres** cada uno. | Comprensión del contexto situacional (evitar falsos positivos semánticos). |
| `authorContext` | Antigüedad de la cuenta en días (número) y horas de permanencia en el servidor (número). | Evaluación de riesgo/vector de cuentas títere (alts/raiders). |
| `serverRules` | Texto de las reglas activas configuradas por el staff del servidor (IDs y textos de máx. 200 caracteres). | Permitir que la IA identifique qué norma comunitaria fue vulnerada. |
| `historySummary` (`/historial`) | Conteo de casos previos, tipos de acción (`warn`, `timeout`, `ban`) y motivos de infracción históricos. | Generación de resumen ejecutivo disciplinario para el staff. |
| `configAssistant` (`/setup`) | Descripción libre ingresada por el staff y lista de nombres/IDs de canales de texto. | Recomendación y borrador de perfil de seguridad y reglas. |

---

## 4. Datos que NUNCA se Transmiten
- **Identificadores personales directos:** No se envían nombres reales, correos electrónicos ni IPs.
- **Tokens o credenciales:** No se transmite ningún dato sensible de autenticación.
- **Canales privados:** No se transmite contenido de canales NSFW ni Mensajes Directos (DMs).
- **Archivos adjuntos masivos:** Las imágenes adjuntas no se transmiten de forma indiscriminada (solo metadatos o miniaturas comprimidas si aplican).

---

## 5. Retención y Almacenamiento Local
- **En memoria (Caché L1):** Las huellas normalizadas (`buildNormalizedFingerprint`) y sus veredictos se almacenan con un TTL máximo de **1 hora** en `LocalCacheService` bajo la clave de ámbito `${guildId}:${ruleVersion}:${fingerprint}`.
- **Idempotencia:** 20 usuarios enviando el mismo texto en el mismo servidor generan una sola llamada hacia Google Gemini.
- **Mongo/Casos:** Si se ejecuta una sanción o revisión, solo se persiste un registro de caso (`CaseModel`) con el extracto del mensaje y el veredicto en la base de datos de HannaeX.

---

## 6. Aviso Recomendado para la Política de Privacidad (PRIVACY.md)
Se recomienda incorporar la siguiente cláusula en la política pública del bot:
> *"Para garantizar la seguridad de las comunidades y prevenir incursiones coordinadas (raids), HannaeX puede procesar fragmentos de texto y contexto técnico temporal (antigüedad de cuenta y permanencia) mediante la API de Google Gemini en servidores con niveles de protección activos. Estos datos se procesan de forma efímera para la clasificación de amenazas sin utilizarse para el entrenamiento de modelos de terceros ni venderse a entidades comerciales."*
