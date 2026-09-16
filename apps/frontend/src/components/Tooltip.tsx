import { type JSX, Show, createSignal, splitProps, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

interface TooltipProps {
  content: string | JSX.Element;
  placement?: "top" | "bottom" | "left" | "right";
  delay?: number;
  children: JSX.Element;
  disabled?: boolean;
}

export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ["content", "placement", "delay", "children", "disabled"]);
  const [show, setShow] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  let triggerRef: HTMLElement | undefined;
  let tooltipRef: HTMLDivElement | undefined;
  let timeoutId: number | undefined;

  const placement = () => local.placement ?? "top";
  const delay = () => local.delay ?? 200;

  const calculatePosition = () => {
    if (!triggerRef || !tooltipRef) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const tooltipRect = tooltipRef.getBoundingClientRect();
    const gap = 8;

    let x = 0;
    let y = 0;

    switch (placement()) {
      case "top":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - gap;
        break;
      case "bottom":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + gap;
        break;
      case "left":
        x = triggerRect.left - tooltipRect.width - gap;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case "right":
        x = triggerRect.right + gap;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Keep tooltip within viewport
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

    setPosition({ x, y });
  };

  const handleMouseEnter = () => {
    if (local.disabled) return;
    timeoutId = window.setTimeout(() => {
      setShow(true);
      requestAnimationFrame(calculatePosition);
    }, delay());
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setShow(false);
  };

  onCleanup(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {local.children}
      </span>
      <Show when={show() && !local.disabled}>
        <Portal>
          <div
            ref={tooltipRef}
            class="fixed z-50 px-3 py-2 text-xs font-medium text-text-1 bg-surface-3 border border-border-strong rounded-lg shadow-lg animate-fade-in pointer-events-none"
            style={{
              left: `${position().x}px`,
              top: `${position().y}px`,
            }}
            role="tooltip"
          >
            {local.content}
          </div>
        </Portal>
      </Show>
    </>
  );
}
