import express, { Request, Response } from "express";
import { HoshikoLogger, LogLevel } from "../Security";

export function createHealthServer() {
  const app = express();
  const port = process.env.PORT || 8080;

  app.get("/", (_req: Request, res: Response) => {
    res.send("Hoshiko Bot is running perfectly");
  });

  app.get("/healthz", (_req: Request, res: Response) => {
    res.send("ok");
  });

  return () => {
    app.listen(port, () => {
      HoshikoLogger.log({
        level: LogLevel.INFO,
        context: "System/Web",
        message: `Health server active on port ${port}`,
      });
    });
  };
}
