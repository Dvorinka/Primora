import { Show, createSignal, onMount } from "solid-js";
import { enableDemoMode } from "../lib/demo-mode";

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

  const handleDemoMode = () => {
    enableDemoMode();
  };

  return (
    <Show when={visible()}>
      <div class="network-error-toast">
        <div class="network-error-content">
          <svg class="network-error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="network-error-text">
            <div class="network-error-title">Connection Error</div>
            <div class="network-error-message">{props.error}</div>
            <div class="network-error-actions">
              <Show when={props.onRetry}>
                <button class="btn-sm btn-secondary" onClick={props.onRetry}>
                  Retry
                </button>
              </Show>
              <button class="btn-sm btn-primary" onClick={handleDemoMode}>
                Try Demo Mode
              </button>
              <button class="btn-sm btn-ghost" onClick={handleDismiss}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}

interface DemoBannerProps {
  onExit?: () => void;
}

export function DemoBanner(props: DemoBannerProps) {
  const [visible, setVisible] = createSignal(true);

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <Show when={visible()}>
      <div class="demo-banner">
        <svg class="demo-banner-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Demo Mode Active - All data is simulated</span>
        <Show when={props.onExit}>
          <button class="btn-sm btn-ghost text-white" onClick={props.onExit}>
            Exit Demo
          </button>
        </Show>
        <button class="demo-banner-close" onClick={handleClose} aria-label="Close">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Show>
  );
}
