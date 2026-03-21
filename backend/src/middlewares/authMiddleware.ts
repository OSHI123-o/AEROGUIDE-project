import type { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin } from "../config/supabase.js";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
};

/**
 * Middleware that validates the Supabase JWT from the Authorization header.
 * On success, attaches `req.user` with `{ id, email }`.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);

  try {
    const supabase = getSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    return res.status(500).json({ message: "Authentication service error" });
  }
}
