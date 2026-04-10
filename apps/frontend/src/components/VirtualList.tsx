import { type JSX, For, createSignal, createEffect, onMount, onCleanup } from "solid-js";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  renderItem: (item: T, index: number) => JSX.Element;
  class?: string;
}

/**
 * High-performance virtual list component for rendering large datasets
 * Only renders visible items + overscan buffer
 */
export function VirtualList<T>(props: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;

  const overscan = () => props.overscan ?? 3;
  const totalHeight = () => props.items.length * props.itemHeight;
  
  // Calculate visible range
  const visibleRange = () => {
    const start = Math.floor(scrollTop() / props.itemHeight);
    const end = Math.ceil((scrollTop() + props.height) / props.itemHeight);
    
    return {
      start: Math.max(0, start - overscan()),
      end: Math.min(props.items.length, end + overscan()),
    };
  };

  const visibleItems = () => {
    const range = visibleRange();
    return props.items.slice(range.start, range.end).map((item, i) => ({
      item,
      index: range.start + i,
    }));
  };

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  };

  onMount(() => {
    containerRef?.addEventListener("scroll", handleScroll, { passive: true });
  });

  onCleanup(() => {
    containerRef?.removeEventListener("scroll", handleScroll);
  });

  return (
    <div
      ref={containerRef}
      class={`overflow-auto ${props.class ?? ""}`}
      style={{ height: `${props.height}px` }}
    >
      <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
        <For each={visibleItems()}>
          {({ item, index }) => (
            <div
              style={{
                position: "absolute",
                top: `${index * props.itemHeight}px`,
                height: `${props.itemHeight}px`,
                width: "100%",
              }}
            >
              {props.renderItem(item, index)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
