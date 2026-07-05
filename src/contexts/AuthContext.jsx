import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [profileError, setProfileError]   = useState(false);
  const [authLoading, setAuthLoading]     = useState(isConfigured);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  // Returns { data, error }. We distinguish "no profile row yet" (data null, no
  // error → genuinely new user, send to onboarding) from "fetch failed" (error
  // set → network/RLS issue, do NOT force an existing user back through onboarding).
  async function fetchProfile(userId) {
    if (!supabase) return { data: null, error: null };
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
  }

  async function loadProfile(userId) {
    const { data, error } = await fetchProfile(userId);
    setProfile(data);
    setProfileError(!!error);
  }

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }

    // Failsafe: show app after 4s even if Supabase is unreachable
    const timeout = setTimeout(() => setAuthLoading(false), 4000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      // Sign out if this was a session-only login (no "remember me") and the session
      // storage was cleared (browser was closed and reopened).
      if (
        session?.user &&
        localStorage.getItem('mamaout_was_session_only') === '1' &&
        !sessionStorage.getItem('mamaout_session_only')
      ) {
        localStorage.removeItem('mamaout_was_session_only');
        await supabase.auth.signOut();
        setAuthLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session.user);
        setNeedsPasswordReset(true);
        setAuthLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        // IMPORTANT: never await supabase queries inside this callback —
        // supabase-js holds its auth lock while it runs, and a query that
        // needs the session token deadlocks the whole client (symptom:
        // saves hang forever until the page is refreshed). Defer instead.
        setTimeout(() => loadProfile(session.user.id), 0);
      } else {
        setUser(null);
        setProfile(null);
        setProfileError(false);
        setNeedsPasswordReset(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function refreshProfile() {
    if (!user) return;
    await loadProfile(user.id);
  }

  // Merge a patch into the local profile immediately, without waiting for a
  // re-fetch. Lets flows like onboarding navigate as soon as their write
  // succeeds instead of hanging on a round-trip.
  function patchProfile(patch) {
    setProfile(p => ({ ...(p || {}), ...patch }));
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileError(false);
  }

  return (
    <AuthContext.Provider value={{ user, profile, profileError, authLoading, needsPasswordReset, setNeedsPasswordReset, refreshProfile, patchProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
