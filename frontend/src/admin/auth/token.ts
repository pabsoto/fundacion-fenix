const SESSION_KEY = 'fenix-admin-session';

export interface SessionData {
  csrfToken: string;
  expiraEn: string;
}

export function saveSession(data: SessionData): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function getSession(): SessionData | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired(): boolean {
  const session = getSession();
  if (!session) return true;
  const expiry = new Date(session.expiraEn);
  return expiry < new Date();
}
