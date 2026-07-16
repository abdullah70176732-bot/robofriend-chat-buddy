import { Smile, Frown, Coffee, Flame } from "lucide-react";
import type { Achievement, EyeStyle, Hat, Mood } from "./types";

// LocalStorage keys — bump the version suffix if a shape changes.
export const SESSIONS_KEY = "robofriend_sessions_v1";
export const ACTIVE_KEY = "robofriend_active_v1";
export const THEME_KEY = "robofriend_theme_v1";
export const LANG_KEY = "robofriend_lang_v1";
export const CUSTOM_KEY = "robofriend_custom_v1";
export const ACH_KEY = "robofriend_achievements_v1";
export const STATS_KEY = "robofriend_stats_v1";
export const MEMORY_KEY = "nexus_memory_v1";
export const PRODUCTIVITY_KEY = "nexus_productivity_v1";

export const THEMES = [
  { id: "default", label: "Neon Blue" },
  { id: "sunset", label: "Sunset" },
  { id: "aurora", label: "Aurora" },
  { id: "midnight", label: "Midnight" },
  { id: "mint", label: "Mint" },
  { id: "rose", label: "Rose" },
] as const;

export const LANGUAGES = [
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

export const BODY_COLORS = [
  { id: "cyan", label: "Cyan", from: "#22d3ee", to: "#d946ef" },
  { id: "emerald", label: "Emerald", from: "#34d399", to: "#22d3ee" },
  { id: "sunset", label: "Sunset", from: "#fb923c", to: "#f43f5e" },
  { id: "violet", label: "Violet", from: "#a78bfa", to: "#ec4899" },
  { id: "gold", label: "Gold", from: "#fde047", to: "#f97316" },
  { id: "ice", label: "Ice", from: "#e0f2fe", to: "#60a5fa" },
];

export const EYES: { id: EyeStyle; label: string }[] = [
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
  { id: "star", label: "Star" },
  { id: "visor", label: "Visor" },
];

export const HATS: { id: Hat; label: string }[] = [
  { id: "none", label: "None" },
  { id: "party", label: "Party" },
  { id: "wizard", label: "Wizard" },
  { id: "crown", label: "Crown" },
  { id: "cap", label: "Cap" },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_chat", label: "First Chat!", desc: "Send your first message", icon: "💬" },
  { id: "chatty", label: "Chatterbox", desc: "Send 10 messages", icon: "🗨️" },
  { id: "recharge_5", label: "Power User", desc: "Recharge 5 times", icon: "🔋" },
  { id: "quest_all", label: "Quest Master", desc: "Complete all daily quests", icon: "🏆" },
  { id: "game_win", label: "Beat Nexus", desc: "Win a game vs Nexus", icon: "🎮" },
  { id: "game_streak", label: "Hot Streak", desc: "Win 3 games in a row", icon: "🔥" },
  { id: "customizer", label: "Style Icon", desc: "Customize your robot", icon: "🎨" },
  { id: "mood_swing", label: "Mood Explorer", desc: "Try every mood", icon: "🎭" },
];

export const MOODS: { id: Mood; label: string; icon: typeof Smile; greeting: string }[] = [
  { id: "happy", label: "Happy", icon: Smile, greeting: "Yesss! 🤖⚡ Your good vibes just charged my circuits! Let's make today legendary 🚀" },
  { id: "sad", label: "Sad", icon: Frown, greeting: "Aww, sensors detect cloudy skies 🤖💙 I'm here for you. Wanna talk, or shall I share something cozy?" },
  { id: "bored", label: "Bored", icon: Coffee, greeting: "Boredom mode? Not on my watch! 🤖✨ I've got jokes, quests, and wild what-ifs. Pick your poison!" },
  { id: "energetic", label: "Energetic", icon: Flame, greeting: "WHOA ⚡🚀 Energy levels off the charts! Let's channel it — workout, project, or a mini-adventure?" },
];

export const QUESTS = [
  "Drink a glass of water 💧",
  "Take 5 deep breaths 🌬️",
  "Message someone you care about 💌",
  "Stretch for 2 minutes 🤸",
  "Write down one win from today 🏆",
];