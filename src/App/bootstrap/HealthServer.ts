import express, { type Request, type Response } from "express";
import { getMongoStatus } from "../../Services/mongo";
import { AppConfig } from "../config/AppConfig";
import { HealthService } from "../health/HealthService";

export class HealthServer {
  private readonly app = express();
  private readonly port: number;
  private readonly discordReadyChecker: () => boolean;

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
        redis: { optional: true, state: "disabled" },
      });
    });

    this.app.get("/healthz/details", (req: Request, res: Response) => {
      const token = AppConfig.get().HEALTH_DETAILS_TOKEN;
      const authorization = req.headers.authorization ?? "";
      const expected = token ? `Bearer ${token}` : "";

      if (!token || authorization !== expected) {
        return res.status(404).json({ status: "not_found" });
      }

      return res.json(HealthService.getDetails());
    });
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`[Health] health server active on port ${this.port}`);
    });
  }
}
