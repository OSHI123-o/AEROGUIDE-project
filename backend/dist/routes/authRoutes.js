import { Router } from "express";
import { signup, login, logout, getMe } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
const authRoutes = Router();
// Public routes (no auth required)
authRoutes.post("/auth/signup", signup);
authRoutes.post("/auth/login", login);
authRoutes.post("/auth/logout", logout);
// Protected routes (requires valid JWT)
authRoutes.get("/auth/me", requireAuth, getMe);
export default authRoutes;
