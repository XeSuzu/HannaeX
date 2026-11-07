# Especificación funcional y visual: Sistema de Logs de Hoshiko

**Estado:** Diseño funcional acordado; pendiente de implementación y
validación técnica.\
**Alcance:** Hoshiko principal y lineamientos independientes para
Hoshiko Security.\
**Objetivo:** Definir el setup, la privacidad, los permisos, la
estructura de canales, los embeds de registro y la experiencia de
administración.

------------------------------------------------------------------------

## 1. Objetivos y principios

El sistema de logs debe permitir que cada comunidad registre eventos
relevantes sin obligarla a adoptar una jerarquía de roles
predeterminada.

Principios:

1.  **Privacidad por defecto:** los canales de logs serán privados.
2.  **Sin jerarquías asumidas:** Hoshiko no debe asumir que todos los
    servidores usan roles como `Trial`, `Helper`, `Moderator` o `Admin`.
3.  **Nombres de roles irrelevantes para la autorización:** el nombre,
    color o posición de un rol no concede permisos por sí mismo.
4.  **Permisos configurables:** cada administrador decide qué roles
    pueden consultar cada canal.
5.  **Configuración explícita:** antes de crear la categoría, el
    administrador debe elegir entre permisos predeterminados o
    personalizados.
6.  **Idempotencia:** volver a ejecutar el setup no debe duplicar
    categorías ni canales.
7.  **Reparación segura:** una reparación no debe sobrescribir cambios
    manuales sin informar y pedir autorización.
8.  **Registro fiel:** los logs describen eventos que realmente
    ocurrieron. No deben presentar una acción intentada como una acción
    exitosa.
9.  **Separación de productos:** Hoshiko normal y Hoshiko Security
    mantienen sus propias categorías, canales, configuración y
    responsabilidades.
10. **Sin despliegue implícito:** esta especificación no autoriza
    cambios en producción ni en infraestructura.

------------------------------------------------------------------------

## 2. Experiencia inicial: `/setup logs`

El setup debe sentirse como un asistente guiado dentro de Discord, no
como un comando que crea canales silenciosamente.

### 2.1 Bienvenida

Al ejecutar `/setup logs`, Hoshiko responde de forma efímera con un
embed de bienvenida.

Contenido sugerido:

-   Título: `Configuración de Hoshiko Logs`
-   Explicación breve de qué registrará el sistema.
-   Número y nombres de los canales que creará.
-   Aviso de que creará una categoría privada.
-   Explicación de que los permisos podrán configurarse por rol y canal.
-   Indicación de que los canales existentes se reutilizarán cuando sea
    posible.

La respuesta inicial debe explicar qué ocurrirá antes de solicitar
decisiones.

### 2.2 Elección obligatoria del modo de permisos

Antes de crear la categoría o los canales, Hoshiko debe mostrar una
advertencia visible y solicitar una elección.

**Advertencia obligatoria:**

> **Antes de continuar**
>
> La configuración predeterminada de Hoshiko Logs será privada. Solo los
> miembros con el permiso `Administrator` podrán ver esta categoría y
> sus canales.
>
> Los demás roles no tendrán acceso, incluidos los roles de moderación.
>
> Si deseas que Helpers, Moderators u otros roles puedan consultar
> determinados logs, selecciona la configuración personalizada.
>
> Esta decisión podrá modificarse posteriormente.

Opciones:

#### A. Configuración predeterminada

-   Solo los miembros con el permiso `Administrator` podrán acceder a
    los canales.
-   `@everyone` no tendrá acceso.
-   Ningún rol recibe acceso por llamarse `Admin`, `Moderator`, `Staff`,
    `Helper` o cualquier otro nombre.
-   La autorización se basa en los permisos reales de Discord.
-   Los usuarios con `Administrator` pueden acceder a canales privados
    por el comportamiento propio de Discord, independientemente de los
    overwrites.

Esta modalidad prioriza la privacidad y no intenta inferir la estructura
del servidor.

#### B. Configuración personalizada

Permite que el administrador diseñe la distribución de acceso de su
propia comunidad:

