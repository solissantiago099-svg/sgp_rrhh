export const AUTH_TOKEN_KEY = "token";
export const AUTH_USER_KEY = "user";
export const AUTH_COOKIE_NAME = "sgp_token";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type JwtPayload = {
  exp?: number;
};

export function isJwtExpired(token: string) {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return true;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(paddedBase64)) as JwtPayload;

    if (!decoded.exp) {
      return true;
    }

    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

export function persistAuth(token: string, user: unknown) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.dispatchEvent(new Event("auth-changed"));
}
