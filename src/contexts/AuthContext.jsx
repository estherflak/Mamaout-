import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [authLoading, setAuthLoading]     = useState(isConfigured);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  async function fetchProfile(userId) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data;
  }

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setProfile(await fetchProfile(session.user.id));
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session.user);
        setNeedsPasswordReset(true);
        setAuthLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        setProfile(await fetchProfile(session.user.id));
      } else {
        setUser(null);
        setProfile(null);
        setNeedsPasswordReset(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function refreshProfile() {
    if (!user) return;
    setProfile(await fetchProfile(user.id));
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, authLoading, needsPasswordReset, setNeedsPasswordReset, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