-   Seleccionar los roles que tendrán acceso.
-   Organizar o representar su jerarquía de responsabilidad.
-   Elegir qué canales puede consultar cada rol.
-   Dar acceso a varios roles en un mismo canal.
-   Configurar accesos diferentes por canal.
-   Revisar un resumen antes de aplicar los permisos.

La jerarquía configurada es una herramienta organizativa. **No debe
conceder acceso automáticamente por posición o nombre**: el acceso
efectivo se define mediante permisos por canal.

### 2.3 Confirmación previa

Antes de crear o modificar recursos, mostrar un resumen:

-   Modo elegido.
-   Categoría que se creará o reutilizará.
-   Canales que se crearán o reutilizarán.
-   Roles autorizados y canales a los que tendrán acceso.
-   Confirmación de que `@everyone` no tendrá acceso.
-   Advertencias sobre roles que ya tengan `Administrator`.

Botones sugeridos:

-   `Confirmar configuración`
-   `Volver a permisos`
-   `Cancelar`

No crear recursos hasta recibir confirmación.

### 2.4 Progreso y resultado

Durante la ejecución, actualizar el embed de forma controlada:

1.  Comprobando permisos del bot.
2.  Buscando una categoría existente.
3.  Creando o reutilizando la categoría.
4.  Creando o reutilizando canales.
5.  Aplicando permisos.
6.  Guardando IDs y configuración.
7.  Verificando el resultado.

Al terminar, mostrar:

-   Categoría creada o reutilizada.
-   Canales creados o reutilizados.
-   Modo de permisos aplicado.
-   Roles con acceso.
-   Errores o elementos que no pudieron configurarse.
-   Acceso directo a la categoría o canales, cuando Discord permita
    incluirlos.

No mostrar éxito si una etapa crítica falló. Si el setup queda
incompleto, indicar exactamente qué se completó y qué necesita atención.

------------------------------------------------------------------------

## 3. Estructura de Hoshiko Logs

Hoshiko normal utilizará una única categoría privada:

``` text
🔒 HOSHIKO LOGS
│
├── #mod-log
├── #message-log
├── #message-review
├── #links-logs
├── #voice-log
└── #server-logs
```

No se crearán subcategorías para estos seis canales.

### 3.1 `#mod-log`

Registro central de acciones de moderación.

Debe incluir, según corresponda:

-   Acción ejecutada.
-   Usuario afectado.
-   Actor responsable: moderador, administrador, sistema o Hoshiko.
-   Motivo.
-   Fecha y hora.
-   Duración, si aplica.
-   Origen: comando, componente, automatización o evento externo.
-   Resultado real de la operación.
-   Número de caso, cuando corresponda.

Acciones posibles: warn, un-warn, timeout, untimeout, ban, unban, kick,
softban, tempban, purge y otras acciones de moderación que se incorporen
formalmente.

Un registro automático debe identificar claramente a Hoshiko como actor,
sin atribuir la acción a un moderador humano.

### 3.2 `#message-log`

Canal único para eventos de mensajes editados y eliminados.

-   Mensaje eliminado: incluir autor, canal, contenido disponible, fecha
    y datos contextuales permitidos.
-   Mensaje editado: incluir autor, canal, contenido anterior y
    contenido nuevo, si ambos están disponibles.
-   Si Discord no proporciona el contenido anterior o el contenido no
    está disponible, indicarlo; no inventarlo.
-   Diferenciar visualmente `Mensaje eliminado` y `Mensaje editado`.

**No se dividirá en `#message-delete-log` y `#message-edit-log`.** Los
permisos se aplican al canal completo, por lo que cualquier rol
autorizado a leer `#message-log` podrá ver ambos tipos de eventos.

### 3.3 `#message-review`

Registro de mensajes enviados a revisión por los sistemas de moderación,
incluida la evaluación mediante IA cuando corresponda.

Debe distinguir:

-   Mensaje revisado.
-   Motivo o categoría detectada.
-   Resultado de la evaluación.
-   Acción tomada, si hubo una.
-   Estado pendiente de revisión humana, cuando aplique.

