import { type JSX, splitProps } from "solid-js";

type BadgeVariant = "primary" | "success" | "warning" | "error" | "neutral";

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "badge-primary",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  neutral: "badge-neutral",
};

export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ["variant", "children", "class"]);

  const variant = () => local.variant ?? "neutral";

  return (
    <span class={`${variantClasses[variant()]} ${local.class ?? ""}`} {...rest}>
      {local.children}
    </span>
  );
}

interface StatusBadgeProps {
  status: "pending" | "active" | "completed" | "error" | "expired";
}

const statusMap: Record<StatusBadgeProps["status"], { variant: BadgeVariant; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  active: { variant: "primary", label: "Active" },
  completed: { variant: "success", label: "Completed" },
  error: { variant: "error", label: "Error" },
  expired: { variant: "neutral", label: "Expired" },
};

export function StatusBadge(props: StatusBadgeProps) {
  const config = () => statusMap[props.status];

  return <Badge variant={config().variant}>{config().label}</Badge>;
}
