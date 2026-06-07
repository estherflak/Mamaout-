import { useState } from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
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

function AuthPrompt({ message }) {
  return (
    <div className="flex flex-col h-full items-center justify-center px-8 text-center">
      <span className="text-5xl mb-4">🌸</span>
      <p className="text-stone-700 font-semibold mb-1">{message}</p>
      <p className="text-sm text-stone-400 mb-6">Create a free account to unlock this</p>
      <LoginScreen />
    </div>
  );
}

function MainApp() {
  const { user, profile, authLoading, needsPasswordReset } = useAuthContext();
  const { requests } = useFriends();
  const [tab, setTab]           = useState('discover');
  const [selected, setSelected] = useState(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-dusty-rose border-t-transparent animate-spin" />
      </div>
    );
  }

  if (needsPasswordReset) return <ResetPasswordScreen />;
  if (user && !profile?.name) return <OnboardingScreen />;

  function renderTab() {
    if (tab === 'discover') return <DiscoverScreen onSelect={setSelected} />;
    if (tab === 'saved')    return user ? <SavedScreen onSelect={setSelected} /> : <LoginScreen />;
    if (tab === 'friends')  return user ? <FriendsScreen /> : <LoginScreen />;
    if (tab === 'profile')  return user ? <ProfileScreen /> : <LoginScreen />;
    return null;
  }

  return (
    <div className="h-screen bg-cream-50 flex flex-col max-w-xl mx-auto">
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderTab()}
      </div>
      <BottomNav activeTab={tab} onChange={setTab} requestCount={requests.length} />
      {selected && (
        <ActivityDetail activity={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