La evaluación de IA no debe presentarse como una sanción. Debe quedar
claro cuándo solo hubo detección, cuándo hubo una decisión automática y
cuándo intervino un moderador.

### 3.4 `#links-logs`

Registro de enlaces detectados por las protecciones de enlaces.

Debe incluir:

-   Autor y canal.
-   Enlace o representación segura del enlace.
-   Regla que lo detectó.
-   Acción ejecutada.
-   Resultado.
-   Fecha y hora.

Evitar que un enlace malicioso se convierta en una vista previa
peligrosa. El embed debe mostrar el enlace como texto seguro y no
provocar una navegación automática.

### 3.5 `#voice-log`

Registro de eventos de voz relevantes, según los eventos y permisos
disponibles en Discord:

-   Entrada y salida de canales de voz.
-   Mute y unmute.
-   Deafen y undeafen.
-   Cámara activada o desactivada.
-   Inicio y fin de transmisión, cuando el evento esté disponible.

Los eventos que Discord no exponga no deben simularse ni inferirse.

### 3.6 `#server-logs`

Registro de cambios relevantes en la configuración del servidor:

-   Creación, eliminación y actualización de canales.
-   Cambios de permisos y overwrites.
-   Cambios de roles y permisos.
-   Cambios de configuración relevantes que Discord permita observar.

Cada evento debe identificar al actor cuando Discord proporcione esa
información. Si no se puede identificar, mostrar `Actor no disponible` o
equivalente.

------------------------------------------------------------------------

## 4. Diseño visual de los embeds

Los embeds deben compartir un lenguaje visual coherente y reconocible,
pero cada tipo de evento debe distinguirse con claridad.

### 4.1 Estructura visual común

Cada embed debe organizar la información en este orden:

1.  **Identidad del evento:** título claro, por ejemplo
    `Mensaje eliminado`, `Usuario expulsado` o `Cambio de permisos`.
2.  **Resumen:** descripción breve del evento.
3.  **Datos principales:** usuario, canal, actor, acción y motivo, según
    corresponda.
4.  **Detalles:** contenido anterior/nuevo, duración, permisos
    modificados u otra información específica.
5.  **Metadatos:** fecha, ID del evento o referencia al caso.
6.  **Pie:** identidad de Hoshiko y contexto del registro.

No todos los eventos necesitan todos los campos. Evitar embeds enormes
con campos vacíos o información redundante.

### 4.2 Identidad por tipo de evento

Usar color, iconografía y títulos para que el personal pueda reconocer
rápidamente la naturaleza del evento.

  Tipo de evento        Identidad visual sugerida
  --------------------- -----------------------------------------
  Moderación            Color de moderación y título con acción
  Mensaje eliminado     Identidad visual de eliminación
  Mensaje editado       Identidad visual de edición
  Revisión de mensaje   Identidad de revisión o análisis
  Enlace detectado      Identidad de protección de enlaces
  Voz                   Identidad de actividad de voz
  Servidor              Identidad de cambios de configuración

Los colores deben ayudar a distinguir categorías, no sustituir el texto.
El estado de éxito, fallo, advertencia o pendiente debe expresarse
explícitamente.

### 4.3 Ejemplo: mensaje eliminado

``` text
┌─────────────────────────────────────────────┐
│ 🗑️ Mensaje eliminado                        │
│                                             │
│ Autor: @Usuario                             │
│ Canal: #general                             │
│                                             │
│ CONTENIDO                                   │
│ "Texto del mensaje eliminado..."            │
│                                             │
│ Registrado: 05/11/2026 08:30                 │
│ ID del mensaje: ...                         │
│                                             │
│ Hoshiko Logs                                │
└─────────────────────────────────────────────┘
```

### 4.4 Ejemplo: mensaje editado

