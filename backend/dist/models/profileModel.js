import { getSupabaseAdmin } from "../config/supabase.js";
/**
 * Get a user profile by their auth user ID.
 */
export async function getProfileById(userId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    if (error || !data)
        return null;
    return data;
}
/**
 * Update a user profile.
 */
export async function updateProfile(userId, updates) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();
    if (error || !data)
        return null;
    return data;
}
/**
 * Get a profile by email.
 */
export async function getProfileByEmail(email) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();
    if (error || !data)
        return null;
    return data;
}
