import os from "os";

export interface SystemStats {
  ramUsage: string;
  uptime: string;
  cpuLoad: string;
}

export class PerformanceMonitor {
  /**
   * Obtiene las estadísticas actuales del sistema
   */
  static getSystemStats(): SystemStats {
    // Uso de memoria del proceso en MB
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    // Tiempo activo del bot
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    return {
      ramUsage: `${memoryUsage.toFixed(2)} MB`,
      uptime: `${hours}h ${minutes}m`,
      cpuLoad: `${os.loadavg()[0].toFixed(2)}%`,
    };
  }
}