``` text
┌─────────────────────────────────────────────┐
│ ✏️ Mensaje editado                           │
│                                             │
│ Autor: @Usuario                             │
│ Canal: #general                             │
│                                             │
│ ANTES                                       │
│ "Texto original..."                         │
│                                             │
│ DESPUÉS                                     │
│ "Texto actualizado..."                      │
│                                             │
│ Registrado: 05/11/2026 08:35                 │
│ ID del mensaje: ...                         │
│                                             │
│ Hoshiko Logs                                │
└─────────────────────────────────────────────┘
```

### 4.5 Ejemplo: acción de moderación

``` text
┌─────────────────────────────────────────────┐
│ 🔨 Usuario sancionado                        │
│                                             │
│ Usuario: @Usuario                           │
│ Acción: Timeout                             │
│ Duración: 10 minutos                        │
│ Responsable: @Moderador                     │
│                                             │
│ Motivo                                      │
│ Reincidencia en spam                        │
│                                             │
│ Caso: #245                                  │
│ Resultado: Ejecutado correctamente         │
│ Fecha: 05/11/2026 08:40                     │
│                                             │
│ Hoshiko Moderation                          │
└─────────────────────────────────────────────┘
```

Los ejemplos son referencias de contenido y jerarquía visual, no una
exigencia de reproducir literalmente el arte ASCII en Discord.

------------------------------------------------------------------------

## 5. Permisos y privacidad

### 5.1 Reglas generales

-   La categoría y sus canales serán privados.
-   `@everyone` no tendrá `ViewChannel`.
-   Hoshiko debe recibir los permisos mínimos necesarios para crear
    canales, configurar overwrites y enviar embeds.
-   Los roles autorizados recibirán los permisos de lectura necesarios,
    normalmente `ViewChannel` y `ReadMessageHistory`.
-   No conceder `Administrator`, `ManageChannels` ni permisos de
    escritura a los roles de logs salvo que exista una necesidad
    separada y explícita.
-   Los usuarios con `Administrator` pueden acceder a canales privados
    por el comportamiento de Discord.
-   La configuración debe considerar los permisos efectivos de Discord y
    no limitarse a inspeccionar nombres de roles.

### 5.2 Modo predeterminado

-   Acceso reservado a miembros con `Administrator`.
-   Los demás roles no reciben acceso.
-   No se intenta detectar automáticamente roles de moderación.
-   La advertencia previa es obligatoria.

### 5.3 Modo personalizado

El administrador puede:

-   Seleccionar roles existentes.
-   Organizar una jerarquía propia de responsabilidad.
-   Elegir los canales visibles para cada rol.
-   Dar acceso a varios roles por canal.
-   Cambiar la distribución sin reconstruir los canales.

La jerarquía es informativa y organizativa. No debe provocar herencia
automática de acceso, salvo que el administrador configure expresamente
esa distribución.

### 5.4 Límites de Discord

Los permisos de lectura se aplican por canal, no por embed o tipo de
evento.

Por tanto, un rol que pueda leer `#message-log` podrá consultar tanto
mensajes eliminados como editados. No es posible ocultar únicamente los
embeds de edición a un rol mediante overwrites del mismo canal.

Los permisos `Administrator` eluden las restricciones de canales
privados. La interfaz debe explicarlo para evitar prometer aislamiento
que Discord no ofrece.

------------------------------------------------------------------------

## 6. Administración posterior: `/setup logs permissions`

El administrador podrá modificar los permisos después del setup sin
reconstruir la categoría ni los canales.

Flujo sugerido:

1.  Hoshiko muestra la configuración actual.
2.  El administrador selecciona el canal que desea modificar o una vista
    general.
3.  Selecciona los roles que tendrán acceso.
4.  Revisa el resumen de permisos.
5.  Confirma los cambios.
6.  Hoshiko aplica los overwrites y verifica el resultado.

Debe ser posible:

-   Añadir o retirar un rol de un canal.
-   Dar acceso a un rol a varios canales.
-   Revisar qué roles pueden ver cada canal.
-   Volver al modo predeterminado.
-   Mantener el resto de la configuración sin cambios.

Cambiar permisos no debe borrar mensajes, registros ni casos.

------------------------------------------------------------------------

## 7. Idempotencia, detección y reparación

