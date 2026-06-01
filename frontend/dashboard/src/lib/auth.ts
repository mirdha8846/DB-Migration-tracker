export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sg_token");
}

export function setToken(token: string): void {
  localStorage.setItem("sg_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("sg_token");
}

export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload)) as T;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
