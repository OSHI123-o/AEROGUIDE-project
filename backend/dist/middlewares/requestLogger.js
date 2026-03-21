import pinoHttp from "pino-http";
export function requestLogger(logger) {
    return pinoHttp({ logger: logger });
}