El setup debe poder ejecutarse más de una vez sin duplicar recursos.

Comportamiento esperado:

-   Buscar la categoría configurada y reutilizarla si existe.
-   Buscar los canales configurados y reutilizarlos.
-   Guardar los IDs de categoría y canales en la base de datos.
-   Comprobar que los canales pertenecen a la categoría correcta.
-   Verificar que Hoshiko puede enviar mensajes.
-   Comprobar los overwrites de permisos.
-   Detectar canales o permisos modificados manualmente.

Si hay diferencias, presentar un resumen antes de reparar.

**Una reparación no debe sobrescribir excepciones manuales
silenciosamente.** Debe indicar qué cambiará y pedir confirmación cuando
la modificación afecte permisos o recursos existentes.

Si un canal fue eliminado manualmente, ofrecer recrearlo. Si fue movido
o renombrado, detectar la situación y solicitar confirmación cuando no
sea seguro determinar la intención.

------------------------------------------------------------------------

## 8. Persistencia de configuración

Guardar, como mínimo:

-   ID del servidor.
-   ID de la categoría.
-   IDs de los canales.
-   Modo de permisos seleccionado.
-   Roles autorizados por canal, en modo personalizado.
-   Información necesaria para reconstruir y verificar la configuración.
-   Fecha de creación o última actualización.
-   Estado de setup y posibles incidencias.

No depender únicamente de nombres de canales o roles: pueden cambiar.
Usar IDs de Discord como referencias estables.

La estructura exacta del modelo queda sujeta al diseño técnico del
repositorio y a la arquitectura de persistencia existente.

------------------------------------------------------------------------

## 9. Casos de moderación: relación con los logs

Los logs registran eventos; el sistema de casos conserva el historial
consultable de acciones de moderación.

Comandos previstos en Hoshiko normal:

-   `/case <id>`: muestra la ficha de un caso.
-   `/cases [usuario] [limite]`: muestra el historial de casos de un
    usuario o, si se habilita, los casos recientes del servidor.

Reglas:

-   Cada acción de moderación exitosa debe generar un caso cuando
    corresponda.
-   Las reversiones, como `/unmute` o `/unwarn`, generan un caso nuevo
    vinculado al original; no eliminan el caso original.
-   Distinguir estados como `ACTIVE`, `EXPIRED` y `REVOKED`.
-   Registrar por separado el resultado de ejecución.
-   Las acciones automáticas identifican a Hoshiko como actor.
-   Un fallo al guardar el caso no debe provocar que una acción ya
    ejecutada en Discord se reporte como fallida.
-   El canal `#mod-log` recibe el evento correspondiente.
-   No crear un canal separado `#case-logs`.

**Pendiente de definir antes de implementar:** qué niveles de staff
pueden consultar los detalles de `/case`, especialmente motivos, IDs y
datos potencialmente sensibles. El acceso al comando debe seguir una
política explícita y no inferirse solo del nombre del rol.

------------------------------------------------------------------------

## 10. Hoshiko Security: sistema de logs independiente

Hoshiko Security tendrá su propio setup, categoría, canales y
configuración de permisos. No debe mezclar sus eventos con Hoshiko
normal.

Estructura propuesta:

``` text
🔒 HOSHIKO SECURITY LOGS
│
├── #raid-logs
├── #anti-nuke-logs
├── #anti-alt-logs
├── #lockdown-logs
├── #honeypot-logs
├── #security-logs
└── #blacklist-logs
```

Responsabilidad de los canales:

-   `#raid-logs`: alertas y episodios relacionados con raids.
-   `#anti-nuke-logs`: eventos y acciones relacionadas con intentos de
    destrucción o abuso de permisos.
-   `#anti-alt-logs`: detecciones relacionadas con cuentas alternativas,
    si esa función está habilitada.
-   `#lockdown-logs`: activación, cambios y finalización de lockdown.
-   `#honeypot-logs`: eventos capturados por honeypots.
-   `#security-logs`: eventos generales de seguridad que no pertenecen a
    una categoría más específica.
