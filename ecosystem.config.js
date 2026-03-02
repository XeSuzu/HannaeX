/**
 * @file ecosystem.config.js
 * @description PM2 configuration file.
 * @see {@link https://pm2.keymetrics.io/docs/usage/application-declaration/}
 */
module.exports = {
  apps: [
    {
      // -----------------
      // STAGING
      // -----------------
      // Entorno de pruebas que simula producción.
      // Se ejecuta en modo 'fork' (un solo proceso).
      // npm run start:staging
      // -----------------
      name: 'Hoshiko-Staging',
      script: 'dist/index.js',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'staging',
      },
    },
    {
      // -----------------
      // PRODUCTION
      // -----------------
      // Entorno real para usuarios globales.
      // Se ejecuta en modo 'cluster' para usar todos los núcleos del CPU.
      // npm run start:prod
      // -----------------
      name: 'Hoshiko-Production',
      script: 'dist/index.js',
      exec_mode: 'fork',   // ← cambiar
      instances: 1,        // ← cambiar
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};