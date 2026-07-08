import { useState } from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useFriends } from './hooks/useFriends';
import BottomNav from './components/BottomNav';
import ActivityDetail from './components/ActivityDetail';
import DiscoverScreen from './screens/DiscoverScreen';
import SavedScreen from './screens/SavedScreen';
import FriendsScreen from './screens/FriendsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import SubmitScreen from './screens/SubmitScreen';
import CommunityAddScreen from './screens/CommunityAddScreen';
import AdminScreen from './screens/AdminScreen';

function MainApp() {
  const { user, profile, profileError, authLoading, needsPasswordReset } = useAuthContext();
  const { requests } = useFriends();
  const [tab, setTab]             = useState('discover');
  const [selected, setSelected]   = useState(null);
  const [discoverSeed, setDiscoverSeed] = useState(null);
  const [showSubmit, setShowSubmit] = useState(
    () => window.location.pathname === '/submit'
  );
  const [showCommunityAdd, setShowCommunityAdd] = useState(false);

  function closeSubmit() {
    setShowSubmit(false);
    if (window.location.pathname === '/submit') {
      window.history.replaceState({}, '', '/');
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-dusty-rose border-t-transparent animate-spin" />
      </div>
    );
  }

  if (needsPasswordReset) return <ResetPasswordScreen />;
  // Only force onboarding when the profile fetch actually succeeded. If it errored
  // (network/RLS), fall through to the app rather than trapping or re-onboarding
  // an existing user (which could overwrite their saved profile with blanks).
  if (user && !profileError && !profile?.onboarding_done) return <OnboardingScreen />;

  function renderTab() {
    if (tab === 'discover') return <DiscoverScreen onSelect={setSelected} onOpenSubmit={() => setShowSubmit(true)} seed={discoverSeed} onSeedConsumed={() => setDiscoverSeed(null)} />;
    if (tab === 'saved')    return user ? <SavedScreen onSelect={setSelected} /> : <LoginScreen />;
    if (tab === 'friends')  return user ? <FriendsScreen onSelect={setSelected} /> : <LoginScreen />;
    if (tab === 'profile')  return user ? <ProfileScreen onOpenSubmit={() => setShowSubmit(true)} onRunSearch={s => { setDiscoverSeed(s); setTab('discover'); }} /> : <LoginScreen />;
    return null;
  }

  const anyModal = !!(selected || showSubmit || showCommunityAdd);

  return (
    <div className="h-[100dvh] bg-cream-50 flex flex-col max-w-xl mx-auto relative">
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderTab()}
      </div>

      {/* FAB — share a community activity */}
      {tab === 'discover' && user && !anyModal && (
        <button
          onClick={() => setShowCommunityAdd(true)}
          className="absolute bottom-[76px] end-4 w-12 h-12 rounded-full bg-dusty-rose shadow-lg flex items-center justify-center text-white z-40 active:scale-95 transition-transform"
          title="Share an activity"
          aria-label="Share an activity with the community"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      )}

      <BottomNav activeTab={tab} onChange={setTab} requestCount={requests.length} />
      {selected && (
        <ActivityDetail activity={selected} onClose={() => setSelected(null)} />
      )}
      {showSubmit && (
        <SubmitScreen onClose={closeSubmit} />
      )}
      {showCommunityAdd && (
        <CommunityAddScreen onClose={() => setShowCommunityAdd(false)} />
      )}
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;

  if (path === '/admin') {
    return (
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </AuthProvider>
  );
}
