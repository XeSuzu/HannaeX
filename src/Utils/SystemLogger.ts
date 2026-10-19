import { CommandLogger } from "./SystemLogger/CommandLogger";
import { SayLogger } from "./SystemLogger/SayLogger";
import { SecurityLogger } from "./SystemLogger/SecurityLogger";
import { SystemEventLogger } from "./SystemLogger/SystemEventLogger";

export const Logger = {
  ...SayLogger,
  ...CommandLogger,
  ...SystemEventLogger,
  ...SecurityLogger,
};
