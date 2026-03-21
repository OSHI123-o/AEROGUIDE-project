import type { Logger } from "pino";
import pinoHttp from "pino-http";

export function requestLogger(logger: Logger) {
  return pinoHttp({ logger: logger as any });
}
