import {
  forwardRef, useCallback, useEffect, useImperativeHandle,
  useRef, useState,
} from 'react';

const SNAPS = {
  closed: 0,
  peek: 0.28,
  half: 0.58,
  full: 0.90,
};

const SNAP_VALUES = [SNAPS.peek, SNAPS.half, SNAPS.full];

function findSnap(current, velocityY) {
  const FLICK = 0.5;
  if (velocityY < -FLICK) {
    return [...SNAP_VALUES].reverse().find((s) => s > current + 0.02) ?? SNAP_VALUES[SNAP_VALUES.length - 1];
  }
  if (velocityY > FLICK) {
    return SNAP_VALUES.find((s) => s < current - 0.02) ?? SNAPS.peek;
  }
  return SNAP_VALUES.reduce((best, s) =>
    Math.abs(s - current) < Math.abs(best - current) ? s : best
  );
}

const BottomSheet = forwardRef(function BottomSheet(
  { open, onOpenChange, children },
  ref
) {
  const sheetRef = useRef(null);
  const dragState = useRef({
    active: false,
    startY: 0,
    startVisible: SNAPS.peek,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  });

  const [visible, setVisible] = useState(open ? SNAPS.peek : 0);
  const [dragging, setDragging] = useState(false);

  // Sync external `open` prop
  useEffect(() => {
    if (dragging) return;
    setVisible((v) => (open ? Math.max(v, SNAPS.peek) : 0));
  }, [open, dragging]);

  // Imperative API for the parent
  useImperativeHandle(ref, () => ({
    snapTo(target) {
      const v = SNAPS[target] ?? SNAPS.peek;
      setVisible(v);
      onOpenChange?.(v >= SNAPS.peek);
    },
    getVisible() {
      return visible;
    },
  }), [visible, onOpenChange]);

  const vh = () =>
    typeof window !== 'undefined' ? window.innerHeight : 800;

  const onPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const y = e.clientY;
    if (y == null) return;
    dragState.current = {
      active: true,
      startY: y,
      startVisible: visible,
      lastY: y,
      lastTime: performance.now(),
      velocity: 0,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [visible]);

  const onPointerMove = useCallback((e) => {
    const ds = dragState.current;
    if (!ds.active) return;
    const y = e.clientY;
    if (y == null) return;
    const height = vh();
    const deltaVisible = (ds.startY - y) / height;
    let next = ds.startVisible + deltaVisible;
    if (next > 1) next = 1 + (next - 1) * 0.25;
    if (next < 0) next = next * 0.25;

    const now = performance.now();
    const dt = now - ds.lastTime;
    if (dt > 0) ds.velocity = (y - ds.lastY) / dt;
    ds.lastY = y;
    ds.lastTime = now;

    setVisible(next);
  }, []);

  const endDrag = useCallback(() => {
    const ds = dragState.current;
    if (!ds.active) return;
    ds.active = false;
    setDragging(false);

    if (visible < SNAPS.peek * 0.5) {
      setVisible(0);
      onOpenChange?.(false);
      return;
    }
    const target = findSnap(visible, ds.velocity);
    setVisible(target);
    onOpenChange?.(target >= SNAPS.peek);
  }, [visible, onOpenChange]);

  const onPointerUp = useCallback(() => endDrag(), [endDrag]);
  const onPointerCancel = useCallback(() => endDrag(), [endDrag]);

  const lastTapRef = useRef(0);
  const onHandleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setVisible((v) => (v >= SNAPS.half - 0.05 ? SNAPS.peek : SNAPS.half));
      onOpenChange?.(true);
    } else {
      setVisible((v) => (v >= SNAPS.half - 0.05 ? SNAPS.peek : SNAPS.half));
      onOpenChange?.(true);
    }
    lastTapRef.current = now;
  }, [onOpenChange]);

  const translatePct = (1 - visible) * 100;

  return (
    <>
      {visible >= SNAPS.half - 0.02 && (
        <div
          className="sheet-backdrop"
          onClick={() => {
            setVisible(SNAPS.peek);
            onOpenChange?.(true);
          }}
        />
      )}

      <div
        ref={sheetRef}
        className={`sheet ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translate3d(0, ${translatePct}%, 0)` }}
      >
        <div
          className="sheet-handle"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onHandleClick}
          role="button"
          aria-label="Drag or tap to expand"
        >
          <div className="sheet-handle-bar" />
        </div>

        <div className="sheet-content">{children}</div>
      </div>
    </>
  );
});

export default BottomSheet;