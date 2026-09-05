import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion } from 'motion/react';
import { DialRoot, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import './dialpad.css';

function Demo() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [target, setTarget] = useState(false);
  const dial = useDialKitController('Curve editor', {
    transition: { type: 'easing', duration: 0.8, ease: [0.25, -0.6, 0.6, 1.6] },
  }, { id: 'easing-demo' });
  const transition = dial.values.transition;
  const setCurve = (ease: [number, number, number, number]) => dial.setValue('transition', { type: 'easing', duration: 0.8, ease });
  return <main className="pad-demo" data-theme={theme}>
    <nav className="pad-demo-nav"><span>DialKit <span>/ Easing</span></span><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Switch theme</button></nav>
    <div className="pad-demo-layout">
      <section className="pad-demo-content">
        <div className="pad-demo-eyebrow">SHAPE THE MOTION</div>
        <h1>A different feeling.</h1>
        <p>Adjust the curve. Play it back.<br />Find the motion that fits.</p>
        <div className="pad-demo-stage" style={{ overflow: 'hidden' }}>
          <motion.div className="pad-demo-object" initial={false} animate={{ x: target ? 65 : -65 }} transition={transition.type === 'easing' ? { type: 'tween', duration: transition.duration, ease: transition.ease } : transition}>
            <span className="pad-demo-dot" />
          </motion.div>
        </div>
        <nav className="pad-demo-nav" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setTarget(!target)}>Replay</button>
          <button onClick={() => setCurve([0.42, 0, 0.58, 1])}>Gentle</button>
          <button onClick={() => setCurve([0.25, -0.6, 0.6, 1.6])}>Overshoot</button>
          <button onClick={() => setCurve([0.15, -1, 0.85, 2])}>Extreme</button>
        </nav>
      </section>
      <aside className="pad-demo-panel">
        <DialRoot mode="inline" theme={theme} />
        <p>Drag either handle to shape the curve.<br />Use arrow keys for small adjustments.</p>
      </aside>
    </div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);
