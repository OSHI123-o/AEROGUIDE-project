import { getSupabaseAdmin } from "../config/supabase.js";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  preferred_lang: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Get a user profile by their auth user ID.
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Update a user profile.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "first_name" | "last_name" | "phone" | "nationality" | "preferred_lang" | "avatar_url">>
): Promise<Profile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Get a profile by email.
 */
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data as Profile;
}
