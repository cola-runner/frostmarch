import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleGestures, closestScreenUnit } from '../game/interaction.ts';
import { Battle } from '../game/simulation.ts';
const advance = (b, s) => {
  for (let i = 0; i < s * 20; i++) b.step(0.05);
};
test('a little finger drift remains a tap while a deliberate drag cannot issue an order', () => {
  const g = new BattleGestures();
  g.begin(1, { x: 100, y: 100 }, 'touch');
  assert.equal(g.move(1, { x: 108, y: 104 }), null);
  assert.deepEqual(g.end(1, { x: 108, y: 104 }), {
    x: 108,
    y: 104,
    type: 'touch',
  });
  g.begin(2, { x: 100, y: 100 }, 'touch');
  assert.equal(g.move(2, { x: 140, y: 120 }).kind, 'pan');
  assert.equal(g.end(2, { x: 140, y: 120 }), null);
});
test('pinch never becomes an accidental tap when fingers lift in either order', () => {
  for (const order of [
    [1, 2],
    [2, 1],
  ]) {
    const g = new BattleGestures();
    g.begin(1, { x: 100, y: 100 }, 'touch');
    g.begin(2, { x: 200, y: 100 }, 'touch');
    assert.equal(g.move(2, { x: 250, y: 100 }).ratio, 2 / 3);
    assert.equal(g.end(order[0], { x: 200, y: 100 }), null);
    assert.equal(g.end(order[1], { x: 100, y: 100 }), null);
    g.begin(3, { x: 150, y: 150 }, 'touch');
    assert(g.end(3, { x: 150, y: 150 }));
  }
});
test('cancelled or missing pointers never issue orders', () => {
  const g = new BattleGestures();
  assert.equal(g.end(9, { x: 0, y: 0 }), null);
  g.begin(1, { x: 100, y: 100 }, 'touch');
  assert.equal(g.end(1, { x: 100, y: 100 }, true), null);
  g.begin(2, { x: 1, y: 1 });
  g.cancel();
  assert.equal(g.end(2, { x: 1, y: 1 }), null);
});
test('selection tolerance stays at finger size even for tiny projected units', () => {
  const units = [
    { id: 1, x: 40, y: 80 },
    { id: 2, x: 70, y: 80 },
  ];
  assert.equal(closestScreenUnit(units, { x: 39, y: 104 }, 28)?.id, 1);
  assert.equal(closestScreenUnit(units, { x: 69, y: 80 }, 28)?.id, 2);
  assert.equal(closestScreenUnit(units, { x: 140, y: 140 }, 28), undefined);
});
test('camp planning freezes simulation while recruitment remains available', () => {
  const b = new Battle();
  b.start();
  b.setPlanning('camp', true);
  assert(b.recruit('guard'));
  const snap = b.snapshot();
  advance(b, 30);
  assert.deepEqual(b.snapshot(), snap);
  b.setPlanning('camp', false);
  advance(b, 4.1);
  assert.equal(b.queue.length, 0);
  assert.equal(b.population, 11);
});
test('nested panel ownership and manual pause cannot accidentally resume combat', () => {
  const b = new Battle();
  b.start();
  b.setPlanning('camp', true);
  b.setPlanning('help', true);
  b.setPlanning('help', false);
  assert(b.planning);
  b.pause();
  b.setPlanning('camp', false);
  advance(b, 2);
  assert.equal(b.phase, 'paused');
  assert.equal(b.time, 0);
  b.pause();
  advance(b, 1);
  assert(b.time > 0);
  b.setPlanning('help', true);
  b.reset();
  assert.equal(b.planning, false);
});
test('previewing a spell or structure is free; only confirmation spends resources', () => {
  const b = new Battle();
  b.start();
  const before = b.snapshot();
  assert.equal(b.targetError('tower', { x: 6, z: 8 }), null);
  assert(b.targetError('tower', { x: 6, z: -8 }));
  assert.equal(b.targetError('blizzard', { x: 0, z: 0 }), null);
  assert(b.targetError('blizzard', { x: 29, z: -25 }));
  assert.deepEqual(b.snapshot(), before);
  assert(b.build({ x: 6, z: 8 }));
  assert.equal(b.gold, before.gold - 100);
  assert(b.blizzard({ x: 0, z: 0 }));
  assert.equal(b.mana, before.mana - 55);
});
