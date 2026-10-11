import { AppConfig } from "../../config/AppConfig";

export function buildRedisKey(scope: string, key: string): string {
  const environment = AppConfig.get().NODE_ENV;
  return `hannaex:${environment}:${scope}:${key}`;
}
