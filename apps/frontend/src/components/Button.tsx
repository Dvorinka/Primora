import { type JSX, Show, splitProps } from "solid-js";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: JSX.Element;
  iconPosition?: "left" | "right";
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  outline: "btn-secondary border border-gray-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "icon",
    "iconPosition",
    "children",
    "class",
    "disabled",
  ]);

  const variant = () => local.variant ?? "secondary";
  const size = () => local.size ?? "md";
  const iconPosition = () => local.iconPosition ?? "left";

  return (
    <button
      class={`btn ${variantClasses[variant()]} ${sizeClasses[size()]} ${local.class ?? ""}`}
      disabled={local.disabled ?? local.loading}
      aria-busy={local.loading}
      {...rest}
    >
      <Show when={local.loading}>
        <span class="spinner" aria-hidden="true" />
      </Show>
      <Show when={local.icon && !local.loading && iconPosition() === "left"}>
        <span class="shrink-0 flex items-center">{local.icon}</span>
      </Show>
      <Show when={local.children}>
        <span class={local.loading ? "opacity-0" : ""}>{local.children}</span>
      </Show>
      <Show when={local.icon && !local.loading && iconPosition() === "right"}>
        <span class="shrink-0 flex items-center">{local.icon}</span>
      </Show>
    </button>
  );
}
