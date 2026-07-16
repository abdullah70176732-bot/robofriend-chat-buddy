import type { Memory, Sentiment } from "./types";

// Simple lexical sentiment classifier — good enough for a weekly trend chart.
export function classifySentiment(text: string): Sentiment {
  const t = text.toLowerCase();
  const pos = /\b(love|great|awesome|happy|excited|amazing|good|thanks|thank you|nice|yay|cool|win|success|glad|😊|😄|🎉|❤️|🚀)\b/;
  const neg = /\b(hate|sad|angry|bad|terrible|awful|frustrat|tired|stress|worried|anxious|stuck|fail|😢|😡|😞)\b/;
  const ana = /\b(how|why|explain|analyze|compare|calculate|difference|reason|because|therefore|data|logic|algorithm|code|function)\b|\?/;
  if (pos.test(t) && !neg.test(t)) return "positive";
  if (neg.test(t)) return "negative";
  if (ana.test(t)) return "analytical";
  return "neutral";
}

// Extract explicit preferences / goals / identity from user text.
export function extractPreferences(text: string): string[] {
  const out: string[] = [];
  const patterns: RegExp[] = [
    /\bmy name is ([^\.\n,!?]{2,40})/i,
    /\bi(?:'m| am) ([a-z][^\.\n,!?]{1,60})/i,
    /\bi (?:like|love|enjoy|prefer) ([^\.\n!?]{2,80})/i,
    /\bi (?:hate|dislike|can't stand) ([^\.\n!?]{2,80})/i,
    /\bmy (?:goal|dream|plan) (?:is )?(?:to )?([^\.\n!?]{2,100})/i,
    /\bi (?:want|need|hope) to ([^\.\n!?]{2,100})/i,
    /\bi (?:work|study) (?:as|at|in) ([^\.\n!?]{2,60})/i,
    /\bremember (?:that )?([^\.\n!?]{2,120})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) out.push(m[0].trim());
  }
  return out;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Build a compact retrieval block for the model, biased to recent + query-relevant topics.
export function buildMemoryContext(mem: Memory, query: string): string {
  const parts: string[] = [];
  if (mem.preferences.length) {
    parts.push("User preferences / identity:\n" + mem.preferences.slice(-8).map((p) => `- ${p}`).join("\n"));
  }
  if (mem.topics.length) {
    const q = query.toLowerCase();
    const qWords = q.split(/\W+/).filter((w) => w.length > 3);
    const scored = mem.topics.map((t) => {
      const days = Math.max(1, (Date.now() - t.ts) / 86400000);
      const rel = qWords.filter((w) => t.text.toLowerCase().includes(w)).length;
      return { t, score: rel * 3 + 1 / days };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 6).map(({ t }) => {
      const ago = Math.round((Date.now() - t.ts) / 86400000);
      const when = ago <= 0 ? "today" : ago === 1 ? "yesterday" : `${ago} days ago`;
      return `- (${when}) ${t.text}`;
    });
    parts.push("Recent discussion topics:\n" + top.join("\n"));
  }
  return parts.join("\n\n");
}