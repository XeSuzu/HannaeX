import { LocalStorage } from './LocalStorage';

/**
 * Niveles de importancia para nuestro sistema de seguridad
 */
export enum LogLevel {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL'
}

/**
 * Estructura de cada entrada de log
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    context: string;     // Ejemplo: "Command/Strike" o "System/Shard"
    message: string;
    guildId?: string;    // Opcional: Para logs por servidor
    userId?: string;     // Opcional: Para saber quién inició la acción
    metadata?: any;      // Opcional: Errores técnicos o datos extra
}

export class HoshikoLogger {
    private static webhookUrl = process.env.LOGS_WEBHOOK_URL;

    /**
     * Registra una entrada de log: guarda localmente, muestra en consola y opcionalmente envía a Discord.
     */
    static async log(entry: Omit<LogEntry, 'timestamp'>) {
        const fullEntry: LogEntry = { ...entry, timestamp: new Date() };

        // Guardar localmente
        try {
            LocalStorage.save(fullEntry);
        } catch (e) {
            // No detener ejecución si falla el storage
            console.error('❌ LocalStorage.save fallo:', (e as Error).message || e);
        }

        // Mostrar en consola con color según nivel
        const colorMap: Record<LogLevel, string> = {
            [LogLevel.INFO]: '\x1b[36m',    // cyan
            [LogLevel.SUCCESS]: '\x1b[32m', // green
            [LogLevel.WARN]: '\x1b[33m',    // yellow
            [LogLevel.ERROR]: '\x1b[31m',   // red
            [LogLevel.FATAL]: '\x1b[35m'    // magenta
        };
        const color = colorMap[entry.level] || '\x1b[36m';
        console.log(`${color}[${fullEntry.timestamp.toISOString()}] [${entry.level}] [${entry.context}]: ${entry.message}\x1b[0m`);

        // Enviar a webhook de Discord para niveles importantes
        if (this.webhookUrl && (entry.level === LogLevel.FATAL || entry.level === LogLevel.ERROR || entry.level === LogLevel.SUCCESS)) {
            await this.sendToDiscord(fullEntry).catch(err => {
                console.error('❌ Falló envío de log a Discord:', err);
            });
        }
    }

    private static async sendToDiscord(entry: LogEntry) {
        if (!this.webhookUrl) return;

        // Evitar lanzar si fetch no existe (compatibilidad)
        const globalFetch = (globalThis as any).fetch;
        if (typeof globalFetch !== 'function') {
            // Node >=18 tiene fetch; si no está, intentar require('node-fetch') dinámicamente
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const nodeFetch = require('node-fetch');
                return await nodeFetch(this.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: `Hoshiko Log • ${entry.level}`,
                            description: entry.message,
                            color: entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL ? 0xFF4D4F : 0x57F287,
                            fields: [
                                { name: 'Contexto', value: entry.context, inline: true },
                                { name: 'Timestamp', value: entry.timestamp.toLocaleString(), inline: true },
                                ...(entry.guildId ? [{ name: 'Guild', value: entry.guildId, inline: true }] : []),
                                ...(entry.userId ? [{ name: 'User', value: entry.userId, inline: true }] : [])
                            ],
                            footer: { text: 'Hoshiko Security System' }
                        }]
                    })
                });
            } catch (e) {
                console.error('❌ No hay fetch disponible y node-fetch no está instalado:', e);
                return;
            }
        }

        // Usar fetch global
        await globalFetch(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: `Hoshiko Log • ${entry.level}`,
                    description: entry.message,
                    color: entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL ? 0xFF4D4F : 0x57F287,
                    fields: [
                        { name: 'Contexto', value: entry.context, inline: true },
                        { name: 'Timestamp', value: entry.timestamp.toLocaleString(), inline: true },
                        ...(entry.guildId ? [{ name: 'Guild', value: entry.guildId, inline: true }] : []),
                        ...(entry.userId ? [{ name: 'User', value: entry.userId, inline: true }] : [])
                    ],
                    footer: { text: 'Hoshiko Security System' }
                }]
            })
        });
    }
}