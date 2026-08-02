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

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-warmline bg-card text-plum placeholder-plum-disabled focus:outline-none focus:ring-2 focus:ring-lilac text-sm';

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">☀️</div>
        <h1 className="text-2xl font-serif font-bold text-plum">MamaOut</h1>
      </div>

      <div className="w-full max-w-sm bg-card rounded-2xl shadow-soft border border-warmline p-6 space-y-3">
        <p className="text-sm font-semibold text-plum">{t('resetPasswordScreen.chooseNewPassword')}</p>

        {error && (
          <div className="px-3 py-2 bg-blush/10 border border-blush/30 rounded-lg text-xs text-blush">
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
          className="w-full py-3 rounded-xl font-semibold text-plum bg-butter active:scale-[0.98] transition-transform text-sm disabled:opacity-60"
        >
          {loading ? '…' : t('resetPasswordScreen.setNewPassword')}
        </button>
      </div>
    </div>
  );
}
