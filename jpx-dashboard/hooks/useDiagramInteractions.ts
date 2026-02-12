import { useCallback, useRef, useState, useEffect, type RefObject } from 'react';
import { useAirportDiagramStore } from '@/store/airportDiagramStore';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

interface UseDiagramInteractionsOptions {
  enabled?: boolean;
}

export function useDiagramInteractions(
  svgRef: RefObject<SVGSVGElement | null>,
  options: UseDiagramInteractionsOptions = {}
) {
  const { enabled = true } = options;

  const { view, setZoom, setPan } = useAirportDiagramStore();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const rafRef = useRef<number | null>(null);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enabled) return;
      e.preventDefault();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = view.zoom * delta;
      setZoom(newZoom);
    },
    [enabled, view.zoom, setZoom]
  );

  // Handle mouse down (start drag)
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled || e.button !== 0) return; // Only left click

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: view.panX,
        startPanY: view.panY,
      });
    },
    [enabled, view.panX, view.panY]
  );

  // Handle mouse move (drag)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging) return;

      // Cancel any pending animation frame
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const dx = (e.clientX - dragState.startX) / view.zoom;
        const dy = (e.clientY - dragState.startY) / view.zoom;

        setPan(dragState.startPanX + dx, dragState.startPanY + dy);
      });
    },
    [dragState, view.zoom, setPan]
  );

  // Handle mouse up (end drag)
  const handleMouseUp = useCallback(() => {
    setDragState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || e.touches.length !== 1) return;

      const touch = e.touches[0];
      setDragState({
        isDragging: true,
        startX: touch.clientX,
        startY: touch.clientY,
        startPanX: view.panX,
        startPanY: view.panY,
      });
    },
    [enabled, view.panX, view.panY]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragState.isDragging || e.touches.length !== 1) return;

      const touch = e.touches[0];

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const dx = (touch.clientX - dragState.startX) / view.zoom;
        const dy = (touch.clientY - dragState.startY) / view.zoom;

        setPan(dragState.startPanX + dx, dragState.startPanY + dy);
      });
    },
    [dragState, view.zoom, setPan]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setDragState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  // Attach event listeners
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !enabled) return;

    // Wheel
    svg.addEventListener('wheel', handleWheel, { passive: false });

    // Mouse
    svg.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Touch
    svg.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      svg.removeEventListener('wheel', handleWheel);
      svg.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      svg.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    svgRef,
    enabled,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return {
    isDragging: dragState.isDragging,
    cursor: dragState.isDragging ? 'grabbing' : 'grab',
  };
}
