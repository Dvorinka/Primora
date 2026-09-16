import { type JSX, For, Show, splitProps } from "solid-js";

type MessageVariant = "info" | "success" | "warning" | "error" | "neutral";

interface MessageProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: MessageVariant;
  title?: string;
  icon?: JSX.Element;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantClasses: Record<MessageVariant, string> = {
  info: "message-info",
  success: "message-success",
  warning: "message-warning",
  error: "message-error",
  neutral: "message-neutral",
};

export function Message(props: MessageProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "title",
    "icon",
    "dismissible",
    "onDismiss",
    "children",
    "class",
  ]);

  const variant = () => local.variant ?? "neutral";

  return (
    <div
      class={`${variantClasses[variant()]} ${local.class ?? ""}`}
      role="alert"
      {...rest}
    >
      <div class="flex gap-3">
        <Show when={local.icon}>
          <div class="flex-shrink-0">{local.icon}</div>
        </Show>
        <div class="flex-1">
          <Show when={local.title}>
            <p class="font-medium">{local.title}</p>
          </Show>
          <div class={local.title ? "mt-1" : ""}>{local.children}</div>
        </div>
        <Show when={local.dismissible}>
          <button
            class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            onClick={local.onDismiss}
            aria-label="Dismiss"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Show>
      </div>
    </div>
  );
}

interface LoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function Loading(props: LoadingProps) {
  const size = () => props.size ?? "md";

  return (
    <div class="flex items-center gap-3 text-text-2 animate-fade-in">
      <div class={`${sizeClasses[size()]} spinner`} />
      <Show when={props.text}>
        <span class="text-sm font-medium">{props.text}</span>
      </Show>
    </div>
  );
}

interface SkeletonProps {
  class?: string;
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedClasses = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton(props: SkeletonProps) {
  const rounded = () => props.rounded ?? "md";

  return (
    <div
      class={`skeleton shimmer ${roundedClasses[rounded()]} ${props.class ?? ""}`}
      style={{
        width: props.width,
        height: props.height,
      }}
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard(props: SkeletonCardProps) {
  const lines = () => props.lines ?? 3;

  return (
    <div class="card space-y-3">
      <Skeleton width="40%" height="14px" />
      <For each={Array.from({ length: lines() })}>
        {(_, i) => (
          <Skeleton
            width={i() === lines() - 1 ? "60%" : "100%"}
            height="12px"
          />
        )}
      </For>
    </div>
  );
}
