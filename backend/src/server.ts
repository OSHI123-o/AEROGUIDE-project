import pino from "pino";
import { createApp } from "./app.js";
import { getEnvConfig } from "./config/env.js";

const env = getEnvConfig();
const logger = pino({ level: env.logLevel });
const app = createApp(logger);

app.listen(env.port, () => {
  logger.info({ port: env.port }, "Backend listening");
});

