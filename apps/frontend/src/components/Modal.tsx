import { type JSX, Show, createEffect, onCleanup, splitProps } from "solid-js";
import { Portal } from "solid-js/web";

interface ModalProps extends JSX.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  showClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-full mx-4",
};

export function Modal(props: ModalProps) {
  const [local, rest] = splitProps(props, [
    "open",
    "onClose",
    "title",
    "description",
    "size",
    "closeOnEscape",
    "closeOnBackdrop",
    "showClose",
    "children",
    "class",
  ]);

  const size = () => local.size ?? "md";
  const closeOnEscape = () => local.closeOnEscape ?? true;
  const closeOnBackdrop = () => local.closeOnBackdrop ?? true;
  const showClose = () => local.showClose ?? true;

  createEffect(() => {
    if (local.open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  });

  createEffect(() => {
    if (!local.open || !closeOnEscape()) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        local.onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    onCleanup(() => document.removeEventListener("keydown", handleEscape));
  });

  onCleanup(() => {
    document.body.style.overflow = "";
  });

  return (
    <Show when={local.open}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby={local.title ? "modal-title" : undefined}
          aria-describedby={local.description ? "modal-description" : undefined}
        >
          {/* Backdrop */}
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => closeOnBackdrop() && local.onClose()}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div
            class={`relative w-full ${sizeClasses[size()]} bg-surface-1 border border-border-strong rounded-xl shadow-elevated animate-scale-in ${local.class ?? ""}`}
            {...rest}
          >
            {/* Header */}
            <Show when={local.title || showClose()}>
              <div class="flex items-start justify-between p-6 border-b border-border">
                <div class="flex-1">
                  <Show when={local.title}>
                    <h2 id="modal-title" class="text-xl font-semibold text-text-primary">
                      {local.title}
                    </h2>
                  </Show>
                  <Show when={local.description}>
                    <p id="modal-description" class="mt-1.5 text-sm text-text-secondary">
                      {local.description}
                    </p>
                  </Show>
                </div>
                <Show when={showClose()}>
                  <button
                    class="ml-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                    onClick={local.onClose}
                    aria-label="Close modal"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Show>
              </div>
            </Show>

            {/* Body */}
            <div class="p-6">{local.children}</div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}

interface ModalFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "right" | "between" | "center";
}

export function ModalFooter(props: ModalFooterProps) {
  const [local, rest] = splitProps(props, ["align", "children", "class"]);

  const alignClass = () => {
    switch (local.align) {
      case "left":
        return "justify-start";
      case "right":
        return "justify-end";
      case "between":
        return "justify-between";
      case "center":
        return "justify-center";
      default:
        return "justify-end";
    }
  };

  return (
    <div
      class={`flex items-center gap-3 px-6 pb-6 ${alignClass()} ${local.class ?? ""}`}
      {...rest}
    >
      {local.children}
    </div>
  );
}
