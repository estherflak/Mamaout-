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

function MainApp() {
  const { user, profile, authLoading } = useAuthContext();
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

  if (!user) return <LoginScreen />;

  if (!profile?.name) return <OnboardingScreen />;

  return (
    <div className="h-screen bg-cream-50 flex flex-col max-w-xl mx-auto">
      {/* Screen content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'discover' && <DiscoverScreen onSelect={setSelected} />}
        {tab === 'saved'    && <SavedScreen    onSelect={setSelected} />}
        {tab === 'friends'  && <FriendsScreen />}
        {tab === 'profile'  && <ProfileScreen />}
      </div>

      {/* Bottom navigation */}
      <BottomNav activeTab={tab} onChange={setTab} requestCount={requests.length} />

      {/* Activity detail modal */}
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
