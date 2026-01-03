const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
const DEFAULT_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 15000;

const getEnvString = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiPayload = {
  candidates?: GeminiCandidate[];
};

export const generateGeminiInsights = async (prompt: string): Promise<{ rawText: string; parsed: unknown }> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required");
  }

  const model = getEnvString("GEMINI_MODEL", DEFAULT_GEMINI_MODEL);
  const baseUrl = getEnvString("GEMINI_API_URL", DEFAULT_GEMINI_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;
  const timeout = getEnvNumber("GEMINI_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json"
        }
      })
    });

    const payload = (await res.json().catch(() => ({}))) as GeminiPayload & { error?: { message?: string } };
    if (!res.ok) {
      const message = payload?.error?.message || `Gemini request failed (${res.status})`;
      const error = new Error(message) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    const rawText =
      payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("")?.trim() || "";

    if (!rawText) {
      return { rawText: "", parsed: null };
    }

    try {
      const parsed = JSON.parse(rawText);
      return { rawText, parsed };
    } catch {
      return { rawText, parsed: { raw: rawText } };
    }
  } finally {
    clearTimeout(timer);
  }
};
