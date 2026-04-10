import { type JSX, For, Show, splitProps } from "solid-js";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "input-sm",
  md: "",
  lg: "input-lg",
};

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["label", "error", "size", "class"]);

  const size = () => local.size ?? "md";

  return (
    <div class="w-full">
      <Show when={local.label}>
        <label class="label">{local.label}</label>
      </Show>
      <input
        class={`input ${sizeClasses[size()]} ${local.error ? "border-error focus:border-error focus:ring-error/20" : ""} ${local.class ?? ""}`}
        {...rest}
      />
      <Show when={local.error}>
        <p class="mt-1 text-xs text-error">{local.error}</p>
      </Show>
    </div>
  );
}

interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ["label", "error", "class"]);

  return (
    <div class="w-full">
      <Show when={local.label}>
        <label class="label">{local.label}</label>
      </Show>
      <textarea
        class={`textarea ${local.error ? "border-error focus:border-error focus:ring-error/20" : ""} ${local.class ?? ""}`}
        {...rest}
      />
      <Show when={local.error}>
        <p class="mt-1 text-xs text-error">{local.error}</p>
      </Show>
    </div>
  );
}

interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string; disabled?: boolean }[];
}

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["label", "error", "options", "children", "class"]);

  return (
    <div class="w-full">
      <Show when={local.label}>
        <label class="label">{local.label}</label>
      </Show>
      <select
        class={`select ${local.error ? "border-error focus:border-error focus:ring-error/20" : ""} ${local.class ?? ""}`}
        {...rest}
      >
        <Show when={local.options}>
          <For each={local.options}>
            {(option) => (
              <option value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            )}
          </For>
        </Show>
        {local.children}
      </select>
      <Show when={local.error}>
        <p class="mt-1 text-xs text-error">{local.error}</p>
      </Show>
    </div>
  );
}

interface FileInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function FileInput(props: FileInputProps) {
  const [local, rest] = splitProps(props, ["label", "error", "class"]);

  return (
    <div class="w-full">
      <Show when={local.label}>
        <label class="label">{local.label}</label>
      </Show>
      <input
        type="file"
        class={`input cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-surface-2 file:text-text-secondary hover:file:bg-surface-3 ${local.error ? "border-error" : ""} ${local.class ?? ""}`}
        {...rest}
      />
      <Show when={local.error}>
        <p class="mt-1 text-xs text-error">{local.error}</p>
      </Show>
    </div>
  );
}
