/** Deterministic game rules. No DOM or renderer dependencies. Coordinates are world X/Z. */
export type Team = 'ally' | 'enemy';
export type Kind = 'hero' | 'guard' | 'ranger' | 'worker' | 'raider';
export type Point = { x: number; z: number };
export type Unit = Point & {
  id: number;
  kind: Kind;
  team: Team;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attack: number;
  goal: Point | null;
  selected: boolean;
  slow: number;
  work: 'gold' | 'wood';
  cargo: number;
  cargoType: 'gold' | 'wood';
  harvest: number;
  returning: boolean;
};
export type Building = Point & {
  id: number;
  team: Team;
  kind: 'keep' | 'tower';
  hp: number;
  maxHp: number;
  attack: number;
  ready: number;
};
export type Effect = Point & {
  id: number;
  kind:
    | 'hit'
    | 'nova'
    | 'blizzard'
    | 'order'
    | 'spawn'
    | 'death'
    | 'harvest'
    | 'arrow';
  age: number;
  duration: number;
  team: Team;
  target?: Point;
};
const STATS: Record<
  Kind,
  { hp: number; damage: number; range: number; speed: number }
> = {
  hero: { hp: 600, damage: 37, range: 2.5, speed: 4.7 },
  guard: { hp: 180, damage: 19, range: 1.6, speed: 3.8 },
  ranger: { hp: 100, damage: 17, range: 9, speed: 3.8 },
  worker: { hp: 90, damage: 0, range: 0, speed: 4.2 },
  raider: { hp: 120, damage: 12, range: 1.7, speed: 3.1 },
};
export const COSTS = {
  guard: { gold: 70, wood: 0 },
  ranger: { gold: 85, wood: 25 },
  worker: { gold: 45, wood: 0 },
  tower: { gold: 100, wood: 90 },
};
export const MINE = { x: -20, z: 15 };
export const GROVE = { x: -20, z: 6 };
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export class Battle {
  units: Unit[] = [];
  buildings: Building[] = [];
  effects: Effect[] = [];
  phase: 'ready' | 'playing' | 'paused' | 'won' | 'lost' = 'ready';
  gold = 240;
  wood = 180;
  mana = 100;
  time = 0;
  wave = 0;
  kills = 0;
  novaCooldown = 0;
  blizzardCooldown = 0;
  nextWave = 24;
  notice = '指挥官，北境军团听候你的命令。';
  queue: { kind: 'guard' | 'ranger' | 'worker'; remaining: number }[] = [];
  private sequence = 1;
  private income = 0;
  constructor() {
    this.reset();
  }
  reset() {
    this.units = [];
    this.buildings = [];
    this.effects = [];
    this.phase = 'ready';
    this.gold = 240;
    this.wood = 180;
    this.mana = 100;
    this.time = 0;
    this.wave = 0;
    this.kills = 0;
    this.novaCooldown = 0;
    this.blizzardCooldown = 0;
    this.nextWave = 24;
    this.queue = [];
    this.income = 0;
    this.sequence = 1;
    this.notice = '指挥官，北境军团听候你的命令。';
    this.addBuilding('keep', 'ally', -7, 18);
    this.addBuilding('keep', 'enemy', 7, -19);
    this.addBuilding('tower', 'enemy', 0, -10);
    this.addBuilding('tower', 'enemy', 15, -12);
    this.addUnit('hero', 'ally', -5, 9);
    for (let i = 0; i < 4; i++)
      this.addUnit(
        'guard',
        'ally',
        -8 + (i % 2) * 2,
        11 + Math.floor(i / 2) * 2,
      );
    for (let i = 0; i < 2; i++) this.addUnit('ranger', 'ally', -3 + i * 2, 13);
    for (let i = 0; i < 3; i++) {
      const u = this.addUnit('worker', 'ally', -13 - i, 16);
      u.work = i === 2 ? 'wood' : 'gold';
    }
    for (let i = 0; i < 5; i++)
      this.addUnit(
        'raider',
        'enemy',
        3 + (i % 3) * 2,
        -13 - Math.floor(i / 3) * 2,
      );
    this.select('army');
  }
  addUnit(kind: Kind, team: Team, x: number, z: number) {
    const s = STATS[kind];
    const u: Unit = {
      id: this.sequence++,
      kind,
      team,
      x,
      z,
      hp: s.hp,
      maxHp: s.hp,
      damage: s.damage,
      range: s.range,
      speed: s.speed,
      attack: 0,
      goal: null,
      selected: false,
      slow: 0,
      work: 'gold',
      cargo: 0,
      cargoType: 'gold',
      harvest: 0,
      returning: false,
    };
    this.units.push(u);
    return u;
  }
  addBuilding(kind: Building['kind'], team: Team, x: number, z: number) {
    const hp = kind === 'keep' ? 1800 : 420;
    const b: Building = {
      id: this.sequence++,
      kind,
      team,
      x,
      z,
      hp,
      maxHp: hp,
      attack: 0,
      ready: 0,
    };
    this.buildings.push(b);
    return b;
  }
  get hero() {
    return this.units.find((u) => u.kind === 'hero' && u.hp > 0);
  }
  get population() {
    return this.units.filter((u) => u.team === 'ally' && u.hp > 0).length;
  }
  get selected() {
    return this.units.filter((u) => u.selected && u.hp > 0);
  }
  start() {
    if (this.phase === 'ready') {
      this.phase = 'playing';
      this.notice = '先采集资源、招募军队，再跨过冰河进攻。';
    }
  }
  pause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }
  select(group: 'army' | 'hero' | 'workers' | number) {
    for (const u of this.units)
      u.selected =
        u.team === 'ally' &&
        u.hp > 0 &&
        (typeof group === 'number'
          ? u.id === group
          : group === 'army'
            ? u.kind !== 'worker'
            : group === 'hero'
              ? u.kind === 'hero'
              : u.kind === 'worker');
  }
  order(p: Point) {
    if (
      this.phase !== 'playing' ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.z)
    )
      return false;
    const selected = this.selected;
    if (!selected.length) {
      this.notice = '先选择英雄或军队。';
      return false;
    }
    const target = {
      x: Math.max(-28, Math.min(28, p.x)),
      z: Math.max(-23, Math.min(23, p.z)),
    };
    const cols = Math.ceil(Math.sqrt(selected.length));
    selected.forEach((u, i) => {
      u.goal = {
        x: target.x + ((i % cols) - (cols - 1) / 2) * 1.4,
        z: target.z + Math.floor(i / cols) * 1.4,
      };
      if (u.kind === 'worker') u.harvest = 0;
    });
    this.fx('order', target, 1, 'ally');
    this.notice = '命令已下达 · 部队将自动攻击沿途敌人';
    return true;
  }
  recruit(kind: 'guard' | 'ranger' | 'worker') {
    if (this.phase !== 'playing') return false;
    if (!(kind in COSTS)) return false;
    const cost = COSTS[kind];
    if (this.population + this.queue.length >= 30) {
      this.notice = '人口已满 · 最多 30 人';
      return false;
    }
    if (this.queue.length >= 5) {
      this.notice = '训练队列已满';
      return false;
    }
    if (this.gold < cost.gold || this.wood < cost.wood) {
      this.notice = '资源不足，工人正在采集中。';
      return false;
    }
    this.gold -= cost.gold;
    this.wood -= cost.wood;
    this.queue.push({ kind, remaining: 4 });
    this.notice = '训练开始 · 4 秒后抵达';
    return true;
  }
  setWork(work: 'gold' | 'wood') {
    if (this.phase !== 'playing') return;
    const workers = this.units.filter(
      (u) => u.kind === 'worker' && u.team === 'ally' && u.hp > 0,
    );
    const selected = workers.filter((u) => u.selected);
    for (const u of selected.length ? selected : workers) {
      u.work = work;
      u.goal = null;
      u.returning = u.cargo > 0;
    }
    this.notice = work === 'gold' ? '工人已前往金矿。' : '工人已前往霜松林。';
  }
  build(p: Point) {
    if (
      this.phase !== 'playing' ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.z)
    )
      return false;
    if (this.gold < 100 || this.wood < 90) {
      this.notice = '箭塔需要 100 金币和 90 木材';
      return false;
    }
    if (
      p.z < 1 ||
      Math.abs(p.x) > 26 ||
      p.z > 23 ||
      this.buildings.some(
        (b) => b.hp > 0 && distance(b, p) < (b.kind === 'keep' ? 7 : 4),
      )
    ) {
      this.notice = '请选择冰河南岸的空地。';
      return false;
    }
    if (
      this.buildings.filter(
        (b) => b.team === 'ally' && b.kind === 'tower' && b.hp > 0,
      ).length >= 5
    ) {
      this.notice = '最多建造 5 座箭塔';
      return false;
    }
    this.gold -= 100;
    this.wood -= 90;
    const b = this.addBuilding('tower', 'ally', p.x, p.z);
    b.ready = 6;
    this.fx('spawn', p, 2, 'ally');
    this.notice = '箭塔建造中 · 6 秒后完工';
    return true;
  }
  nova() {
    const h = this.hero;
    if (
      this.phase !== 'playing' ||
      !h ||
      this.novaCooldown > 0 ||
      this.mana < 30
    )
      return false;
    this.mana -= 30;
    this.novaCooldown = 10;
    this.fx('nova', h, 1.5, 'ally');
    for (const u of this.units)
      if (u.team === 'enemy' && distance(u, h) < 11) {
        this.hurt(u, 105);
        u.slow = 5;
      }
    for (const b of this.buildings)
      if (b.team === 'enemy' && distance(b, h) < 11) this.hurt(b, 100);
    this.notice = '凛冬之环 · 周围敌人冻结减速';
    return true;
  }
  blizzard(p: Point) {
    const h = this.hero;
    if (
      this.phase !== 'playing' ||
      !h ||
      this.blizzardCooldown > 0 ||
      this.mana < 55 ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.z)
    )
      return false;
    if (Math.abs(p.x) > 30 || Math.abs(p.z) > 25) {
      this.notice = '请选择战场内的位置';
      return false;
    }
    if (distance(h, p) > 26) {
      this.notice = '目标太远 · 靠近英雄 26 米以内';
      return false;
    }
    this.mana -= 55;
    this.blizzardCooldown = 22;
    this.fx('blizzard', p, 4, 'ally');
    this.notice = '暴风雪降临 · 持续轰击目标区域';
    return true;
  }
  fx(
    kind: Effect['kind'],
    p: Point,
    duration: number,
    team: Team,
    target?: Point,
  ) {
    this.effects.push({
      id: this.sequence++,
      kind,
      x: p.x,
      z: p.z,
      age: 0,
      duration,
      team,
      target,
    });
  }
  hurt(target: Unit | Building, damage: number) {
    if (target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp === 0) {
      this.fx('death', target, 1.6, target.team);
      if (target.team === 'enemy') {
        this.kills++;
        this.gold += 'kind' in target && target.kind === 'keep' ? 200 : 20;
      }
    }
  }
  private move(u: Unit, p: Point, dt: number) {
    const d = distance(u, p);
    if (d < 0.15) return true;
    const v = Math.min(d, u.speed * dt * (u.slow > 0 ? 0.35 : 1));
    u.x += ((p.x - u.x) / d) * v;
    u.z += ((p.z - u.z) / d) * v;
    return d < 0.3;
  }
  step(dt: number) {
    if (this.phase !== 'playing') return;
    dt = Math.min(Math.max(dt, 0), 0.1);
    if (!Number.isFinite(dt)) return;
    this.time += dt;
    this.mana = Math.min(100, this.mana + 2.8 * dt);
    this.novaCooldown = Math.max(0, this.novaCooldown - dt);
    this.blizzardCooldown = Math.max(0, this.blizzardCooldown - dt);
    this.nextWave -= dt;
    if (this.nextWave <= 0) {
      this.wave++;
      this.nextWave = 30;
      const count = Math.min(4 + this.wave, 12);
      for (let i = 0; i < count; i++) {
        const u = this.addUnit(
          'raider',
          'enemy',
          4 + (i % 4) * 2,
          -21 - Math.floor(i / 4),
        );
        u.goal = { x: -7, z: 18 };
      }
      this.notice = `第 ${this.wave} 波霜烬军团正在进攻！`;
    }
    if (this.queue.length) {
      this.queue[0].remaining -= dt;
      if (this.queue[0].remaining <= 0) {
        const job = this.queue.shift()!;
        const keep = this.buildings.find(
          (b) => b.team === 'ally' && b.kind === 'keep',
        )!;
        const u = this.addUnit(job.kind, 'ally', keep.x + 5, keep.z - 4);
        u.selected = job.kind !== 'worker';
        this.fx('spawn', u, 1.2, 'ally');
        this.notice = '增援已抵达，等待你的指令。';
      }
    }
    for (const e of this.effects) {
      e.age += dt;
      if (e.kind === 'blizzard') {
        for (const u of this.units)
          if (u.hp > 0 && u.team === 'enemy' && distance(u, e) < 8) {
            this.hurt(u, 45 * dt);
            u.slow = 2;
          }
        for (const b of this.buildings)
          if (b.hp > 0 && b.team === 'enemy' && distance(b, e) < 8)
            this.hurt(b, 45 * dt);
      }
    }
    this.effects = this.effects.filter((e) => e.age < e.duration);
    const living = this.units.filter((u) => u.hp > 0);
    const structures = this.buildings.filter((b) => b.hp > 0);
    for (const u of living) {
      if (u.hp <= 0) continue;
      u.attack = Math.max(0, u.attack - dt);
      u.slow = Math.max(0, u.slow - dt);
      if (u.kind === 'worker') {
        if (u.goal) {
          if (this.move(u, u.goal, dt)) u.goal = null;
          continue;
        }
        const home = this.buildings.find(
          (b) => b.team === 'ally' && b.kind === 'keep',
        )!;
        const deposit = { x: home.x - 5, z: home.z };
        const target = u.returning ? deposit : u.work === 'gold' ? MINE : GROVE;
        if (distance(u, target) > 1.2) this.move(u, target, dt);
        else if (u.returning) {
          if (u.cargoType === 'gold') this.gold += u.cargo;
          else this.wood += u.cargo;
          this.fx('harvest', u, 0.8, 'ally');
          u.cargo = 0;
          u.returning = false;
          u.harvest = 0;
        } else {
          u.harvest += dt;
          if (u.harvest > 1.8) {
            u.cargo = 18;
            u.cargoType = u.work;
            u.returning = true;
            u.harvest = 0;
          }
        }
        continue;
      }
      const opponents = living
        .filter((v) => v.team !== u.team && v.hp > 0)
        .sort((a, b) => distance(u, a) - distance(u, b));
      const enemy = opponents[0];
      let target: Unit | Building | undefined =
        enemy && distance(u, enemy) < (u.goal ? 8 : 13) ? enemy : undefined;
      if (!target) {
        const buildings = structures
          .filter((b) => b.team !== u.team && b.hp > 0)
          .sort((a, b) => distance(u, a) - distance(u, b));
        if (buildings[0] && distance(u, buildings[0]) < (u.goal ? 10 : 14))
          target = buildings[0];
      }
      if (target) {
        const radius =
          'maxHp' in target && 'ready' in target
            ? target.kind === 'keep'
              ? 4
              : 1.8
            : 0.5;
        const d = distance(u, target);
        if (d > u.range + radius) this.move(u, target, dt);
        else if (u.attack <= 0) {
          this.hurt(target, u.damage);
          u.attack = u.kind === 'hero' ? 0.8 : 1.05;
          this.fx(u.range > 3 ? 'arrow' : 'hit', u, 0.3, u.team, {
            x: target.x,
            z: target.z,
          });
        }
      } else if (u.goal) {
        if (this.move(u, u.goal, dt)) u.goal = null;
      } else if (u.team === 'enemy' && this.wave > 0) {
        u.goal = { x: -7, z: 18 };
      }
    }
    // Soft separation keeps formations readable without requiring a navigation mesh.
    for (let i = 0; i < living.length; i++)
      for (let j = i + 1; j < living.length; j++) {
        const a = living[i],
          b = living[j];
        const d = distance(a, b);
        if (d < 0.9 && d > 0.001) {
          const shift = ((0.9 - d) * Math.min(1, dt * 5)) / 2;
          const x = ((a.x - b.x) / d) * shift,
            z = ((a.z - b.z) / d) * shift;
          a.x += x;
          a.z += z;
          b.x -= x;
          b.z -= z;
        }
      }
    for (const u of living) {
      for (const b of structures) {
        const r = b.kind === 'keep' ? 4.3 : 1.5;
        const d = distance(u, b);
        if (d < r && d > 0.001) {
          u.x = b.x + ((u.x - b.x) / d) * r;
          u.z = b.z + ((u.z - b.z) / d) * r;
        }
      }
      u.x = Math.max(-29, Math.min(29, u.x));
      u.z = Math.max(-24, Math.min(24, u.z));
    }
    for (const b of structures) {
      b.attack = Math.max(0, b.attack - dt);
      b.ready = Math.max(0, b.ready - dt);
      if (b.ready > 0) continue;
      const target = living
        .filter(
          (u) =>
            u.hp > 0 &&
            u.team !== b.team &&
            distance(b, u) < (b.kind === 'keep' ? 12 : 14),
        )
        .sort((a, c) => distance(a, b) - distance(c, b))[0];
      if (target && b.attack <= 0) {
        this.hurt(target, b.kind === 'keep' ? 17 : 24);
        this.fx('arrow', b, 0.4, b.team, { x: target.x, z: target.z });
        b.attack = 1.4;
      }
    }
    // The hero recuperates outside combat, making short mobile sessions forgiving.
    const hero = this.hero;
    if (
      hero &&
      !living.some((u) => u.team === 'enemy' && distance(u, hero) < 13)
    )
      hero.hp = Math.min(hero.maxHp, hero.hp + 7 * dt);
    this.income += dt;
    if (this.income >= 10) {
      this.gold += 8;
      this.income -= 10;
    }
    this.units = this.units.filter((u) => u.hp > 0);
    if (
      !this.hero ||
      this.buildings.some(
        (b) => b.kind === 'keep' && b.team === 'ally' && b.hp <= 0,
      )
    ) {
      this.phase = 'lost';
      this.notice = '北境防线失守。整顿军队，再战一次。';
    } else if (
      this.buildings.some(
        (b) => b.kind === 'keep' && b.team === 'enemy' && b.hp <= 0,
      )
    ) {
      this.phase = 'won';
      this.notice = '寒霜要塞已被攻破。黎明属于北境。';
    }
  }
  snapshot() {
    return {
      units: this.units.map(({ id, x, z, kind, team }) => ({
        id,
        x,
        z,
        kind,
        team,
      })),
      buildings: this.buildings.map(({ id, x, z, kind, team, hp }) => ({
        id,
        x,
        z,
        kind,
        team,
        hp,
      })),
      phase: this.phase,
      gold: Math.floor(this.gold),
      wood: Math.floor(this.wood),
      mana: Math.floor(this.mana),
      time: Math.floor(this.time),
      wave: this.wave,
      nextWave: Math.ceil(this.nextWave),
      population: this.population,
      kills: this.kills,
      hp: Math.ceil(this.hero?.hp ?? 0),
      nova: Math.ceil(this.novaCooldown),
      blizzard: Math.ceil(this.blizzardCooldown),
      notice: this.notice,
      selected: this.selected.length,
      queue: this.queue.map((j) => ({ ...j })),
      enemyHp:
        this.buildings.find((b) => b.kind === 'keep' && b.team === 'enemy')
          ?.hp ?? 0,
      allyHp:
        this.buildings.find((b) => b.kind === 'keep' && b.team === 'ally')
          ?.hp ?? 0,
    };
  }
}
export type Snapshot = ReturnType<Battle['snapshot']>;
