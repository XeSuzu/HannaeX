import os from "os";

export class PerformanceMonitor {
  /**
   * Obtiene estadísticas detalladas de salud del sistema y del proceso.
   */
  static getSystemStats() {
    const mem = process.memoryUsage();

    // rss: Memoria total asignada al proceso por el sistema operativo
    // heapUsed: Memoria que los objetos de tu código están ocupando realmente
    const ramUsage = `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`;
    const ramAllocated = `${(mem.rss / 1024 / 1024).toFixed(2)} MB`;

    // Carga de CPU (Promedio de 1 minuto)
    const loads = os.loadavg();
    const cpuLoad = `${(loads[0] || 0).toFixed(2)}%`;

    // Formato de tiempo mejorado (Días, Horas, Minutos, Segundos)
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    const uptime = `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`;

    return {
      ramUsage, // Uso real de JS
      ramAllocated, // Reserva del Sistema
      cpuLoad, // Carga de CPU
      uptime, // Tiempo legible
      platform: `${os.type()} ${os.arch()}`, // Sistema Operativo
      nodeVersion: process.version, // Versión de Node
    };
  }
}
