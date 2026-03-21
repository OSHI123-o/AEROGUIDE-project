import type { Request, Response } from "express";
import { z } from "zod";
import { getSupabaseAdmin } from "../config/supabase.js";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

// ── Validation schemas ────────────────────────────────────────

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── Signup ─────────────────────────────────────────────────────

export async function signup(req: Request, res: Response) {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }

  const { email, password, firstName, lastName } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
      user_metadata: {
        first_name: firstName,
        last_name: lastName.toUpperCase(),
      },
    });

    if (error) {
      const status = error.message?.includes("already been registered") ? 409 : 400;
      return res.status(status).json({ message: error.message });
    }

    // Also sign the user in so they get a session immediately
    const { data: session, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      // User was created but auto-login failed — still success
      return res.status(201).json({
        message: "Account created. Please sign in.",
        user: { id: data.user?.id, email: data.user?.email },
      });
    }

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: data.user?.id,
        email: data.user?.email,
        firstName,
        lastName: lastName.toUpperCase(),
      },
      session: {
        access_token: session.session?.access_token,
        refresh_token: session.session?.refresh_token,
        expires_at: session.session?.expires_at,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Signup failed",
      details: err instanceof Error ? err.message : "Unexpected error",
    });
  }
}

// ── Login ──────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }

  const { email, password } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Fetch the user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, preferred_lang, avatar_url")
      .eq("id", data.user.id)
      .single();

    return res.json({
      message: "Login successful",
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        preferredLang: profile?.preferred_lang || "EN",
        avatarUrl: profile?.avatar_url || null,
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Login failed",
      details: err instanceof Error ? err.message : "Unexpected error",
    });
  }
}

// ── Logout ─────────────────────────────────────────────────────

export async function logout(_req: Request, res: Response) {
  // Stateless JWT — client just needs to discard the token.
  // This endpoint exists so the frontend has a consistent API.
  return res.json({ message: "Logged out successfully" });
}

// ── Get current user profile ───────────────────────────────────

export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json({
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        nationality: profile.nationality,
        preferredLang: profile.preferred_lang,
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch profile",
      details: err instanceof Error ? err.message : "Unexpected error",
    });
  }
}
