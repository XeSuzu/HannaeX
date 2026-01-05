import os from 'os';

export class PerformanceMonitor {
  static getSystemStats() {
    const mem = process.memoryUsage();
    const ramUsage = `${Math.round((mem.rss / 1024 / 1024) * 100) / 100} MB`;
    const loads = os.loadavg();
    const cpuLoad = `${Math.round((loads[0] || 0) * 100) / 100}`;
    const uptimeSeconds = Math.floor(process.uptime());
    const uptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`;
    return {
      ramUsage,
      cpuLoad,
      uptime
    };
  }
}
