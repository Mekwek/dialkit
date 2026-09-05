import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import './dialpad.css';

function Demo() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const dial = useDialKitController('DialPad', {
    position: { type: 'pad' },
    interaction: { type: 'select', options: ['Position', 'Tilt'], default: 'Position' },
  }, { id: 'dialpad-demo' });
  const { x, y } = dial.values.position;
  const tilt = dial.values.interaction === 'Tilt';
  return <main className="pad-demo" data-theme={theme}>
    <nav className="pad-demo-nav"><span>DialKit <span>/ DialPad</span></span><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Switch theme</button></nav>
    <div className="pad-demo-layout">
      <section className="pad-demo-content">
        <div className="pad-demo-eyebrow">TWO VALUES. ONE GESTURE.</div>
        <h1>Find it by feel.</h1>
        <p>A little left. A little higher.<br />Explore both directions at once.</p>
        <div className="pad-demo-stage">
          <div className="pad-demo-object" style={{ transform: tilt ? `rotateX(${-y * 30}deg) rotateY(${x * 30}deg)` : `translate(${x * 100}px, ${-y * 85}px)` }}>
            <span className="pad-demo-dot" />
          </div>
        </div>
        <output className="pad-demo-output">X <span>{x.toFixed(2)}</span><i />Y <span>{y.toFixed(2)}</span></output>
      </section>
      <aside className="pad-demo-panel">
        <DialRoot mode="inline" theme={theme} />
        <p>Drag to explore. Hold Shift to lock an axis.<br />Use arrow keys for small adjustments.</p>
      </aside>
    </div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);
