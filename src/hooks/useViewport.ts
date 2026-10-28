import { useState, useCallback, useRef, useEffect } from 'react';
import { ViewportState, MindMapNode } from '../types/mindmap';

interface UseViewportOptions {
  initialPanX?: number;
  initialPanY?: number;
  initialZoom?: number;
}

export function useViewport(options: UseViewportOptions = {}) {
  const [viewport, setViewport] = useState<ViewportState>({
    panX: options.initialPanX ?? 0,
    panY: options.initialPanY ?? 0,
    zoom: options.initialZoom ?? 1,
  });

  const isPanningRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Stop running animation
  const stopAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Smoothly pan & slide canvas to center on a target (x, y) coordinate
  const panToCoordinate = useCallback(
    (targetX: number, targetY: number, targetZoom?: number, durationMs = 450) => {
      stopAnimation();

      setViewport((current) => {
        const destZoom = targetZoom ?? current.zoom;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const destPanX = centerX - targetX * destZoom;
        const destPanY = centerY - targetY * destZoom;

        // If duration is 0, center immediately without animating
        if (durationMs <= 0) {
          return {
            panX: destPanX,
            panY: destPanY,
            zoom: destZoom,
          };
        }

        const startPanX = current.panX;
        const startPanY = current.panY;
        const startZoom = current.zoom;
        const startTime = performance.now();

        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / durationMs);

          // Ease-out cubic curve: 1 - (1 - t)^3
          const ease = 1 - Math.pow(1 - progress, 3);

          const currentX = startPanX + (destPanX - startPanX) * ease;
          const currentY = startPanY + (destPanY - startPanY) * ease;
          const currentZ = startZoom + (destZoom - startZoom) * ease;

          setViewport({
            panX: currentX,
            panY: currentY,
            zoom: currentZ,
          });

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(step);
          } else {
            animFrameRef.current = null;
          }
        };

        animFrameRef.current = requestAnimationFrame(step);
        return current;
      });
    },
    [stopAnimation]
  );

  // Slide canvas to center on a specific node (including its dimensions)
  const panToNode = useCallback(
    (node: Pick<MindMapNode, 'x' | 'y' | 'width' | 'height'>, instant = false) => {
      const nodeCenterX = node.x + (node.width ? node.width / 2 : 110);
      const nodeCenterY = node.y + (node.height ? node.height / 2 : 45);
      panToCoordinate(nodeCenterX, nodeCenterY, undefined, instant ? 0 : 450);
    },
    [panToCoordinate]
  );

  // Fit all nodes into screen view
  const fitToNodes = useCallback(
    (nodes: MindMapNode[]) => {
      if (nodes.length === 0) {
        panToCoordinate(0, 0, 1);
        return;
      }

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      nodes.forEach((n) => {
        const w = n.width || 220;
        const h = n.height || 90;
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x + w);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y + h);
      });

      const padding = 120;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      const scaleX = window.innerWidth / width;
      const scaleY = window.innerHeight / height;
      const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.25);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      panToCoordinate(centerX, centerY, targetZoom, 500);
    },
    [panToCoordinate]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Prevent default browser pinch-zoom
      e.preventDefault();
      stopAnimation();

      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const rect = e.currentTarget.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setViewport((current) => {
        const newZoom = Math.min(Math.max(current.zoom * zoomFactor, 0.2), 3.0);
        const scaleChange = newZoom / current.zoom;

        const newPanX = cursorX - (cursorX - current.panX) * scaleChange;
        const newPanY = cursorY - (cursorY - current.panY) * scaleChange;

        return {
          panX: newPanX,
          panY: newPanY,
          zoom: newZoom,
        };
      });
    },
    [stopAnimation]
  );

  // Pointer panning handlers for canvas background
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Do not initiate panning if clicking on a button, input, textarea or interactive element
      if (
        (e.target as HTMLElement).closest(
          'button, input, textarea, a, [role="button"], [role="menuitem"], [data-interactive="true"]'
        )
      ) {
        return;
      }

      // Only pan on left click on empty canvas, middle click, or with spacebar
      if (e.button === 0 || e.button === 1) {
        stopAnimation();
        isPanningRef.current = true;
        startPointerRef.current = { x: e.clientX, y: e.clientY };
        startPanRef.current = { x: viewport.panX, y: viewport.panY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [viewport.panX, viewport.panY, stopAnimation]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;

    setViewport((prev) => ({
      ...prev,
      panX: startPanRef.current.x + dx,
      panY: startPanRef.current.y + dy,
    }));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  }, []);

  // Zoom control helpers
  const zoomIn = useCallback(() => {
    stopAnimation();
    setViewport((prev) => {
      const newZoom = Math.min(prev.zoom * 1.2, 3.0);
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const scaleChange = newZoom / prev.zoom;
      return {
        zoom: newZoom,
        panX: centerX - (centerX - prev.panX) * scaleChange,
        panY: centerY - (centerY - prev.panY) * scaleChange,
      };
    });
  }, [stopAnimation]);

  const zoomOut = useCallback(() => {
    stopAnimation();
    setViewport((prev) => {
      const newZoom = Math.max(prev.zoom / 1.2, 0.2);
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const scaleChange = newZoom / prev.zoom;
      return {
        zoom: newZoom,
        panX: centerX - (centerX - prev.panX) * scaleChange,
        panY: centerY - (centerY - prev.panY) * scaleChange,
      };
    });
  }, [stopAnimation]);

  const resetZoom = useCallback(() => {
    stopAnimation();
    setViewport((prev) => {
      const newZoom = 1;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const scaleChange = newZoom / prev.zoom;
      return {
        zoom: newZoom,
        panX: centerX - (centerX - prev.panX) * scaleChange,
        panY: centerY - (centerY - prev.panY) * scaleChange,
      };
    });
  }, [stopAnimation]);

  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  return {
    viewport,
    setViewport,
    panToCoordinate,
    panToNode,
    fitToNodes,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
