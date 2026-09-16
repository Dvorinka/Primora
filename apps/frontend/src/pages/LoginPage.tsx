import { Show } from "solid-js";
import { Input } from "../components/Input";
import {
  LogoMark,
  LogoGithub,
  LogoGoogle,
  LogoDiscord,
  LogoMicrosoft,
} from "../components/Icons";

type AuthMode = "sign-in" | "sign-up";
type Provider = "github" | "google" | "discord" | "microsoft";

interface LoginPageProps {
  mode: AuthMode;
  email: string;
  password: string;
  name: string;
  authMessage: string;
  authPending: boolean;
  onModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: SubmitEvent) => void;
  onSocial: (provider: Provider) => void;
  onTryDemo?: () => void;
}

const socialProviders: { id: Provider; label: string; logo: (p: { class?: string }) => import("solid-js").JSX.Element }[] = [
  { id: "github", label: "GitHub", logo: LogoGithub },
  { id: "google", label: "Google", logo: LogoGoogle },
  { id: "discord", label: "Discord", logo: LogoDiscord },
  { id: "microsoft", label: "Microsoft", logo: LogoMicrosoft },
];

export function LoginPage(props: LoginPageProps) {
  const isSignIn = () => props.mode === "sign-in";

  return (
    <div class="auth-wrap">
      {/* brand panel */}
      <aside class="auth-brand" aria-hidden="true">
        <div class="auth-brand-grid" />
        <div class="auth-brand-inner">
          <div class="flex items-center gap-2.5">
            <LogoMark class="w-6 h-6 text-accent" />
            <span class="font-semibold tracking-tight" style="color: var(--text-1)">Primora</span>
          </div>
        </div>
        <div class="auth-brand-inner">
          <p class="auth-tagline">The console for your self-hosted backend.</p>
          <p class="mt-3" style="font-size: 0.875rem; color: var(--text-3); max-width: 22rem;">
            Storage, documents, credentials and audit — one Postgres, one API, your hardware.
          </p>
        </div>
        <div class="auth-points">
          <div class="auth-point">Every mutation lands in the audit log</div>
          <div class="auth-point">Generated TypeScript client, straight from OpenAPI</div>
          <div class="auth-point">No hosted tier — your data never leaves the box</div>
        </div>
      </aside>

      {/* form panel */}
      <main class="auth-panel">
        <div class="auth-card animate-scale-in">
          <div class="mb-8">
            <div class="flex items-center gap-2.5 mb-6" style="min-width: 0">
              <LogoMark class="w-5 h-5 text-accent" />
              <span class="font-semibold tracking-tight" style="color: var(--text-1)">Primora</span>
            </div>
            <h1 style="font-size: 1.25rem; letter-spacing: -0.02em;">
              {isSignIn() ? "Sign in" : "Create your account"}
            </h1>
            <p class="mt-1" style="font-size: 0.8125rem; color: var(--text-3)">
              {isSignIn()
                ? "Access your workspace"
                : "One account for the whole workspace"}
            </p>
          </div>

          {/* mode toggle */}
          <div class="seg mb-6" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={isSignIn()}
              class={`seg-item ${isSignIn() ? "active" : ""}`}
              onClick={() => props.onModeChange("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isSignIn()}
              class={`seg-item ${!isSignIn() ? "active" : ""}`}
              onClick={() => props.onModeChange("sign-up")}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={props.onSubmit} class="space-y-4">
            <Show when={!isSignIn()}>
              <Input
                label="Name"
                type="text"
                placeholder="Ada Lovelace"
                value={props.name}
                onInput={(e) => props.onNameChange(e.currentTarget.value)}
                autocomplete="name"
                required
              />
            </Show>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={props.email}
              onInput={(e) => props.onEmailChange(e.currentTarget.value)}
              autocomplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={props.password}
              onInput={(e) => props.onPasswordChange(e.currentTarget.value)}
              autocomplete={isSignIn() ? "current-password" : "new-password"}
              required
            />

            <Show when={props.authMessage}>
              <div class="message message-neutral">{props.authMessage}</div>
            </Show>

            <button
              type="submit"
              class="btn btn-primary w-full"
              disabled={props.authPending}
            >
              <Show
                when={props.authPending}
                fallback={isSignIn() ? "Sign in" : "Create account"}
              >
                <span class="spinner" /> Working…
              </Show>
            </button>
          </form>

          <div class="divider my-6">or continue with</div>

          <div class="grid grid-cols-4 gap-2">
            {socialProviders.map((p) => (
              <button
                type="button"
                class="btn btn-secondary btn-icon w-full"
                onClick={() => props.onSocial(p.id)}
                disabled={props.authPending}
                title={`Continue with ${p.label}`}
                aria-label={`Continue with ${p.label}`}
              >
                <p.logo class="w-4 h-4" />
              </button>
            ))}
          </div>

          <Show when={props.onTryDemo}>
            <div class="divider my-6" />
            <button
              type="button"
              class="btn btn-ghost w-full"
              style="color: var(--text-3)"
              onClick={props.onTryDemo}
            >
              No backend yet — <span style="color: var(--accent)">launch demo mode</span>
            </button>
          </Show>
        </div>
      </main>
    </div>
  );
}
