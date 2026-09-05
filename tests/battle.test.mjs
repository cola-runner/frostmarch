import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, MINE } from '../game/simulation.ts';
function advance(b, seconds) {
  for (let i = 0; i < Math.round(seconds * 20); i++) b.step(0.05);
}
test('ready and paused battles do not advance resources or time', () => {
  const b = new Battle();
  advance(b, 5);
  assert.equal(b.time, 0);
  b.start();
  advance(b, 1);
  b.pause();
  const state = b.snapshot();
  advance(b, 10);
  assert.deepEqual(b.snapshot(), state);
});
test('recruitment charges once, queues, spawns after four seconds, and enforces limits', () => {
  const b = new Battle();
  b.start();
  const n = b.population;
  assert.equal(b.recruit('guard'), true);
  assert.equal(b.gold, 170);
  advance(b, 4.1);
  assert.equal(b.population, n + 1);
  assert.equal(b.queue.length, 0);
  b.gold = 0;
  assert.equal(b.recruit('guard'), false);
  b.gold = 9999;
  for (let i = 0; i < 10; i++) b.recruit('guard');
  assert.equal(b.queue.length, 5);
});
test('workers return actual cargo to the keep instead of granting passive resource ticks', () => {
  const b = new Battle();
  b.start();
  b.nextWave = 999;
  const worker = b.units.find((u) => u.kind === 'worker');
  worker.x = MINE.x;
  worker.z = MINE.z;
  b.units = b.units.filter((u) => u.kind !== 'worker' || u.id === worker.id);
  advance(b, 2);
  assert.equal(b.gold, 240);
  assert.equal(worker.cargo, 18);
  advance(b, 5);
  assert.equal(b.gold, 258);
});
test('formation commands move selected units without moving unselected units', () => {
  const b = new Battle();
  b.start();
  b.nextWave = 999;
  b.units = b.units.filter((u) => u.team === 'ally');
  b.select('hero');
  const h = b.hero,
    guard = b.units.find((u) => u.kind === 'guard');
  const gx = guard.x,
    gz = guard.z;
  assert.equal(b.order({ x: 2, z: 6 }), true);
  advance(b, 1);
  assert(h.x > -5);
  assert.equal(guard.x, gx);
  assert.equal(guard.z, gz);
  assert.equal(b.order({ x: NaN, z: 0 }), false);
});
test('nova damages nearby enemies, applies slow, consumes mana, and respects cooldown', () => {
  const b = new Battle();
  b.start();
  const h = b.hero,
    e = b.addUnit('raider', 'enemy', h.x + 2, h.z);
  assert(b.nova());
  assert.equal(e.hp, 15);
  assert.equal(e.slow, 5);
  assert.equal(b.mana, 70);
  assert.equal(b.nova(), false);
  assert.equal(e.hp, 15);
});
test('blizzard validates distance, deals damage over time, and respects cooldown', () => {
  const b = new Battle();
  b.start();
  assert.equal(b.blizzard({ x: 29, z: -25 }), false);
  assert.equal(b.mana, 100);
  const h = b.hero,
    e = b.addUnit('raider', 'enemy', h.x + 3, h.z);
  e.speed = 0;
  assert(b.blizzard({ x: e.x, z: e.z }));
  advance(b, 1);
  assert(e.hp < 90);
  assert.equal(b.blizzard({ x: 0, z: 0 }), false);
});
test('tower rejects overlaps and enemy territory without charging, then constructs', () => {
  const b = new Battle();
  b.start();
  assert.equal(b.build({ x: -7, z: 18 }), false);
  assert.equal(b.build({ x: 3, z: -5 }), false);
  assert.equal(b.gold, 240);
  assert(b.build({ x: 6, z: 8 }));
  assert.equal(b.gold, 140);
  assert.equal(b.wood, 90);
  const tower = b.buildings.at(-1);
  assert.equal(tower.ready, 6);
  advance(b, 6.1);
  assert.equal(tower.ready, 0);
});
test('enemy waves spawn on schedule and advance toward the player', () => {
  const b = new Battle();
  b.start();
  b.nextWave = 0.05;
  b.step(0.1);
  assert.equal(b.wave, 1);
  assert.equal(b.units.filter((u) => u.team === 'enemy').length, 10);
  assert(b.units.some((u) => u.team === 'enemy' && u.goal?.z === 18));
});
test('destroying enemy keep wins; losing hero or allied keep loses', () => {
  for (const target of ['enemy', 'ally', 'hero']) {
    const b = new Battle();
    b.start();
    if (target === 'hero') b.hero.hp = 0;
    else b.buildings.find((x) => x.team === target && x.kind === 'keep').hp = 0;
    b.step(0.05);
    assert.equal(b.phase, target === 'enemy' ? 'won' : 'lost');
  }
});
test('reset restores a clean battle after combat, recruitment and building', () => {
  const b = new Battle();
  b.start();
  b.recruit('guard');
  b.build({ x: 5, z: 8 });
  advance(b, 20);
  b.reset();
  assert.deepEqual(b.snapshot(), new Battle().snapshot());
  assert.equal(b.buildings.length, 4);
  assert.equal(b.units.length, 15);
});
test('a sensible offensive army can win without hidden cheats', () => {
  const b = new Battle();
  b.start();
  let result = '';
  for (let i = 0; i < 20 * 240 && b.phase === 'playing'; i++) {
    if (i % 80 === 0) {
      if (b.gold >= 85 && b.wood >= 25) b.recruit('ranger');
      else if (b.gold >= 70) b.recruit('guard');
      b.select('army');
      b.order({ x: 7, z: -19 });
    }
    if (
      b.hero &&
      b.units.some(
        (u) =>
          u.team === 'enemy' && Math.hypot(u.x - b.hero.x, u.z - b.hero.z) < 10,
      )
    )
      b.nova();
    if (b.hero && Math.hypot(b.hero.x - 7, b.hero.z + 19) < 26)
      b.blizzard({ x: 7, z: -19 });
    b.step(0.05);
    result = b.phase;
  }
  assert.equal(result, 'won', JSON.stringify(b.snapshot()));
});

test('switching a worker job never converts already gathered cargo', () => {
  const b = new Battle();
  b.start();
  b.nextWave = 999;
  const u = b.units.find((x) => x.kind === 'worker');
  b.units = b.units.filter((x) => x.kind !== 'worker' || x.id === u.id);
  u.x = MINE.x;
  u.z = MINE.z;
  advance(b, 2);
  assert.equal(u.cargo, 18);
  b.select('workers');
  b.setWork('wood');
  advance(b, 5);
  assert.equal(b.gold, 258);
  assert.equal(b.wood, 180);
});
