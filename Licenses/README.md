# Documentación legal y de terceros

- [LICENSE.md](LICENSE.md): licencia del código propio. Declara All Rights Reserved y no concede permisos de reutilización.
- [TERMS.md](TERMS.md): términos de uso del servicio alojado.
- [PRIVACY.md](PRIVACY.md): tratamiento de datos y almacenamiento técnico. El contenido de la antigua política de cookies se revisó y consolidó en esta política; no se identificó una web de usuario en el código revisado.
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md): textos de licencia generados para dependencias de producción, más avisos manuales de runtime, Discord y assets.
- [../docs/Hoshiko_Dev.md](../docs/Hoshiko_Dev.md): guía de desarrollo, fuera de los documentos legales.

## Actualizar atribuciones

1. Instala las dependencias con el lockfile reconciliado.
2. Ejecuta npm run generate-licenses.
3. Revisa el aviso de licencias múltiples que emite la herramienta y los cambios generados.
4. Vuelve a agregar/verificar la sección manual de runtime, Discord, fuentes e imágenes; el comando --overwrite reemplaza el archivo completo.
5. No distribuyas el inventario hasta resolver los [TODO: VALIDAR].

## Pendientes de validación

- Titularidad/contacto para la licencia del código.
- Estado y cláusulas de Premium, moderación, jurisdicción y soporte en TERMS.md.
- Datos, voz, proveedores, regiones, retención, eliminación, seguridad y backups en PRIVACY.md.
- Licencias de todos los paquetes y de los recursos visuales; conflicto del manifiesto/lockfile de PM2.
- Licencia aplicable a tv4, que declara múltiples licencias.
- Runtime Node.js, términos de Discord y datos de procedencia/licencia de fuentes e imágenes.

Estos documentos preservan la intención de los textos anteriores, pero no sustituyen una revisión profesional. No presentes los elementos marcados [TODO: VALIDAR] como prácticas o condiciones confirmadas.
