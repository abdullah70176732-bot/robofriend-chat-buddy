import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Send, Mic, MicOff, Volume2, VolumeX, Trash2, Battery, BatteryCharging,
  Sparkles, Zap, Rocket, Bot, Smile, Frown, Coffee, Flame, CheckCircle2, Circle, Menu, X,
  Palette, Globe, Plus, MessageSquare, Wand2, Gamepad2, Trophy, Award,
  BarChart3, ImagePlus, Brain,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: NexusApp });

type Msg = { id: string; role: "user" | "bot"; text: string; image?: string; sentiment?: Sentiment; ts?: number };
type Sentiment = "positive" | "neutral" | "analytical" | "negative";
type Mood = "happy" | "sad" | "bored" | "energetic";
type Session = { id: string; title: string; messages: Msg[]; createdAt: number };
type EyeStyle = "round" | "square" | "star" | "visor";
type Hat = "none" | "party" | "wizard" | "crown" | "cap";
type Customization = { body: string; eyes: EyeStyle; hat: Hat };
type RPSChoice = "rock" | "paper" | "scissors";
type Achievement = { id: string; label: string; desc: string; icon: string };

const THEMES = [
  { id: "default", label: "Neon Blue" },
  { id: "sunset", label: "Sunset" },
  { id: "aurora", label: "Aurora" },
  { id: "midnight", label: "Midnight" },
  { id: "mint", label: "Mint" },
  { id: "rose", label: "Rose" },
] as const;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
] as const;

const SESSIONS_KEY = "robofriend_sessions_v1";
const ACTIVE_KEY = "robofriend_active_v1";
const THEME_KEY = "robofriend_theme_v1";
const LANG_KEY = "robofriend_lang_v1";
const CUSTOM_KEY = "robofriend_custom_v1";
const ACH_KEY = "robofriend_achievements_v1";
const STATS_KEY = "robofriend_stats_v1";
const MEMORY_KEY = "nexus_memory_v1";
const PRODUCTIVITY_KEY = "nexus_productivity_v1";

type MemoryTopic = { text: string; ts: number; sentiment: Sentiment };
type Memory = { preferences: string[]; topics: MemoryTopic[] };
type ProductivityDay = { date: string; score: number };

