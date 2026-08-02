import { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useFriendsActivity, relativeTime } from '../hooks/useFriendsActivity';
import { useLanguage } from '../contexts/LanguageContext';
import { localizedName, locationLine } from '../lib/localize';

function FriendAvatar({ name, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClasses} rounded-full bg-plum flex items-center justify-center flex-shrink-0`}>
      <span className="text-cream font-semibold">{name?.[0] ?? '?'}</span>
    </div>
  );
}

function RequestCard({ request, onAccept, onDecline }) {
  const { t } = useLanguage();
  const sender = request.user;
  return (
    <div className="bg-card rounded-2xl border border-warmline p-3 flex items-center gap-3">
      <FriendAvatar name={sender?.name} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-plum text-sm truncate">{sender?.name ?? t('friendsScreen.someone')}</p>
        <p className="text-xs text-plum-soft truncate">{sender?.phone}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onDecline(request.id)}
          className="px-3 py-1.5 rounded-xl border border-warmline text-xs text-plum"
        >
          {t('friendsScreen.decline')}
        </button>
        <button
          onClick={() => onAccept(request.id)}
          className="px-3 py-1.5 rounded-xl bg-sage-400 text-white text-xs font-semibold"
        >
          {t('friendsScreen.accept')}
        </button>
      </div>
    </div>
  );
}

function FriendFeedItem({ item, onSelect, lang, t }) {
  const verb = item.status === 'going' ? t('friendsScreen.isGoingTo') : t('friendsScreen.isInterestedIn');
  return (
    <button
      onClick={() => onSelect?.(item.activity)}
      className="w-full text-start bg-card rounded-2xl border border-warmline p-3 flex items-center gap-3"
    >
      <FriendAvatar name={item.friendName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-plum leading-snug">
          <span className="font-medium">{item.friendName}</span>{' '}
          <span className="text-plum-soft">{verb}</span>
        </p>
        <p dir="auto" className="text-sm font-medium text-plum truncate">{localizedName(item.activity, lang)}</p>
        <p dir="auto" className="text-xs text-plum-soft truncate">
          {locationLine(item.activity, lang)}
          {item.date ? ` · ${relativeTime(item.date, lang)}` : ''}
        </p>
      </div>
      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
        item.status === 'going' ? 'bg-sage-100 text-sage-600' : 'bg-lilac-pale text-plum'
      }`}>
        {item.status === 'going' ? t('activityDetail.going') : t('activityDetail.interested')}
      </span>
    </button>
  );
}

export default function FriendsScreen({ onSelect }) {
  const { friends, requests, loading, sendRequest, respond } = useFriends();
  const { lang, t } = useLanguage();
  const { feed, hint } = useFriendsActivity(friends, lang);
  const [tab, setTab]     = useState('friends'); // 'friends' | 'requests'
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  async function handleAdd() {
    if (!phone.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await sendRequest(phone.trim());
      setStatus('sent');
      setPhone('');
    } catch (err) {
      setStatus('error');
      const knownCodes = ['not_configured', 'no_user_found', 'own_number', 'already_sent'];
      setErrorMsg(knownCodes.includes(err.message) ? t(`friendsScreen.errors.${err.message}`) : (err.message || t('friendsScreen.errors.no_user_found')));
    }
  }

  function handleWhatsAppInvite() {
    const msg = t('friendsScreen.inviteMessage');
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-canvas">
        <h2 className="text-xl font-serif font-semibold text-plum leading-snug">{t('friendsScreen.title')}</h2>
        <p className="text-xs text-plum-soft mt-0.5">{t('friendsScreen.subtitle')}</p>

        {/* Add friend */}
        <div className="mt-3 mb-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder={t('friendsScreen.phonePlaceholder')}
              value={phone}
              onChange={e => { setPhone(e.target.value); setStatus(null); }}
              className="flex-1 px-3 py-2 rounded-xl border border-warmline text-sm bg-card focus:outline-none focus:border-lilac placeholder:text-plum-disabled"
            />
            <button
              onClick={handleAdd}
              disabled={status === 'sending' || !phone.trim()}
              className="px-4 py-2 rounded-xl bg-butter text-plum text-sm font-semibold disabled:opacity-50"
            >
              {status === 'sending' ? '…' : t('common.add')}
            </button>
          </div>

          {status === 'sent' && (
            <p className="text-xs text-sage-500 font-medium">{t('friendsScreen.requestSent')}</p>
          )}
          {status === 'error' && (
            <p className="text-xs text-blush">{errorMsg}</p>
          )}

          <button
            onClick={handleWhatsAppInvite}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-warmline bg-card text-sm text-plum"
          >
            <svg className="w-4 h-4 fill-green-400" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {t('friendsScreen.inviteWhatsapp')}
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-lilac-pale rounded-xl p-0.5">
          {[
            { id: 'friends',  label: t('friendsScreen.friendsTab') },
            { id: 'requests', label: `${t('friendsScreen.requestsTab')}${requests.length > 0 ? ` (${requests.length})` : ''}` },
          ].map(tabOpt => (
            <button
              key={tabOpt.id}
              onClick={() => setTab(tabOpt.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === tabOpt.id ? 'bg-card shadow-soft text-plum' : 'text-plum-soft'
              }`}
            >
              {tabOpt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-16 bg-lilac-pale rounded-2xl animate-pulse" />)}
          </div>
        ) : tab === 'requests' ? (
          requests.length === 0 ? (
            <div className="text-center pt-12">
              <p className="text-plum-soft text-sm">{t('friendsScreen.noPendingRequests')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <RequestCard
                  key={r.id}
                  request={r}
                  onAccept={id => respond(id, true)}
                  onDecline={id => respond(id, false)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-5">
            {/* What your friends saved (Phase 6.2) */}
            {(feed.length > 0 || hint) && (
              <section>
                <h3 className="text-xs font-semibold text-plum-soft mb-3">
                  {t('friendsScreen.whatFriendsSaved')}
                </h3>
                {feed.length > 0 ? (
                  <div className="space-y-2.5">
                    {feed.map(item => <FriendFeedItem key={item.id} item={item} onSelect={onSelect} lang={lang} t={t} />)}
                  </div>
                ) : (
                  <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 text-center">
                    <p dir="auto" className="text-sm text-sage-600">🌸 {hint}</p>
                    <p className="text-xs text-plum-soft mt-1">{t('friendsScreen.addFriendsPrompt')}</p>
                  </div>
                )}
              </section>
            )}

            {/* Friends list */}
            {friends.length === 0 ? (
              !hint && (
                <div className="flex flex-col items-center justify-center text-center pt-12">
                  <span className="text-5xl mb-4">👯</span>
                  <p className="text-plum font-medium mb-1">{t('friendsScreen.noFriendsYet')}</p>
                  <p className="text-sm text-plum-soft">{t('friendsScreen.addFriendsHint')}</p>
                </div>
              )
            ) : (
              <section>
                <h3 className="text-xs font-semibold text-plum-soft mb-3">{t('friendsScreen.yourFriends')}</h3>
                <div className="space-y-2">
                  {friends.map(f => (
                    <div key={f.id} className="bg-card rounded-2xl border border-warmline p-3 flex items-center gap-3">
                      <FriendAvatar name={f.name} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-plum text-sm truncate">{f.name ?? t('friendsScreen.friend')}</p>
                        <p className="text-xs text-plum-soft truncate">{f.neighborhood}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
