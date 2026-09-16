import { type JSX, For, Show, createSignal } from "solid-js";
import { Portal } from "solid-js/web";

type ToastVariant = "info" | "success" | "warning" | "error";

interface Toast {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  icon?: JSX.Element;
}

const [toasts, setToasts] = createSignal<Toast[]>([]);

const variantConfig = {
  info: {
    bg: "bg-info-muted",
    border: "border-info/25",
    text: "text-info",
    icon: (
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    bg: "bg-success-muted",
    border: "border-success/25",
    text: "text-success",
    icon: (
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: "bg-warning-muted",
    border: "border-warning/25",
    text: "text-warning",
    icon: (
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  error: {
    bg: "bg-error-muted",
    border: "border-error/25",
    text: "text-error",
    icon: (
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export const toast = {
  show: (options: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    const duration = options.duration ?? 5000;

    setToasts((prev) => [...prev, { ...options, id }]);

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }

    return id;
  },
  success: (message: string, title?: string, duration?: number) => {
    return toast.show({ variant: "success", message, title, duration });
  },
  error: (message: string, title?: string, duration?: number) => {
    return toast.show({ variant: "error", message, title, duration });
  },
  warning: (message: string, title?: string, duration?: number) => {
    return toast.show({ variant: "warning", message, title, duration });
  },
  info: (message: string, title?: string, duration?: number) => {
    return toast.show({ variant: "info", message, title, duration });
  },
  dismiss: (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  },
  dismissAll: () => {
    setToasts([]);
  },
};

export function ToastContainer() {
  return (
    <Portal>
      <div
        class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        <For each={toasts()}>
          {(item) => {
            const config = variantConfig[item.variant];
            return (
              <div
                class={`${config.bg} ${config.border} border rounded-lg shadow-lg p-4 flex gap-3 animate-slide-up pointer-events-auto`}
                role="alert"
              >
                <div class={`flex-shrink-0 ${config.text}`}>
                  {item.icon ?? config.icon}
                </div>
                <div class="flex-1 min-w-0">
                  <Show when={item.title}>
                    <p class={`font-semibold text-sm ${config.text}`}>{item.title}</p>
                  </Show>
                  <p class={`text-sm ${item.title ? "mt-1" : ""} ${config.text}`}>
                    {item.message}
                  </p>
                </div>
                <button
                  class={`flex-shrink-0 ${config.text} opacity-70 hover:opacity-100 transition-opacity`}
                  onClick={() => toast.dismiss(item.id)}
                  aria-label="Dismiss notification"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </Portal>
  );
}
