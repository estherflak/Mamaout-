import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [tab, setTab]             = useState('phone'); // 'phone' | 'email'
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [otpSent, setOtpSent]     = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isSignUp, setIsSignUp]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function handlePhoneSend() {
    setError(''); setLoading(true);
    // Normalise to E.164 for Israel (strip leading 0, add +972)
    const normalised = phone.startsWith('+')
      ? phone
      : '+972' + phone.replace(/^0/, '').replace(/\s+/g, '');

    const { error: e } = await supabase.auth.signInWithOtp({ phone: normalised });
    if (e) setError(e.message); else setOtpSent(true);
    setLoading(false);
  }

  async function handleOtpVerify() {
    setError(''); setLoading(true);
    const normalised = phone.startsWith('+')
      ? phone
      : '+972' + phone.replace(/^0/, '').replace(/\s+/g, '');

    const { error: e } = await supabase.auth.verifyOtp({
      phone: normalised, token: otp, type: 'sms',
    });
    if (e) setError(e.message);
    setLoading(false);
  }

  async function handleEmail() {
    setError(''); setLoading(true);
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error: e } = await fn;
    if (e) setError(e.message);
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-dusty-rose text-sm';
  const btnCls   = 'w-full py-3 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm disabled:opacity-60';

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🌸</div>
        <h1 className="text-2xl font-bold text-stone-800">MamaOut</h1>
        <p className="text-sm text-stone-400 mt-1">Activities for you and your little one</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {/* Tab switch */}
        <div className="flex rounded-xl bg-stone-50 p-1 mb-5">
          {['phone', 'email'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setOtpSent(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
            >
              {t === 'phone' ? '📱 Phone' : '✉️ Email'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        {tab === 'phone' && (
          <div className="space-y-3">
            {!otpSent ? (
              <>
                <input
                  className={inputCls}
                  type="tel"
                  placeholder="Phone number (05X-XXX-XXXX)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
                <button className={btnCls} onClick={handlePhoneSend} disabled={loading || !phone}>
                  {loading ? 'Sending…' : 'Send code'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-stone-400 text-center">
                  Enter the code sent to {phone}
                </p>
                <input
                  className={inputCls}
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  maxLength={6}
                />
                <button className={btnCls} onClick={handleOtpVerify} disabled={loading || otp.length < 4}>
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
                <button
                  className="w-full text-xs text-stone-400 underline"
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                >
                  Try a different number
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'email' && (
          <div className="space-y-3">
            <input className={inputCls} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className={inputCls} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className={btnCls} onClick={handleEmail} disabled={loading || !email || !password}>
              {loading ? '…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
            <button className="w-full text-xs text-stone-400 underline" onClick={() => setIsSignUp(s => !s)}>
              {isSignUp ? 'Already have an account? Sign in' : 'New here? Create account'}
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-stone-100" />
          <span className="text-xs text-stone-300">or</span>
          <div className="flex-1 h-px bg-stone-100" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full py-3 rounded-xl border border-stone-200 bg-white text-stone-700 text-sm font-medium flex items-center justify-center gap-2 active:bg-stone-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <p className="mt-6 text-xs text-stone-300 text-center max-w-xs">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
