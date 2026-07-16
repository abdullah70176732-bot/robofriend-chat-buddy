// Shared domain types for the Nexus app.
export type Sentiment = "positive" | "neutral" | "analytical" | "negative";
export type Mood = "happy" | "sad" | "bored" | "energetic";
export type EyeStyle = "round" | "square" | "star" | "visor";
export type Hat = "none" | "party" | "wizard" | "crown" | "cap";
export type RPSChoice = "rock" | "paper" | "scissors";

export type Msg = {
  id: string;
  role: "user" | "bot";
  text: string;
  image?: string;
  sentiment?: Sentiment;
  ts?: number;
};

export type Session = {
  id: string;
  title: string;
  messages: Msg[];
  createdAt: number;
};

export type Customization = { body: string; eyes: EyeStyle; hat: Hat };

export type Achievement = { id: string; label: string; desc: string; icon: string };

export type MemoryTopic = { text: string; ts: number; sentiment: Sentiment };
export type Memory = { preferences: string[]; topics: MemoryTopic[] };
export type ProductivityDay = { date: string; score: number };