import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleEmail() {
    setError(''); setLoading(true);
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error: e } = await fn;
    if (e) setError(e.message);
    setLoading(false);
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-dusty-rose text-sm';
  const btnCls   = 'w-full py-3 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm disabled:opacity-60';

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🌸</div>
        <h1 className="text-2xl font-bold text-stone-800">MamaOut</h1>
        <p className="text-sm text-stone-400 mt-1">Activities for you and your little one</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        <input
          className={inputCls}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className={inputCls}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          className={btnCls}
          onClick={handleEmail}
          disabled={loading || !email || !password}
        >
          {loading ? '…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
        <button
          className="w-full text-xs text-stone-400 underline"
          onClick={() => { setIsSignUp(s => !s); setError(''); }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'New here? Create account'}
        </button>
      </div>

      <p className="mt-6 text-xs text-stone-300 text-center max-w-xs">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

