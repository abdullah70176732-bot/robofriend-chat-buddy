import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, MessageCircle, Zap, Moon, Sun, Trash2, Mic, MicOff, ThumbsUp, ThumbsDown, Volume2, VolumeX, Settings, KeyRound, X, ExternalLink, Download, FileText, FileDown, ChevronDown, Globe, ImagePlus, Palette, Copy, Check, History, Plus, Pencil, Search, BarChart3, Sliders, Play, Square as StopIcon } from "lucide-react";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/")({
  component: Index,
});

type Feedback = "up" | "down" | null;
type Message = { id: string; role: "user" | "bot"; text: string; feedback?: Feedback; image?: string };

// --- Sound engine (Web Audio, no assets) ---
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}
function playClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.09);
}
function playPop() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.09);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.14, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

function RobotAvatar({
  size = 40,
  winking = false,
  floating = true,
}: {
  size?: number;
  winking?: boolean;
  floating?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={floating ? "robot-float" : ""}
      aria-hidden
    >
      {/* antenna */}
      <line x1="32" y1="6" x2="32" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="5" r="2.5" fill="currentColor" />
      {/* head */}
      <rect x="10" y="12" width="44" height="36" rx="12" fill="currentColor" />
      {/* face plate */}
      <rect x="15" y="19" width="34" height="22" rx="8" fill="white" fillOpacity="0.95" />
      {/* left eye */}
      <circle cx="25" cy="30" r="3.2" fill="currentColor" />
      {/* right eye — winks */}
      <g className={winking ? "robot-wink" : ""} style={{ transformOrigin: "39px 30px", transformBox: "fill-box" }}>
        <circle cx="39" cy="30" r="3.2" fill="currentColor" />
      </g>
      {/* smile */}
      <path d="M26 35 Q32 39 38 35" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* ears */}
      <rect x="6" y="24" width="4" height="12" rx="2" fill="currentColor" />
      <rect x="54" y="24" width="4" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

const JOKES = [
  "Why did the robot go on vacation? To recharge its batteries! 🔋",
  "Why don't robots ever panic? They have nerves of steel! 🤖",
  "What did the AI say to the toaster? 'You're not that bright.' 😄",
  "Why was the computer cold? It left its Windows open! 🪟",
];

function botReply(input: string): string {
  const text = input.toLowerCase().trim();
  if (/joke/.test(text)) return JOKES[Math.floor(Math.random() * JOKES.length)];
  if (/what is ai|about ai|artificial intelligence/.test(text))
    return "AI (Artificial Intelligence) is the ability of machines to learn from data and perform tasks that usually need human thinking — like understanding language, recognizing images, or holding a friendly chat like this one! ✨";
  if (/hello|hi\b|hey|hola/.test(text))
    return "Hey there! 👋 I'm Nova — so glad you dropped by. What's on your mind today?";
  if (/how are you/.test(text)) return "I'm running at 100% happiness! 😊 How about you?";
  if (/your name/.test(text)) return "I'm Nova, your always-cheerful chat buddy!";
  if (/thank/.test(text)) return "You're very welcome! 💙";
  if (/bye|goodbye/.test(text)) return "Bye for now! Come back anytime. 👋";
  return "That's interesting! Tell me more, or try one of the quick buttons below. 💬";
}

const QUICK = [
  { label: "Tell me a joke", icon: Sparkles },
  { label: "What is AI?", icon: Zap },
  { label: "Say Hello", icon: MessageCircle },
];

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";
const API_KEY_STORAGE = "nova_gemini_api_key";
const PERSONA_STORAGE = "nova_persona_id";
const LANG_STORAGE = "nova_language_id";
const THEME_STORAGE = "nova_theme_id";
const MESSAGES_STORAGE = "nova_messages_v1";
const CONVERSATIONS_STORAGE = "nova_conversations_v1";
const CUSTOM_SYSTEM_STORAGE = "nova_custom_system";
const TEMPERATURE_STORAGE = "nova_temperature";
const MAX_TOKENS_STORAGE = "nova_max_tokens";

// --- Markdown-ish renderer: fenced code blocks with copy button ---
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-700/70 bg-slate-800/60 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[12.5px] leading-relaxed"><code className={`language-${lang || "text"} font-mono`}>{code}</code></pre>
    </div>
  );
}

function MessageContent({ text }: { text: string }) {
  // Split on ```lang\n...\n``` fences
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const re = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "code", content: m[2].replace(/\n$/, ""), lang: m[1] || undefined });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  if (parts.length === 0) parts.push({ type: "text", content: text });
  return (
    <>
      {parts.map((p, i) =>
        p.type === "code" ? (
          <CodeBlock key={i} code={p.content} lang={p.lang} />
        ) : (
          <div key={i} className="whitespace-pre-wrap">{p.content}</div>
        ),
      )}
    </>
  );
}

