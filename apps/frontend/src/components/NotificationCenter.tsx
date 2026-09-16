import { Show, For, createSignal } from "solid-js";
import { Portal } from "solid-js/web";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const [notifications, setNotifications] = createSignal<Notification[]>([]);

export function addNotification(notification: Omit<Notification, "id">) {
  const id = Math.random().toString(36).substring(7);
  const duration = notification.duration ?? 5000;
  const newNotification: Notification = {
    ...notification,
    id,
    duration,
  };

  setNotifications(prev => [...prev, newNotification]);

  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }

  return id;
}

export function removeNotification(id: string) {
  setNotifications(prev => prev.filter(n => n.id !== id));
}

export function clearNotifications() {
  setNotifications([]);
}

export function NotificationCenter() {
  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return (
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "error":
        return (
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "warning":
        return (
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "info":
        return (
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColors = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-success-muted border-success/25 text-success";
      case "error":
        return "bg-error-muted border-error/25 text-error";
      case "warning":
        return "bg-warning-muted border-warning/25 text-warning";
      case "info":
        return "bg-info-muted border-info/25 text-info";
    }
  };

  const getIconColors = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "text-success";
      case "error":
        return "text-error";
      case "warning":
        return "text-warning";
      case "info":
        return "text-info";
    }
  };

  return (
    <Portal>
      <div class="fixed top-4 right-4 z-50 space-y-3 max-w-md">
        <For each={notifications()}>
          {(notification) => (
            <div
              class={`${getColors(notification.type)} border rounded-lg shadow-lg p-4 animate-toast-in`}
            >
              <div class="flex items-start gap-3">
                <div class={`flex-shrink-0 ${getIconColors(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-sm">{notification.title}</h4>
                  <Show when={notification.message}>
                    <p class="text-sm mt-1 opacity-90">{notification.message}</p>
                  </Show>
                  <Show when={notification.action}>
                    <button
                      onClick={notification.action!.onClick}
                      class="text-sm font-medium mt-2 underline hover:no-underline"
                    >
                      {notification.action!.label}
                    </button>
                  </Show>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}

// Convenience functions
export const notify = {
  success: (title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: "success", title, message, ...options }),
  
  error: (title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: "error", title, message, duration: 7000, ...options }),
  
  warning: (title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: "warning", title, message, ...options }),
  
  info: (title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: "info", title, message, ...options }),
};
