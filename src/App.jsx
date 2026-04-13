import { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { getUser, logout } from './lib/auth';

export default function App() {
  const [user, setUser] = useState(() => getUser());

  // Prevent browser's "not allowed" drag cursor and page-dim when dragging
  // files from the OS over non-drop areas of the app.
  useEffect(() => {
    const suppress = (e) => e.preventDefault();
    document.addEventListener('dragover', suppress);
    document.addEventListener('drop', suppress);
    return () => {
      document.removeEventListener('dragover', suppress);
      document.removeEventListener('drop', suppress);
    };
  }, []);

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
