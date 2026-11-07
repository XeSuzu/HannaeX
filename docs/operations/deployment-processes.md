# Preparación operacional: procesos PM2

Esta configuración prepara los procesos gestionados por PM2 para el despliegue en la máquina virtual.

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

`hoshiko-security` permanece detenido y preparado (`autorestart: false`) con sus logs en `/root/.pm2/logs/hoshiko-security-*.log`:

```sh
pm2 start ecosystem.config.js --only hoshiko-security --update-env
pm2 logs hoshiko-security
pm2 stop hoshiko-security
```

O mediante los scripts de npm:

```sh
npm run start:security:prod
npm run logs:security
npm run stop:security
```

No uses `pm2 start ecosystem.config.js` sin `--only`: iniciaría también las aplicaciones declaradas que no quieras activar. Para mantener el worker o security parados en una máquina donde ya se iniciaron, el comando manual es `pm2 stop <nombre>`.

Los scripts `start:prod` y `logs:prod` apuntan ahora a `hoshiko-bot`; `start:staging` conserva el nombre de staging existente.
