# Redis en Ubuntu / Oracle VM

Guía para revisión y ejecución manual. No se ejecutaron comandos de sistema ni se instaló Redis durante esta preparación. Redis sigue siendo opcional para el bot actual.

## 1. Identificar Ubuntu e instalar

Primero comprueba la versión de la VM y la versión que ofrece el repositorio configurado:

```sh
cat /etc/os-release
apt-cache policy redis-server
```

En Ubuntu con el paquete disponible, instala desde los repositorios de esa versión:

```sh
sudo apt update
sudo apt install redis-server
redis-server --version
```

BullMQ requiere una versión Redis compatible (usa Redis 6.2 o posterior como mínimo operativo). Si el paquete de la versión de Ubuntu es anterior, detente: consulta el repositorio oficial de Redis para esa versión de Ubuntu o actualiza Ubuntu antes de habilitar BullMQ. No añadas repositorios de terceros sin revisar su mantenimiento y firma.

## 2. Servicio y escucha local

Comprueba versión, servicio y sockets antes de habilitar Redis para la aplicación:

```sh
redis-server --version
sudo systemctl status redis-server --no-pager
sudo ss -ltnp | grep ':6379'
```

Edita la configuración instalada por el paquete, habitualmente `/etc/redis/redis.conf`:

```sh
sudoedit /etc/redis/redis.conf
```

Confirma que la configuración efectiva incluya una escucha solo local y modo protegido:

```conf
bind 127.0.0.1 ::1
protected-mode yes
port 6379
```

No uses `bind 0.0.0.0`, no abras 6379 en UFW ni en las reglas de red de Oracle Cloud. Comprueba las reglas actuales; no agregues una regla de entrada para Redis:

```sh
sudo ufw status verbose
```

Después de configurar autenticación, puedes habilitar el servicio:

```sh
sudo systemctl enable --now redis-server
sudo systemctl status redis-server --no-pager
```

## 3. ACL y comandos peligrosos

Prefiere ACL (Redis 6+) a una contraseña compartida del usuario `default`. Genera una contraseña larga en la VM y guárdala en el almacén seguro que uses para secretos:

```sh
openssl rand -hex 32
```

No pegues el resultado en documentación, tickets, historial de shell ni logs. Crea un archivo ACL legible solo por root y el usuario/grupo del servicio Redis; usa un editor que no registre el secreto en el historial:

```sh
sudo install -o root -g redis -m 0640 /dev/null /etc/redis/users.acl
sudoedit /etc/redis/users.acl
```

Contenido de referencia. Sustituye el marcador localmente por la contraseña generada; nunca guardes el marcador ni una contraseña real en este repositorio:

```conf
user default off
user hoshiko on >REEMPLAZAR_LOCALMENTE ~bull:* &bull:* +@all -@dangerous
```

En `/etc/redis/redis.conf`, configura el ACL file:

```conf
aclfile /etc/redis/users.acl
```

`-@dangerous` bloquea comandos administrativos/destructivos de esa categoría, incluidos comandos como `FLUSHALL`, `FLUSHDB`, `CONFIG`, `DEBUG` y `SHUTDOWN` según la versión. BullMQ usa scripts Lua; no bloquees `EVAL`/`EVALSHA` ni renombres comandos sin validar la compatibilidad de la versión de BullMQ y Redis. Las ACL de referencia conceden comandos no peligrosos y restringen claves/canales al prefijo `bull`; si se personaliza el prefijo de BullMQ, actualiza ambos patrones y prueba todas las operaciones antes de producción.

Reinicia Redis tras editar configuración y valida el estado antes de continuar:

```sh
sudo systemctl restart redis-server
sudo systemctl status redis-server --no-pager
```

## 4. Persistencia futura para jobs

RDB guarda snapshots puntuales; AOF registra las escrituras para una recuperación más reciente. Para una futura cola BullMQ, conserva snapshots RDB y habilita AOF con sincronización cada segundo:

```conf
appendonly yes
appendfsync everysec
```

Esto reduce la pérdida probable ante una caída a aproximadamente el intervalo de fsync, pero no equivale a cero pérdida ni reemplaza backups. AOF y snapshots consumen disco adicional; AOF puede necesitar espacio temporal adicional durante reescrituras. Mide el tamaño real de los datos, supervisa espacio libre/inodos y define retención/backup antes de guardar jobs de negocio.

## 5. Memoria

