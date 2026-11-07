# Licencias de Terceros y Componentes de Software Libre

> **Proyecto:** Hoshiko & Hoshiko Security (`HannaeX`)  
> **Fecha de Actualización:** 7 de noviembre de 2026  
> **Manifiesto Detallado:** [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md)  

---

## 1. Resumen de Licencias del Ecosistema de Dependencias

El proyecto Hoshiko hace uso de diversas bibliotecas y paquetes de código abierto distribuidos bajo licencias permisivas estándar del ecosistema Node.js y TypeScript. Todas las licencias de dependencias han sido auditadas para asegurar plena compatibilidad con el modelo de desarrollo del proyecto.

### Distribución de Licencias de Dependencias Directas

| Licencia | Cantidad de Paquetes | Ejemplos Principales | Obligaciones y Condiciones |
|---|:---:|---|---|
| **MIT** | 15 | `@napi-rs/canvas`, `axios`, `express`, `dotenv`, `mongoose`, `typescript`, `bullmq` | Permisiva estándar. Requiere mantener el aviso de copyright y la renuncia de garantía original. |
| **Apache-2.0** | 2 | `discord.js`, `@google/generative-ai` | Permisiva moderna. Requiere mantener los avisos de copyright, la licencia Apache 2.0 y documentar modificaciones sustanciales si aplica. |
| **BlueOak-1.0.0** | 1 | `lru-cache` | Permisiva contemporánea con términos equivalentes a MIT/BSD, diseñada para claridad y simplicidad. |
| **ISC** | 2 | `node-cron`, `generate-license-file` | Permisiva equivalente funcional a la licencia BSD de 2 cláusulas y MIT. |
| **BSD-2-Clause** | 1 | `dotenv` (componentes auxiliares) | Permisiva estándar que exige preservar avisos de derechos de autor y condiciones de redistribución. |
| **AGPL-3.0** | 1 | `pm2` *(Exclusivo de Runtime CLI en Host)* | Gestor de procesos del sistema operativo. Ver análisis de aislamiento abajo. |

---

## 2. Análisis Jurídico de Herramientas de Infraestructura (PM2)

- **Paquete:** `pm2` (`AGPL-3.0`)
- **Naturaleza en el Repositorio:** Herramienta de ejecución y monitorización de procesos a nivel del sistema operativo en el host/máquina virtual (`ecosystem.config.js`).
- **Verificación Técnica de Aislamiento:**
  - El código fuente de las aplicaciones (`apps/hoshiko` y `apps/hoshiko-security`) **no importa ni enlaza (`import` / `require`) ningún módulo de PM2**.
  - PM2 opera estrictamente como un ejecutor de comandos CLI externo (`pm2 start`, `pm2 logs`).
  - Conforme a los principios de licenciamiento de la Free Software Foundation (FSF), la ejecución de un software propietario bajo un runtime o gestor de procesos externo independiente no contagia ni somete el código del proceso gestionado a los términos de la licencia AGPL.

---

## 3. Manifiesto Completo de Atribuciones

Para consultar el texto íntegro de cada una de las licencias de las dependencias, subdependencias y sus respectivos titulares de derechos de autor, consulte el archivo autogenerado:

👉 [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md)

Este manifiesto se actualiza periódicamente mediante el script automatizado:
```bash
npm run generate-licenses
```
