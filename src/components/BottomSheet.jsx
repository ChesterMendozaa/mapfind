import { useEffect, useRef, useState } from 'react';

export default function BottomSheet({ open, onOpenChange, children, peek = 260 }) {
  const [startY, setStartY] = useState(null);
  const sheetRef = useRef(null);

  // Close on backdrop tap (outside)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    };
    // delay to avoid immediate close from the click that opened it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onOpenChange]);

  const onTouchStart = (e) => setStartY(e.touches[0].clientY);
  const onTouchEnd = (e) => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 40) onOpenChange(false);
    if (dy < -40) onOpenChange(true);
    setStartY(null);
  };

  return (
    <div
      ref={sheetRef}
      className={`sheet ${open ? 'open' : ''}`}
      style={{ '--peek': `${peek}px` }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="sheet-handle" onClick={() => onOpenChange(!open)} />
      <div className="sheet-content">{children}</div>
    </div>
  );
}