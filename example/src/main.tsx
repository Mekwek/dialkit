import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';
import { PhotoStack } from './PhotoStack';
import { Release } from './Release';
import { ConditionalVisibility } from './ConditionalVisibility';
import { Groups } from './Groups';
import { SingleTrack } from './SingleTrack';

/** A short panel anchored at the bottom, so its preset dropdown has no room below. */
function BottomPanel() {
  useDialKit('Bottom', { amount: [1, 0, 10], enabled: true }, { id: 'bottom-panel' });
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<><PhotoStack /><DialRoot position="top-right" /></>} />
        <Route path="/release-1.2" element={<Release />} />
        <Route
          path="/conditional"
          element={<><ConditionalVisibility /><DialRoot position="top-right" /></>}
        />
        <Route
          path="/groups"
          element={<><Groups /><DialRoot position="top-right" /></>}
        />
        <Route
          path="/groups-accordion"
          element={<><Groups /><DialRoot position="bottom-right" folderMode="accordion" /></>}
        />
        <Route path="/single-track" element={<SingleTrack />} />
        <Route path="/bottom" element={<><BottomPanel /><DialRoot position="bottom-right" /></>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
