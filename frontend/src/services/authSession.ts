import { supabase } from "../lib/supabaseClient";

const AUTH_KEY = "aeroguide_is_authenticated";

/**
 * Check if the user is authenticated by verifying the Supabase session.
 * Falls back to localStorage flag for backward compatibility.
 */
export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === "1";
}

/**
 * Set the local authentication flag.
 * This is kept in sync with Supabase session state.
 */
export function setAuthenticated(value: boolean) {
  if (value) {
    localStorage.setItem(AUTH_KEY, "1");
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

/**
 * Get the current Supabase session (async).
 * Returns null if no active session.
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Refresh the local auth flag from the active Supabase session.
 */
export async function syncAuthenticatedState() {
  const session = await getSession();
  const isSignedIn = Boolean(session);

  setAuthenticated(isSignedIn);

  if (session?.user?.email) {
    localStorage.setItem("aeroguide_user_email", session.user.email);
  } else {
    localStorage.removeItem("aeroguide_user_email");
    localStorage.removeItem("aeroguide_user_profile");
  }

  return isSignedIn;
}

/**
 * Get the access token for API calls.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/**
 * Sign out from Supabase and clear local state.
 */
export async function signOut() {
  await supabase.auth.signOut();
  setAuthenticated(false);
  localStorage.removeItem("aeroguide_user_email");
  localStorage.removeItem("aeroguide_user_profile");
  localStorage.removeItem("aeroguide_remember_me");
}

/**
 * Listen for auth state changes and keep the localStorage flag in sync.
 */
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session) {
    setAuthenticated(true);
    if (session.user?.email) {
      localStorage.setItem("aeroguide_user_email", session.user.email);
    }
  } else if (event === "SIGNED_OUT") {
    setAuthenticated(false);
    localStorage.removeItem("aeroguide_user_email");
    localStorage.removeItem("aeroguide_user_profile");
  }
});

void syncAuthenticatedState();
