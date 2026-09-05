import * as T from 'three';
import { BattleGestures, closestScreenUnit } from './interaction';
import {
  Battle,
  MINE,
  type Point,
  type Unit,
  type Building,
  type Effect,
} from './simulation';
export type SceneController = {
  dispose: () => void;
  setTarget: (mode: 'tower' | 'blizzard' | null, p?: Point) => void;
  focus: (p: Point) => void;
  rotate: () => void;
  zoom: (direction: number) => void;
};
export function createScene(
  host: HTMLElement,
  battle: Battle,
  onTap: (p: Point, unit?: Unit) => void,
  onFrame: () => void,
): SceneController {
  const scene = new T.Scene();
  scene.background = new T.Color('#829eaa');
  scene.fog = new T.FogExp2('#829eaa', 0.0065);
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  const mobileGPU = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobileGPU ? 1.35 : 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const camera = new T.OrthographicCamera(-40, 40, 28, -28, 0.1, 220);
  let size = host.clientHeight <= 520 ? 42 : host.clientWidth < 700 ? 46 : 53,
    angle = 0.64;
  const center = new T.Vector3(0, 0, 0);
  const wanted = center.clone();
  let aspect = 1;
  scene.add(new T.HemisphereLight('#d4edf5', '#506c81', 2));
  const sun = new T.DirectionalLight('#ffe0ad', 3.2);
  sun.position.set(-28, 48, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobileGPU ? 1024 : 2048, mobileGPU ? 1024 : 2048);
  Object.assign(sun.shadow.camera, {
    left: -45,
    right: 45,
    top: 40,
    bottom: -40,
    near: 1,
    far: 140,
  });
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(new T.AmbientLight('#aac9dc', 0.2));
  const material = (
    color: string,
    extra: Partial<T.MeshStandardMaterialParameters> = {},
  ) =>
    new T.MeshStandardMaterial({
      color,
      roughness: 0.85,
      flatShading: true,
      ...extra,
    });
  const mats = {
    snow: material('#d0e0df'),
    snowBright: material('#e3ece4'),
    stone: material('#597683'),
    stoneDark: material('#354c5d'),
    roof: material('#204961'),
    redRoof: material('#663e49'),
    wood: material('#73584a'),
    gold: material('#e4b85c', { metalness: 0.45, roughness: 0.4 }),
    steel: material('#a1b7bd', { metalness: 0.5, roughness: 0.45 }),
    blue: material('#357891'),
    red: material('#9b4f4d'),
    skin: material('#dfbda2'),
    ice: material('#78bed0', {
      metalness: 0.25,
      roughness: 0.25,
      emissive: '#244756',
      emissiveIntensity: 0.2,
    }),
    flame: material('#ffc374', { emissive: '#ff7024', emissiveIntensity: 2.7 }),
    rune: material('#bbebed', { emissive: '#70d5e6', emissiveIntensity: 1.6 }),
  };
  const boxGeo = new T.BoxGeometry(1, 1, 1),
    coneGeo = new T.ConeGeometry(1, 1, 6),
    sphereGeo = new T.IcosahedronGeometry(1, 0),
    cylGeo = new T.CylinderGeometry(1, 1, 1, 8);
  const geometries = new Set<T.BufferGeometry>([
    boxGeo,
    coneGeo,
    sphereGeo,
    cylGeo,
  ]);
  const allMaterials = new Set<T.Material>(Object.values(mats));
  function mesh(
    geo: T.BufferGeometry,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    parent: T.Object3D = scene,
  ) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (
    parent: T.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: T.Material,
  ) => mesh(boxGeo, mat, x, y, z, w, h, d, parent);
  let seed = 19;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // A carved, floating slice of the northern frontier.
  const terrain = new T.PlaneGeometry(65, 53, 42, 34);
  terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    const edge = Math.max(Math.abs(x) - 25, Math.abs(z) - 19, 0);
    pos.setY(i, Math.abs(z) < 4 ? -0.27 : (rnd() - 0.5) * 0.22 + edge * 0.06);
    const c = new T.Color('#cfdfde').lerp(new T.Color('#a0bcc5'), rnd() * 0.45);
    colors.push(c.r, c.g, c.b);
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  geometries.add(terrain);
  const groundMat = material('#ffffff', { vertexColors: true });
  allMaterials.add(groundMat);
  const ground = mesh(terrain, groundMat, 0, 0, 0);
  ground.castShadow = false;
  box(scene, 64, 2.5, 52, 0, -1.9, 0, mats.stoneDark);
  box(scene, 63.8, 0.6, 51.8, 0, -0.55, 0, mats.snow);
  for (let i = 0; i < 120; i++) {
    const side = i % 4;
    const x = side < 2 ? (side === 0 ? -32 : 32) : (rnd() - 0.5) * 65;
    const z = side >= 2 ? (side === 2 ? -26 : 26) : (rnd() - 0.5) * 53;
    const rock = mesh(
      sphereGeo,
      i % 3 ? mats.stone : mats.snow,
      x,
      -1.2 + rnd() * 0.7,
      z,
      1 + rnd() * 2,
      1.5 + rnd() * 2.5,
      1 + rnd() * 2,
    );
    rock.rotation.set(rnd(), rnd() * 3, rnd());
  }
  // Frozen river: shallow glacial layers, polygonal floes and fracture lines.
  const riverMat = material('#6896a9', { roughness: 0.22, metalness: 0.5 });
  allMaterials.add(riverMat);
  box(scene, 64, 0.12, 6.8, 0, 0.08, 0, riverMat);
  for (let i = 0; i < 24; i++) {
    const floe = mesh(
      cylGeo,
      i % 2 ? mats.snow : mats.ice,
      (rnd() - 0.5) * 62,
      0.18,
      (rnd() - 0.5) * 5.8,
      0.3 + rnd(),
      0.07,
      0.4 + rnd(),
    );
    floe.rotation.y = rnd() * 6;
  }
  const crackMat = new T.LineBasicMaterial({
    color: '#bfe7e8',
    transparent: true,
    opacity: 0.45,
  });
  allMaterials.add(crackMat);
  for (let i = 0; i < 26; i++) {
    const x = (rnd() - 0.5) * 62,
      z = (rnd() - 0.5) * 5;
    const geo = new T.BufferGeometry().setFromPoints([
      new T.Vector3(x, 0.18, z),
      new T.Vector3(x + 1, 0.18, z - 0.5),
      new T.Vector3(x + 1.7, 0.18, z + 0.1),
    ]);
    geometries.add(geo);
    scene.add(new T.Line(geo, crackMat));
  }
  for (const x of [-5, 15]) {
    box(scene, 4.1, 0.4, 9, x, 0.32, 0, mats.wood);
    for (let z = -4; z <= 4; z += 0.65)
      box(scene, 4.2, 0.07, 0.42, x, 0.56, z, mats.stone);
    for (const dx of [-2, 2]) {
      box(scene, 0.2, 0.2, 8.6, x + dx, 1.1, 0, mats.wood);
      for (const z of [-4, -2, 0, 2, 4])
        box(scene, 0.28, 1.2, 0.28, x + dx, 0.7, z, mats.stone);
      box(scene, 0.32, 0.08, 8.6, x + dx, 1.23, 0, mats.snow);
    }
  }
  // Foot-worn paths and scattered flagstones connect each stronghold.
  const pathMat = material('#a8babb');
  allMaterials.add(pathMat);
  for (let i = 0; i < 95; i++) {
    const z = (rnd() - 0.5) * 44;
    if (Math.abs(z) < 4) continue;
    const x = (z > 0 ? -6 : 5) + (rnd() - 0.5) * 5;
    mesh(
      cylGeo,
      pathMat,
      x,
      0.08,
      z,
      0.2 + rnd() * 0.45,
      0.018,
      0.3 + rnd() * 0.6,
    );
  }
  // Instancing keeps the forest inexpensive on phones.
  const trees: { x: number; z: number; h: number }[] = [];
  for (let i = 0; i < 270; i++) {
    const x = (rnd() - 0.5) * 62,
      z = (rnd() - 0.5) * 49;
    if (
      Math.abs(z) < 5 ||
      Math.abs(x) < 18 ||
      Math.hypot(x - MINE.x, z - MINE.z) < 4
    )
      continue;
    trees.push({ x, z, h: 2 + rnd() * 3.6 });
  }
  const treeMat = material('#315c65');
  allMaterials.add(treeMat);
  const dummy = new T.Object3D();
  function instances(
    geo: T.BufferGeometry,
    mat: T.Material,
    count: number,
    place: (i: number, o: T.Object3D) => void,
  ) {
    const inst = new T.InstancedMesh(geo, mat, count);
    for (let i = 0; i < count; i++) {
      place(i, dummy);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.castShadow = true;
    inst.receiveShadow = true;
    scene.add(inst);
  }
  instances(cylGeo, mats.wood, trees.length, (i, o) => {
    const t = trees[i];
    o.position.set(t.x, t.h * 0.25, t.z);
    o.scale.set(0.13, t.h * 0.5, 0.13);
    o.rotation.set(0, 0, 0);
  });
  for (let layer = 0; layer < 3; layer++) {
    instances(coneGeo, treeMat, trees.length, (i, o) => {
      const t = trees[i],
        r = t.h * (0.4 - layer * 0.09);
      o.position.set(t.x, t.h * (0.34 + layer * 0.22), t.z);
      o.scale.set(r, t.h * 0.55, r);
      o.rotation.set(0, i, 0);
    });
    instances(coneGeo, mats.snow, trees.length, (i, o) => {
      const t = trees[i],
        r = t.h * (0.37 - layer * 0.083);
      o.position.set(t.x, t.h * (0.39 + layer * 0.22), t.z);
      o.scale.set(r, t.h * 0.46, r);
      o.rotation.set(0, i, 0);
    });
  }
  // Gold mine with exposed ore, timber entrance and a warm lantern.
  for (let i = 0; i < 9; i++)
    mesh(
      sphereGeo,
      mats.stone,
      MINE.x + (rnd() - 0.5) * 4,
      1 + rnd(),
      MINE.z + (rnd() - 0.5) * 3,
      1 + rnd() * 1.5,
      1 + rnd() * 1.4,
      1.5,
    );
  box(scene, 2.2, 2.4, 0.4, MINE.x + 1, 1.1, MINE.z + 1.5, mats.wood);
  box(scene, 1.5, 1.8, 0.5, MINE.x + 1, 1, MINE.z + 1.8, mats.stoneDark);
  for (let i = 0; i < 8; i++)
    mesh(
      sphereGeo,
      mats.gold,
      MINE.x + (rnd() - 0.5) * 4,
      0.8 + rnd() * 2,
      MINE.z + 1.7,
      0.3,
      0.45,
      0.3,
    );
  const flags: T.Mesh[] = [];
  const fires: T.Mesh[] = [];
  function flag(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    enemy = false,
  ) {
    box(parent, 0.08, 3, 0.08, x, y + 1.5, z, mats.wood);
    const geo = new T.PlaneGeometry(1.35, 1, 5, 2);
    geometries.add(geo);
    const mat = material(enemy ? '#a65952' : '#397a99', { side: T.DoubleSide });
    allMaterials.add(mat);
    const f = new T.Mesh(geo, mat);
    f.position.set(x + 0.65, y + 2.25, z);
    flags.push(f);
    parent.add(f);
  }
  function fire(parent: T.Object3D, x: number, z: number) {
    box(parent, 0.23, 1.4, 0.23, x, 0.7, z, mats.wood);
    const f = mesh(sphereGeo, mats.flame, x, 1.55, z, 0.23, 0.44, 0.23, parent);
    fires.push(f);
    mesh(sphereGeo, mats.gold, x, 1.26, z, 0.34, 0.13, 0.34, parent);
  }
  fire(scene, MINE.x + 2.3, MINE.z + 2);
  function makeBuilding(b: Building) {
    const g = new T.Group();
    g.position.set(b.x, 0, b.z);
    scene.add(g);
    const roof = b.team === 'ally' ? mats.roof : mats.redRoof;
    if (b.kind === 'keep') {
      box(g, 9, 0.5, 8, 0, 0.25, 0, mats.stone);
      box(g, 7.5, 3.6, 6, 0, 2, 0, mats.stone);
      box(g, 7.8, 0.3, 6.3, 0, 3.9, 0, mats.snow);
      box(g, 3.2, 6, 3.3, 0, 3.4, -0.8, mats.stoneDark);
      box(g, 3.5, 0.25, 3.6, 0, 6.5, -0.8, mats.snow);
      const keepRoof = mesh(coneGeo, roof, 0, 8, -0.8, 2.7, 3.1, 2.7, g);
      keepRoof.rotation.y = Math.PI / 6;
      for (const x of [-3.6, 3.6])
        for (const z of [-2.8, 2.8]) {
          box(g, 1.8, 5, 1.8, x, 2.7, z, mats.stoneDark);
          box(g, 2.05, 0.28, 2.05, x, 5.15, z, mats.snow);
          mesh(coneGeo, roof, x, 6.15, z, 1.6, 2.1, 1.6, g);
          box(g, 0.38, 0.8, 0.04, x, 4, z + 1, mats.gold);
        }
      for (let x = -2.8; x <= 2.8; x += 1.4) {
        box(g, 0.65, 0.75, 0.65, x, 4.4, 3, mats.stoneDark);
        box(g, 0.8, 0.16, 0.8, x, 4.85, 3, mats.snow);
      }
      box(g, 2, 2.6, 0.15, 0, 1.45, 3.05, mats.wood);
      for (let x = -0.8; x < 1; x += 0.4)
        box(g, 0.05, 2.5, 0.05, x, 1.4, 3.16, mats.steel);
      box(g, 2.9, 0.25, 1.8, 0, 0.2, 3.6, mats.stone);
      box(g, 2.7, 0.18, 1.2, 0, 0.13, 4.3, mats.snow);
      flag(g, 0, 9, -0.8, b.team === 'enemy');
      fire(g, -2.5, 4.4);
      fire(g, 2.5, 4.4);
    } else {
      box(g, 2.8, 0.35, 2.8, 0, 0.2, 0, mats.stone);
      box(g, 1.5, 4.6, 1.5, 0, 2.5, 0, mats.stoneDark);
      box(g, 2.5, 0.5, 2.5, 0, 4.8, 0, mats.stone);
      box(g, 2.6, 0.2, 2.6, 0, 5.15, 0, mats.snow);
      for (const x of [-1, 1])
        for (const z of [-1, 1])
          box(g, 0.6, 0.7, 0.6, x, 5.5, z, mats.stoneDark);
      mesh(coneGeo, roof, 0, 6.5, 0, 1.8, 2, 1.8, g);
      flag(g, 0, 7.3, 0, b.team === 'enemy');
    }
    return g;
  }
  // Small supply camp: tent, stacked logs, crates and smouldering embers.
  const tent = mesh(coneGeo, mats.blue, -14, 1.4, 21, 2.6, 3, 2.6);
  tent.rotation.y = 0.3;
  for (let i = 0; i < 7; i++) {
    const log = mesh(
      cylGeo,
      mats.wood,
      -15 + (i % 3) * 0.6,
      0.35 + Math.floor(i / 3) * 0.35,
      6,
      0.23,
      2,
      0.23,
    );
    log.rotation.z = Math.PI / 2;
  }
  for (let i = 0; i < 4; i++)
    box(
      scene,
      0.8,
      0.8,
      0.8,
      -13 + (i % 2),
      0.4 + Math.floor(i / 2) * 0.8,
      19,
      mats.wood,
    );
  fire(scene, -11, 22);
  // Frost shards and ancient runestones frame the enemy approach.
  for (const [x, z] of [
    [-10, -17],
    [21, -19],
    [-23, -8],
    [25, 10],
  ]) {
    for (let i = 0; i < 5; i++) {
      const shard = mesh(
        coneGeo,
        mats.ice,
        x + (rnd() - 0.5) * 3,
        1 + rnd(),
        z + (rnd() - 0.5) * 3,
        0.3 + rnd() * 0.5,
        2 + rnd() * 3,
        0.5,
      );
      shard.rotation.z = (rnd() - 0.5) * 0.5;
    }
    mesh(sphereGeo, mats.snow, x, 0.15, z, 2, 0.2, 1.5);
  }
  const rings = new T.RingGeometry(0.63, 0.7, 40);
  rings.rotateX(-Math.PI / 2);
  geometries.add(rings);
  const selectedMat = new T.MeshBasicMaterial({
    color: '#b7ecc8',
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  allMaterials.add(selectedMat);
  const shadowGeo = new T.CircleGeometry(0.65, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  geometries.add(shadowGeo);
  const shadowMat = new T.MeshBasicMaterial({
    color: '#263f4b',
    transparent: true,
    opacity: 0.23,
    depthWrite: false,
  });
  allMaterials.add(shadowMat);
  const healthGeo = new T.PlaneGeometry(1, 0.085);
  geometries.add(healthGeo);
  const hpMat = new T.MeshBasicMaterial({ color: '#9ad7b3', depthTest: false });
  const enemyHpMat = new T.MeshBasicMaterial({
    color: '#e39480',
    depthTest: false,
  });
  const hpBackMat = new T.MeshBasicMaterial({
    color: '#203840',
    depthTest: false,
  });
  allMaterials.add(hpMat);
  allMaterials.add(enemyHpMat);
  allMaterials.add(hpBackMat);
  type Avatar = {
    group: T.Group;
    body: T.Group;
    ring: T.Mesh;
    left: T.Mesh;
    right: T.Mesh;
    arm: T.Group;
    hp: T.Group;
    fill: T.Mesh;
    last: Point;
  };
  const avatars = new Map<number, Avatar>();
  const buildings = new Map<number, T.Group>();
  function makeUnit(u: Unit): Avatar {
    const g = new T.Group(),
      body = new T.Group(),
      arm = new T.Group();
    scene.add(g);
    g.add(body);
    const hero = u.kind === 'hero';
    const enemy = u.team === 'enemy';
    const worker = u.kind === 'worker';
    const tint = enemy ? mats.red : worker ? mats.wood : mats.blue;
    mesh(shadowGeo, shadowMat, 0, 0.03, 0, 1, 1, 1, g);
    const ring = mesh(
      rings,
      selectedMat,
      0,
      0.04,
      0,
      hero ? 1.6 : 1,
      1,
      hero ? 1.6 : 1,
      g,
    );
    ring.castShadow = false;
    const left = box(body, 0.24, 0.54, 0.28, -0.18, 0.38, 0, mats.stoneDark),
      right = box(body, 0.24, 0.54, 0.28, 0.18, 0.38, 0, mats.stoneDark);
    box(body, 0.68, 0.65, 0.42, 0, 0.99, 0, tint);
    mesh(
      sphereGeo,
      worker ? mats.skin : mats.steel,
      0,
      1.58,
      0,
      0.3,
      0.32,
      0.3,
      body,
    );
    if (!worker) {
      box(body, 0.48, 0.09, 0.05, 0, 1.59, 0.29, mats.stoneDark);
      box(body, 0.13, 0.13, 0.06, 0, 1.6, 0.33, enemy ? mats.flame : mats.rune);
    }
    box(body, 0.8, 0.16, 0.49, 0, 1.25, 0, mats.steel);
    if (hero) {
      const cape = mesh(
        coneGeo,
        mats.blue,
        0,
        0.9,
        -0.28,
        0.58,
        1.2,
        0.22,
        body,
      );
      cape.rotation.x = -0.14;
      box(body, 0.38, 0.15, 0.36, 0, 1.84, 0, mats.snowBright);
    }
    arm.position.set(0.45, 1.12, 0);
    body.add(arm);
    box(arm, 0.2, 0.5, 0.22, 0, -0.12, 0, tint);
    if (u.kind === 'ranger') {
      const bowGeo = new T.TorusGeometry(0.4, 0.04, 5, 10, Math.PI);
      geometries.add(bowGeo);
      const bow = mesh(bowGeo, mats.wood, 0, 0.08, 0.33, 1, 1, 1, arm);
      bow.rotation.y = Math.PI / 2;
      box(arm, 0.04, 0.7, 0.04, 0, 0.08, 0.4, mats.steel);
    } else if (worker) {
      box(arm, 0.08, 1.05, 0.08, 0, 0.28, 0.2, mats.wood);
      box(arm, 0.65, 0.1, 0.14, 0, 0.73, 0.2, mats.steel);
    } else {
      box(
        arm,
        0.08,
        hero ? 1.6 : 0.95,
        0.09,
        0,
        0.45,
        0.25,
        hero ? mats.rune : mats.steel,
      );
      box(arm, 0.4, 0.09, 0.16, 0, 0.06, 0.25, mats.gold);
      const shield = mesh(
        cylGeo,
        tint,
        -0.85,
        -0.1,
        0.05,
        0.32,
        0.1,
        0.43,
        arm,
      );
      shield.rotation.x = Math.PI / 2;
      box(arm, 0.07, 0.5, 0.1, -0.85, -0.1, 0.13, mats.gold);
    }
    if (hero) body.scale.setScalar(1.32);
    const hp = new T.Group();
    g.add(hp);
    hp.position.y = hero ? 2.85 : 2.3;
    mesh(healthGeo, hpBackMat, 0, 0, 0, 1.25, 1.7, 1, hp);
    const fill = mesh(
      healthGeo,
      enemy ? enemyHpMat : hpMat,
      0,
      0,
      0.01,
      1.2,
      1,
      1,
      hp,
    );
    hp.renderOrder = 10;
    return {
      group: g,
      body,
      ring,
      left,
      right,
      arm,
      hp,
      fill,
      last: { x: u.x, z: u.z },
    };
  }
  const effectGroups = new Map<number, T.Group>();
  const novaMat = new T.MeshBasicMaterial({
    color: '#c1f5ed',
    transparent: true,
    opacity: 0.7,
    side: T.DoubleSide,
    depthWrite: false,
  });
  allMaterials.add(novaMat);
  const fxRing = new T.RingGeometry(0.95, 1, 64);
  fxRing.rotateX(-Math.PI / 2);
  geometries.add(fxRing);
  function makeEffect(e: Effect) {
    const g = new T.Group();
    g.position.set(e.x, 0.2, e.z);
    scene.add(g);
    if (e.kind === 'nova' || e.kind === 'blizzard') {
      for (let i = 0; i < 3; i++) {
        const mat = novaMat.clone();
        allMaterials.add(mat);
        mesh(fxRing, mat, 0, 0.02 * i, 0, 1, 1, 1, g);
      }
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2,
          r = e.kind === 'nova' ? 8.5 : 1 + (i % 7);
        mesh(
          coneGeo,
          mats.ice,
          Math.sin(a) * r,
          0,
          Math.cos(a) * r,
          0.15 + (i % 3) * 0.1,
          1.5 + (i % 4),
          0.2,
          g,
        );
      }
    } else if (e.kind === 'order') {
      mesh(fxRing, novaMat, 0, 0, 0, 1.4, 1, 1.4, g);
      mesh(coneGeo, mats.gold, 0, 1.8, 0, 0.12, 0.8, 0.12, g);
    } else if (e.kind === 'arrow') {
      const a = mesh(
        sphereGeo,
        e.team === 'ally' ? mats.gold : mats.flame,
        0,
        1.3,
        0,
        0.12,
        0.12,
        0.5,
        g,
      );
      a.castShadow = false;
    } else {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        mesh(
          sphereGeo,
          e.kind === 'harvest'
            ? mats.gold
            : e.team === 'ally'
              ? mats.ice
              : mats.flame,
          Math.sin(a) * 0.4,
          0.5,
          Math.cos(a) * 0.4,
          0.1,
          0.1,
          0.1,
          g,
        );
      }
    }
    return g;
  }
  const snowCount = mobileGPU ? 320 : 600,
    snowPositions = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPositions[i * 3] = (rnd() - 0.5) * 95;
    snowPositions[i * 3 + 1] = rnd() * 35;
    snowPositions[i * 3 + 2] = (rnd() - 0.5) * 85;
  }
  const snowGeo = new T.BufferGeometry();
  snowGeo.setAttribute('position', new T.BufferAttribute(snowPositions, 3));
  geometries.add(snowGeo);
  const snowMat = new T.PointsMaterial({
    color: '#e2f3ef',
    size: 0.085,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  allMaterials.add(snowMat);
  const snowfall = new T.Points(snowGeo, snowMat);
  scene.add(snowfall);
  const ray = new T.Raycaster(),
    ndc = new T.Vector2(),
    plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function pick(x: number, y: number) {
    const rect = host.getBoundingClientRect();
    ndc.set(
      ((x - rect.left) / rect.width) * 2 - 1,
      (-(y - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(ndc, camera);
    const hit = new T.Vector3();
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  let disposed = false,
    frame = 0,
    last = performance.now(),
    clock = 0,
    lastUi = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = !document.hidden;
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    aspect = w / h;
    renderer.setSize(w, h);
    updateCamera();
  }
  function updateCamera() {
    const extent = size * (aspect < 0.8 ? 1.16 : 1);
    camera.left = (-extent * aspect) / 2;
    camera.right = (extent * aspect) / 2;
    const hudOffset =
      extent * (host.clientHeight <= 520 ? 0.12 : aspect < 0.8 ? 0.06 : 0);
    camera.top = extent / 2 - hudOffset;
    camera.bottom = -extent / 2 - hudOffset;
    camera.updateProjectionMatrix();
    camera.position.set(
      center.x + Math.sin(angle) * 60,
      60,
      center.z + Math.cos(angle) * 60,
    );
    camera.lookAt(center);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const gestures = new BattleGestures();
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    host.setPointerCapture(e.pointerId);
    gestures.begin(e.pointerId, { x: e.clientX, y: e.clientY }, e.pointerType);
  };
  const onMove = (e: PointerEvent) => {
    const gesture = gestures.move(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) return;
    if (gesture.kind === 'pinch')
      size = T.MathUtils.clamp(size * gesture.ratio, 25, 85);
    const a = pick(gesture.from.x, gesture.from.y),
      b = pick(gesture.to.x, gesture.to.y);
    if (a && b) {
      wanted.x = T.MathUtils.clamp(wanted.x + a.x - b.x, -22, 22);
      wanted.z = T.MathUtils.clamp(wanted.z + a.z - b.z, -20, 20);
    }
  };
  const onUp = (e: PointerEvent) => {
    const tap = gestures.end(
      e.pointerId,
      { x: e.clientX, y: e.clientY },
      e.type === 'pointercancel',
    );
    if (!tap) return;
    const p = pick(tap.x, tap.y);
    if (!p) return;
    const rect = host.getBoundingClientRect();
    const candidates = battle.units
      .filter((u) => u.team === 'ally' && u.hp > 0)
      .map((unit) => {
        const projected = new T.Vector3(unit.x, 1.25, unit.z).project(camera);
        return {
          unit,
          x: rect.left + ((projected.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - projected.y) * rect.height) / 2,
        };
      });
    const hit = closestScreenUnit(
      candidates,
      tap,
      tap.type === 'touch' ? 28 : 18,
    );
    onTap(p, hit?.unit);
  };
  // Visible placement marker stays in world space while the camera moves.
  let targetMode: 'tower' | 'blizzard' | null = null;
  let targetPoint: Point | null = null;
  const targetMaterial = new T.MeshBasicMaterial({
    color: '#b7edcf',
    transparent: true,
    opacity: 0.85,
    side: T.DoubleSide,
    depthWrite: false,
  });
  allMaterials.add(targetMaterial);
  const targetGroup = new T.Group();
  targetGroup.visible = false;
  scene.add(targetGroup);
  const targetRingGeometry = new T.RingGeometry(0.97, 1, 64);
  targetRingGeometry.rotateX(-Math.PI / 2);
  geometries.add(targetRingGeometry);
  const targetRing = new T.Mesh(targetRingGeometry, targetMaterial);
  targetGroup.add(targetRing);
  const targetFillMaterial = targetMaterial.clone();
  targetFillMaterial.opacity = 0.14;
  allMaterials.add(targetFillMaterial);
  const targetFillGeometry = new T.CircleGeometry(1, 64);
  targetFillGeometry.rotateX(-Math.PI / 2);
  geometries.add(targetFillGeometry);
  const targetFill = new T.Mesh(targetFillGeometry, targetFillMaterial);
  targetGroup.add(targetFill);
  for (const a of [0, Math.PI / 2]) {
    const m = new T.Mesh(boxGeo, targetMaterial);
    m.scale.set(1.4, 0.025, 0.08);
    m.rotation.y = a;
    targetGroup.add(m);
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    size = T.MathUtils.clamp(size + e.deltaY * 0.035, 25, 85);
  };
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onUp);
  host.addEventListener('wheel', onWheel, { passive: false });
  const visibility = () => {
    visible = !document.hidden;
    last = performance.now();
  };
  document.addEventListener('visibilitychange', visibility);
  function loop(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible) return;
    clock += dt;
    battle.step(dt);
    if (targetMode && targetPoint) {
      const valid = !battle.targetError(targetMode, targetPoint);
      const color = valid ? '#b7edcf' : '#ef9b83';
      targetMaterial.color.set(color);
      targetFillMaterial.color.set(color);
      const radius = targetMode === 'blizzard' ? 8 : 2;
      targetRing.scale.set(radius, 1, radius);
      targetFill.scale.set(radius, 1, radius);
      targetGroup.position.set(targetPoint.x, 0.26, targetPoint.z);
      targetGroup.visible = battle.phase === 'playing';
    } else targetGroup.visible = false;

    center.lerp(wanted, Math.min(1, dt * 7));
    updateCamera();
    const buildingIds = new Set(battle.buildings.map((b) => b.id));
    for (const [id, g] of buildings)
      if (!buildingIds.has(id)) {
        scene.remove(g);
        buildings.delete(id);
      }
    for (const b of battle.buildings) {
      let g = buildings.get(b.id);
      if (!g) {
        g = makeBuilding(b);
        buildings.set(b.id, g);
      }
      if (b.hp <= 0) {
        g.scale.y = T.MathUtils.lerp(g.scale.y, 0.04, 0.07);
        g.position.y = T.MathUtils.lerp(g.position.y, -0.5, 0.1);
      } else {
        g.scale.y = b.ready > 0 ? 0.2 + 0.8 * (1 - b.ready / 6) : 1;
      }
    }
    const ids = new Set(battle.units.map((u) => u.id));
    for (const [id, a] of avatars)
      if (!ids.has(id)) {
        scene.remove(a.group);
        avatars.delete(id);
      }
    for (const u of battle.units) {
      let a = avatars.get(u.id);
      if (!a) {
        a = makeUnit(u);
        avatars.set(u.id, a);
      }
      const dx = u.x - a.last.x,
        dz = u.z - a.last.z,
        moving = Math.hypot(dx, dz) > 0.003;
      a.group.position.set(u.x, 0, u.z);
      if (moving) {
        const desired = Math.atan2(dx, dz);
        a.body.rotation.y +=
          Math.atan2(
            Math.sin(desired - a.body.rotation.y),
            Math.cos(desired - a.body.rotation.y),
          ) * 0.23;
      }
      a.body.position.y = moving
        ? Math.abs(Math.sin(clock * 12 + u.id)) * 0.08
        : Math.sin(clock * 2 + u.id) * 0.018;
      a.left.rotation.x = moving ? Math.sin(clock * 12 + u.id) * 0.55 : 0;
      a.right.rotation.x = -a.left.rotation.x;
      a.arm.rotation.x = u.attack > 0.6 ? Math.sin(u.attack * 8) * 0.7 : 0;
      a.ring.visible = u.selected;
      a.hp.quaternion.copy(camera.quaternion);
      a.fill.scale.x = Math.max(0, u.hp / u.maxHp) * 1.2;
      a.hp.visible = u.hp < u.maxHp || u.selected;
      a.last = { x: u.x, z: u.z };
    }
    const effectIds = new Set(battle.effects.map((e) => e.id));
    for (const [id, g] of effectGroups)
      if (!effectIds.has(id)) {
        scene.remove(g);
        g.traverse((o) => {
          if (
            o instanceof T.Mesh &&
            o.material !== novaMat &&
            o.material instanceof T.MeshBasicMaterial
          ) {
            o.material.dispose();
            allMaterials.delete(o.material);
          }
        });
        effectGroups.delete(id);
      }
    for (const e of battle.effects) {
      let g = effectGroups.get(e.id);
      if (!g) {
        g = makeEffect(e);
        effectGroups.set(e.id, g);
      }
      const t = e.age / e.duration;
      if (e.kind === 'nova' || e.kind === 'blizzard') {
        g.children.forEach((child, i) => {
          if (i < 3) {
            const s =
              e.kind === 'nova'
                ? Math.min(11, (t + i * 0.07) * 17)
                : 7.5 + Math.sin(clock * 3 + i) * 0.4;
            child.scale.set(s, 1, s);
            if (child instanceof T.Mesh)
              (child.material as T.MeshBasicMaterial).opacity = (1 - t) * 0.7;
          } else {
            child.position.y =
              e.kind === 'nova'
                ? Math.sin(t * Math.PI) * 1.8
                : (1 - ((t * 4 + i * 0.037) % 1)) * 10;
            child.scale.y =
              e.kind === 'nova'
                ? Math.sin(t * Math.PI) * (1 + (i % 4))
                : 1.5 + (i % 4);
          }
        });
      } else if (e.kind === 'arrow' && e.target) {
        g.position.x = e.x + (e.target.x - e.x) * t;
        g.position.z = e.z + (e.target.z - e.z) * t;
        g.position.y = 1.5 + Math.sin(t * Math.PI) * 2;
        g.lookAt(e.target.x, 1, e.target.z);
      } else if (e.kind === 'order') {
        g.scale.setScalar(1 + t);
        g.position.y = 0.2 + Math.sin(t * Math.PI) * 0.2;
      } else {
        g.children.forEach((c, i) => {
          c.position.x = Math.sin((i / 8) * Math.PI * 2) * t * 2;
          c.position.z = Math.cos((i / 8) * Math.PI * 2) * t * 2;
          c.position.y = Math.sin(t * Math.PI) * 1.4;
          c.scale.setScalar(0.13 * (1 - t));
        });
      }
    }
    if (!reduced) {
      for (let i = 0; i < snowCount; i++) {
        snowPositions[i * 3] += dt * 0.8;
        snowPositions[i * 3 + 1] -= dt * (1 + (i % 3) * 0.3);
        if (snowPositions[i * 3 + 1] < 0) snowPositions[i * 3 + 1] = 35;
        if (snowPositions[i * 3] > 48) snowPositions[i * 3] = -48;
      }
      snowGeo.attributes.position.needsUpdate = true;
      for (const f of flags) {
        const pos = f.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++)
          pos.setZ(
            i,
            Math.sin(clock * 3 + pos.getX(i) * 3) * 0.12 * (pos.getX(i) + 0.7),
          );
        pos.needsUpdate = true;
      }
      for (const f of fires) {
        f.scale.y = 0.4 + Math.sin(clock * 9 + f.position.x) * 0.08;
        f.rotation.y = clock * 0.6;
      }
    }
    renderer.render(scene, camera);
    if (now - lastUi > 100) {
      onFrame();
      lastUi = now;
    }
  }
  frame = requestAnimationFrame(loop);
  return {
    setTarget(mode, p) {
      targetMode = mode;
      targetPoint = p ?? null;
      targetGroup.visible = !!mode && !!p;
    },
    focus(p) {
      wanted.set(p.x, 0, p.z);
    },
    rotate() {
      angle += Math.PI / 4;
    },
    zoom(d) {
      size = T.MathUtils.clamp(size + d * 6, 25, 85);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      gestures.cancel();
      document.removeEventListener('visibilitychange', visibility);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('wheel', onWheel);
      for (const geo of geometries) geo.dispose();
      for (const mat of allMaterials) mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
