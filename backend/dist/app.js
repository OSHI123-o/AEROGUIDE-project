import cors from "cors";
import express from "express";
import helmet from "helmet";
import { requestLogger } from "./middlewares/requestLogger.js";
import { notFound } from "./middlewares/notFound.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import { getEnvConfig } from "./config/env.js";
export function createApp(logger) {
    const app = express();
    const env = getEnvConfig();
    app.use(cors({
        origin: (origin, cb) => {
            // Allow curl / server-to-server calls (no origin)
            if (!origin)
                return cb(null, true);
            // Allow any localhost dev port
            if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
                return cb(null, true);
            return cb(new Error("Not allowed by CORS"));
        },
        credentials: true,
    }));
    app.use(helmet());
    app.use(express.json({ limit: "64kb" }));
    app.use(requestLogger(logger));
    app.get("/api/health", (_req, res) => {
        res.json({
            ok: true,
            service: "aeroguide-backend",
            dataSource: env.useSupabase ? "supabase" : "in-memory",
        });
    });
    app.use("/api", bookingRoutes);
    app.use(notFound);
    return app;
}
