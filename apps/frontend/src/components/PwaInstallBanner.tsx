import { Show, createSignal, onCleanup, onMount } from "solid-js";

// Chromium fires `beforeinstallprompt` once manifest + service worker pass
// installability checks. Stash the event and let the banner trigger it —
// the native mini-infobar is easy to miss.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "primora_pwa_install_dismissed";

export function PwaInstallBanner() {
  const [deferred, setDeferred] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = createSignal(localStorage.getItem(DISMISS_KEY) === "1");

  onMount(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      // SAFETY: the listener is only attached to "beforeinstallprompt", whose
      // event always carries prompt()/userChoice.
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    onCleanup(() => window.removeEventListener("beforeinstallprompt", handler));
  });

  const install = async () => {
    const event = deferred();
    if (!event) return;
    await event.prompt();
    if ((await event.userChoice).outcome === "accepted") setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <Show when={deferred() && !dismissed()}>
      <div
        class="message message-info mb-5"
        style="display:flex;align-items:center;justify-content:space-between;gap:1rem"
      >
        <span>Install Primora as an app for quick access from your launcher.</span>
        <span style="display:flex;gap:0.5rem;flex-shrink:0">
          <button class="btn btn-primary btn-sm" onClick={install}>
            Install
          </button>
          <button class="btn btn-ghost btn-sm" onClick={dismiss}>
            Not now
          </button>
        </span>
      </div>
    </Show>
  );
}
