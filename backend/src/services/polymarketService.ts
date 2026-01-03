const DEFAULT_GAMMA_API_URL = "https://gamma-api.polymarket.com";
const DEFAULT_CLOB_API_URL = "https://clob.polymarket.com";
const DEFAULT_TIMEOUT_MS = 12000;

const normalizeBaseUrl = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.replace(/\/+$/, "");
};

const getTimeoutMs = (): number => {
  const raw = process.env.POLYMARKET_API_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_TIMEOUT_MS;
};

const toQueryValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : null;
  }
  return null;
};

const buildUrl = (baseUrl: string, path: string, query: Record<string, unknown>): string => {
  const normalizedBase = `${baseUrl.replace(/\/+$/, "")}/`;
  const url = new URL(path, normalizedBase);
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    const normalized = toQueryValue(value);
    if (normalized !== null && normalized !== "") {
      params.set(key, normalized);
    }
  });

  const queryString = params.toString();
  if (queryString) {
    url.search = queryString;
  }

  return url.toString();
};

const requestJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });
    const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      const message = payload?.error || `Upstream request failed (${res.status})`;
      const error = new Error(message) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }
    return payload as T;
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      const timeoutError = new Error("Upstream request timed out") as Error & { status?: number };
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchGammaMarkets = async (query: Record<string, unknown>): Promise<unknown> => {
  const baseUrl = normalizeBaseUrl(process.env.POLYMARKET_GAMMA_API_URL, DEFAULT_GAMMA_API_URL);
  const url = buildUrl(baseUrl, "markets", query);
  return requestJson<unknown>(url);
};

export const fetchClobMarkets = async (query: Record<string, unknown>): Promise<unknown> => {
  const baseUrl = normalizeBaseUrl(process.env.POLYMARKET_CLOB_API_URL, DEFAULT_CLOB_API_URL);
  const url = buildUrl(baseUrl, "markets", query);
  return requestJson<unknown>(url);
};

export const fetchClobTrades = async (query: Record<string, unknown>): Promise<unknown> => {
  const baseUrl = normalizeBaseUrl(process.env.POLYMARKET_CLOB_API_URL, DEFAULT_CLOB_API_URL);
  const path = process.env.POLYMARKET_TRADES_PATH || "trades";
  const url = buildUrl(baseUrl, path, query);
  return requestJson<unknown>(url);
};
