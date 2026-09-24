import { type JSX, Show, createEffect, createUniqueId, onCleanup, splitProps } from "solid-js";
import { Portal } from "solid-js/web";

interface ModalProps extends JSX.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  error?: JSX.Element;
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
    "error",
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
  const titleId = createUniqueId();
  const descriptionId = createUniqueId();

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
          aria-labelledby={local.title ? titleId : undefined}
          aria-describedby={local.description ? descriptionId : undefined}
        >
          {/* Backdrop */}
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => closeOnBackdrop() && local.onClose()}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div
            class={`relative w-full ${sizeClasses[size()]} bg-surface border border-border-strong rounded-xl shadow-lg animate-scale-in ${local.class ?? ""}`}
            {...rest}
          >
            {/* Header */}
            <Show when={local.title || showClose()}>
              <div class="flex items-start justify-between p-6 border-b border-border">
                <div class="flex-1">
                  <Show when={local.title}>
                    <h2 id={titleId} class="text-xl font-semibold text-text-1">
                      {local.title}
                    </h2>
                  </Show>
                  <Show when={local.description}>
                    <p id={descriptionId} class="mt-1.5 text-sm text-text-2">
                      {local.description}
                    </p>
                  </Show>
                </div>
                <Show when={showClose()}>
                  <button
                    class="ml-4 p-2 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors"
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
            <div class="p-6">
              <Show when={local.error}>
                <div class="message message-error mb-4" role="alert">
                  {local.error}
                </div>
              </Show>
              {local.children}
            </div>
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
