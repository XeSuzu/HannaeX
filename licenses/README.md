# Marco Legal y Licencias — HannaeX (Hoshiko & Hoshiko Security)

Esta carpeta constituye la **única fuente de verdad oficial y centralizada** para toda la documentación legal, licenciamiento de software, políticas de privacidad, términos de servicio y expedientes internos de auditoría jurídica del proyecto HannaeX (Hoshiko v2.1.0).

---

## 📁 Estructura del Directorio `licenses/`

```text
licenses/
├── public/                    # Documentación legal pública oficial para usuarios y web
│   ├── TERMS_OF_SERVICE.md    # Términos y Condiciones de Uso del servicio
│   ├── PRIVACY_POLICY.md      # Política de Privacidad oficial para usuarios y comunidades
│   └── README.md              # Índice de documentación pública
├── LICENSE                    # Licencia propietaria principal (All Rights Reserved - v.sxn)
├── LICENSE.md                 # Versión markdown de la licencia principal
├── THIRD_PARTY_LICENSES.md    # Resumen y análisis de licencias de dependencias y librerías
├── ATTRIBUTIONS.md            # Manifiesto íntegro autogenerado de atribuciones de terceros
├── README.md                  # Índice y guía de navegación de este directorio
│
├── hoshiko/                   # Expediente técnico-jurídico interno de Hoshiko
│   ├── 01-Terms-of-Service.md
│   ├── 02-Privacy-Policy.md
│   ├── 03-Acceptable-Use-Policy.md
│   ├── 04-Data-Retention-and-Deletion.md
│   ├── 05-AI-and-Moderation-Disclosure.md
│   ├── 06-Third-Party-Services.md
│   ├── 07-Disclaimers-and-Limitations.md
│   ├── DATA-INVENTORY.md
│   └── LEGAL-REVIEW.md
│
└── hoshiko-security/          # Documentación jurídica y alcance de Hoshiko Security
    ├── 01-Product-Vision.md
    ├── 02-Security-Scope.md
    ├── 03-Roadmap-and-Planned-Features.md
    ├── 04-Threat-Detection-and-Mitigation.md
    ├── 05-Data-and-Telemetry-Inventory.md
    ├── 06-Privacy-and-Security-Considerations.md
    ├── 07-Future-Terms-and-Conditions.md
    ├── 08-Future-Privacy-Policy.md
    └── 09-Legal-Open-Questions.md
```

---

## 🏛️ Clasificación y Finalidad de los Documentos Oficiales

### 1. Licenciamiento de Código Fuente y Software
- [`LICENSE`](LICENSE) / [`LICENSE.md`](LICENSE.md): Licencia propietaria del código fuente de HannaeX / Hoshiko (*All Rights Reserved*, titularidad de `v.sxn`).
- [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md): Resumen clasificado de las licencias de código abierto de las dependencias directas e indirectas (MIT, Apache 2.0, BlueOak, ISC, BSD) y análisis de aislamiento de PM2.
- [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md): Manifiesto exhaustivo de derechos de autor y licencias de terceros generado mediante `npm run generate-licenses`.

### 2. Documentación Pública Oficial (`licenses/public/`)
Documentos destinados a consulta directa de los usuarios, comunidades, Discord App Directory y la web oficial:
- [`public/PRIVACY_POLICY.md`](public/PRIVACY_POLICY.md): Política de Privacidad pública ajustada al marco de la LOPDP (Ecuador), Discord Developer Policy y normativas internacionales aplicables. Detalla el tratamiento de datos de la Inteligencia Artificial (Gemini Relay, memoria soberana `PersonalMemory`, cuotas deslizantes de 24h y Zero-Knowledge Logging).
- [`public/TERMS_OF_SERVICE.md`](public/TERMS_OF_SERVICE.md): Términos de Servicio oficiales que rigen la utilización del bot, responsabilidades de moderadores y reglas contra el uso indebido.
- [`public/README.md`](public/README.md): Índice y guía de accesibilidad de la documentación pública.

### 3. Expedientes Internos de Auditoría Técnica
- [`hoshiko/`](hoshiko/): Análisis interno detallado de retención de datos, flujo de moderación, inventario de esquemas en MongoDB (`DATA-INVENTORY.md`) y matriz de revisión legal (`LEGAL-REVIEW.md`).
- [`hoshiko-security/`](hoshiko-security/): Documentación preparatoria sobre la separación de responsabilidades y alcance defensivo de Hoshiko Security.

---

## 🔗 Referencias a Documentación Técnica Especializada
- [`docs/music/LEGAL.md`](../docs/music/LEGAL.md): Marco legal y límites técnicos de audio en Discord.
- [`docs/audits/PRIVACY-AUDIT.md`](../docs/audits/PRIVACY-AUDIT.md): Auditoría histórica de minimización de datos en filtros heurísticos.
