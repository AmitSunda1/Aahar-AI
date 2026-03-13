import { useRef, useEffect } from "react";

interface ScrollerProps {
    items: (string | number)[];
    value: string | number;
    onChange: (value: string | number) => void;
    suffix?: string;
}

const ITEM_HEIGHT = 64;
const PADDING_ROWS = 2;
const VISIBLE_ROWS = PADDING_ROWS * 2 + 1; // 5 rows shown

export const Scroller = ({ items, value, onChange, suffix }: ScrollerProps) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Keep refs to avoid stale closures in event handlers
    const itemsRef = useRef(items);
    const onChangeRef = useRef(onChange);
    itemsRef.current = items;
    onChangeRef.current = onChange;

    // Drag state
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartScrollTop = useRef(0);
    const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedIndex = items.indexOf(value);

    // Snap to nearest item programmatically
    const snapToNearest = (el: HTMLDivElement) => {
        const rawIndex = el.scrollTop / ITEM_HEIGHT;
        const idx = Math.round(rawIndex);
        const clamped = Math.max(0, Math.min(idx, itemsRef.current.length - 1));
        el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
        onChangeRef.current(itemsRef.current[clamped]);
    };

    const scheduleSnap = () => {
        if (snapTimer.current) clearTimeout(snapTimer.current);
        snapTimer.current = setTimeout(() => {
            if (listRef.current) snapToNearest(listRef.current);
        }, 120);
    };

    // Mount: set initial scroll position with no animation
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const idx = Math.max(0, itemsRef.current.indexOf(value));
        el.scrollTop = idx * ITEM_HEIGHT;
        // Cleanup snap timer on unmount
        return () => { if (snapTimer.current) clearTimeout(snapTimer.current); };
    }, []); // mount only

    // ── Native scroll (touch + trackpad + mouse wheel) ──────────────────────
    const handleScroll = () => {
        if (isDragging.current) return;
        const el = listRef.current;
        if (!el) return;
        const idx = Math.max(0, Math.min(
            Math.round(el.scrollTop / ITEM_HEIGHT),
            itemsRef.current.length - 1
        ));
        onChangeRef.current(itemsRef.current[idx]);
        scheduleSnap();
    };

    // ── Mouse drag (desktop click-and-drag) ──────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!listRef.current) return;
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartScrollTop.current = listRef.current.scrollTop;
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !listRef.current) return;
        const delta = dragStartY.current - e.clientY;
        listRef.current.scrollTop = dragStartScrollTop.current + delta;
        const idx = Math.max(0, Math.min(
            Math.round(listRef.current.scrollTop / ITEM_HEIGHT),
            itemsRef.current.length - 1
        ));
        onChangeRef.current(itemsRef.current[idx]);
    };

    const handleMouseUp = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        if (listRef.current) snapToNearest(listRef.current);
    };

    // Attach global mouse move/up to window so dragging outside the element still works
    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []); // stable — uses refs

    return (
        <div
            className="relative w-full cursor-grab active:cursor-grabbing select-none"
            style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}
        >
            {/* Top gradient fade */}
            <div
                className="absolute inset-x-0 top-0 z-10 pointer-events-none rounded-t-card"
                style={{
                    height: ITEM_HEIGHT * PADDING_ROWS,
                    background: "linear-gradient(to bottom, #0B0B0B 10%, transparent 100%)",
                }}
            />

            {/* Centre highlight band */}
            <div
                className="absolute inset-x-0 z-10 pointer-events-none"
                style={{
                    top: ITEM_HEIGHT * PADDING_ROWS,
                    height: ITEM_HEIGHT,
                    background: "rgba(11, 95, 255, 0.10)",
                    borderTop: "1px solid rgba(11, 95, 255, 0.25)",
                    borderBottom: "1px solid rgba(11, 95, 255, 0.25)",
                }}
            />

            {/* Bottom gradient fade */}
            <div
                className="absolute inset-x-0 bottom-0 z-10 pointer-events-none rounded-b-card"
                style={{
                    height: ITEM_HEIGHT * PADDING_ROWS,
                    background: "linear-gradient(to top, #0B0B0B 10%, transparent 100%)",
                }}
            />

            {/* Scrollable list */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                onMouseDown={handleMouseDown}
                className="w-full h-full overflow-y-scroll scrollbar-hide"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {/* Top phantom rows */}
                {Array.from({ length: PADDING_ROWS }).map((_, i) => (
                    <div key={`top-${i}`} style={{ height: ITEM_HEIGHT }} />
                ))}

                {items.map((item, idx) => {
                    const dist = Math.abs(idx - selectedIndex);
                    const isSelected = dist === 0;
                    return (
                        <div
                            key={String(item)}
                            style={{ height: ITEM_HEIGHT }}
                            className="flex items-center justify-center"
                        >
                            <span
                                className="text-base-white font-semibold transition-all duration-100"
                                style={{
                                    fontSize: isSelected ? "26px" : dist === 1 ? "20px" : "16px",
                                    opacity: isSelected ? 1 : dist === 1 ? 0.45 : 0.18,
                                }}
                            >
                                {item}{isSelected && suffix ? ` ${suffix}` : ""}
                            </span>
                        </div>
                    );
                })}

                {/* Bottom phantom rows */}
                {Array.from({ length: PADDING_ROWS }).map((_, i) => (
                    <div key={`bot-${i}`} style={{ height: ITEM_HEIGHT }} />
                ))}
            </div>
        </div>
    );
};
