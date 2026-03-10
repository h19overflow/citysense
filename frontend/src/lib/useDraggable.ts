import { useRef, useState, useCallback } from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  disabled?: boolean;
}

const DRAG_THRESHOLD = 5;

export function useDraggable({ initialPosition, disabled }: UseDraggableOptions = {}) {
  const [position, setPosition] = useState<Position>(
    initialPosition ?? { x: window.innerWidth - 80, y: window.innerHeight - 80 }
  );
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const wasDragged = useRef(false);
  const startPointer = useRef<Position>({ x: 0, y: 0 });
  const startPos = useRef<Position>({ x: 0, y: 0 });

  const constrainToViewport = useCallback((pos: Position): Position => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 56;
    const h = el?.offsetHeight ?? 56;
    return {
      x: Math.max(8, Math.min(pos.x, window.innerWidth - w - 8)),
      y: Math.max(8, Math.min(pos.y, window.innerHeight - h - 8)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      dragging.current = true;
      wasDragged.current = false;
      startPointer.current = { x: e.clientX, y: e.clientY };
      startPos.current = { ...position };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startPointer.current.x;
      const dy = e.clientY - startPointer.current.y;

      if (!wasDragged.current && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      wasDragged.current = true;

      const next = constrainToViewport({
        x: startPos.current.x + dx,
        y: startPos.current.y + dy,
      });
      setPosition(next);
    },
    [constrainToViewport]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return {
    position,
    setPosition,
    wasDragged,
    ref,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
