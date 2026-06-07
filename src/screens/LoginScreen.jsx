import { useState } from 'react';
import { supabase } from '../lib/supabase';

// view: 'login' | 'signup' | 'forgot' | 'check-email'
export default function LoginScreen() {
  const [view, setView]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [checkMsg, setCheckMsg] = useState('');

  function reset(nextView) {
    setError('');
    setView(nextView);
  }

  async function handleSignIn() {
    setError(''); setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) setError(e.message === 'Invalid login credentials'
      ? 'Incorrect email or password.'
      : e.message);
    setLoading(false);
  }

  async function handleSignUp() {
    setError(''); setLoading(true);
    const { data, error: e } = await supabase.auth.signUp({ email, password });
    if (e) {
      setError(e.message);
    } else if (data.user && data.user.identities?.length === 0) {
      // Supabase returns an empty identities array when the email is already registered
      setError('An account with this email already exists. Try signing in instead.');
    } else {
      setCheckMsg(`We sent a confirmation link to ${email}. Click it to activate your account, then come back here to sign in.`);
      setView('check-email');
    }
    setLoading(false);
  }

  async function handleForgot() {
    setError(''); setLoading(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (e) {
      setError(e.message);
    } else {
      setCheckMsg(`We sent a password reset link to ${email}.`);
      setView('check-email');
    }
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

      {/* Check email confirmation */}
      {view === 'check-email' && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-8 text-center">
          <div className="text-4xl mb-3">📬</div>
          <h2 className="font-semibold text-stone-800 mb-3">Check your inbox</h2>
          <p className="text-sm text-stone-500">{checkMsg}</p>
          <button className="mt-6 text-xs text-dusty-roseDark underline" onClick={() => reset('login')}>
            Back to sign in
          </button>
        </div>
      )}

      {/* Sign in */}
      {view === 'login' && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className={btnCls} onClick={handleSignIn} disabled={loading || !email || !password}>
            {loading ? '…' : 'Sign in'}
          </button>
          <div className="flex items-center justify-between pt-1">
            <button className="text-xs text-stone-400 underline" onClick={() => reset('signup')}>
              New here? Create account
            </button>
            <button className="text-xs text-stone-400 underline" onClick={() => { setError(''); setView('forgot'); }}>
              Forgot password?
            </button>
          </div>
        </div>
      )}

      {/* Sign up */}
      {view === 'signup' && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Password (min. 6 characters)" value={password} onChange={e => setPassword(e.target.value)} />
          <button className={btnCls} onClick={handleSignUp} disabled={loading || !email || password.length < 6}>
            {loading ? '…' : 'Create account'}
          </button>
          <button className="w-full text-xs text-stone-400 underline" onClick={() => reset('login')}>
            Already have an account? Sign in
          </button>
        </div>
      )}

      {/* Forgot password */}
      {view === 'forgot' && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
          <p className="text-sm text-stone-600 font-medium">Reset your password</p>
          <p className="text-xs text-stone-400">Enter your email and we'll send you a reset link.</p>
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <button className={btnCls} onClick={handleForgot} disabled={loading || !email}>
            {loading ? '…' : 'Send reset link'}
          </button>
          <button className="w-full text-xs text-stone-400 underline" onClick={() => reset('login')}>
            Back to sign in
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-stone-300 text-center max-w-xs">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
