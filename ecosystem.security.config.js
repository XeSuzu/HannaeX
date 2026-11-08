/**
 * @file ecosystem.security.config.js
 * @description PM2 configuration file specifically for Hoshiko-Security.
 * Prepared for independent manual activation upon explicit authorization.
 * 
 * IMPORTANT: DO NOT START AUTOMATICALLY.
 * Activation command (when authorized):
 *   pm2 start ecosystem.security.config.js --only Hoshiko-Security
 */

const path = require("path");

module.exports = {
  apps: [
    {
      name: "Hoshiko-Security",
      script: "./dist/index.js",
      cwd: path.resolve(__dirname, "apps/hoshiko-security"),
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 10000,
      out_file: "/home/hanna/.pm2/logs/hoshiko-security-out.log",
      error_file: "/home/hanna/.pm2/logs/hoshiko-security-error.log",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        SECURITY_PORT: 8082,
        SECURITY_HEALTH_HOST: "127.0.0.1",
      },
    },
  ],
};
