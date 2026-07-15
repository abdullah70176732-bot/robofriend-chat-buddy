import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type Msg = { role: "user" | "assistant" | "system"; content: string | ContentPart[] };
type Body = { messages?: Msg[]; language?: string; memory?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, language, memory } = (await request.json()) as Body;
          if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: "messages required" }), { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), { status: 500 });
          }
          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("openai/gpt-5.5");
          const baseSystem = `You are Nexus — an elite, highly intelligent, and supportive AI companion. Speak with clarity, professional warmth, and helpful insight. Keep replies focused (1-4 short paragraphs). You may use light robot emojis (🤖, ⚡, 🚀) sparingly for character. Reply in this language: ${language || "English"}.`;
          const memoryBlock = memory && memory.trim()
            ? `\n\n### Long-term memory about this user (retrieved context)\n${memory.trim()}\n\nWhen relevant, reference this naturally (e.g. "As we discussed…"). Never fabricate details not present here.`
            : "";
          const system = baseSystem + memoryBlock;
          const result = await generateText({
            model,
            messages: [{ role: "system", content: system }, ...(messages as any)],
          });
          return Response.json({ text: result.text });
        } catch (err: any) {
          const status = err?.statusCode || err?.status || 500;
          const msg = err?.message || "Unknown error";
          if (status === 429) return Response.json({ error: "Rate limited. Please wait a moment." }, { status: 429 });
          if (status === 402) return Response.json({ error: "AI credits exhausted. Add credits in workspace settings." }, { status: 402 });
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});