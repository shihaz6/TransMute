import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { erpApi } from '@/api/erp';
import { ApiError, SESSION_ENDED_EVENT } from '@/api/client';
import type { AuthUserDto } from '@/api/dto';

interface SignInValue {
  user: AuthUserDto;
  signOut: () => Promise<void>;
}

const SignInContext = createContext<SignInValue | null>(null);

/** The signed-in account and a sign-out action. Only valid inside SignInGate. */
export function useSignIn(): SignInValue {
  const value = useContext(SignInContext);
  if (!value) throw new Error('useSignIn must be used inside SignInGate');
  return value;
}

type Session =
  | { status: 'checking' }
  | { status: 'signed-out'; message?: string }
  | { status: 'signed-in'; user: AuthUserDto };

/**
 * Shows the sign-in form until the server confirms a session. The app below it is only
 * mounted once signed in, so no data is requested before then.
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'checking' });

  const checkSession = useCallback(async () => {
    try {
      const user = await erpApi.me();
      setSession({ status: 'signed-in', user });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 0 ? err.message : undefined;
      setSession({ status: 'signed-out', message });
    }
  }, []);

  useEffect(() => {
    void checkSession();
    // Only a session that was active gets the "session ended" message; a first visit does not.
    const onEnded = () =>
      setSession((prev) =>
        prev.status === 'signed-in' ? { status: 'signed-out', message: 'Your session has ended. Sign in again.' } : prev
      );
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, [checkSession]);

  const signOut = useCallback(async () => {
    try {
      await erpApi.logout();
    } finally {
      setSession({ status: 'signed-out' });
    }
  }, []);

  if (session.status === 'checking') {
    return <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111113]" aria-busy="true" />;
  }
  if (session.status === 'signed-out') {
    return <SignInForm message={session.message} onSignedIn={(user) => setSession({ status: 'signed-in', user })} />;
  }
  return (
    <SignInContext.Provider value={{ user: session.user, signOut }}>{children}</SignInContext.Provider>
  );
}

function SignInForm({ message, onSignedIn }: { message?: string; onSignedIn: (user: AuthUserDto) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(message);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const user = await erpApi.login(username.trim(), password);
      setPassword('');
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F7] dark:bg-[#111113] px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div>
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Sign in to TransMute</h1>
          <p className="text-xs text-stone-500 mt-1">Use the owner account set on the server.</p>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
          Username
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-stone-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-2 text-sm font-medium disabled:opacity-60 cursor-pointer"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

/** A small sign-out button for the app header. */
export function SignOutButton() {
  const { user, signOut } = useSignIn();
  return (
    <button
      onClick={() => void signOut()}
      title={`Signed in as ${user.displayName}`}
      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
    >
      Sign out
    </button>
  );
}