-   `#blacklist-logs`: eventos de consulta, revisión o aplicación
    relacionados con blacklist, según las responsabilidades autorizadas.

El setup de Security debe seguir los mismos principios de privacidad,
elección previa de permisos, confirmación, personalización por canal,
idempotencia y reparación segura.

La categoría de Security debe permanecer independiente de
`HOSHIKO LOGS`. No compartir canales ni mezclar permisos entre ambos
productos.

Los nombres y funciones anteriores son la estructura de diseño
propuesta; la implementación debe verificar qué módulos y eventos
existen realmente antes de prometer registros.

------------------------------------------------------------------------

## 11. Diseño de embeds de Security

Los embeds de Security deben priorizar la lectura rápida de incidentes.

Estructura recomendada:

1.  Tipo y severidad del evento.
2.  Estado del incidente.
3.  Actor, cuenta o recurso afectado.
4.  Detección que originó la alerta.
5.  Acción ejecutada o recomendada.
6.  Resultado.
7.  Fecha y referencias técnicas disponibles.

Distinguir claramente:

-   `DETECTED`: amenaza detectada.
-   `MITIGATING`: mitigación en curso.
-   `MITIGATED`: mitigación completada.
-   `FAILED`: acción fallida.
-   `REVIEW_REQUIRED`: requiere revisión humana.
-   `RESOLVED`: incidente cerrado.

No usar `MITIGATED` si solo se generó una alerta. No confundir una
alerta con una acción ejecutada.

Los detalles sensibles deben limitarse a los roles que el administrador
autorice. Evitar publicar tokens, credenciales, secretos, contenido
privado innecesario o datos que no sean pertinentes para responder al
incidente.

------------------------------------------------------------------------

## 12. Requisitos de interacción y experiencia en Discord

-   Usar respuestas efímeras durante el setup y la administración de
    permisos.
-   Los mensajes de configuración deben ser claros y no saturar al
    administrador.
-   Preferir botones, menús de selección y confirmaciones para las
    decisiones del setup.
-   Editar la respuesta de interacción durante el progreso en lugar de
    enviar una sucesión de mensajes.
-   Manejar correctamente expiración de componentes e interacciones.
-   Si el proceso falla, informar el estado parcial y permitir reanudar
    o reparar.
-   Los embeds de logs son registros; no deben contener controles que
    ejecuten sanciones por accidente.
-   Si en el futuro se añaden botones de acción, exigir permisos,
    confirmación y validación de jerarquía antes de ejecutar cambios.

------------------------------------------------------------------------

## 13. Seguridad, permisos del bot y fallos

Antes de iniciar el setup, comprobar que Hoshiko tiene los permisos
necesarios para:

-   Administrar canales.
-   Ver los canales creados.
-   Enviar mensajes.
-   Insertar enlaces y embeds.
-   Leer el historial cuando sea necesario.
-   Configurar overwrites de permisos.

Si falta un permiso, explicar cuál y detener la etapa que dependa de él.
No crear una estructura parcialmente abierta como alternativa
silenciosa.

Durante la operación:

-   No exponer mensajes internos de errores, stack traces ni secretos.
-   Registrar errores técnicos en el sistema interno correspondiente.
-   Diferenciar fallos de Discord, fallos de persistencia y errores de
    configuración.
-   Verificar el resultado después de aplicar permisos.
-   No asumir que una operación fue exitosa solo porque la solicitud fue
    enviada.

------------------------------------------------------------------------

## 14. Criterios de aceptación

El sistema estará listo para considerarse funcional cuando se verifique
lo siguiente:

### Setup

-   [ ] `/setup logs` presenta una bienvenida y explica los recursos que
    creará.
-   [ ] Antes de crear recursos, exige elegir permisos predeterminados o
    personalizados.
-   [ ] La advertencia de privacidad indica explícitamente que el modo
    predeterminado solo permite acceso a usuarios con `Administrator`.
-   [ ] El modo predeterminado no concede acceso por nombres de roles.
-   [ ] El modo personalizado permite seleccionar roles y canales
    individualmente.
