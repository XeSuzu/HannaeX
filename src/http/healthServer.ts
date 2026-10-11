import express, { type Request, type Response } from "express";
import { AppConfig } from "../App/config/AppConfig";
import { HealthService } from "../App/health/HealthService";
import { getMongoStatus } from "../Services/mongo";

export function createHealthServer(
  discordReadyChecker: () => boolean = () => true,
) {
  const app = express();
  const port = AppConfig.get().PORT;

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
      redis: { optional: true, state: "disabled" },
    });
  });

  app.get("/healthz/details", (req: Request, res: Response) => {
    const token = AppConfig.get().HEALTH_DETAILS_TOKEN;
    const authorizationHeader = req.headers.authorization ?? "";
    const expected = token ? `Bearer ${token}` : "";

    if (!token || authorizationHeader !== expected) {
      return res.status(404).json({ status: "not_found" });
    }

    return res.json(HealthService.getDetails());
  });

  return () => {
    app.listen(port, () => {
      console.log(`[Health] health server active on port ${port}`);
    });
  };
}
