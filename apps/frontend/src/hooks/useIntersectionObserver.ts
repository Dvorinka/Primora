import { createSignal, onMount, onCleanup, Accessor } from "solid-js";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

/**
 * Hook to observe element visibility using Intersection Observer API
 * Useful for lazy loading, infinite scroll, and animations on scroll
 */
export function useIntersectionObserver(
  elementRef: Accessor<HTMLElement | undefined>,
  options: UseIntersectionObserverOptions = {}
): Accessor<IntersectionObserverEntry | undefined> {
  const [entry, setEntry] = createSignal<IntersectionObserverEntry>();
  const { freezeOnceVisible = false, ...observerOptions } = options;

  onMount(() => {
    const element = elementRef();
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);

        if (freezeOnceVisible && entry.isIntersecting) {
          observer.disconnect();
        }
      },
      observerOptions
    );

    observer.observe(element);

    onCleanup(() => {
      observer.disconnect();
    });
  });

  return entry;
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(
  imageRef: Accessor<HTMLImageElement | undefined>,
  src: string
): Accessor<boolean> {
  const [loaded, setLoaded] = createSignal(false);

  const entry = useIntersectionObserver(imageRef, {
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  createSignal(() => {
    const img = imageRef();
    const isVisible = entry()?.isIntersecting;

    if (img && isVisible && !loaded()) {
      img.src = src;
      img.onload = () => setLoaded(true);
    }
  });

  return loaded;
}
