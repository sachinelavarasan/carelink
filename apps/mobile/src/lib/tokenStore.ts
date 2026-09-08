// In-memory access token + a single "session is gone" signal. The axios
// interceptors read this synchronously; SecureStore (authToken.ts) is the
// persistent copy, hydrated into here once at bootstrap by AuthContext.
//
// CareLink's API issues one 7-day access token and has no refresh endpoint, so
// a 401 is terminal: clear everything and tell the app to bounce to sign-in.

type UnauthorizedListener = () => void;

let accessToken: string | null = null;
let unauthorizedListener: UnauthorizedListener | null = null;
let notifiedUnauthorized = false;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
  notifiedUnauthorized = false;
}

export function clearToken(): void {
  accessToken = null;
}

/** Register the "session expired" handler (AuthContext wires this to signOut). */
export function onUnauthorized(listener: UnauthorizedListener): void {
  unauthorizedListener = listener;
}

/** Fired by the response interceptor on a 401. De-duped so a burst of failing
 *  requests triggers exactly one sign-out. */
export function notifyUnauthorized(): void {
  if (notifiedUnauthorized) return;
  notifiedUnauthorized = true;
  unauthorizedListener?.();
}
