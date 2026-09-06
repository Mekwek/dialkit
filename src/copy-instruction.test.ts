import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCopyInstruction } from './copy-instruction';

describe('copy instructions', () => {
  it('leaves a production handoff note for timeline authoring', () => {
    const instruction = buildCopyInstruction('useDialTimeline', 'Hero', {
      'card.at': 0.45,
    });

    assert.match(instruction, /Keep the existing `clip\.current` bindings/);
    assert.match(instruction, /do not convert the animation or remove DialKit yet/);
    assert.match(instruction, /TODO\(production\)/);
    assert.match(instruction, /real Motion animations/);
    assert.match(instruction, /remove useDialTimeline and <DialTimeline \/>/);
  });

  it('uses the same production handoff for create-style framework adapters', () => {
    const instruction = buildCopyInstruction('createDialTimeline', 'Hero', {
      'card.at': 0.45,
    });

    assert.match(instruction, /Keep the existing `clip\.current` bindings/);
    assert.match(instruction, /TODO\(production\)/);
    assert.match(instruction, /remove createDialTimeline and <DialTimeline \/>/);
  });

  it('does not add timeline guidance to ordinary panels', () => {
    const instruction = buildCopyInstruction('useDialKit', 'Card', { radius: 12 });

    assert.doesNotMatch(instruction, /clip\.current/);
    assert.doesNotMatch(instruction, /TODO\(production\)/);
  });

  it('copies tuned values without leaking the transition editor mode', () => {
    const instruction = buildCopyInstruction('createDialKit', 'Card', {
      'motion.transition': { type: 'spring', visualDuration: 0.4, bounce: 0.2 },
      'motion.transition.__mode': 'simple',
      position: { x: 0.5, y: -0.2 },
    });
    assert.doesNotMatch(instruction, /__mode/);
    assert.match(instruction, /"visualDuration": 0.4/);
    assert.match(instruction, /"x": 0.5/);
  });
});
