import { LogoMark } from "./Icons";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  class?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Logo(props: LogoProps) {
  const size = () => props.size ?? "md";
  const showText = () => props.showText ?? true;

  return (
    <div class={`flex items-center gap-2.5 ${props.class ?? ""}`}>
      <LogoMark class={`${sizeClasses[size()]} text-accent`} />
      {showText() && (
        <span class={`${textSizeClasses[size()]} font-semibold tracking-tight text-text-1`}>
          Primora
        </span>
      )}
    </div>
  );
}

export function LogoIcon(props: { class?: string; animated?: boolean }) {
  return <LogoMark class={props.class ?? "h-6 w-6 text-accent"} />;
}
