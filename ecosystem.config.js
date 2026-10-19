/**
 * @file ecosystem.config.js
 * @description PM2 configuration file.
 * @see {@link https://pm2.keymetrics.io/docs/usage/application-declaration/}
 */
module.exports = {
  apps: [
    {
      name: "Hoshiko-Staging",
      script: "./dist/index.js",
      cwd: "/root/HannaeX",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "staging",
      },
    },
    {
      name: "hoshiko-bot",
      script: "./dist/index.js",
      cwd: "/root/HannaeX",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      out_file: "/root/.pm2/logs/hoshiko-bot-out.log",
      error_file: "/root/.pm2/logs/hoshiko-bot-error.log",
      // Safety net only; investigate memory growth instead of treating restarts as a leak fix.
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "hoshiko-worker",
      script: "./dist/worker.js",
      cwd: "/root/HannaeX",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: false,
      out_file: "/root/.pm2/logs/hoshiko-worker-out.log",
      error_file: "/root/.pm2/logs/hoshiko-worker-error.log",
      // Safety net only; investigate memory growth instead of treating restarts as a leak fix.
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        WORKER_ENABLED: "false",
        REDIS_ENABLED: "false",
      },
    },
  ],
};
