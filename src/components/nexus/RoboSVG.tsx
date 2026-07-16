import { BODY_COLORS } from "@/lib/nexus/constants";
import type { Customization } from "@/lib/nexus/types";

export function RoboSVG({ c, size = 44 }: { c: Customization; size?: number }) {
  const color = BODY_COLORS.find((x) => x.id === c.body) ?? BODY_COLORS[0];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" aria-hidden="true">
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

export function RoboAvatar({ talking, custom }: { talking: boolean; custom: Customization }) {
  return (
    <div className={`relative h-11 w-11 shrink-0 rounded-2xl bg-slate-900/60 p-1 ${talking ? "animate-pulse" : ""}`}>
      <RoboSVG c={custom} size={36} />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.8)]" aria-hidden="true" />
    </div>
  );
}