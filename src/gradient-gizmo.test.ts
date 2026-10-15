import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultGradientHandles, gradientFrame, gradientParamAt, legacyGradientHandles, normalizeGradient, switchGradientShape, type BackgroundGradient, type GradientHandles,
} from './background';
import {
  GHOST_BAND_IN, GHOST_BAND_OUT, dragGradientCentre, ghostPositionAt, dragGradientEnd, dragGradientWidth, formatGizmoAngle, ghostBandPath, gizmoAngle, gizmoPoints,
  rotateGradientHandles, rotateGradientQuarter, stopPlacement, stopPositionAt,
} from './gradient-gizmo';

const box = { width: 200, height: 100 };
const square = { width: 100, height: 100 };
const near = (actual: number, expected: number, epsilon = 1e-3) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not ${expected}`);
const nearPoint = (actual: { x: number; y: number }, expected: { x: number; y: number }, epsilon = 1e-3) => {
  near(actual.x, expected.x, epsilon);
  near(actual.y, expected.y, epsilon);
};
/** On a 100px square: a circle of radius 25px at the centre, its main axis pointing right, its width handle above. */
const circle = (): GradientHandles => ({ start: { x: 0.5, y: 0.5 }, end: { x: 0.75, y: 0.5 }, width: { x: 0.5, y: 0.25 } });

describe('old values: angle to handles', () => {
  it('converts a linear angle through the centre with CSS line length', () => {
    // 180° is Figma's top to bottom line, edge to edge.
    assert.deepEqual(legacyGradientHandles('linear', 180), { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, width: { x: 0, y: 0.5 } });
    assert.deepEqual(legacyGradientHandles('linear', 90), { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 1 } });
    assert.deepEqual(legacyGradientHandles('linear', 0), { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 }, width: { x: 1, y: 0.5 } });
    // 45°: towards the top right corner, half length (sin + cos) / 2 = 0.7071.
    const diagonal = legacyGradientHandles('linear', 45);
    nearPoint(diagonal.start, { x: 0, y: 1 });
    nearPoint(diagonal.end, { x: 1, y: 0 });
    assert.deepEqual(legacyGradientHandles('radial', 30), { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0 } });
  });

  it('normalizes an old value with angle and no handles, and keeps new handles', () => {
    assert.deepEqual(normalizeGradient({ shape: 'linear', angle: 270, stops: [] }).handles, legacyGradientHandles('linear', 270));
    assert.deepEqual(normalizeGradient({ shape: 'radial', angle: 0, stops: [] }).handles, legacyGradientHandles('radial', 0));
    const handles = { start: { x: -0.2, y: 0.3 }, end: { x: 1.4, y: 0.9 }, width: { x: 0.1, y: 0.1 } };
    assert.deepEqual(normalizeGradient({ shape: 'diamond', handles, stops: [] }).handles, handles);
    assert.equal(normalizeGradient({ shape: 'angular', handles, stops: [] }).shape, 'angular');
    assert.equal(normalizeGradient({ shape: 'cone', handles, stops: [] }).shape, 'linear');
  });
});

describe('the shading rule', () => {
  it('gives t for each shape in the gradient frame', () => {
    const frame = gradientFrame(circle(), square.width, square.height);
    assert.equal(gradientParamAt('linear', frame, 75, 50), 1);
    assert.equal(gradientParamAt('linear', frame, 50, 80), 0);
    assert.equal(gradientParamAt('radial', frame, 50, 25), 1);
    near(gradientParamAt('radial', frame, 50 + 12.5, 50 + 12.5), Math.SQRT1_2);
    assert.equal(gradientParamAt('diamond', frame, 50 + 12.5, 50 + 12.5), 1);
    // Angular: 0 at the end handle's direction, a quarter turn towards the width side (up here).
    assert.equal(gradientParamAt('angular', frame, 90, 50), 0);
    near(gradientParamAt('angular', frame, 50, 10), 0.25);
    near(gradientParamAt('angular', frame, 10, 50), 0.5);
    near(gradientParamAt('angular', frame, 50, 90), 0.75);
  });

  it('reads any width point as the distance from the main axis', () => {
    // Figma's own default, edge to edge: its width point is not on the perpendicular through the start.
    const frame = gradientFrame({ start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, width: { x: 0, y: 0.5 } }, 100, 100);
    near(frame.r1, 100);
    near(frame.r2, 50);
    assert.deepEqual([frame.nx, frame.ny], [-1, 0]);
  });

  it('defaults to a top to bottom linear, 10% in from every edge', () => {
    assert.deepEqual(defaultGradientHandles(), { start: { x: 0.5, y: 0.1 }, end: { x: 0.5, y: 0.9 }, width: { x: 0.1, y: 0.5 } });
    const frame = gradientFrame(defaultGradientHandles(), 100, 100);
    near(frame.r1, 80);
    near(frame.r2, 40);
  });
});

describe('switching the gradient type (Figma\'s placement)', () => {
  const stops = [{ at: 0, color: '#000000', alpha: 100 }, { at: 100, color: '#ffffff', alpha: 100 }];
  const linear = (start: { x: number; y: number }, end: { x: number; y: number }): BackgroundGradient => ({ shape: 'linear', handles: { start, end, width: { x: 0, y: 0 } }, stops });

  it('puts a centred type on the line\'s middle, as a circle in pixels', () => {
    const aspect = 16 / 9;
    const radial = switchGradientShape(linear({ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.9 }), 'radial', aspect);
    assert.equal(radial.shape, 'radial');
    assert.deepEqual(radial.handles.start, { x: 0.5, y: 0.5 });
    assert.deepEqual(radial.handles.end, { x: 0.5, y: 0.9 });
    // In pixels (width = aspect, height = 1): the width vector is the end vector turned 90° clockwise, as long.
    const end = { x: (radial.handles.end.x - 0.5) * aspect, y: radial.handles.end.y - 0.5 };
    const width = { x: (radial.handles.width.x - 0.5) * aspect, y: radial.handles.width.y - 0.5 };
    near(Math.hypot(width.x, width.y), Math.hypot(end.x, end.y), 1e-5);
    near(width.x, -end.y, 1e-5);
    near(width.y, end.x, 1e-5);
    const frame = gradientFrame(radial.handles, 1600, 900);
    near(frame.r1, frame.r2, 1e-2);
    assert.deepEqual(radial.stops, stops);
  });

  it('keeps the points between Radial, Angular and Diamond, and gives the line back', () => {
    const start = { x: 0.173, y: 0.405 };
    const end = { x: 0.797, y: 0.452 };
    const radial = switchGradientShape(linear(start, end), 'radial', 3.17);
    const angular = switchGradientShape(radial, 'angular', 3.17);
    const diamond = switchGradientShape(angular, 'diamond', 3.17);
    assert.deepEqual(angular.handles, radial.handles);
    assert.deepEqual(diamond.handles, radial.handles);
    const back = switchGradientShape(switchGradientShape(diamond, 'radial', 3.17), 'linear', 3.17);
    assert.equal(back.shape, 'linear');
    assert.deepEqual(back.handles.start, start);
    assert.deepEqual(back.handles.end, end);
    // Linear to linear changes nothing; the value is a new object.
    const same = linear(start, end);
    assert.deepEqual(switchGradientShape(same, 'linear', 2), same);
    assert.notEqual(switchGradientShape(same, 'linear', 2).handles, same.handles);
  });
});

describe('the gizmo maths', () => {
  it('turns a Linear in a default place over the other axis, the same distance in', () => {
    // Top to bottom, 10% in: a quarter turn clockwise runs right to left, 10% in.
    const once = rotateGradientQuarter('linear', defaultGradientHandles(), box);
    nearPoint(once.start, { x: 0.9, y: 0.5 });
    nearPoint(once.end, { x: 0.1, y: 0.5 });
    const twice = rotateGradientQuarter('linear', once, box);
    nearPoint(twice.start, { x: 0.5, y: 0.9 });
    nearPoint(twice.end, { x: 0.5, y: 0.1 });
    // Edge to edge stays edge to edge (Figma's default), on a wide canvas too.
    const edge = rotateGradientQuarter('linear', { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0, y: 1 } }, box);
    nearPoint(edge.start, { x: 0.5, y: 0 });
    nearPoint(edge.end, { x: 0.5, y: 1 });
  });

  it('turns any other Linear in pixels around the middle of its line', () => {
    // 54px wide on a 200 x 100 canvas, centred: it turns to 54px tall, centred.
    const h = rotateGradientQuarter('linear', { start: { x: 0.365, y: 0.5 }, end: { x: 0.635, y: 0.5 }, width: { x: 0.365, y: 1 } }, box);
    nearPoint(h.start, { x: 0.5, y: 0.23 });
    nearPoint(h.end, { x: 0.5, y: 0.77 });
    // Off centre: the middle of the line stays where it is.
    const off = rotateGradientQuarter('linear', { start: { x: 0.1, y: 0.2 }, end: { x: 0.3, y: 0.2 }, width: { x: 0.1, y: 0.4 } }, box);
    nearPoint(off.start, { x: 0.2, y: 0 });
    nearPoint(off.end, { x: 0.2, y: 0.4 });
  });

  it('turns Radial, Angular and Diamond around their centre', () => {
    const turned = rotateGradientQuarter('radial', circle(), square);
    nearPoint(turned.start, { x: 0.5, y: 0.5 });
    nearPoint(turned.end, { x: 0.5, y: 0.75 });
  });

  it('rotates the end and width handles around the start, keeping lengths', () => {
    const turned = rotateGradientHandles(circle(), Math.PI / 2, square);
    nearPoint(turned.start, { x: 0.5, y: 0.5 });
    nearPoint(turned.end, { x: 0.5, y: 0.75 });
    // The width handle, 25px above, turns to 25px right.
    nearPoint(gizmoPoints(turned, square).width, { x: 75, y: 50 });
  });

  it('scales and turns with the end handle, the width following in proportion', () => {
    const h = dragGradientEnd(circle(), { x: 50, y: 100 }, square);
    nearPoint(h.end, { x: 0.5, y: 1 });
    const f = gradientFrame(h, square.width, square.height);
    near(f.r1, 50);
    near(f.r2, 50);
    nearPoint(gizmoPoints(h, square).width, { x: 100, y: 50 });
  });

  it('moves the centre with the end handle fixed and the shape kept', () => {
    const h = dragGradientCentre(circle(), { x: 25, y: 50 }, square);
    nearPoint(h.start, { x: 0.25, y: 0.5 });
    nearPoint(h.end, { x: 0.75, y: 0.5 });
    near(gradientFrame(h, 100, 100).r2, 50);
  });

  it('changes only the cross radius with the width handle, on either side', () => {
    const h = dragGradientWidth(circle(), { x: 70, y: 40 }, square);
    nearPoint(h.end, { x: 0.75, y: 0.5 });
    near(gradientFrame(h, 100, 100).r2, 10);
    const flipped = dragGradientWidth(circle(), { x: 60, y: 80 }, square);
    nearPoint(gizmoPoints(flipped, square).width, { x: 50, y: 80 });
  });

  it('projects the pointer onto the line, or onto the rim by its angle', () => {
    near(stopPositionAt('linear', circle(), { x: 62.5, y: 90 }, square), 50);
    assert.equal(stopPositionAt('radial', circle(), { x: 0, y: 50 }, square), 0);
    assert.equal(stopPositionAt('diamond', circle(), { x: 99, y: 50 }, square), 100);
    near(stopPositionAt('angular', circle(), { x: 50, y: 45 }, square), 25);
    near(stopPositionAt('angular', circle(), { x: 45, y: 50 }, square), 50);
    // A 2:1 canvas: positions are measured in pixels.
    near(stopPositionAt('linear', { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0, y: 0 } }, { x: 50, y: 0 }, box), 25);
  });

  it('places swatches beside the line, or outside the rim, pointing back', () => {
    const onLine = stopPlacement('linear', circle(), 40, square);
    nearPoint(onLine, { x: 60, y: 50 });
    nearPoint({ x: onLine.ox, y: onLine.oy }, { x: 0, y: -1 });
    near(onLine.rotation, 0);
    const onRim = stopPlacement('angular', circle(), 25, square);
    nearPoint(onRim, { x: 50, y: 25 });
    nearPoint({ x: onRim.ox, y: onRim.oy }, { x: 0, y: -1 });
  });

  it('bands the ghost from 8px on the far side to the swatches\' outer edge', () => {
    assert.equal(GHOST_BAND_OUT, 28);
    assert.equal(GHOST_BAND_IN, 8);
    // A line running right: the swatches stand above it.
    assert.equal(ghostBandPath('linear', circle(), square), 'M50.00 22.00L75.00 22.00L75.00 58.00L50.00 58.00Z');
    // Angular: two loops around the rim (outside and inside), filled even-odd.
    const ring = ghostBandPath('angular', circle(), square);
    assert.equal(ring.split('M').length - 1, 2);
    assert.ok(ring.startsWith('M103.00 50.00'));
  });

  it('places the ghost at the nearest point of the line or the rim', () => {
    near(ghostPositionAt('linear', circle(), { x: 62.5, y: 20 }, square), 50);
    // A 2:1 ellipse (r1 50, r2 25): straight out from a rim point, the position stays.
    const wide: GradientHandles = { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0.5 }, width: { x: 0.5, y: 0.25 } };
    const rimAt = (at: number, out: number) => { const p = stopPlacement('angular', wide, at, square); return { x: p.x + p.ox * out, y: p.y + p.oy * out }; };
    for (const at of [10, 37.5, 62, 90]) {
      near(ghostPositionAt('angular', wide, rimAt(at, 0), square), at, 1e-3);
      near(ghostPositionAt('angular', wide, rimAt(at, 20), square), at, 1e-3);
      near(ghostPositionAt('angular', wide, rimAt(at, -6), square), at, 1e-3);
    }
  });

  it("shows the main axis angle with Figma's signs", () => {
    const at = (x: number, y: number) => gizmoAngle({ start: { x: 0.5, y: 0.5 }, end: { x, y }, width: { x: 0.5, y: 0 } }, square);
    assert.equal(at(0.5, 1), 0);
    assert.equal(at(1, 0.5), -90);
    assert.equal(at(0, 0.5), 90);
    assert.equal(at(0.5, 0), 180);
    assert.equal(at(1, 1), -45);
    assert.equal(formatGizmoAngle(at(1, 0.5)), '-90°');
    assert.equal(formatGizmoAngle(at(0, 0.5)), '90°');
  });
});
