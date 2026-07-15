import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Bot, Sparkles, MessageCircle, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Message = { id: string; role: "user" | "bot"; text: string };

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi! I'm RoboFriend 🤖 — ask me anything, or tap a quick button below to get started!",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "bot", text: botReply(trimmed) },
      ]);
      setTyping(false);
      inputRef.current?.focus();
    }, 550);
  };

  return (
    <div className="flex min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-80 flex-col justify-between p-8 text-sidebar-foreground"
        style={{ background: "var(--gradient-sidebar)" }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Bot className="h-7 w-7" />
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
        <header className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-4 backdrop-blur-sm md:hidden">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">RoboFriend</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "bot" && (
                  <div className="mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
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
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
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
                  onClick={() => send(label)}
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
                send(input);
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
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
