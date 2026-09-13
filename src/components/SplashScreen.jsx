import { useEffect, useState } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';

export default function SplashScreen({ visible }) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setMounted(false), 500);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <div className={`splash ${visible ? '' : 'splash-hide'}`}>
      <div className="splash-inner">
        <div className="splash-logo">
          <FaMapMarkerAlt />
        </div>
        <h1 className="splash-name">MapFind</h1>
        <p className="splash-tag">Find places, fast.</p>
        <div className="splash-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}