// Simple lexical sentiment classifier — good enough for a weekly trend chart.
function classifySentiment(text: string): Sentiment {
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
function extractPreferences(text: string): string[] {
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Build a compact retrieval block for the model, biased to recent + query-relevant topics.
function buildMemoryContext(mem: Memory, query: string): string {
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

const BODY_COLORS = [
  { id: "cyan", label: "Cyan", from: "#22d3ee", to: "#d946ef" },
  { id: "emerald", label: "Emerald", from: "#34d399", to: "#22d3ee" },
  { id: "sunset", label: "Sunset", from: "#fb923c", to: "#f43f5e" },
  { id: "violet", label: "Violet", from: "#a78bfa", to: "#ec4899" },
  { id: "gold", label: "Gold", from: "#fde047", to: "#f97316" },
  { id: "ice", label: "Ice", from: "#e0f2fe", to: "#60a5fa" },
];

const EYES: { id: EyeStyle; label: string }[] = [
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
  { id: "star", label: "Star" },
  { id: "visor", label: "Visor" },
];

const HATS: { id: Hat; label: string }[] = [
  { id: "none", label: "None" },
  { id: "party", label: "Party" },
  { id: "wizard", label: "Wizard" },
  { id: "crown", label: "Crown" },
  { id: "cap", label: "Cap" },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: "first_chat", label: "First Chat!", desc: "Send your first message", icon: "💬" },
  { id: "chatty", label: "Chatterbox", desc: "Send 10 messages", icon: "🗨️" },
  { id: "recharge_5", label: "Power User", desc: "Recharge 5 times", icon: "🔋" },
  { id: "quest_all", label: "Quest Master", desc: "Complete all daily quests", icon: "🏆" },
  { id: "game_win", label: "Beat Nexus", desc: "Win a game vs Nexus", icon: "🎮" },
  { id: "game_streak", label: "Hot Streak", desc: "Win 3 games in a row", icon: "🔥" },
  { id: "customizer", label: "Style Icon", desc: "Customize your robot", icon: "🎨" },
  { id: "mood_swing", label: "Mood Explorer", desc: "Try every mood", icon: "🎭" },
];

const MOODS: { id: Mood; label: string; icon: typeof Smile; greeting: string }[] = [
  { id: "happy", label: "Happy", icon: Smile, greeting: "Yesss! 🤖⚡ Your good vibes just charged my circuits! Let's make today legendary 🚀" },
  { id: "sad", label: "Sad", icon: Frown, greeting: "Aww, sensors detect cloudy skies 🤖💙 I'm here for you. Wanna talk, or shall I share something cozy?" },
  { id: "bored", label: "Bored", icon: Coffee, greeting: "Boredom mode? Not on my watch! 🤖✨ I've got jokes, quests, and wild what-ifs. Pick your poison!" },
  { id: "energetic", label: "Energetic", icon: Flame, greeting: "WHOA ⚡🚀 Energy levels off the charts! Let's channel it — workout, project, or a mini-adventure?" },
];

const QUESTS = [
  "Drink a glass of water 💧",
  "Take 5 deep breaths 🌬️",
  "Message someone you care about 💌",
  "Stretch for 2 minutes 🤸",
  "Write down one win from today 🏆",
];

function RoboSVG({ c, size = 44 }: { c: Customization; size?: number }) {
  const color = BODY_COLORS.find((x) => x.id === c.body) ?? BODY_COLORS[0];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
      <defs>
        <linearGradient id={`body-${c.body}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color.from} />
          <stop offset="100%" stopColor={color.to} />
        </linearGradient>
      </defs>
      {/* antenna */}
      <line x1="32" y1="10" x2="32" y2="16" stroke={color.to} strokeWidth="1.5" />
      <circle cx="32" cy="9" r="2" fill={color.to} />
      {/* head */}
      <rect x="14" y="16" width="36" height="30" rx="8" fill={`url(#body-${c.body})`} />
      <rect x="14" y="16" width="36" height="30" rx="8" fill="none" stroke="rgba(255,255,255,0.25)" />
      {/* eyes */}
      {c.eyes === "round" && (
        <>
          <circle cx="24" cy="30" r="4" fill="#0f172a" />
          <circle cx="40" cy="30" r="4" fill="#0f172a" />
          <circle cx="25" cy="29" r="1.2" fill="#fff" />
          <circle cx="41" cy="29" r="1.2" fill="#fff" />
        </>
      )}
      {c.eyes === "square" && (
        <>
          <rect x="20" y="26" width="8" height="8" rx="1" fill="#0f172a" />
          <rect x="36" y="26" width="8" height="8" rx="1" fill="#0f172a" />
          <rect x="22" y="28" width="2" height="2" fill="#22d3ee" />
          <rect x="38" y="28" width="2" height="2" fill="#22d3ee" />
        </>
      )}
      {c.eyes === "star" && (
        <>
          <text x="24" y="34" fontSize="10" textAnchor="middle" fill="#fde047">★</text>
          <text x="40" y="34" fontSize="10" textAnchor="middle" fill="#fde047">★</text>
        </>
      )}
      {c.eyes === "visor" && (
        <rect x="18" y="26" width="28" height="6" rx="3" fill="#0f172a" stroke="#22d3ee" strokeWidth="0.6" />
      )}
      {/* mouth */}
      <rect x="24" y="38" width="16" height="3" rx="1.5" fill="rgba(15,23,42,0.7)" />
      {/* body */}
      <rect x="20" y="48" width="24" height="12" rx="4" fill={`url(#body-${c.body})`} opacity="0.9" />
      {/* hats */}
      {c.hat === "party" && (
        <polygon points="32,2 24,16 40,16" fill="#f43f5e" stroke="#fff" strokeWidth="0.5" />
      )}
      {c.hat === "wizard" && (
        <>
          <polygon points="32,0 22,18 42,18" fill="#6366f1" />
          <circle cx="28" cy="8" r="1" fill="#fde047" />
          <circle cx="34" cy="12" r="0.8" fill="#fff" />
        </>
      )}
      {c.hat === "crown" && (
        <polygon points="18,16 22,8 26,14 32,6 38,14 42,8 46,16" fill="#fde047" stroke="#f97316" strokeWidth="0.5" />
      )}
      {c.hat === "cap" && (
        <>
          <path d="M14,16 Q32,4 50,16 Z" fill="#22d3ee" />
          <rect x="14" y="15" width="36" height="3" fill="#0891b2" />
        </>
      )}
    </svg>
  );
}

function RoboAvatar({ talking, custom }: { talking: boolean; custom: Customization }) {
  return (
    <div className={`relative h-11 w-11 shrink-0 rounded-2xl bg-slate-900/60 p-1 ${talking ? "animate-pulse" : ""}`}>
      <RoboSVG c={custom} size={36} />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.8)]" />
    </div>
  );
}

function makeSession(): Session {
  return {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    title: "New chat",
    createdAt: Date.now(),
    messages: [
      { id: "m0", role: "bot", text: "Systems online 🤖⚡ I'm Nexus — your futuristic buddy. Pick a mood, chat, or ask me anything 🚀" },
    ],
  };
}

function NexusApp() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [battery, setBattery] = useState(100);
  const [mood, setMood] = useState<Mood | null>(null);
  const [quests, setQuests] = useState<boolean[]>(() => QUESTS.map(() => false));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<string>("default");
  const [language, setLanguage] = useState<string>("en");
  const [custom, setCustom] = useState<Customization>({ body: "cyan", eyes: "round", hat: "none" });
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [stats, setStats] = useState({ recharges: 0, msgs: 0, wins: 0, streak: 0, moods: [] as Mood[] });
  const [panel, setPanel] = useState<"none" | "avatar" | "game" | "achievements">("none");
  const [rpsUser, setRpsUser] = useState<RPSChoice | null>(null);
  const [rpsBot, setRpsBot] = useState<RPSChoice | null>(null);
  const [rpsScore, setRpsScore] = useState({ user: 0, bot: 0 });
  const [rpsMsg, setRpsMsg] = useState<string>("Make your move!");
  const [toast, setToast] = useState<Achievement | null>(null);
  const [memory, setMemory] = useState<Memory>({ preferences: [], topics: [] });
  const [productivity, setProductivity] = useState<ProductivityDay[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = sessions.find((s) => s.id === activeId);
  const messages = active?.messages ?? [];

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      const savedActive = localStorage.getItem(ACTIVE_KEY) || "";
      const savedTheme = localStorage.getItem(THEME_KEY) || "default";
      const savedLang = localStorage.getItem(LANG_KEY) || "en";
      let list: Session[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || list.length === 0) list = [makeSession()];
      const activeExists = list.find((s) => s.id === savedActive);
      setSessions(list);
      setActiveId(activeExists ? savedActive : list[0].id);
      setTheme(savedTheme);
      setLanguage(savedLang);
      const savedCustom = localStorage.getItem(CUSTOM_KEY);
      if (savedCustom) setCustom(JSON.parse(savedCustom));
      const savedAch = localStorage.getItem(ACH_KEY);
      if (savedAch) setUnlocked(JSON.parse(savedAch));
      const savedStats = localStorage.getItem(STATS_KEY);
      if (savedStats) setStats(JSON.parse(savedStats));
      const savedMem = localStorage.getItem(MEMORY_KEY);
      if (savedMem) setMemory(JSON.parse(savedMem));
      const savedProd = localStorage.getItem(PRODUCTIVITY_KEY);
      if (savedProd) setProductivity(JSON.parse(savedProd));
    } catch {
      const s = makeSession();
      setSessions([s]);
      setActiveId(s.id);
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* noop */ }
  }, [sessions, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(THEME_KEY, theme);
    if (theme === "default") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [theme, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(LANG_KEY, language); }, [language, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)); }, [custom, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(ACH_KEY, JSON.stringify(unlocked)); }, [unlocked, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }, [stats, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); }, [memory, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(PRODUCTIVITY_KEY, JSON.stringify(productivity)); }, [productivity, hydrated]);

  // Recompute today's productivity score whenever quests change.
  useEffect(() => {
    if (!hydrated) return;
    const score = Math.round((quests.filter(Boolean).length / QUESTS.length) * 100);
    setProductivity((list) => {
      const key = todayKey();
      const rest = list.filter((d) => d.date !== key);
      return [...rest, { date: key, score }].slice(-30);
    });
  }, [quests, hydrated]);

  function unlock(id: string) {
    if (unlocked.includes(id)) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return;
    setUnlocked((u) => [...u, id]);
    setToast(ach);
    setTimeout(() => setToast(null), 3800);
    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#22d3ee", "#d946ef", "#a78bfa", "#fde047"] });
    } catch { /* noop */ }
  }

  // Auto-unlock checks
  useEffect(() => {
    if (!hydrated) return;
    if (stats.msgs >= 1) unlock("first_chat");
    if (stats.msgs >= 10) unlock("chatty");
    if (stats.recharges >= 5) unlock("recharge_5");
    if (stats.wins >= 1) unlock("game_win");
    if (stats.streak >= 3) unlock("game_streak");
    if (stats.moods.length >= MOODS.length) unlock("mood_swing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (quests.every(Boolean)) unlock("quest_all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quests, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = language;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e: any) => {
      const txt = e.results[0]?.[0]?.transcript ?? "";
      if (txt) setInput((prev) => (prev ? prev + " " : "") + txt);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
  }, [language]);

  function speak(text: string) {
    if (!voiceOn || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[🤖⚡🚀💙✨💧🌬️💌🤸🏆]/gu, ""));
    u.rate = 1.05; u.pitch = 1.2; u.lang = language;
    synth.speak(u);
  }

  function updateActive(fn: (s: Session) => Session) {
    setSessions((list) => list.map((s) => (s.id === activeId ? fn(s) : s)));
  }

  function pushBot(text: string) {
    const id = crypto.randomUUID();
    updateActive((s) => ({ ...s, messages: [...s.messages, { id, role: "bot", text }] }));
    speak(text);
  }

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if ((!text && !pendingImage) || !active) return;
    setInput("");
    const image = pendingImage;
    setPendingImage(null);
    const sentiment = classifySentiment(text || "shared an image");
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: text || "(shared an image)", image: image || undefined, sentiment, ts: Date.now() };
    const nextMessages = [...active.messages, userMsg];
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";
    updateActive((s) => ({
      ...s,
      title: s.messages.length <= 1 ? text.slice(0, 40) : s.title,
      messages: nextMessages,
    }));
    setBattery((b) => Math.max(0, b - 3));
    setStats((s) => ({ ...s, msgs: s.msgs + 1 }));

    // RAG: update long-term memory with extracted preferences and this topic.
    const newPrefs = extractPreferences(text);
    const topicText = text.slice(0, 140);
    const updatedMemory: Memory = {
      preferences: Array.from(new Set([...memory.preferences, ...newPrefs])).slice(-20),
      topics: [...memory.topics, ...(topicText ? [{ text: topicText, ts: Date.now(), sentiment }] : [])].slice(-60),
    };
    setMemory(updatedMemory);
    const memoryContext = buildMemoryContext(updatedMemory, text);

    setTyping(true);
    try {
      const payload = {
        language: langLabel,
        memory: memoryContext,
        messages: nextMessages.map((m, idx) => {
          const role = m.role === "bot" ? ("assistant" as const) : ("user" as const);
          // Attach the image only on the final user turn using multimodal parts.
          if (idx === nextMessages.length - 1 && m.image) {
            return {
              role,
              content: [
                { type: "text", text: m.text || "What's in this image?" },
                { type: "image_url", image_url: { url: m.image } },
              ],
            };
          }
          return { role, content: m.text };
        }),
      };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      const reply = data.text || "Beep boop 🤖 (empty reply)";
      const botMsg: Msg = { id: crypto.randomUUID(), role: "bot", text: reply, sentiment: classifySentiment(reply), ts: Date.now() };
      updateActive((s) => ({ ...s, messages: [...s.messages, botMsg] }));
      speak(reply);
    } catch (err: any) {
      pushBot(`⚠️ Circuits fizzled: ${err?.message || "unknown error"}. Try again in a moment 🤖`);
    } finally {
      setTyping(false);
    }
  }

  function handleImagePick(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image too large (max 5MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function clearMemory() {
    setMemory({ preferences: [], topics: [] });
  }

  function pickMood(m: Mood) {
    if (!active) return;
    setMood(m);
    setStats((s) => (s.moods.includes(m) ? s : { ...s, moods: [...s.moods, m] }));
    const g = MOODS.find((x) => x.id === m)!.greeting;
    updateActive((s) => ({ ...s, messages: [...s.messages, { id: crypto.randomUUID(), role: "bot", text: g }] }));
    speak(g);
  }

  function toggleMic() {
    const r = recogRef.current;
    if (!r) { alert("Voice input isn't supported in this browser."); return; }
    if (listening) { r.stop(); setListening(false); return; }
    try { r.start(); setListening(true); } catch { /* already started */ }
  }

  function recharge() {
    setBattery(100);
    setStats((s) => ({ ...s, recharges: s.recharges + 1 }));
    pushBot("⚡⚡⚡ Fully recharged! 🤖 Ready to launch 🚀");
  }

  function playRPS(choice: RPSChoice) {
    const options: RPSChoice[] = ["rock", "paper", "scissors"];
    const bot = options[Math.floor(Math.random() * 3)];
    setRpsUser(choice); setRpsBot(bot);
    if (choice === bot) { setRpsMsg("It's a tie! 🤝"); return; }
    const userWins =
      (choice === "rock" && bot === "scissors") ||
      (choice === "paper" && bot === "rock") ||
      (choice === "scissors" && bot === "paper");
    if (userWins) {
      setRpsScore((s) => ({ ...s, user: s.user + 1 }));
      setRpsMsg("You win this round! 🎉");
      setStats((s) => ({ ...s, wins: s.wins + 1, streak: s.streak + 1 }));
    } else {
      setRpsScore((s) => ({ ...s, bot: s.bot + 1 }));
      setRpsMsg("Nexus wins! 🤖⚡");
      setStats((s) => ({ ...s, streak: 0 }));
    }
  }

  function updateCustom(patch: Partial<Customization>) {
    setCustom((c) => ({ ...c, ...patch }));
    unlock("customizer");
  }

  function toggleQuest(i: number) {
    setQuests((q) => q.map((v, idx) => (idx === i ? !v : v)));
  }

  function clearChat() {
    updateActive((s) => ({ ...s, messages: [{ id: crypto.randomUUID(), role: "bot", text: "Memory wiped 🤖 fresh start! What's on your mind?" }] }));
  }

  function newChat() {
    const s = makeSession();
    setSessions((list) => [s, ...list]);
    setActiveId(s.id);
    setSidebarOpen(false);
  }

  function deleteChat(id: string) {
    setSessions((list) => {
      const next = list.filter((s) => s.id !== id);
      if (next.length === 0) {
        const fresh = makeSession();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  const batteryColor = battery > 50 ? "text-emerald-400" : battery > 20 ? "text-amber-400" : "text-rose-400";
  const doneCount = useMemo(() => quests.filter(Boolean).length, [quests]);
  const rpsEmoji = (c: RPSChoice | null) => (c === "rock" ? "✊" : c === "paper" ? "✋" : c === "scissors" ? "✌️" : "❔");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* neon backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      </div>
      {/* theme-driven overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: "var(--gradient-bg)" }} />

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className={`fixed md:static inset-y-0 left-0 z-40 w-80 transform border-r border-white/10 bg-slate-950/80 backdrop-blur-xl transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RoboAvatar talking={typing} custom={custom} />
                <div>
                  <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Nexus</h1>
                  <p className="text-xs text-slate-400">Neon companion v2050</p>
                </div>
              </div>
              <button className="md:hidden text-slate-400" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            {/* Feature buttons */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => setPanel("avatar")} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-2 text-[10px] text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200 transition">
                <Wand2 className="h-4 w-4" /> Avatar
              </button>
              <button onClick={() => setPanel("game")} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-2 text-[10px] text-slate-200 hover:border-fuchsia-400/40 hover:text-fuchsia-200 transition">
                <Gamepad2 className="h-4 w-4" /> Games
              </button>
              <button onClick={() => setPanel("achievements")} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-2 text-[10px] text-slate-200 hover:border-amber-400/40 hover:text-amber-200 transition">
                <Trophy className="h-4 w-4" /> Awards
              </button>
            </div>

            {/* Chat sessions */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Chats</h2>
                <button onClick={newChat} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200 transition">
                  <Plus className="h-3 w-3" /> New
                </button>
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div key={s.id} className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${s.id === activeId ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"}`}>
                    <button onClick={() => { setActiveId(s.id); setSidebarOpen(false); }} className="flex flex-1 items-center gap-2 truncate text-left">
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </button>
                    <button onClick={() => deleteChat(s.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-300 transition" title="Delete">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Battery */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Battery className={`h-4 w-4 ${batteryColor}`} /> Robot Battery
                </div>
                <span className={`text-sm font-bold ${batteryColor}`}>{battery}%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full transition-all duration-500 ${battery > 50 ? "bg-emerald-400" : battery > 20 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${battery}%` }} />
              </div>
              <button onClick={recharge} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110">
                <BatteryCharging className="h-4 w-4" /> Recharge ⚡
              </button>
            </div>

            {/* Mood */}
            <div className="mt-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Your Mood</h2>
              <div className="grid grid-cols-2 gap-2">
                {MOODS.map((m) => {
                  const Icon = m.icon;
                  const active = mood === m.id;
                  return (
                    <button key={m.id} onClick={() => pickMood(m.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${active ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"}`}>
                      <Icon className="h-4 w-4" /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quests */}
            <div className="mt-5 flex-1 overflow-y-auto">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Daily Quests</h2>
                <span className="text-xs text-slate-400">{doneCount}/{QUESTS.length}</span>
              </div>
              <ul className="space-y-2">
                {QUESTS.map((q, i) => (
                  <li key={i}>
                    <button onClick={() => toggleQuest(i)}
                      className={`flex w-full items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm transition hover:border-white/20 ${quests[i] ? "opacity-60 line-through" : ""}`}>
                      {quests[i] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                      <span>{q}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
              <Sparkles className="h-4 w-4 text-fuchsia-300" /> Powered by playful circuits
            </div>
          </div>
        </aside>

        {/* Main chat */}
        <main className="flex min-h-screen flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl md:px-6">
            <div className="flex items-center gap-3">
              <button className="md:hidden rounded-lg border border-white/10 p-2 text-slate-300" onClick={() => setSidebarOpen(true)}><Menu className="h-4 w-4" /></button>
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-300">
                <Zap className="h-4 w-4 text-cyan-300" /> Live chat
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300">
                <Palette className="h-4 w-4 text-fuchsia-300" />
                <select value={theme} onChange={(e) => setTheme(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none">
                  {THEMES.map((t) => <option key={t.id} value={t.id} className="bg-slate-900">{t.label}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300">
                <Globe className="h-4 w-4 text-cyan-300" />
                <select value={language} onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none">
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code} className="bg-slate-900">{l.label}</option>)}
                </select>
              </label>
              <button onClick={() => setVoiceOn((v) => !v)} title="Read aloud"
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${voiceOn ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"}`}>
                {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Voice
              </button>
              <button onClick={clearChat} title="Clear chat"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-rose-400/40 hover:text-rose-200 transition">
                <Trash2 className="h-4 w-4" /> Clear
              </button>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex items-end gap-3 ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  {m.role === "bot" && <RoboAvatar talking={false} custom={custom} />}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-cyan-500 to-fuchsia-600 text-white shadow-fuchsia-500/20"
                      : "border border-white/10 bg-white/5 text-slate-100 backdrop-blur"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex items-end gap-3">
                  <RoboAvatar talking custom={custom} />
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-300 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-300" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick chips */}
          <div className="border-t border-white/10 bg-slate-950/60 px-4 py-2 backdrop-blur-xl md:px-8">
            <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
              {["Tell me a joke 🤖", "Plan my day 🚀", "Cheer me up ⚡", "Say hello"].map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-cyan-500/5">
              <button onClick={toggleMic} title="Voice input"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${listening ? "bg-rose-500/20 text-rose-300 animate-pulse" : "text-slate-300 hover:bg-white/10"}`}>
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Talk to Nexus..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button onClick={() => send()} disabled={!input.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-500">
              <Rocket className="mr-1 inline h-3 w-3" /> Nexus is a playful companion — not a doctor, therapist, or oracle.
            </p>
          </div>
        </main>
      </div>

      {/* Modal panels */}
      {panel !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPanel("none")}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-500/10">
            <button onClick={() => setPanel("none")} className="absolute right-4 top-4 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>

            {panel === "avatar" && (
              <div>
                <h2 className="mb-1 text-xl font-bold bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Robot Customizer</h2>
                <p className="mb-4 text-xs text-slate-400">Design your Nexus — style updates live.</p>
                <div className="mb-4 grid place-items-center rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                  <RoboSVG c={custom} size={140} />
                </div>
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Body Color</h3>
                  <div className="flex flex-wrap gap-2">
                    {BODY_COLORS.map((b) => (
                      <button key={b.id} onClick={() => updateCustom({ body: b.id })} title={b.label}
                        className={`h-9 w-9 rounded-full border-2 transition ${custom.body === b.id ? "border-white scale-110" : "border-white/20 hover:border-white/50"}`}
                        style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }} />
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Eyes</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {EYES.map((e) => (
                      <button key={e.id} onClick={() => updateCustom({ eyes: e.id })}
                        className={`rounded-xl border px-2 py-2 text-xs transition ${custom.eyes === e.id ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"}`}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Hat</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {HATS.map((h) => (
                      <button key={h.id} onClick={() => updateCustom({ hat: h.id })}
                        className={`rounded-xl border px-2 py-2 text-xs transition ${custom.hat === h.id ? "border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"}`}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {panel === "game" && (
              <div>
                <h2 className="mb-1 text-xl font-bold bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Rock · Paper · Scissors</h2>
                <p className="mb-4 text-xs text-slate-400">Face off against Nexus!</p>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <div className="text-xs text-slate-400">You</div>
                    <div className="my-2 text-5xl">{rpsEmoji(rpsUser)}</div>
                    <div className="text-2xl font-bold text-cyan-300">{rpsScore.user}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <div className="text-xs text-slate-400">Nexus</div>
                    <div className="my-2 text-5xl">{rpsEmoji(rpsBot)}</div>
                    <div className="text-2xl font-bold text-fuchsia-300">{rpsScore.bot}</div>
                  </div>
                </div>
                <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/60 py-3 text-center text-sm text-slate-200">{rpsMsg}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["rock", "paper", "scissors"] as RPSChoice[]).map((c) => (
                    <button key={c} onClick={() => playRPS(c)}
                      className="rounded-xl border border-white/10 bg-white/5 py-3 text-3xl hover:border-cyan-400/40 hover:bg-cyan-400/10 transition">
                      {rpsEmoji(c)}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setRpsScore({ user: 0, bot: 0 }); setRpsUser(null); setRpsBot(null); setRpsMsg("Make your move!"); }}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs text-slate-300 hover:border-rose-400/40 hover:text-rose-200 transition">
                  Reset scores
                </button>
              </div>
            )}

            {panel === "achievements" && (
              <div>
                <h2 className="mb-1 text-xl font-bold bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Achievements</h2>
                <p className="mb-4 text-xs text-slate-400">{unlocked.length}/{ACHIEVEMENTS.length} unlocked</p>
                <ul className="space-y-2">
                  {ACHIEVEMENTS.map((a) => {
                    const got = unlocked.includes(a.id);
                    return (
                      <li key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${got ? "border-amber-400/40 bg-amber-400/10" : "border-white/10 bg-white/5 opacity-60"}`}>
                        <div className={`grid h-10 w-10 place-items-center rounded-lg text-xl ${got ? "bg-amber-400/20" : "bg-white/5 grayscale"}`}>{a.icon}</div>
                        <div className="flex-1">
                          <div className={`text-sm font-semibold ${got ? "text-amber-200" : "text-slate-300"}`}>{a.label}</div>
                          <div className="text-xs text-slate-400">{a.desc}</div>
                        </div>
                        {got && <Award className="h-4 w-4 text-amber-300" />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Achievement toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-amber-500/20 animate-in slide-in-from-right duration-300">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/20 text-xl">{toast.icon}</div>
          <div>
            <div className="text-xs text-amber-300">Achievement unlocked!</div>
            <div className="text-sm font-semibold text-slate-100">{toast.label}</div>
          </div>
        </div>
      )}
    </div>
  );
}