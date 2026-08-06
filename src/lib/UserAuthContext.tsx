import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { signInUser } from './api';
import type { Session } from '@supabase/supabase-js';

interface UserAuthValue {
  username: string | null;
  registrationId: string | null;
  session: Session | null;
  loading: boolean;
  isPending: boolean;
  signInWithCredentials: (username: string, password: string) => Promise<{ ok: boolean; error?: string; status?: string }>;
  signOut: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthValue | undefined>(undefined);

const USERNAME_KEY = 'betpro_username';
const REG_ID_KEY = 'betpro_registration_id';
const PENDING_KEY = 'betpro_is_pending';

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    // On mount: restore session (Supabase persists it in localStorage automatically)
    // then derive username from localStorage or fall back to nothing.
    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session;
      setSession(sess);

      if (sess) {
        const stored = localStorage.getItem(USERNAME_KEY);
        if (stored) setUsername(stored);
        const storedRegId = localStorage.getItem(REG_ID_KEY);
        if (storedRegId) setRegistrationId(storedRegId);
        setIsPending(localStorage.getItem(PENDING_KEY) === 'true');
      } else {
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(REG_ID_KEY);
        localStorage.removeItem(PENDING_KEY);
        setUsername(null);
        setRegistrationId(null);
        setIsPending(false);
      }

      setLoading(false);
    });

    // Listen for auth state changes (token refresh, sign-out from another tab, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) {
        setUsername(null);
        setRegistrationId(null);
        setIsPending(false);
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(REG_ID_KEY);
        localStorage.removeItem(PENDING_KEY);
      } else {
        const stored = localStorage.getItem(USERNAME_KEY);
        if (stored) setUsername(stored);
        const storedRegId = localStorage.getItem(REG_ID_KEY);
        if (storedRegId) setRegistrationId(storedRegId);
        setIsPending(localStorage.getItem(PENDING_KEY) === 'true');
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithCredentials = async (uname: string, password: string) => {
    const result = await signInUser(uname, password);
    if (!result.ok || !result.session) {
      return { ok: false, error: result.error, status: result.status };
    }
    // Persist the session in the Supabase client (writes to localStorage automatically
    // because persistSession: true is set in supabase.ts)
    const { error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    // Always store the canonical username returned by the server,
    // not the raw login input (which may be a phone number).
    const canonicalUsername = result.user?.username ?? uname;
    setUsername(canonicalUsername);
    localStorage.setItem(USERNAME_KEY, canonicalUsername);
    const regId = result.user?.registrationId || null;
    if (regId) {
      setRegistrationId(regId);
      localStorage.setItem(REG_ID_KEY, regId);
    }
    const pending = result.pending ?? false;
    setIsPending(pending);
    localStorage.setItem(PENDING_KEY, String(pending));
    return { ok: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUsername(null);
    setRegistrationId(null);
    setIsPending(false);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(REG_ID_KEY);
    localStorage.removeItem(PENDING_KEY);
  };

  return (
    <UserAuthContext.Provider
      value={{ username, registrationId, session, loading, isPending, signInWithCredentials, signOut }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth(): UserAuthValue {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}
