import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DialStore } from './store/DialStore';

describe('panel open state', () => {
  it('supports initial collapse and external changes without altering values or presets', () => {
    const id = 'panel-collapse';
    DialStore.registerPanel(id, 'Panel', { x: 1 }, undefined, { defaultCollapsed: true });
    assert.equal(DialStore.getPanelOpen(id), false);
    const values = DialStore.getValues(id);
    let notifications = 0;
    const unsub = DialStore.subscribe(id, () => notifications++);
    DialStore.setPanelOpen(id, true);
    assert.equal(DialStore.getPanelOpen(id), true);
    assert.equal(DialStore.getValues(id), values);
    assert.equal(notifications, 1);
    let reveals = 0;
    const stopOpen = DialStore.subscribePanelOpen((panelId, open) => { if (panelId === id && open) reveals++; });
    DialStore.setPanelOpen(id, true);
    assert.equal(notifications, 1);
    assert.equal(reveals, 1);
    stopOpen();
    DialStore.updatePanel(id, 'Updated', { x: 2 }, undefined, { defaultCollapsed: true });
    assert.equal(DialStore.getPanelOpen(id), true);
    DialStore.resetValues(id);
    assert.equal(DialStore.getPanelOpen(id), true);
    unsub(); DialStore.unregisterPanel(id);
    assert.equal(DialStore.getPanelOpen(id), undefined);
  });
  it('retains state for stable IDs and delegates unspecified defaults to the root', () => {
    const id = 'retained-collapse';
    DialStore.registerPanel(id, 'Panel', { x: 1 }, undefined, { retainOnUnmount: true });
    assert.equal(DialStore.getPanelOpen(id), undefined);
    DialStore.setPanelOpen(id, false);
    DialStore.unregisterPanel(id);
    DialStore.registerPanel(id, 'Panel', { x: 1 }, undefined, { defaultCollapsed: false });
    assert.equal(DialStore.getPanelOpen(id), false);
    DialStore.unregisterPanel(id);
    DialStore.setPanelOpen('not-registered', true);
    assert.equal(DialStore.getPanelOpen('not-registered'), undefined);
  });
  it('toggles a host-seeded default and reveals the containing toolkit only on an open request', () => {
    const id = 'host-default-collapse';
    DialStore.registerPanel(id, 'Panel', { x: 1 });
    const requests: boolean[] = [];
    const stopOpen = DialStore.subscribePanelOpen((panelId, open) => {
      if (panelId === id) requests.push(open);
    });
    DialStore.initPanelOpen(id, false);
    assert.equal(DialStore.isPanelOpen(id), false);
    assert.deepEqual(requests, []);
    DialStore.togglePanelOpen(id);
    assert.equal(DialStore.isPanelOpen(id), true);
    assert.deepEqual(requests, [true]);
    DialStore.initPanelOpen(id, false);
    assert.equal(DialStore.isPanelOpen(id), true);
    assert.deepEqual(requests, [true]);
    stopOpen();
    DialStore.unregisterPanel(id);
  });
});
