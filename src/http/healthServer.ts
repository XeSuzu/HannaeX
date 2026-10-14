import express, { type Request, type Response } from "express";
import type { Server } from "node:http";
import { AppConfig } from "../App/config/AppConfig";
import { HealthService } from "../App/health/HealthService";
import { RedisHealthService } from "../App/infrastructure/redis/RedisHealthService";
import { getMongoStatus } from "../Services/mongo";

export function createHealthServer(
  discordReadyChecker: () => boolean = () => true,
) {
  const app = express();
  const port = AppConfig.get().PORT;
  let server: Server | null = null;
  let closePromise: Promise<void> | null = null;

  app.get("/", (_req: Request, res: Response) => {
    res.send("Hoshiko Bot is running perfectly");
  });

  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.get("/healthz/live", (_req: Request, res: Response) => {
    res.json(HealthService.getLive());
  });

  app.get("/healthz/ready", (_req: Request, res: Response) => {
    const mongoStatus = getMongoStatus();
    const readyState = HealthService.getReadyState(
      mongoStatus,
      discordReadyChecker(),
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

  app.get("/healthz/details", (req: Request, res: Response) => {
    const token = AppConfig.get().HEALTH_DETAILS_TOKEN;
    const authorizationHeader = req.headers.authorization ?? "";
    const expected = token ? `Bearer ${token}` : "";

    if (!token || authorizationHeader !== expected) {
      return res.status(404).json({ status: "not_found" });
    }

    return res.json(HealthService.getDetails(discordReadyChecker()));
  });

  return {
    start(): Server {
      if (server?.listening) {
        return server;
      }

      server = app.listen(port, () => {
        console.log(`[Health] health server active on port ${port}`);
      });
      return server;
    },
    close(): Promise<void> {
      if (closePromise) {
        return closePromise;
      }

      const activeServer = server;
      if (!activeServer?.listening) {
        server = null;
        return Promise.resolve();
      }

      closePromise = new Promise<void>((resolve, reject) => {
        activeServer.close((error?: Error) => {
          const code = (error as NodeJS.ErrnoException | undefined)?.code;
          if (error && code !== "ERR_SERVER_NOT_RUNNING") {
            reject(error);
            return;
          }

          resolve();
        });
      }).finally(() => {
        if (server === activeServer) {
          server = null;
        }
        closePromise = null;
      });

      return closePromise;
    },
  };
}
