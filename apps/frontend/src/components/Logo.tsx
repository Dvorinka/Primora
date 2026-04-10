import { type JSX } from "solid-js";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  class?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
};

export function Logo(props: LogoProps) {
  const size = () => props.size ?? "md";
  const showText = () => props.showText ?? true;
  const animated = () => props.animated ?? true;

  return (
    <div class={`flex items-center gap-3 group ${props.class ?? ""}`}>
      <div
        class={`${sizeClasses[size()]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-accent via-accent-hover to-accent font-bold text-white shadow-lg ${animated() ? 'transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl' : ''}`}
        style={{
          "box-shadow": "0 4px 20px rgba(25, 163, 217, 0.3), 0 0 40px rgba(25, 163, 217, 0.15)",
        }}
      >
        <span class="relative z-10 font-display font-extrabold">P</span>
        {/* Animated glow effect */}
        {animated() && (
          <div 
            class="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
            style={{ "z-index": "-1" }}
          />
        )}
      </div>
      {showText() && (
        <div class="flex flex-col leading-none">
          <span 
            class={`${textSizeClasses[size()]} font-display font-bold tracking-tight bg-gradient-to-r from-text-primary via-accent to-text-primary bg-clip-text text-transparent ${animated() ? 'transition-all duration-300 group-hover:tracking-wide' : ''}`}
            style={{
              "background-size": "200% auto",
              "animation": animated() ? "shimmer 3s linear infinite" : "none",
            }}
          >
            PRIMORA
          </span>
          <span class="text-2xs text-text-muted font-medium tracking-widest uppercase mt-0.5">
            Platform
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoIcon(props: { class?: string; animated?: boolean }) {
  const animated = () => props.animated ?? false;

  return (
    <svg
      class={`${props.class ?? ''} ${animated() ? 'transition-transform duration-300 hover:scale-110 hover:rotate-6' : ''}`}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#19a3d9" />
          <stop offset="0.5" stop-color="#22b8f0" />
          <stop offset="1" stop-color="#19a3d9" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" filter="url(#glow)" />
      
      {/* P letter with modern design */}
      <path
        d="M10 9h7c3.866 0 7 3.134 7 7 0 3.866-3.134 7-7 7h-3v-5h3c1.657 0 3-1.343 3-3s-1.343-3-3-3h-5v14H10V9z"
        fill="white"
        opacity="0.95"
      />
      
      {/* Accent dot */}
      <circle cx="24" cy="24" r="2.5" fill="white" opacity="0.9">
        {animated() && (
          <animate
            attributeName="opacity"
            values="0.9;0.5;0.9"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </circle>
    </svg>
  );
}