Define `maxmemory` según RAM disponible, carga medida y margen para el sistema operativo, buffers y persistencia. `256mb` puede servir como valor inicial de laboratorio en una VM pequeña, no es un valor universal:

```conf
maxmemory 256mb
maxmemory-policy noeviction
```

`noeviction` es la política compatible con BullMQ: Redis no debe descartar silenciosamente jobs por presión de memoria; en su lugar una escritura puede fallar y debe ser observada por la aplicación. Planifica alertas y capacidad antes de acercarte al límite. No uses `allkeys-lru` para una instancia que conserva jobs BullMQ. Tampoco mezcles jobs durables y caché descartable en la misma instancia sin separar límites, claves, alertas y política de retención; lo preferible es separarlas.

## 6. Credenciales y conexión

Guarda `REDIS_URL`/credenciales en el gestor de secretos de la VM o en un archivo de entorno fuera del repositorio, con permisos restringidos al usuario del proceso. Una forma de URL para la aplicación es `redis://usuario:contraseña@127.0.0.1:6379`; usa una contraseña hex generada como arriba para evitar caracteres que requieran escape en la URL. No incluyas `.env.production` en la imagen ni imprimas la URL completa en logs. Si se comparte información diagnóstica, redacta usuario y contraseña.

## 7. Pruebas manuales

Autentica sin incluir la contraseña en los argumentos del proceso; `redis-cli` la solicitará:

```sh
redis-cli -h 127.0.0.1 -p 6379 --user hoshiko --askpass PING
sudo ss -ltnp | grep ':6379'
sudo systemctl status redis-server --no-pager
```

El primer comando debe responder `PONG`. Verifica que `ss` muestre solo `127.0.0.1:6379` y, si se habilitó IPv6 local, `[::1]:6379`, nunca `0.0.0.0:6379` ni una IP pública. La prueba desde la VM es deliberadamente local; no abras el puerto para probar desde Internet.

Luego prueba la aplicación con `REDIS_ENABLED=false`, y después con Redis activo y `REDIS_ENABLED=true`. Revisa `/healthz/ready` y los detalles de salud autorizados sin exponer credenciales ni `REDIS_URL`.

## 8. Estados de salud y readiness

`/healthz/ready` no requiere Redis. La readiness actual del bot depende de su configuración crítica, Mongo conectado y Discord listo.

```text
Redis disabled:
- REDIS_ENABLED=false
- bot sano
- worker opcional no usa queues

Redis optional-ready:
- REDIS_ENABLED=true
- Redis conectado
- ninguna feature de negocio depende de él todavía

Redis degraded:
- REDIS_ENABLED=true
- Redis no conecta
- bot actual sigue listo si Mongo y Discord están listos

Redis required:
- estado futuro, solamente cuando una feature crítica se migre
- en ese momento se revisará readiness por feature
```

## 9. Checklist antes de `REDIS_ENABLED=true`

- [ ] Redis está protegido, en bind local, con protected mode y ACL.
- [ ] El secreto se guardó en un almacén protegido y no aparece en logs.
- [ ] Redis responde localmente con autenticación.
- [ ] Se probó la health del bot; `/healthz/ready` no depende de Redis.
- [ ] Se probó el bot con Redis apagado.
- [ ] El worker sigue idle/detenido y no hay processors de negocio.

## 10. Checklist antes de que una feature use BullMQ

- [ ] Cola definida y propiedad/responsable claros.
- [ ] Payload versionado y validado.
- [ ] Idempotency key estable para evitar efectos duplicados.
- [ ] Retries y backoff definidos para errores transitorios.
- [ ] Timeout y límites de recursos definidos.
- [ ] Concurrencia configurada y probada.
- [ ] Estrategia dead-letter y reproceso documentada.
- [ ] Métricas, logs y alertas para cola, fallos y antigüedad de jobs.
- [ ] Comportamiento explícito si Redis cae, incluyendo qué operaciones fallan o se posponen.

## 11. Reversión

Para detener Redis sin borrar los datos:

```sh
sudo systemctl stop redis-server
sudo systemctl disable redis-server
sudo systemctl status redis-server --no-pager
```

Para desinstalar de forma controlada, confirma primero backups y ubicación de datos. `remove` conserva configuración/datos locales en muchos casos; revisa qué conservar antes de purgar o borrar directorios:

```sh
sudo apt remove redis-server
apt-cache policy redis-server
```

No ejecutes `purge`, `autoremove` ni borres `/var/lib/redis` hasta verificar que ya no se necesitan los datos y que existe un backup restaurable.