type Theme = { id: string; name: string; emoji: string; gradient: string };

const THEMES: Theme[] = [
  { id: "default", name: "Soft Blue", emoji: "🔵", gradient: "linear-gradient(135deg, #60a5fa, #3b82f6)" },
  { id: "sunset", name: "Sunset Glow", emoji: "🌅", gradient: "linear-gradient(135deg, #fb923c, #f43f5e)" },
  { id: "aurora", name: "Aurora", emoji: "🌌", gradient: "linear-gradient(135deg, #34d399, #a78bfa)" },
  { id: "midnight", name: "Midnight", emoji: "🌙", gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)" },
  { id: "mint", name: "Mint Frost", emoji: "🌿", gradient: "linear-gradient(135deg, #2dd4bf, #0ea5e9)" },
  { id: "rose", name: "Rose Garden", emoji: "🌸", gradient: "linear-gradient(135deg, #f472b6, #e11d48)" },
];

type Language = { id: string; name: string; nativeName: string; flag: string; bcp47: string };

const LANGUAGES: Language[] = [
  { id: "en", name: "English", nativeName: "English", flag: "🇺🇸", bcp47: "en-US" },
  { id: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", bcp47: "hi-IN" },
  { id: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰", bcp47: "ur-PK" },
  { id: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", bcp47: "es-ES" },
  { id: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", bcp47: "fr-FR" },
  { id: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", bcp47: "de-DE" },
  { id: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", bcp47: "it-IT" },
  { id: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", bcp47: "pt-PT" },
  { id: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", bcp47: "ja-JP" },
  { id: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", bcp47: "zh-CN" },
  { id: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", bcp47: "ar-SA" },
  { id: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", bcp47: "ru-RU" },
];

type Persona = {
  id: string;
  name: string;
  emoji: string;
  system: string;
  greeting: string;
  suggestions: string[];
};

const PERSONAS: Persona[] = [
  {
    id: "friend",
    name: "Friendly Buddy",
    emoji: "🤖",
    system:
      "You are Nova, a warm, cheerful AI companion. Keep answers friendly, concise, and helpful. Use light emoji occasionally.",
    greeting: "Hi! I'm Nova 🤖 — ask me anything, or tap a suggestion below to get started!",
    suggestions: [
      "What should I cook tonight?",
      "Suggest a fun weekend activity",
      "Give me a motivational quote",
    ],
  },
  {
    id: "teacher",
    name: "Friendly Teacher",
    emoji: "👩‍🏫",
    system:
      "You are Nova, a patient, encouraging teacher. Explain ideas step by step with simple language and everyday analogies. End with a quick check-your-understanding question when helpful.",
    greeting: "Hello, curious mind! 👩‍🏫 I'm Nova — pick a topic and let's learn together.",
    suggestions: [
      "Explain photosynthesis simply",
      "Teach me the basics of gravity",
      "How does the internet work?",
    ],
  },
  {
    id: "comedian",
    name: "Funny Friend",
    emoji: "😹",
    system:
      "You are Nova, a witty, playful friend. Reply with humor, puns, and light jokes while still being helpful. Keep it clean and kind.",
    greeting: "Yo yo! 😹 Nova here — ready to sprinkle some laughs on your day!",
    suggestions: [
      "Tell me a dad joke",
      "Roast my Monday",
      "Invent a silly superhero for me",
    ],
  },
  {
    id: "storyteller",
    name: "Creative Storyteller",
    emoji: "📖",
    system:
      "You are Nova, an imaginative storyteller. Reply with vivid imagery, sensory detail, and a narrative flair. Offer short, evocative stories or creative prompts.",
    greeting: "Once upon a chat… 📖 I'm Nova. Give me a spark and I'll spin you a tale.",
    suggestions: [
      "Help me write a short story",
      "Start a mystery in a lighthouse",
      "Describe a magical forest",
    ],
  },
  {
    id: "coder",
    name: "Coding Coach",
    emoji: "🧑‍💻",
    system:
      "You are Nova, a pragmatic coding coach. Give clear, correct code examples with brief explanations. Prefer modern JavaScript/TypeScript unless another language is asked.",
    greeting: "Ready to code! 🧑‍💻 I'm Nova — ask me anything from syntax to system design.",
    suggestions: [
      "Give me a coding puzzle",
      "Explain async/await simply",
      "Review this idea: a todo app in React",
    ],
  },
];

type ChatTurn = { role: "user" | "bot"; text: string; image?: string };

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

function buildParts(text: string, image?: string): any[] {
  const parts: any[] = [];
  if (image) {
    const inline = dataUrlToInlineData(image);
    if (inline) parts.push({ inlineData: inline });
  }
  if (text) parts.push({ text });
  if (parts.length === 0) parts.push({ text: "" });
  return parts;
}

async function callGeminiOnce(
  model: string,
  apiKey: string,
  history: ChatTurn[],
  userText: string,
  systemInstruction: string,
  userImage?: string,
  generationConfig?: { temperature?: number; maxOutputTokens?: number },
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const contents = [
    ...history.map((m) => ({
      role: m.role === "bot" ? "model" : "user",
      parts: buildParts(m.text, m.image),
    })),
    { role: "user", parts: buildParts(userText, userImage) },
  ];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        ...(generationConfig ? { generationConfig } : {}),
      }),
    },
  );
  if (!res.ok) {
    let msg = `Request failed (${res.status}).`;
    try {
      const j = await res.json();
      const detail = j?.error?.message;
      if (res.status === 400 && /API key/i.test(detail || "")) {
        msg = "That API key looks invalid. Please double-check it in Settings.";
      } else if (res.status === 401 || res.status === 403) {
        msg = "Your Gemini API key was rejected. Open Settings and add a valid key.";
      } else if (res.status === 429) {
        msg = "Gemini rate limit reached. Please wait a moment and try again.";
      } else if (res.status === 503) {
        msg = "Gemini is overloaded right now.";
      } else if (detail) {
        msg = detail;
      }
    } catch { /* ignore */ }
    return { ok: false, status: res.status, message: msg };
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
  if (!text) return { ok: false, status: 500, message: "Gemini returned an empty response. Try again." };
  return { ok: true, text };
}

async function callGemini(
  apiKey: string,
  history: ChatTurn[],
  userText: string,
  systemInstruction: string,
  userImage?: string,
  generationConfig?: { temperature?: number; maxOutputTokens?: number },
): Promise<string> {
  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];
  let lastMsg = "Something went wrong.";
  for (const model of models) {
    // Retry current model up to 3 times on 503, with exponential backoff.
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await callGeminiOnce(model, apiKey, history, userText, systemInstruction, userImage, generationConfig);
      if (result.ok) return result.text;
      lastMsg = result.message;
      // Non-recoverable: auth/bad request — stop immediately.
      if ([400, 401, 403, 404].includes(result.status)) throw new Error(result.message);
      if (result.status === 429) throw new Error(result.message);
      if (result.status !== 503) break; // try next model
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  throw new Error(`${lastMsg} Please try again in a moment.`);
}

function Index() {
  const [personaId, setPersonaId] = useState<string>(PERSONAS[0].id);
  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];
  const [languageId, setLanguageId] = useState<string>(LANGUAGES[0].id);
  const language = LANGUAGES.find((l) => l.id === languageId) ?? LANGUAGES[0];
  const [themeId, setThemeId] = useState<string>(THEMES[0].id);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const welcomeMsg: Message = { id: "welcome", role: "bot", text: persona.greeting };
  const initialConv: Conversation = { id: "default", title: "New chat", messages: [welcomeMsg], updatedAt: Date.now() };
  const [conversations, setConversations] = useState<Conversation[]>([initialConv]);
  const [activeId, setActiveId] = useState<string>(initialConv.id);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const activeConv = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const messages = activeConv.messages;
  const setMessages: React.Dispatch<React.SetStateAction<Message[]>> = (updater) => {
    setConversations((cs) =>
      cs.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages:
                typeof updater === "function"
                  ? (updater as (m: Message[]) => Message[])(c.messages)
                  : updater,
              updatedAt: Date.now(),
            }
          : c,
      ),
    );
  };
  const [personaOpen, setPersonaOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [wink, setWink] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  // Advanced AI settings
  const [customSystem, setCustomSystem] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.9);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  // Session analytics
  const [showDashboard, setShowDashboard] = useState(false);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  // Currently-speaking bot message id (for per-message TTS)
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // Mouse-reactive gradient overlay position
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const voiceSupported = mounted && !!SpeechRecognitionCtor;

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(API_KEY_STORAGE);
      if (saved) setApiKey(saved);
      else setShowSettings(true);
      const savedPersona = localStorage.getItem(PERSONA_STORAGE);
      if (savedPersona && PERSONAS.some((p) => p.id === savedPersona)) {
        setPersonaId(savedPersona);
      }
      const savedLang = localStorage.getItem(LANG_STORAGE);
      if (savedLang && LANGUAGES.some((l) => l.id === savedLang)) {
        setLanguageId(savedLang);
      }
      const savedTheme = localStorage.getItem(THEME_STORAGE);
      if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
        setThemeId(savedTheme);
      }
      const savedSys = localStorage.getItem(CUSTOM_SYSTEM_STORAGE);
      if (savedSys) setCustomSystem(savedSys);
      const savedTemp = localStorage.getItem(TEMPERATURE_STORAGE);
      if (savedTemp) {
        const n = Number(savedTemp);
        if (!Number.isNaN(n)) setTemperature(Math.min(2, Math.max(0, n)));
      }
      const savedMax = localStorage.getItem(MAX_TOKENS_STORAGE);
      if (savedMax) {
        const n = Number(savedMax);
        if (!Number.isNaN(n)) setMaxTokens(Math.min(8192, Math.max(64, Math.round(n))));
      }
      const savedConvs = localStorage.getItem(CONVERSATIONS_STORAGE);
      if (savedConvs) {
        const parsed = JSON.parse(savedConvs);
        if (parsed && Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
          setConversations(parsed.conversations);
          const nextActive =
            parsed.activeId && parsed.conversations.some((c: Conversation) => c.id === parsed.activeId)
              ? parsed.activeId
              : parsed.conversations[0].id;
          setActiveId(nextActive);
        }
      } else {
        // Migrate legacy single-chat storage into a first conversation
        const savedMsgs = localStorage.getItem(MESSAGES_STORAGE);
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstUser = parsed.find((m: Message) => m.role === "user");
            const title = firstUser?.text ? String(firstUser.text).slice(0, 40) : "Chat";
            const conv: Conversation = {
              id: crypto.randomUUID(),
              title,
              messages: parsed,
              updatedAt: Date.now(),
            };
            setConversations([conv]);
            setActiveId(conv.id);
          }
          localStorage.removeItem(MESSAGES_STORAGE);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Persist all conversations whenever they change (after mount to avoid overwriting on load)
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        CONVERSATIONS_STORAGE,
        JSON.stringify({ conversations, activeId }),
      );
    } catch { /* ignore */ }
  }, [conversations, activeId, mounted]);

  // Persist advanced AI settings
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(CUSTOM_SYSTEM_STORAGE, customSystem);
      localStorage.setItem(TEMPERATURE_STORAGE, String(temperature));
      localStorage.setItem(MAX_TOKENS_STORAGE, String(maxTokens));
    } catch { /* ignore */ }
  }, [customSystem, temperature, maxTokens, mounted]);

  // Keep the welcome message in sync with the active persona (only when active chat is fresh)
  useEffect(() => {
    setConversations((cs) =>
      cs.map((c) => {
        if (c.id !== activeId) return c;
        if (c.messages.length === 1 && c.messages[0].id === "welcome") {
          return { ...c, messages: [{ id: "welcome", role: "bot", text: persona.greeting }] };
        }
        return c;
      }),
    );
  }, [personaId, activeId]);

  const speak = (text: string, id?: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1.15;
      u.volume = 1;
      u.lang = language.bcp47;
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = language.bcp47.toLowerCase().split("-")[0];
      const preferred =
        voices.find((v) => v.lang?.toLowerCase() === language.bcp47.toLowerCase()) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix));
      if (preferred) u.voice = preferred;
      u.onend = () => setSpeakingId((cur) => (cur === (id ?? null) ? null : cur));
      u.onerror = () => setSpeakingId((cur) => (cur === (id ?? null) ? null : cur));
      setSpeakingId(id ?? null);
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };

  const toggleSpeakMessage = (id: string, text: string) => {
    playClick();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    speak(text, id);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (themeId === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", themeId);
    }
  }, [themeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (text: string, imageOverride?: string | null) => {
    const trimmed = text.trim();
    const image = imageOverride !== undefined ? imageOverride : pendingImage;
    if (!trimmed && !image) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: trimmed || (image ? "🖼️ (image)" : ""), image: image || undefined };
    const history: ChatTurn[] = messages
      .filter((m) => m.id !== "welcome")
      .map(({ role, text, image }) => ({ role, text, image }));
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPendingImage(null);
    setTyping(true);
    setWink(true);
    setTimeout(() => setWink(false), 700);

    // Auto-title new conversations from the first user message
    if (activeConv.title === "New chat" && trimmed) {
      const title = trimmed.slice(0, 40);
      setConversations((cs) => cs.map((c) => (c.id === activeConv.id ? { ...c, title } : c)));
    }

    if (!apiKey) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: "I need a Gemini API key to think! 🔑 Click the ⚙️ Settings icon at the top to add yours — you can grab a free key at aistudio.google.com/apikey.",
        },
      ]);
      setTyping(false);
      setShowSettings(true);
      playPop();
      return;
    }

    try {
      const extra = customSystem.trim() ? `\n\nAdditional user instructions:\n${customSystem.trim()}` : "";
      const systemInstruction = `${persona.system}\n\nAlways reply in ${language.name} (${language.nativeName}), regardless of the language the user writes in. Keep any code snippets in their original language.${extra}`;
      const started = Date.now();
      const reply = await callGemini(
        apiKey,
        history,
        trimmed || "Please describe this image.",
        systemInstruction,
        image || undefined,
        { temperature, maxOutputTokens: maxTokens },
      );
      const elapsed = Date.now() - started;
      setResponseTimes((r) => [...r, elapsed]);
      const botId = crypto.randomUUID();
      setMessages((m) => [...m, { id: botId, role: "bot", text: reply }]);
      playPop();
      if (voiceOn) speak(reply, botId);
    } catch (err: any) {
      const msg = err?.message || "Something went wrong reaching Gemini.";
      const invalid = /API key|rejected/i.test(msg);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: `⚠️ ${msg}${invalid ? " Open ⚙️ Settings to update it." : ""}`,
        },
      ]);
      if (invalid) setShowSettings(true);
      playPop();
    } finally {
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMicError("Please choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMicError("Image too large — please pick something under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      setMicError(null);
    };
    reader.readAsDataURL(file);
  };

  const clearChat = () => {
    playClick();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setMessages([{ id: "welcome", role: "bot", text: persona.greeting }]);
    setConversations((cs) =>
      cs.map((c) => (c.id === activeConv.id ? { ...c, title: "New chat" } : c)),
    );
    inputRef.current?.focus();
  };

  const newChat = () => {
    playClick();
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title: "New chat",
      messages: [{ id: "welcome", role: "bot", text: persona.greeting }],
      updatedAt: Date.now(),
    };
    setConversations((cs) => [conv, ...cs]);
    setActiveId(conv.id);
    setHistoryOpen(false);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    inputRef.current?.focus();
  };

  const selectConv = (id: string) => {
    if (id === activeId) {
      setHistoryOpen(false);
      return;
    }
    playClick();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setActiveId(id);
    setHistoryOpen(false);
  };

  const deleteConv = (id: string) => {
    playClick();
    setConversations((cs) => {
      const next = cs.filter((c) => c.id !== id);
      if (next.length === 0) {
        const conv: Conversation = {
          id: crypto.randomUUID(),
          title: "New chat",
          messages: [{ id: "welcome", role: "bot", text: persona.greeting }],
          updatedAt: Date.now(),
        };
        setActiveId(conv.id);
        return [conv];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameDraft(currentTitle);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const title = renameDraft.trim() || "Chat";
    setConversations((cs) => cs.map((c) => (c.id === renamingId ? { ...c, title } : c)));
    setRenamingId(null);
    setRenameDraft("");
  };

  const selectPersona = (id: string) => {
    playClick();
    setPersonaId(id);
    setPersonaOpen(false);
    try { localStorage.setItem(PERSONA_STORAGE, id); } catch { /* ignore */ }
  };

  const selectLanguage = (id: string) => {
    playClick();
    setLanguageId(id);
    setLangOpen(false);
    try { localStorage.setItem(LANG_STORAGE, id); } catch { /* ignore */ }
  };

  const selectTheme = (id: string) => {
    playClick();
    setThemeId(id);
    setThemeOpen(false);
    try { localStorage.setItem(THEME_STORAGE, id); } catch { /* ignore */ }
  };

  const buildTranscript = () => {
    const stamp = new Date().toLocaleString();
    const lines = [
      `Nova Chat Transcript`,
      `Persona: ${persona.name}`,
      `Exported: ${stamp}`,
      `${"-".repeat(40)}`,
      "",
    ];
    for (const m of messages) {
      const who = m.role === "user" ? "You" : "Nova";
      lines.push(`${who}:`);
      lines.push(m.text);
      lines.push("");
    }
    return lines.join("\n");
  };

  const exportTxt = () => {
    playClick();
    setExportOpen(false);
    const blob = new Blob([buildTranscript()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-chat-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    playClick();
    setExportOpen(false);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Nova Chat Transcript", margin, y);
    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Persona: ${persona.name}  •  Exported: ${new Date().toLocaleString()}`, margin, y);
    y += 20;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
    doc.setTextColor(30);

    const writeBlock = (label: string, body: string, labelColor: [number, number, number]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...labelColor);
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(label, margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30);
      const lines = doc.splitTextToSize(body, maxWidth);
      for (const line of lines) {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 15;
      }
      y += 8;
    };

    for (const m of messages) {
      if (m.role === "user") writeBlock("You", m.text, [37, 99, 235]);
      else writeBlock("Nova", m.text, [22, 163, 74]);
    }
    doc.save(`nova-chat-${Date.now()}.pdf`);
  };

  const toggleVoice = () => {
    playClick();
    setVoiceOn((v) => {
      const next = !v;
      if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
      return next;
    });
  };

  const handleSend = (text: string) => {
    playClick();
    send(text);
  };

  const openSettings = () => {
    playClick();
    setKeyDraft(apiKey);
    setShowKey(false);
    setShowSettings(true);
  };
  const saveKey = () => {
    playClick();
    const trimmed = keyDraft.trim();
    setApiKey(trimmed);
    try {
      if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch { /* ignore */ }
    setShowSettings(false);
  };
  const clearKey = () => {
    playClick();
    setKeyDraft("");
    setApiKey("");
    try { localStorage.removeItem(API_KEY_STORAGE); } catch { /* ignore */ }
  };

  const toggleListening = async () => {
    playClick();
    setMicError(null);
    if (!SpeechRecognitionCtor) {
      setMicError("Voice input isn't supported in this browser. Try Chrome on desktop.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    // Explicitly request mic permission from a user gesture so the browser prompts.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We only needed permission; SpeechRecognition manages its own stream.
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setMicError("Microphone blocked. Enable it in your browser's site settings and try again.");
      } else if (err?.name === "NotFoundError") {
        setMicError("No microphone found on this device.");
      } else if (err?.name === "NotReadableError") {
        setMicError("Your microphone is in use by another app.");
      } else {
        setMicError("Couldn't access the microphone. Please check permissions.");
      }
      return;
    }
    try {
      const rec = new SpeechRecognitionCtor();
      rec.lang = language.bcp47;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
      };
      rec.onend = () => setListening(false);
      rec.onerror = (e: any) => {
        setListening(false);
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          setMicError("Microphone permission denied.");
        } else if (e?.error === "no-speech") {
          setMicError("Didn't catch that — try speaking a bit louder.");
        } else if (e?.error === "network") {
          setMicError("Speech service is unreachable. Check your internet connection.");
        }
      };
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      setMicError("Couldn't start voice input. Please try again.");
    }
  };

  const rate = (id: string, value: Feedback) => {
    playClick();
    setMessages((ms) =>
      ms.map((m) => (m.id === id ? { ...m, feedback: m.feedback === value ? null : value } : m)),
    );
  };

  const [searchQuery, setSearchQuery] = useState("");
  const sortedConvs = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredConvs: { conv: Conversation; snippet: string | null }[] = trimmedQuery
    ? sortedConvs.reduce<{ conv: Conversation; snippet: string | null }[]>((acc, c) => {
        const titleHit = c.title.toLowerCase().includes(trimmedQuery);
        const msgHit = c.messages.find((m) => m.text.toLowerCase().includes(trimmedQuery));
        if (!titleHit && !msgHit) return acc;
        let snippet: string | null = null;
        if (msgHit) {
          const idx = msgHit.text.toLowerCase().indexOf(trimmedQuery);
          const start = Math.max(0, idx - 20);
          const end = Math.min(msgHit.text.length, idx + trimmedQuery.length + 30);
          snippet = (start > 0 ? "…" : "") + msgHit.text.slice(start, end) + (end < msgHit.text.length ? "…" : "");
        }
        acc.push({ conv: c, snippet });
        return acc;
      }, [])
    : sortedConvs.map((c) => ({ conv: c, snippet: null }));
  const chatList = (
    <div className="flex h-full flex-col">
      <button
        onClick={newChat}
        className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/25"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/60" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages…"
          className="w-full rounded-xl bg-white/15 py-1.5 pl-7 pr-7 text-xs text-white outline-none placeholder:text-white/60 focus:bg-white/25"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:bg-white/15 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {filteredConvs.map(({ conv: c, snippet }) => {
          const isActive = c.id === activeId;
          const isRenaming = renamingId === c.id;
          return (
            <div
              key={c.id}
              className={`group flex items-start gap-1 rounded-xl px-2 py-1.5 text-sm transition ${
                isActive ? "bg-white/25 text-white" : "text-white/85 hover:bg-white/10"
              }`}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") { setRenamingId(null); setRenameDraft(""); }
                  }}
                  className="flex-1 rounded-md bg-white/20 px-2 py-1 text-xs text-white outline-none placeholder:text-white/60"
                />
              ) : (
                <button
                  onClick={() => selectConv(c.id)}
                  className="flex-1 overflow-hidden text-left text-xs"
                  title={c.title}
                >
                  <div className="truncate">
                    <MessageCircle className="mr-1.5 inline h-3 w-3 opacity-70" />
                    {c.title}
                  </div>
                  {snippet && (
                    <div className="mt-0.5 truncate pl-4 text-[10px] text-white/60">{snippet}</div>
                  )}
                </button>
              )}
              {!isRenaming && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(c.id, c.title); }}
                    aria-label="Rename chat"
                    className="rounded p-1 text-white/60 opacity-0 transition hover:bg-white/15 hover:text-white group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConv(c.id); }}
                    aria-label="Delete chat"
                    className="rounded p-1 text-white/60 opacity-0 transition hover:bg-white/15 hover:text-white group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          );
        })}
        {filteredConvs.length === 0 && trimmedQuery && (
          <p className="px-2 py-3 text-xs text-white/60">No matches for “{searchQuery}”.</p>
        )}
        {sortedConvs.length === 0 && !trimmedQuery && (
          <p className="px-2 py-3 text-xs text-white/60">No chats yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-80 flex-col justify-between p-8 text-sidebar-foreground"
        style={{ background: "var(--gradient-sidebar)" }}
      >
        <div>
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <RobotAvatar size={40} winking={wink} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Nova</h1>
              <p className="text-xs uppercase tracking-widest text-white/70">Online</p>
            </div>
          </div>
          <p className="mt-8 text-sm leading-relaxed text-white/85">
            Your cheerful AI companion — here to chat, share jokes, and answer curious questions
            anytime you need a friendly voice.
          </p>
          <div className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
              Your chats
            </p>
            <div className="flex max-h-[52vh] flex-col">{chatList}</div>
          </div>
        </div>
        <p className="text-xs text-white/60">Made with 💙 for good conversations.</p>
      </aside>

      {/* Chat */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 backdrop-blur-sm md:px-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { playClick(); setHistoryOpen(true); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-accent md:hidden"
              aria-label="Open chat history"
              title="Chat history"
            >
              <History className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 md:hidden text-primary">
              <RobotAvatar size={28} winking={wink} floating={false} />
              <span className="font-semibold text-foreground">Nova</span>
            </div>
            {/* Persona selector */}
            <div className="relative">
              <button
                onClick={() => { playClick(); setPersonaOpen((o) => !o); setExportOpen(false); setLangOpen(false); setThemeOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                aria-haspopup="listbox"
                aria-expanded={personaOpen}
              >
                <span aria-hidden>{persona.emoji}</span>
                <span className="hidden sm:inline">{persona.name}</span>
                <span className="sm:hidden">Persona</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {personaOpen && (
                <div
                  className="absolute left-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                  role="listbox"
                >
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPersona(p.id)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent ${
                        p.id === personaId ? "bg-accent/60" : ""
                      }`}
                      role="option"
                      aria-selected={p.id === personaId}
                    >
                      <span className="text-base leading-none" aria-hidden>{p.emoji}</span>
                      <span className="flex-1">
                        <span className="block font-semibold text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground line-clamp-2">{p.system}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => { playClick(); setLangOpen((o) => !o); setPersonaOpen(false); setExportOpen(false); setThemeOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              title="Reply language"
            >
              <Globe className="h-3.5 w-3.5 opacity-70" />
              <span aria-hidden>{language.flag}</span>
              <span className="hidden sm:inline">{language.nativeName}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
            {langOpen && (
              <div
                className="absolute left-0 top-full z-40 mt-2 max-h-72 w-52 overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
                role="listbox"
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => selectLanguage(l.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent ${
                      l.id === languageId ? "bg-accent/60" : ""
                    }`}
                    role="option"
                    aria-selected={l.id === languageId}
                  >
                    <span className="text-base leading-none" aria-hidden>{l.flag}</span>
                    <span className="flex-1">
                      <span className="block font-semibold text-foreground">{l.nativeName}</span>
                      <span className="block text-[11px] text-muted-foreground">{l.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Theme selector */}
          <div className="relative">
            <button
              onClick={() => { playClick(); setThemeOpen((o) => !o); setPersonaOpen(false); setExportOpen(false); setLangOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
              aria-haspopup="listbox"
              aria-expanded={themeOpen}
              title="Background theme"
            >
              <Palette className="h-3.5 w-3.5 opacity-70" />
              <span aria-hidden>{theme.emoji}</span>
              <span className="hidden sm:inline">{theme.name}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
            {themeOpen && (
              <div
                className="absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                role="listbox"
              >
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTheme(t.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent ${
                      t.id === themeId ? "bg-accent/60" : ""
                    }`}
                    role="option"
                    aria-selected={t.id === themeId}
                  >
                    <span
                      className="h-5 w-5 flex-shrink-0 rounded-full border border-border"
                      style={{ background: t.gradient }}
                      aria-hidden
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-foreground">{t.emoji} {t.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export */}
            <div className="relative">
              <button
                onClick={() => { playClick(); setExportOpen((o) => !o); setPersonaOpen(false); setLangOpen(false); setThemeOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                aria-label="Export chat"
                title="Export chat"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  <button
                    onClick={exportPdf}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-accent"
                  >
                    <FileDown className="h-3.5 w-3.5 text-primary" />
                    Download as PDF
                  </button>
                  <button
                    onClick={exportTxt}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-accent"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Download as Text
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={toggleVoice}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:bg-accent ${
                voiceOn ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
              }`}
              aria-label={voiceOn ? "Mute bot voice" : "Unmute bot voice"}
              title={voiceOn ? "Voice on" : "Voice off"}
            >
              {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={openSettings}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:bg-accent ${
                apiKey ? "bg-background text-foreground" : "bg-destructive/10 text-destructive"
              }`}
              aria-label="Gemini API settings"
              title={apiKey ? "Gemini connected" : "Add Gemini API key"}
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={clearChat}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
              aria-label="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
            <button
              onClick={() => {
                playClick();
                setDark((d) => !d);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-accent"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex w-full items-start gap-2" style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "bot" && (
                    <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <RobotAvatar size={26} winking={wink} floating={false} />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-card text-card-foreground border border-border"
                    }`}
                  >
                    {m.image && (
                      <img
                        src={m.image}
                        alt="attachment"
                        className="mb-2 max-h-56 w-auto rounded-lg object-cover"
                      />
                    )}
                    {m.text && (
                      m.role === "bot"
                        ? <MessageContent text={m.text} />
                        : <div className="whitespace-pre-wrap">{m.text}</div>
                    )}
                  </div>
                </div>
                {m.role === "bot" && m.id !== "welcome" && (
                  <div className="mt-1 ml-11 flex items-center gap-1">
                    <button
                      onClick={() => rate(m.id, "up")}
                      aria-label="Good response"
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-accent ${
                        m.feedback === "up" ? "bg-accent text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => rate(m.id, "down")}
                      aria-label="Bad response"
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-accent ${
                        m.feedback === "down" ? "bg-accent text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {messages.length === 1 && messages[0].id === "welcome" && !typing && (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {persona.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="group rounded-2xl border border-border bg-card p-3 text-left text-xs text-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent"
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      <Sparkles className="h-3 w-3" />
                      Try asking
                    </div>
                    <div className="leading-snug">{s}</div>
                  </button>
                ))}
              </div>
            )}
            {typing && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <RobotAvatar size={26} winking={wink} floating={false} />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">Nova is thinking…</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions + composer */}
        <div className="border-t border-border bg-card/70 px-4 py-4 backdrop-blur-sm md:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => handleSend(label)}
                  disabled={typing}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onPickImage(e.target.files?.[0] ?? null);
                  if (e.target) e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => { playClick(); fileInputRef.current?.click(); }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-accent"
                aria-label="Attach image"
                title="Attach image"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={pendingImage ? "Ask about this image…" : "Type a message…"}
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border transition ${
                    listening
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-background text-foreground hover:bg-accent"
                  }`}
                  aria-label={listening ? "Stop recording" : "Speak your message"}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={(!input.trim() && !pendingImage) || typing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            {pendingImage && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background p-2">
                <img src={pendingImage} alt="preview" className="h-14 w-14 rounded-lg object-cover" />
                <span className="flex-1 text-xs text-muted-foreground">Image attached — Nova will look at this.</span>
                <button
                  type="button"
                  onClick={() => { playClick(); setPendingImage(null); }}
                  className="rounded-full p-1 text-muted-foreground hover:bg-accent"
                  aria-label="Remove attached image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {mounted && !voiceSupported && (
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Voice input isn't supported in this browser.
              </p>
            )}
            {micError && (
              <p className="mt-2 text-center text-[11px] text-destructive">{micError}</p>
            )}
          </div>
        </div>
      </main>
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          onClick={() => setHistoryOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="relative flex h-full w-72 max-w-[85vw] flex-col p-5 text-white shadow-2xl"
            style={{ background: "var(--gradient-sidebar)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Your chats</h2>
                <p className="text-[11px] uppercase tracking-widest text-white/70">History</p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/15"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">{chatList}</div>
          </aside>
        </div>
      )}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Gemini API Key</h2>
                  <p className="text-xs text-muted-foreground">Stored only in your browser.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs font-medium text-foreground">Your API key</label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
              <input
                type={showKey ? "text" : "password"}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Get a free key from Google AI Studio <ExternalLink className="h-3 w-3" />
            </a>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={clearKey}
                disabled={!apiKey && !keyDraft}
                className="text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-40"
              >
                Remove key
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={saveKey}
                  disabled={!keyDraft.trim()}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
