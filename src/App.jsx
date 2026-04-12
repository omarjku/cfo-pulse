import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { getUser, logout } from './lib/auth';

export default function App() {
  const [user, setUser] = useState(() => getUser());

  if (!user) {
    return <LoginPage onLogin={(username) => setUser(username)} />;
  }

  return (
    <AppShell
      user={user}
      onLogout={() => { logout(); setUser(null); }}
    />
  );
}
