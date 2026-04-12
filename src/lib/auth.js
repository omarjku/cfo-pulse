const STORAGE_KEY = 'cfo_user';
const CREDENTIALS = { admin: 'admin' }; // username: password

export function getUser() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function login(username, password) {
  if (CREDENTIALS[username] && CREDENTIALS[username] === password) {
    localStorage.setItem(STORAGE_KEY, username);
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}
