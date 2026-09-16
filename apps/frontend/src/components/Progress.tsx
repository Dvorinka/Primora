import { type JSX, Show, splitProps } from "solid-js";

interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const variantClasses = {
  default: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

export function Progress(props: ProgressProps) {
  const [local, rest] = splitProps(props, [
    "value",
    "max",
    "size",
    "variant",
    "showLabel",
    "label",
    "animated",
    "class",
  ]);

  const max = () => local.max ?? 100;
  const size = () => local.size ?? "md";
  const variant = () => local.variant ?? "default";
  const percentage = () => Math.min(100, Math.max(0, (local.value / max()) * 100));

  return (
    <div class={`w-full ${local.class ?? ""}`} {...rest}>
      <Show when={local.showLabel || local.label}>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-text-2">{local.label ?? "Progress"}</span>
          <span class="text-xs font-medium text-text-1">{Math.round(percentage())}%</span>
        </div>
      </Show>
      <div
        class={`w-full bg-surface-2 rounded-full overflow-hidden ${sizeClasses[size()]}`}
        role="progressbar"
        aria-valuenow={local.value}
        aria-valuemin={0}
        aria-valuemax={max()}
      >
        <div
          class={`h-full ${variantClasses[variant()]} transition-all duration-300 ease-out ${local.animated ? "animate-pulse" : ""}`}
          style={{ width: `${percentage()}%` }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: "default" | "success" | "warning" | "error";
  showLabel?: boolean;
}

export function CircularProgress(props: CircularProgressProps) {
  const max = () => props.max ?? 100;
  const size = () => props.size ?? 64;
  const strokeWidth = () => props.strokeWidth ?? 4;
  const variant = () => props.variant ?? "default";
  const percentage = () => Math.min(100, Math.max(0, (props.value / max()) * 100));

  const radius = () => (size() - strokeWidth()) / 2;
  const circumference = () => 2 * Math.PI * radius();
  const offset = () => circumference() - (percentage() / 100) * circumference();

  const colorMap = {
    default: "var(--accent)",
    success: "var(--success)",
    warning: "var(--warning)",
    error: "var(--error)",
  };

  return (
    <div class="relative inline-flex items-center justify-center">
      <svg
        width={size()}
        height={size()}
        class="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          stroke="var(--surface-2)"
          stroke-width={strokeWidth()}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          stroke={colorMap[variant()]}
          stroke-width={strokeWidth()}
          fill="none"
          stroke-dasharray={`${circumference()}`}
          stroke-dashoffset={`${offset()}`}
          stroke-linecap="round"
          class="transition-all duration-300 ease-out"
        />
      </svg>
      <Show when={props.showLabel}>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-sm font-semibold text-text-1">
            {Math.round(percentage())}%
          </span>
        </div>
      </Show>
    </div>
  );
}

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary";
}

const spinnerSizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[3px]",
};

export function Spinner(props: SpinnerProps) {
  const size = () => props.size ?? "md";
  const variant = () => props.variant ?? "default";

  return (
    <div
      class={`${spinnerSizeClasses[size()]} rounded-full animate-spin ${
        variant() === "primary"
          ? "border-accent border-t-transparent"
          : "border-surface-2 border-t-accent"
      }`}
      role="status"
      aria-label="Loading"
    >
      <span class="sr-only">Loading...</span>
    </div>
  );
}
