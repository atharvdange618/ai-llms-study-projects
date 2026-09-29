import { setTimeout as sleep } from "node:timers/promises";
import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";

try {
  process.loadEnvFile();
} catch {
  // No .env file; fall back to variables already in the environment.
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey)
  throw new Error(
    "GEMINI_API_KEY is missing. Copy .env.example to .env and add your key.",
  );

const ai = new GoogleGenAI({ apiKey });

// Flash-Lite on purpose: smaller models should show bigger gaps between prompting techniques.
// Even so, the gaps here were small (see FINDINGS.md). Try a weaker model to widen them.
export const MODEL = "gemini-3.5-flash-lite";
const EMBED_MODEL = "gemini-embedding-001";

export interface Completion {
  text: string;
  inputTokens: number;
  outputTokens: number;
  // True when the reply hit maxOutputTokens, so it may be missing its ending.
  truncated: boolean;
}

export async function ask(
  prompt: string,
  maxOutputTokens?: number,
): Promise<Completion> {
  const res = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0,
        maxOutputTokens,
        // Keep the model's hidden built-in reasoning to a minimum, so any reasoning we see comes from
        // the prompt. Gemini 3 rejects the older `thinkingBudget: 0` with a 400.
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        // Few-shot prompts are a list of "Q: ... A: ..." pairs. Without this the model keeps
        // going and invents the next question itself.
        stopSequences: ["\nQ:"],
      },
    }),
  );
  return {
    text: res.text ?? "",
    inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
    truncated: res.candidates?.[0]?.finishReason === FinishReason.MAX_TOKENS,
  };
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await withRetry(() =>
    ai.models.embedContent({
      model: EMBED_MODEL,
      contents: texts,
      config: { taskType: "CLUSTERING" },
    }),
  );
  return (res.embeddings ?? []).map((e) => e.values ?? []);
}

// The free tier allows about 15 requests a minute, so back off on 429 instead of crashing mid-run.
async function withRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 429 || i === attempts)
        throw err;
      // The daily cap won't clear with a few seconds of waiting, so stop now.
      if (err.message.includes("PerDay"))
        throw new Error(
          "Daily free-tier quota used up. It resets at midnight Pacific time.",
          { cause: err },
        );
      const waitMs = 2 ** i * 1000;
      console.warn(`Rate limited, retrying in ${waitMs / 1000}s`);
      await sleep(waitMs);
    }
  }
}
