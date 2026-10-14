import express, { type Request, type Response } from "express";
import type { Server } from "node:http";
import { getMongoStatus } from "../../Services/mongo";
import { AppConfig } from "../config/AppConfig";
import { HealthService } from "../health/HealthService";
import { RedisHealthService } from "../infrastructure/redis/RedisHealthService";

export class HealthServer {
  private readonly app = express();
  private readonly port: number;
  private readonly discordReadyChecker: () => boolean;
  private server: Server | null = null;
  private closePromise: Promise<void> | null = null;

  constructor(discordReadyChecker: () => boolean = () => true) {
    this.port = AppConfig.get().PORT;
    this.discordReadyChecker = discordReadyChecker;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.app.get("/", (_req: Request, res: Response) => {
      res.send("Hoshiko Bot is running perfectly");
    });

    this.app.get("/healthz", (_req: Request, res: Response) => {
      res.json({ status: "ok" });
    });

    this.app.get("/healthz/live", (_req: Request, res: Response) => {
      res.json(HealthService.getLive());
    });

    this.app.get("/healthz/ready", (_req: Request, res: Response) => {
      const mongoStatus = getMongoStatus();
      const readyState = HealthService.getReadyState(
        mongoStatus,
        this.discordReadyChecker(),
      );

      res.status(readyState.status === "ok" ? 200 : 503).json({
        status: readyState.status,
        details: readyState.details,
        mongo: { status: mongoStatus },
        redis: {
          optional: true,
          state: RedisHealthService.getStatus().state,
        },
      });
    });

    this.app.get("/healthz/details", (req: Request, res: Response) => {
      const token = AppConfig.get().HEALTH_DETAILS_TOKEN;
      const authorization = req.headers.authorization ?? "";
      const expected = token ? `Bearer ${token}` : "";

      if (!token || authorization !== expected) {
        return res.status(404).json({ status: "not_found" });
      }

      return res.json(HealthService.getDetails(this.discordReadyChecker()));
    });
  }

  start(): Server {
    if (this.server?.listening) {
      return this.server;
    }

    this.server = this.app.listen(this.port, () => {
      console.log(`[Health] health server active on port ${this.port}`);
    });
    return this.server;
  }

  close(): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }

    const activeServer = this.server;
    if (!activeServer?.listening) {
      this.server = null;
      return Promise.resolve();
    }

    this.closePromise = new Promise<void>((resolve, reject) => {
      activeServer.close((error?: Error) => {
        const code = (error as NodeJS.ErrnoException | undefined)?.code;
        if (error && code !== "ERR_SERVER_NOT_RUNNING") {
          reject(error);
          return;
        }

        resolve();
      });
    }).finally(() => {
      if (this.server === activeServer) {
        this.server = null;
      }
      this.closePromise = null;
    });

    return this.closePromise;
  }
}
