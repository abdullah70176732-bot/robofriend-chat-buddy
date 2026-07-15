import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, MessageCircle, Zap, Moon, Sun, Trash2, Mic, MicOff, ThumbsUp, ThumbsDown, Volume2, VolumeX } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Feedback = "up" | "down" | null;
type Message = { id: string; role: "user" | "bot"; text: string; feedback?: Feedback };

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
    return "Hey there! 👋 I'm RoboFriend — so glad you dropped by. What's on your mind today?";
  if (/how are you/.test(text)) return "I'm running at 100% happiness! 😊 How about you?";
  if (/your name/.test(text)) return "I'm RoboFriend, your always-cheerful chat buddy!";
  if (/thank/.test(text)) return "You're very welcome! 💙";
  if (/bye|goodbye/.test(text)) return "Bye for now! Come back anytime. 👋";
  return "That's interesting! Tell me more, or try one of the quick buttons below. 💬";
}

const QUICK = [
  { label: "Tell me a joke", icon: Sparkles },
  { label: "What is AI?", icon: Zap },
  { label: "Say Hello", icon: MessageCircle },
];

function Index() {
  const welcomeMsg: Message = {
    id: "welcome",
    role: "bot",
    text: "Hi! I'm RoboFriend 🤖 — ask me anything, or tap a quick button below to get started!",
  };
  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [dark, setDark] = useState(false);
  const [wink, setWink] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const voiceSupported = mounted && !!SpeechRecognitionCtor;

  useEffect(() => {
    setMounted(true);
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1.15;
      u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /female|zira|samantha|google.*english/i.test(v.name)) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
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

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setWink(true);
    setTimeout(() => setWink(false), 700);
    setTimeout(() => {
      const reply = botReply(trimmed);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "bot", text: reply },
      ]);
      setTyping(false);
      playPop();
      if (voiceOn) speak(reply);
      inputRef.current?.focus();
    }, 1000);
  };

  const clearChat = () => {
    playClick();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setMessages([welcomeMsg]);
    inputRef.current?.focus();
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
      rec.lang = "en-US";
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
              <h1 className="text-2xl font-bold tracking-tight">RoboFriend</h1>
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
          <div className="flex items-center gap-2 md:hidden text-primary">
            <RobotAvatar size={28} winking={wink} floating={false} />
            <span className="font-semibold text-foreground">RoboFriend</span>
          </div>
          <div className="hidden md:block text-sm text-muted-foreground">
            Chatting with <span className="font-semibold text-foreground">RoboFriend</span>
          </div>
          <div className="flex items-center gap-2">
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
            {typing && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <RobotAvatar size={26} winking={wink} floating={false} />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
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
    </div>
  );
}
