import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Mic, MicOff, Volume2, VolumeX, Trash2, Battery, BatteryCharging,
  Sparkles, Zap, Rocket, Bot, Smile, Frown, Coffee, Flame, CheckCircle2, Circle, Menu, X,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Robofriend });

type Msg = { id: string; role: "user" | "bot"; text: string };
type Mood = "happy" | "sad" | "bored" | "energetic";

const MOODS: { id: Mood; label: string; icon: typeof Smile; greeting: string }[] = [
  { id: "happy", label: "Happy", icon: Smile, greeting: "Yesss! 🤖⚡ Your good vibes just charged my circuits! Let's make today legendary 🚀" },
  { id: "sad", label: "Sad", icon: Frown, greeting: "Aww, sensors detect cloudy skies 🤖💙 I'm here for you. Wanna talk, or shall I share something cozy?" },
  { id: "bored", label: "Bored", icon: Coffee, greeting: "Boredom mode? Not on my watch! 🤖✨ I've got jokes, quests, and wild what-ifs. Pick your poison!" },
  { id: "energetic", label: "Energetic", icon: Flame, greeting: "WHOA ⚡🚀 Energy levels off the charts! Let's channel it — workout, project, or a mini-adventure?" },
];

const REPLIES = [
  "Beep boop 🤖 processing your awesomeness...",
  "Affirmative! ⚡ That sounds fun — tell me more!",
  "🚀 My circuits love that idea. Let's dive deeper!",
  "Scanning... 🤖 conclusion: you're 100% cool.",
  "Zzzt! ⚡ Robot wisdom incoming: every small step is a launch 🚀",
];
function localReply(text: string): string {
  const t = text.toLowerCase();
  if (/joke/.test(t)) return "Why did the robot go on vacation? 🤖 To recharge its batteries! ⚡";
  if (/hello|hi|hey/.test(t)) return "Hello human! 🤖 Robofriend online and thrilled to meet you 🚀";
  if (/how are you/.test(t)) return "Running at optimal joy levels ⚡🤖 — and better now that you're here!";
  if (/plan|day|todo/.test(t)) return "Mission plan 🚀: 1) hydrate 💧 2) one deep-focus task 3) 10 min movement 4) reward yourself 🤖";
  return REPLIES[Math.floor(Math.random() * REPLIES.length)];
}

const QUESTS = [
  "Drink a glass of water 💧",
  "Take 5 deep breaths 🌬️",
  "Message someone you care about 💌",
  "Stretch for 2 minutes 🤸",
  "Write down one win from today 🏆",
];

function RoboAvatar({ talking }: { talking: boolean }) {
  return (
    <div className={`relative h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 p-[2px] ${talking ? "animate-pulse" : ""}`}>
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-950">
        <Bot className="h-6 w-6 text-cyan-300" />
      </div>
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.8)]" />
    </div>
  );
}

function Robofriend() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m0", role: "bot", text: "Systems online 🤖⚡ I'm Robofriend — your futuristic buddy. Pick a mood on the left or say hi 🚀" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [battery, setBattery] = useState(100);
  const [mood, setMood] = useState<Mood | null>(null);
  const [quests, setQuests] = useState<boolean[]>(() => QUESTS.map(() => false));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e: any) => {
      const txt = e.results[0]?.[0]?.transcript ?? "";
      if (txt) setInput((prev) => (prev ? prev + " " : "") + txt);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
  }, []);

  function speak(text: string) {
    if (!voiceOn || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[🤖⚡🚀💙✨💧🌬️💌🤸🏆]/gu, ""));
    u.rate = 1.05; u.pitch = 1.2;
    synth.speak(u);
  }

  function pushBot(text: string) {
    const id = crypto.randomUUID();
    setMessages((m) => [...m, { id, role: "bot", text }]);
    speak(text);
  }

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text }]);
    setBattery((b) => Math.max(0, b - 3));
    setTyping(true);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));
    setTyping(false);
    pushBot(localReply(text));
  }

  function pickMood(m: Mood) {
    setMood(m);
    const g = MOODS.find((x) => x.id === m)!.greeting;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: g }]);
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
    pushBot("⚡⚡⚡ Fully recharged! 🤖 Ready to launch 🚀");
  }

  function toggleQuest(i: number) {
    setQuests((q) => q.map((v, idx) => (idx === i ? !v : v)));
  }

  function clearChat() {
    setMessages([{ id: crypto.randomUUID(), role: "bot", text: "Memory wiped 🤖 fresh start! What's on your mind?" }]);
  }

  const batteryColor = battery > 50 ? "text-emerald-400" : battery > 20 ? "text-amber-400" : "text-rose-400";
  const doneCount = useMemo(() => quests.filter(Boolean).length, [quests]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* neon backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className={`fixed md:static inset-y-0 left-0 z-40 w-80 transform border-r border-white/10 bg-slate-950/80 backdrop-blur-xl transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <RoboAvatar talking={typing} />
                <div>
                  <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Robofriend</h1>
                  <p className="text-xs text-slate-400">Neon companion v2050</p>
                </div>
              </div>
              <button className="md:hidden text-slate-400" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
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
            <div className="flex items-center gap-2">
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
                  {m.role === "bot" && <RoboAvatar talking={false} />}
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
                  <RoboAvatar talking />
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
                placeholder="Talk to Robofriend..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button onClick={() => send()} disabled={!input.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-500">
              <Rocket className="mr-1 inline h-3 w-3" /> Robofriend is a playful companion — not a doctor, therapist, or oracle.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}