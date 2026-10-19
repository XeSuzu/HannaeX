# Preparación operacional: procesos y contenedores

Esta configuración prepara dos procesos posibles, `hoshiko-bot` y `hoshiko-worker`. No se ejecutaron comandos PM2 ni Docker durante esta preparación.

## PM2

`hoshiko-bot` ejecuta `dist/index.js` en `fork`, con una instancia y `NODE_ENV=production`. PM2 reinicia el proceso si termina inesperadamente. Los logs se separan en `/root/.pm2/logs/hoshiko-bot-out.log` y `/root/.pm2/logs/hoshiko-bot-error.log`.

`max_memory_restart` es una red de seguridad, no una solución para fugas. Ajusta el umbral después de medir el uso normal y diagnostica cualquier crecimiento sostenido.

El bot solo intenta Redis cuando `REDIS_ENABLED=true`, y lo hace en segundo plano sin esperar a que conecte; si Redis falta o cae, el arranque normal del bot continúa. El worker usa `dist/worker.js`, una instancia `fork`, logs propios y `WORKER_ENABLED=false` / `REDIS_ENABLED=false` en la declaración PM2. No lo arranques en el primer despliegue. `worker.ts` comprueba `WORKER_ENABLED` antes de importar o conectar infraestructura. Si se activa el worker, Redis es requisito para ese proceso: con Redis deshabilitado o degradado, no inicia queues y termina con código no exitoso. Las variables ya suministradas al proceso (por ejemplo, por PM2) prevalecen sobre `.env.production`; dotenv solo completa valores faltantes.

`Hoshiko-Staging` se conserva para no romper el flujo de staging existente; también queda en una instancia `fork`. No ejecutes staging y producción a la vez salvo que estén configurados con aplicaciones/credenciales Discord separadas y hayas validado cron jobs y cualquier otro efecto compartido.

Primer arranque, solo después del despliegue del artefacto compilado:

```sh
pm2 start ecosystem.config.js --only hoshiko-bot --update-env
pm2 status
pm2 logs hoshiko-bot
```

El worker permanece detenido mientras no se ejecute explícitamente:

```sh
pm2 start ecosystem.config.js --only hoshiko-worker --update-env
pm2 logs hoshiko-worker
```

No uses `pm2 start ecosystem.config.js` sin `--only`: iniciaría también las aplicaciones declaradas que no quieras activar. Para mantener el worker parado en una máquina donde ya se inició, el comando manual es `pm2 stop hoshiko-worker`.

Los scripts `start:prod` y `logs:prod` apuntan ahora a `hoshiko-bot`; `start:staging` conserva el nombre de staging existente.

## Docker

El Dockerfile existente conserva `CMD ["npm", "start"]`, que ejecuta el bot. `.dockerignore` excluye `.env` y `.env.*`; pasa la configuración en tiempo de ejecución con el mecanismo de secretos del entorno, nunca copiando credenciales a la imagen.

El archivo de entorno debe establecer `NODE_ENV=production` y contener los valores requeridos por la aplicación. Ejemplos manuales, no ejecutados:

```sh
docker build -t hoshiko:release .
docker run --name hoshiko-bot --env-file /ruta/protegida/production.env \
  -e NODE_ENV=production hoshiko:release
```

La misma imagen compila `dist/worker.js`; un contenedor de worker sustituye el `CMD` de la imagen:

```sh
docker run --name hoshiko-worker --env-file /ruta/protegida/production.env \
  -e NODE_ENV=production -e WORKER_ENABLED=false -e REDIS_ENABLED=false \
  hoshiko:release node dist/worker.js
```

No crees ni inicies el contenedor worker en el primer despliegue. Si más adelante lo inicias en modo disabled/idle, recuerda que el entry point comprueba `WORKER_ENABLED` antes de conectar Mongo. No se añade Compose: en este despliegue no aporta valor operativo inmediato ni sustituye los servicios gestionados de producción.