-   [ ] Se muestra un resumen y se solicita confirmación antes de
    aplicar cambios.
-   [ ] El setup informa progreso y resultado real.

### Canales y embeds

-   [ ] Hoshiko normal crea o reutiliza una única categoría con seis
    canales.
-   [ ] `#message-log` registra mensajes editados y eliminados en el
    mismo canal.
-   [ ] Los embeds distinguen visualmente ambos eventos.
-   [ ] Cada canal utiliza un formato coherente con su tipo de evento.
-   [ ] Los logs reflejan resultados reales y no acciones supuestas.
-   [ ] Los datos no disponibles se indican como tales.

### Permisos

-   [ ] `@everyone` no tiene acceso a la categoría.
-   [ ] Los roles personalizados reciben únicamente los accesos
    configurados.
-   [ ] La jerarquía organizativa no concede permisos de forma
    implícita.
-   [ ] Se explica que `Administrator` elude las restricciones de
    canales privados.
-   [ ] `/setup logs permissions` permite modificar permisos sin
    reconstruir canales.

### Integridad y recuperación

-   [ ] Ejecutar el setup varias veces no duplica categoría ni canales.
-   [ ] Los IDs quedan guardados y se utilizan para localizar recursos.
-   [ ] Se detectan cambios manuales relevantes.
-   [ ] La reparación muestra los cambios antes de aplicarlos.
-   [ ] Una reparación no sobrescribe excepciones manuales sin
    autorización.
-   [ ] Los fallos parciales se informan con precisión.

### Separación

-   [ ] Hoshiko normal y Hoshiko Security tienen categorías y setups
    independientes.
-   [ ] Los eventos de Security no se publican en los canales de Hoshiko
    normal.
-   [ ] La configuración de permisos de un producto no modifica la del
    otro.

------------------------------------------------------------------------

## 15. Decisiones pendientes antes de implementación

1.  **Acceso a `/case` y `/cases`:** definir qué roles pueden consultar
    los detalles y qué campos deben ocultarse según el nivel de acceso.
2.  **Política de retención:** definir si los registros tendrán
    retención ilimitada o limpieza automática y configurable.
3.  **Límites de contenido:** definir cómo truncar mensajes largos y
    cómo manejar adjuntos, embeds y contenido que Discord ya no permita
    recuperar.
4.  **Matriz inicial de Security:** definir si el modo predeterminado
    también será exclusivo para `Administrator` y cerrar los permisos
    personalizados de sus canales.
5.  **Eventos disponibles:** verificar en el código y en las capacidades
    actuales de Discord qué eventos puede registrar realmente cada
    módulo.

Estas decisiones no deben resolverse mediante supuestos durante la
implementación.

------------------------------------------------------------------------

## 16. Fuera de alcance

Esta especificación no autoriza:

-   Desplegar cambios en producción.
-   Reiniciar procesos PM2 o contenedores.
-   Modificar variables de entorno, tokens o infraestructura.
-   Migrar o eliminar datos existentes.
-   Implementar funciones de Security dentro de Hoshiko normal.
-   Cambiar la arquitectura general del repositorio sin una tarea
    específica.
-   Prometer detecciones o eventos que Discord o el código actual no
    proporcionen.

------------------------------------------------------------------------

## Resumen

Hoshiko tendrá un sistema de logs privado, guiado y configurable. El
setup advertirá primero que el modo predeterminado permite acceso
únicamente a usuarios con `Administrator`. Si la comunidad necesita una
distribución distinta, podrá elegir el modo personalizado y decidir qué
roles pueden ver cada canal, sin depender de nombres ni jerarquías
predefinidas.

Hoshiko normal utilizará una sola categoría con seis canales, incluido
un único `#message-log` para ediciones y eliminaciones. Hoshiko Security
mantendrá una categoría y un sistema de logs independientes. Los embeds
compartirán una identidad visual consistente, priorizarán la lectura
rápida y distinguirán detecciones, acciones y resultados reales.

**Este documento describe el diseño acordado. No certifica que estas
funciones estén implementadas.**
