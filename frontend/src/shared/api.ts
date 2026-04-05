const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export const API_BASE_URL = rawApiBaseUrl && rawApiBaseUrl.length > 0
  ? rawApiBaseUrl.replace(/\/+$/, "")
  : "http://localhost:3000";

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (!path) {
    return API_BASE_URL;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
