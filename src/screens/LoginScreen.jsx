import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// view: 'login' | 'signup' | 'forgot' | 'check-email'
// Renders full-screen by default (tab gating), or as sheet content when
// `sheet` is true (opened from a heart tap / RSVP / the Discover CTA).
export default function LoginScreen({ sheet = false, initialView = 'login', promptMessage = null, onClose }) {
  const { t } = useLanguage();
  const [view, setView]         = useState(initialView);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [checkMsg, setCheckMsg]   = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  function reset(nextView) {
    setError('');
    setView(nextView);
  }

  async function handleSignIn() {
    setError(''); setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) {
      setError(e.message === 'Invalid login credentials' ? t('loginScreen.incorrectCreds') : e.message);
    } else if (rememberMe) {
      sessionStorage.removeItem('mamaout_session_only');
      localStorage.removeItem('mamaout_was_session_only');
    } else {
      sessionStorage.setItem('mamaout_session_only', '1');
      localStorage.setItem('mamaout_was_session_only', '1');
    }
    setLoading(false);
  }

  async function handleSignUp() {
    setError(''); setLoading(true);
    const { data, error: e } = await supabase.auth.signUp({ email, password });
    if (e) {
      setError(e.message);
    } else if (data.user && data.user.identities?.length === 0) {
      // Supabase returns an empty identities array when the email is already registered
      setError(t('loginScreen.accountExists'));
    } else {
      setCheckMsg(t('loginScreen.checkMsgConfirm', { email }));
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
      setCheckMsg(t('loginScreen.checkMsgReset', { email }));
      setView('check-email');
    }
    setLoading(false);
  }

  function submitOnEnter(e, action, disabled) {
    if (e.key === 'Enter' && !disabled) action();
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-dusty-rose text-sm';
  const btnCls   = 'w-full py-3 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm disabled:opacity-60';

  const signInDisabled = loading || !email || !password;
  const signUpDisabled = loading || !email || password.length < 6;

  return (
    <div className={`bg-cream-50 flex flex-col items-center justify-center px-6 ${sheet ? 'py-8 relative' : 'min-h-screen'}`}>
      {sheet && onClose && (
        <button
          onClick={onClose}
          aria-label={t('loginScreen.close')}
          className="absolute end-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <div className="mb-6 text-center">
        <div className="text-4xl mb-2">☀️</div>
        <h1 className="text-2xl font-bold text-stone-800">MamaOut</h1>
        <p className="text-sm text-stone-400 mt-1">{t('loginScreen.tagline')}</p>
      </div>

      {/* Contextual nudge, e.g. "Create a free account to save favorites" */}
      {promptMessage && view !== 'check-email' && (
        <div className="w-full max-w-sm mb-3 px-4 py-2.5 bg-dusty-rose/10 border border-dusty-rose/30 rounded-xl text-xs text-stone-600 text-center font-medium">
          {promptMessage}
        </div>
      )}

      {/* Check email confirmation */}
      {view === 'check-email' && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-8 text-center">
          <div className="text-4xl mb-3">📬</div>
          <h2 className="font-semibold text-stone-800 mb-3">{t('loginScreen.checkYourInbox')}</h2>
          <p className="text-sm text-stone-500">{checkMsg}</p>
          <button className="mt-6 text-xs text-dusty-roseDark underline" onClick={() => reset('login')}>
            {t('loginScreen.backToSignIn')}
          </button>
        </div>
      )}

      {/* Sign in / Sign up card with an explicit, equal-weight switch */}
      {(view === 'login' || view === 'signup') && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
          <div className="flex bg-stone-100 rounded-xl p-0.5">
            {[
              { id: 'signup', label: t('loginScreen.signUpTab') },
              { id: 'login',  label: t('loginScreen.signInTab') },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => reset(v.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  view === v.id ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view === 'signup' && (
            <p className="text-xs text-stone-400 text-center">{t('loginScreen.signUpSubtitle')}</p>
          )}

          {error && <div className="px-3 py-2 bg-blush/10 border border-blush/30 rounded-lg text-xs text-blush">{error}</div>}

          <input className={inputCls} type="email" autoComplete="email" placeholder={t('loginScreen.email')} value={email} onChange={e => setEmail(e.target.value)} />

          {view === 'login' ? (
            <>
              <input
                className={inputCls} type="password" autoComplete="current-password"
                placeholder={t('loginScreen.password')} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => submitOnEnter(e, handleSignIn, signInDisabled)}
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-dusty-rose"
                />
                <span className="text-xs text-stone-500">{t('loginScreen.rememberMe')}</span>
              </label>
              <button className={btnCls} onClick={handleSignIn} disabled={signInDisabled}>
                {loading ? t('loginScreen.signingInEllipsis') : t('loginScreen.signIn')}
              </button>
              <div className="text-center pt-1">
                <button className="text-xs text-stone-400 underline" onClick={() => { setError(''); setView('forgot'); }}>
                  {t('loginScreen.forgotPassword')}
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                className={inputCls} type="password" autoComplete="new-password"
                placeholder={t('loginScreen.passwordMin')} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => submitOnEnter(e, handleSignUp, signUpDisabled)}
              />
              <button className={btnCls} onClick={handleSignUp} disabled={signUpDisabled}>
                {loading ? t('loginScreen.signingInEllipsis') : t('loginScreen.createAccount')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Forgot password */}
      {view === 'forgot' && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
          <p className="text-sm text-stone-600 font-medium">{t('loginScreen.resetTitle')}</p>
          <p className="text-xs text-stone-400">{t('loginScreen.resetSubtitle')}</p>
          {error && <div className="px-3 py-2 bg-blush/10 border border-blush/30 rounded-lg text-xs text-blush">{error}</div>}
          <input className={inputCls} type="email" autoComplete="email" placeholder={t('loginScreen.email')} value={email} onChange={e => setEmail(e.target.value)} />
          <button className={btnCls} onClick={handleForgot} disabled={loading || !email}>
            {loading ? t('loginScreen.signingInEllipsis') : t('loginScreen.sendResetLink')}
          </button>
          <button className="w-full text-xs text-stone-400 underline" onClick={() => reset('login')}>
            {t('loginScreen.backToSignIn')}
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-stone-300 text-center max-w-xs">
        {t('loginScreen.terms')}
      </p>
    </div>
  );
}
