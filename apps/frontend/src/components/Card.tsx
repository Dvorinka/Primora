import { type JSX, Show, splitProps } from "solid-js";

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

const variantClasses = {
  default: "card",
  elevated: "card-elevated",
  interactive: "card-interactive",
};

const paddingClasses = {
  none: "!p-0",
  sm: "!p-3",
  md: "",
  lg: "!p-6",
};

export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ["variant", "padding", "hoverable", "children", "class"]);

  const variant = () => local.variant ?? "default";
  const padding = () => local.padding ?? "md";

  return (
    <div
      class={`${variantClasses[variant()]} ${paddingClasses[padding()]} ${local.hoverable ? "card-interactive" : ""} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </div>
  );
}

interface CardHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function CardHeader(props: CardHeaderProps) {
  const [local, rest] = splitProps(props, ["eyebrow", "title", "description", "class"]);

  return (
    <div class={`card-header ${local.class ?? ""}`} {...rest}>
      <Show when={local.eyebrow}>
        <p class="text-xs font-semibold text-accent uppercase tracking-wider mb-1">{local.eyebrow}</p>
      </Show>
      <h3 class="card-header-title">{local.title}</h3>
      <Show when={local.description}>
        <p class="card-header-description">{local.description}</p>
      </Show>
    </div>
  );
}

interface CardContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Apply subtle background tint */
  tint?: boolean;
}

export function CardContent(props: CardContentProps) {
  const [local, rest] = splitProps(props, ["tint", "children", "class"]);

  return (
    <div
      class={`space-y-4 ${local.tint ? "bg-surface-2/30 -mx-4 -mb-4 px-4 pb-4 pt-4 rounded-b-lg" : ""} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </div>
  );
}

interface CardFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Align actions to the right */
  align?: "left" | "right" | "between";
}

export function CardFooter(props: CardFooterProps) {
  const [local, rest] = splitProps(props, ["align", "children", "class"]);

  const alignClass = () => {
    switch (local.align) {
      case "right":
        return "justify-end";
      case "between":
        return "justify-between";
      default:
        return "justify-start";
    }
  };

  return (
    <div
      class={`flex items-center gap-3 pt-4 mt-4 border-t border-border ${alignClass()} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: JSX.Element;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  description?: string;
}

export function StatCard(props: StatCardProps) {
  return (
    <div class="stat-card group">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="stat-label">{props.label}</p>
          <p class="stat-value">{props.value}</p>
          <Show when={props.description}>
            <p class="text-xs text-text-3 mt-1.5 leading-relaxed">{props.description}</p>
          </Show>
        </div>
        <Show when={props.icon}>
          <div class="text-text-3 opacity-40 group-hover:opacity-60 transition-opacity">{props.icon}</div>
        </Show>
      </div>
      <Show when={props.trend && props.trendValue}>
        <div
          class={`mt-3 text-xs flex items-center gap-1.5 font-medium ${
            props.trend === "up"
              ? "text-success"
              : props.trend === "down"
                ? "text-error"
                : "text-text-3"
          }`}
        >
          <Show when={props.trend === "up"}>
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </Show>
          <Show when={props.trend === "down"}>
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </Show>
          {props.trendValue}
        </div>
      </Show>
    </div>
  );
}
