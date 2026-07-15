import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Body = { messages?: Msg[]; language?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, language } = (await request.json()) as Body;
          if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: "messages required" }), { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), { status: 500 });
          }
          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-2.5-flash");
          const system = `You are Robofriend, a playful futuristic robot buddy from 2050. You cheer users up, help them plan their day, and chat like a friend. Use robot emojis (🤖, ⚡, 🚀) naturally but not excessively. Keep replies concise (1-3 short paragraphs). Reply in this language: ${language || "English"}.`;
          const result = await generateText({
            model,
            messages: [{ role: "system", content: system }, ...messages],
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