import pino from "pino";
import { createApp } from "./app.js";
import { getEnvConfig } from "./config/env.js";

const env = getEnvConfig();
const logger = pino({ level: env.logLevel });
const app = createApp(logger);

app.listen(env.port, () => {
  // Add clear, human-readable startup messages
  console.log(`\n🚀 Backend successfully started and listening on port ${env.port}`);
  console.log(`✅ Data Source: ${env.useSupabase ? 'Supabase Database' : 'In-Memory Mode'}`);
  console.log(`✅ Ready to accept requests!\n`);

  // Structured log for tools like Datadog/CloudWatch
  logger.info({ port: env.port }, "Backend listening");
});
