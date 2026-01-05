import fs from 'fs';
import path from 'path';
import { LogEntry } from './HoshikoLogger';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'hoshiko-logs.jsonl');

export class LocalStorage {
  static save(entry: LogEntry) {
    try {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
      const line = JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        context: entry.context,
        message: entry.message,
        guildId: entry.guildId ?? null,
        userId: entry.userId ?? null,
        metadata: entry.metadata ?? null
      });
      fs.appendFileSync(LOG_FILE, line + '\n', { encoding: 'utf8' });
    } catch (err) {
      // No lanzar: el logger no debe romper la app
      // eslint-disable-next-line no-console
      console.error('LocalStorage.save falló:', (err as Error).message || err);
    }
  }
}