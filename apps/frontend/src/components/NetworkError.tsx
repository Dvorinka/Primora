import { Show, createSignal } from "solid-js";
import { enableDemoMode } from "../lib/demo-mode";
import { IconAlert, IconX } from "./Icons";

interface NetworkErrorProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function NetworkError(props: NetworkErrorProps) {
  const [visible, setVisible] = createSignal(true);

  const handleDismiss = () => {
    setVisible(false);
    props.onDismiss?.();
  };

  return (
    <Show when={visible()}>
      <div
        class="fixed bottom-4 right-4 z-[100] animate-toast-in"
        role="alert"
        style="max-width:24rem"
      >
        <div
          class="card"
          style="border-color:rgba(248,113,113,0.4);box-shadow:var(--shadow-lg)"
        >
          <div class="flex gap-3">
            <span style="color:var(--error);flex-shrink:0">
              <IconAlert class="w-5 h-5" />
            </span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm text-text-1">Connection error</div>
              <div class="text-xs text-text-3 mt-0.5">{props.error}</div>
              <div class="flex gap-2 mt-3">
                <Show when={props.onRetry}>
                  <button class="btn btn-secondary btn-sm" onClick={props.onRetry}>
                    Retry
                  </button>
                </Show>
                <button class="btn btn-primary btn-sm" onClick={enableDemoMode}>
                  Try demo mode
                </button>
                <button class="btn btn-ghost btn-sm" onClick={handleDismiss}>
                  Dismiss
                </button>
              </div>
            </div>
            <button class="icon-btn" style="width:1.5rem;height:1.5rem" onClick={handleDismiss} aria-label="Dismiss">
              <IconX class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
