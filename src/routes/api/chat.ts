import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

// Enterprise limits — protect the gateway & wallet from abuse.
const MAX_MESSAGES = 40;
const MAX_TEXT_LEN = 8_000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB decoded per image
const MAX_TOTAL_PAYLOAD = 12 * 1024 * 1024; // 12MB request body
const MAX_MEMORY_LEN = 4_000;
const MAX_LANG_LEN = 16;

const textPart = z.object({ type: z.literal("text"), text: z.string().max(MAX_TEXT_LEN) });
const imagePart = z.object({
  type: z.literal("image_url"),
  image_url: z.object({
    url: z
      .string()
      .max(MAX_IMAGE_BYTES * 2) // base64 overhead ~1.37x
      .refine(
        (u) => u.startsWith("data:image/") || /^https:\/\//.test(u),
        "image url must be https or data:image/*",
      ),
  }),
});
const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.union([z.string().max(MAX_TEXT_LEN), z.array(z.union([textPart, imagePart])).max(8)]),
});
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  language: z.string().max(MAX_LANG_LEN).optional(),
  memory: z.string().max(MAX_MEMORY_LEN).optional(),
});

// Naive in-memory rate limiter (per worker instance). Best-effort DoS shield.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;
const rlBucket = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = rlBucket.get(ip);
  if (!b || now > b.reset) {
    rlBucket.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > RL_MAX) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentLength = Number(request.headers.get("content-length") || 0);
          if (contentLength > MAX_TOTAL_PAYLOAD) {
            return Response.json({ error: "Payload too large" }, { status: 413 });
          }

          const ip = clientIp(request);
          const rl = rateLimit(ip);
          if (!rl.ok) {
            return new Response(
              JSON.stringify({ error: "Too many requests. Please slow down." }),
              {
                status: 429,
                headers: {
                  "content-type": "application/json",
                  "retry-after": String(rl.retryAfter),
                },
              },
            );
          }

          let raw: unknown;
          try {
            raw = await request.json();
          } catch {
            return Response.json({ error: "Invalid JSON body" }, { status: 400 });
          }

          const parsed = bodySchema.safeParse(raw);
          if (!parsed.success) {
            return Response.json(
              { error: "Invalid request", issues: parsed.error.issues.slice(0, 5) },
              { status: 400 },
            );
          }
          const { messages, language, memory } = parsed.data;

          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return Response.json(
              { error: "AI is not configured. Please contact support." },
              { status: 503 },
            );
          }

          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("openai/gpt-5.5");
          const safeLang = (language || "English").replace(/[\r\n]/g, " ").slice(0, MAX_LANG_LEN);
          const baseSystem = `You are Nexus — an elite, highly intelligent, and supportive AI companion. Speak with clarity, professional warmth, and helpful insight. Keep replies focused (1-4 short paragraphs). You may use light robot emojis (🤖, ⚡, 🚀) sparingly for character. Reply in this language: ${safeLang}.`;
          const memoryBlock = memory && memory.trim()
            ? `\n\n### Long-term memory about this user (retrieved context)\n${memory.trim()}\n\nWhen relevant, reference this naturally (e.g. "As we discussed…"). Never fabricate details not present here.`
            : "";
          const system = baseSystem + memoryBlock;

          // Abort runaway upstream calls to protect worker CPU budget.
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45_000);
          try {
          const result = await generateText({
            model,
              messages: [{ role: "system", content: system }, ...(messages as any)],
              abortSignal: controller.signal,
          });
          return Response.json({ text: result.text });
          } finally {
            clearTimeout(timeout);
          }
        } catch (err: unknown) {
          const e = err as { statusCode?: number; status?: number; message?: string; name?: string };
          if (e?.name === "AbortError") {
            return Response.json({ error: "AI response timed out. Please retry." }, { status: 504 });
          }
          const status = e?.statusCode || e?.status || 500;
          if (status === 429) return Response.json({ error: "Rate limited. Please wait a moment." }, { status: 429 });
          if (status === 402) return Response.json({ error: "AI credits exhausted. Add credits in workspace settings." }, { status: 402 });
          // Do not leak internal error details to clients.
          console.error("[api/chat] error:", e?.message || err);
          return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      },
    },
  },
});