import { Show, createSignal } from "solid-js";
import { Button, Input, Modal } from "./index";

interface OnboardingModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
}

export function OnboardingModal(props: OnboardingModalProps) {
  const [step, setStep] = createSignal(1);
  const [apiKey, setApiKey] = createSignal("");

  const handleNext = () => {
    if (step() < 3) {
      setStep(step() + 1);
    } else {
      props.onClose();
    }
  };

  const handleSkip = () => {
    props.onClose();
  };

  return (
    <Modal open={props.isOpen} onClose={props.onClose} title="Get Started with Your Project">
      <div class="space-y-6">
        <Show when={step() === 1}>
          <div class="space-y-4">
            <div class="text-center">
              <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">Welcome to {props.projectName}!</h3>
              <p class="text-gray-600 text-sm">
                Let's get you set up in just a few steps. You'll be able to create API keys, set up storage, and start building.
              </p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">1</div>
                <span class="text-sm">Create your first API key</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-semibold">2</div>
                <span class="text-sm">Set up storage buckets</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-semibold">3</div>
                <span class="text-sm">Connect your application</span>
              </div>
            </div>
          </div>
        </Show>

        <Show when={step() === 2}>
          <div class="space-y-4">
            <div class="text-center mb-4">
              <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">Create Your First API Key</h3>
              <p class="text-gray-600 text-sm">
                API keys allow your applications to authenticate with Primora services.
              </p>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-800">
                <strong>Tip:</strong> You can create API keys from the Settings tab. Each key can have different permissions and scopes.
              </p>
            </div>
          </div>
        </Show>

        <Show when={step() === 3}>
          <div class="space-y-4">
            <div class="text-center mb-4">
              <div class="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">Connect Your Application</h3>
              <p class="text-gray-600 text-sm mb-4">
                Use the following code snippet to connect to your project:
              </p>
            </div>
            <div class="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-100 overflow-x-auto">
              <pre>{`import { PrimoraClient } from '@primora/client';

const client = new PrimoraClient({
  apiKey: 'your-api-key',
  projectId: '${props.projectName.toLowerCase().replace(/\s+/g, '-')}'
});

// Upload a file
await client.storage.upload('bucket-name', file);`}</pre>
            </div>
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p class="text-sm text-yellow-800">
                <strong>Documentation:</strong> Visit our docs to learn more about authentication, storage, and other features.
              </p>
            </div>
          </div>
        </Show>

        <div class="flex justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <div class="flex gap-2">
            <Show when={step() > 1}>
              <Button variant="outline" onClick={() => setStep(step() - 1)}>
                Back
              </Button>
            </Show>
            <Button onClick={handleNext}>
              {step() === 3 ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
