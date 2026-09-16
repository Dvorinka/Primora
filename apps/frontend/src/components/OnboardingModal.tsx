import { For, Show, createSignal } from "solid-js";
import { Modal } from "./Modal";
import { IconCheck } from "./Icons";

interface OnboardingModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
}

const steps = [
  {
    title: "Welcome aboard",
    body: (projectName: string) =>
      `${projectName} is ready. Three things worth doing first:`,
    list: [
      "Create an API key in Settings",
      "Create a storage bucket for files",
      "Invite teammates from Members",
    ],
  },
  {
    title: "Authenticate requests",
    body: () =>
      "Every API call needs either a session JWT (this console uses it) or an X-API-Key header scoped to the project. Keys are shown once — store them like passwords.",
  },
  {
    title: "Wire up your app",
    body: () =>
      "Point your client at /api/v1 on this host. The OpenAPI spec is served at /api/v1/openapi.yaml — regenerate the TypeScript client with `npm run generate:client`.",
  },
];

export function OnboardingModal(props: OnboardingModalProps) {
  const [step, setStep] = createSignal(0);

  const handleClose = () => {
    setStep(0);
    props.onClose();
  };

  return (
    <Modal open={props.isOpen} onClose={handleClose} title="Get started" size="sm">
      <div class="space-y-4">
        {/* step indicator */}
        <div class="flex items-center gap-1.5">
          <For each={steps}>
            {(_, i) => (
              <div
                class="flex-1 rounded-full"
                style={`height:3px;background:${i() <= step() ? "var(--accent)" : "var(--surface-3)"}`}
              />
            )}
          </For>
        </div>

        <div>
          <h3 style="font-size:0.9375rem">{steps[step()].title}</h3>
          <p class="mt-1.5 text-sm text-text-2">{steps[step()].body(props.projectName)}</p>
          <Show when={steps[step()].list}>
            <ul class="mt-3 space-y-2">
              <For each={steps[step()].list}>
                {(item) => (
                  <li class="flex items-center gap-2 text-sm text-text-2">
                    <span
                      class="flex items-center justify-center w-4 h-4 rounded-full"
                      style="background:var(--accent-muted);color:var(--accent)"
                    >
                      <IconCheck class="w-2.5 h-2.5" />
                    </span>
                    {item}
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class="flex items-center justify-between pt-2" style="border-top:1px solid var(--border)">
          <button class="btn btn-ghost btn-sm" onClick={handleClose}>
            Skip
          </button>
          <div class="flex gap-2">
            <Show when={step() > 0}>
              <button class="btn btn-secondary btn-sm" onClick={() => setStep(step() - 1)}>
                Back
              </button>
            </Show>
            <button
              class="btn btn-primary btn-sm"
              onClick={() => (step() < steps.length - 1 ? setStep(step() + 1) : handleClose())}
            >
              {step() === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
