import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, MessageCircle, Zap, Moon, Sun, Trash2, Mic, MicOff, ThumbsUp, ThumbsDown, Volume2, VolumeX, Settings, KeyRound, X, ExternalLink, Download, FileText, FileDown, ChevronDown, Globe, ImagePlus } from "lucide-react";
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
): Promise<string> {
  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];
  let lastMsg = "Something went wrong.";
  for (const model of models) {
    // Retry current model up to 3 times on 503, with exponential backoff.
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await callGeminiOnce(model, apiKey, history, userText, systemInstruction, userImage);
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
  const welcomeMsg: Message = { id: "welcome", role: "bot", text: persona.greeting };
  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
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
    } catch { /* ignore */ }
  }, []);

  // Keep the welcome message in sync with the active persona (only when chat is fresh)
  useEffect(() => {
    setMessages((ms) => {
      if (ms.length === 1 && ms[0].id === "welcome") {
        return [{ id: "welcome", role: "bot", text: persona.greeting }];
      }
      return ms;
    });
  }, [personaId]);

  const speak = (text: string) => {
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
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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
      const systemInstruction = `${persona.system}\n\nAlways reply in ${language.name} (${language.nativeName}), regardless of the language the user writes in. Keep any code snippets in their original language.`;
      const reply = await callGemini(apiKey, history, trimmed || "Please describe this image.", systemInstruction, image || undefined);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "bot", text: reply }]);
      playPop();
      if (voiceOn) speak(reply);
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
    inputRef.current?.focus();
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
          <div className="mt-10 space-y-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                What I can do
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>💬 Have a friendly chat</li>
                <li>😄 Tell you a joke</li>
                <li>🧠 Explain AI concepts</li>
                <li>👋 Cheer up your day</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="text-xs text-white/60">Made with 💙 for good conversations.</p>
      </aside>

      {/* Chat */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 backdrop-blur-sm md:px-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 md:hidden text-primary">
              <RobotAvatar size={28} winking={wink} floating={false} />
              <span className="font-semibold text-foreground">Nova</span>
            </div>
            {/* Persona selector */}
            <div className="relative">
              <button
                onClick={() => { playClick(); setPersonaOpen((o) => !o); setExportOpen(false); }}
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
              onClick={() => { playClick(); setLangOpen((o) => !o); setPersonaOpen(false); setExportOpen(false); }}
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
          </div>
          <div className="flex items-center gap-2">
            {/* Export */}
            <div className="relative">
              <button
                onClick={() => { playClick(); setExportOpen((o) => !o); setPersonaOpen(false); }}
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
                    {m.text}
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
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
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
                disabled={!input.trim() || typing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
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
