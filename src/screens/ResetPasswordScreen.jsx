import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function ResetPasswordScreen() {
  const { setNeedsPasswordReset } = useAuthContext();
  const { t } = useLanguage();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function handleReset() {
    if (password !== confirm) { setError(t('resetPasswordScreen.passwordsNoMatch')); return; }
    if (password.length < 6)  { setError(t('resetPasswordScreen.passwordTooShort')); return; }

    setError(''); setLoading(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    if (e) {
      setError(e.message);
    } else {
      setNeedsPasswordReset(false);
    }
    setLoading(false);
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-dusty-rose text-sm';

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🌸</div>
        <h1 className="text-2xl font-bold text-stone-800">MamaOut</h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-3">
        <p className="text-sm font-semibold text-stone-700">{t('resetPasswordScreen.chooseNewPassword')}</p>

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        <input
          className={inputCls}
          type="password"
          placeholder={t('resetPasswordScreen.newPasswordPlaceholder')}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <input
          className={inputCls}
          type="password"
          placeholder={t('resetPasswordScreen.confirmPasswordPlaceholder')}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
        />
        <button
          onClick={handleReset}
          disabled={loading || !password || !confirm}
          className="w-full py-3 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm disabled:opacity-60"
        >
          {loading ? '…' : t('resetPasswordScreen.setNewPassword')}
        </button>
      </div>
    </div>
  );
}
