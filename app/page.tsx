'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Snowflake,
  Swords,
  Shield,
  Crosshair,
  Coins,
  TreePine,
  Users,
  Volume2,
  VolumeX,
  Maximize,
  Flag,
  Pause,
  Play,
  RotateCcw,
  Plus,
  Minus,
  Hammer,
  BowArrow,
  Pickaxe,
  CloudSnow,
  X,
  ChevronRight,
  Compass,
  Crown,
  Tent,
  CircleHelp,
  Check,
  Map,
} from 'lucide-react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Battle,
  COSTS,
  MINE,
  GROVE,
  type Point,
  type Snapshot,
  type Unit,
} from '../game/simulation';
import type { SceneController } from '../game/scene';
import { BattleAudio } from '../game/audio';
import { registerGameTools } from '../game/webmcp';
const initial = new Battle().snapshot();
type Mode = 'order' | 'tower' | 'blizzard';
const clock = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
export default function Home() {
  const mount = useRef<HTMLDivElement>(null),
    battleRef = useRef<Battle | null>(null),
    sceneRef = useRef<SceneController | null>(null),
    audioRef = useRef<BattleAudio | null>(null),
    modeRef = useRef<Mode>('order'),
    aimRef = useRef<Point | null>(null);
  const [state, setState] = useState<Snapshot>(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [mode, setMode] = useState<Mode>('order'),
    [camp, setCamp] = useState(false),
    [help, setHelp] = useState(false),
    [sound, setSound] = useState(true),
    [group, setGroup] = useState('army'),
    [aim, setAim] = useState<{ point: Point; error: string | null } | null>(
      null,
    ),
    [mapOpen, setMapOpen] = useState(false);
  const refresh = useCallback(() => {
    if (battleRef.current) {
      setState(battleRef.current.snapshot());
      if (aimRef.current && modeRef.current !== 'order')
        setAim({
          point: aimRef.current,
          error: battleRef.current.targetError(modeRef.current, aimRef.current),
        });
    }
  }, []);
  const chooseMode = useCallback((next: Mode) => {
    modeRef.current = next;
    battleRef.current?.setPlanning('target', next !== 'order');
    aimRef.current = null;
    setAim(null);
    sceneRef.current?.setTarget(next === 'order' ? null : next);
    setMode(next);
  }, []);
  const openCamp = useCallback(
    (open: boolean) => {
      setCamp(open);
      battleRef.current?.setPlanning('camp', open);
      refresh();
    },
    [refresh],
  );
  const openHelp = useCallback(
    (open: boolean) => {
      setHelp(open);
      battleRef.current?.setPlanning('help', open);
      refresh();
    },
    [refresh],
  );
  const confirmTarget = useCallback(() => {
    const b = battleRef.current,
      p = aimRef.current;
    if (!b || !p || modeRef.current === 'order') return;
    const ok = modeRef.current === 'tower' ? b.build(p) : b.blizzard(p);
    if (ok) {
      audioRef.current?.cue(modeRef.current === 'tower' ? 'recruit' : 'magic');
      chooseMode('order');
    }
    refresh();
  }, [chooseMode, refresh]);
  useEffect(() => {
    const battle = new Battle();
    battleRef.current = battle;
    const audio = new BattleAudio();
    audioRef.current = audio;
    let gone = false;
    let unregister = () => {};
    import('../game/scene')
      .then(({ createScene }) => {
        if (gone || !mount.current) return;
        try {
          sceneRef.current = createScene(
            mount.current,
            battle,
            (p: Point, unit?: Unit) => {
              if (battle.phase !== 'playing') return;
              if (modeRef.current !== 'order') {
                aimRef.current = p;
                setAim({
                  point: p,
                  error: battle.targetError(modeRef.current, p),
                });
                sceneRef.current?.setTarget(modeRef.current, p);
              } else if (unit) {
                battle.select(unit.id);
                setGroup(
                  unit.kind === 'hero'
                    ? 'hero'
                    : unit.kind === 'worker'
                      ? 'workers'
                      : 'single',
                );
                audio.cue('order');
              } else {
                if (battle.order(p)) audio.cue('order');
              }
              refresh();
            },
            refresh,
          );
          setReady(true);
          unregister = registerGameTools(battle, refresh);
        } catch (e) {
          setError(e instanceof Error ? e.message : '无法初始化 3D 战场');
        }
      })
      .catch(() => setError('战场加载失败，请刷新重试。'));
    if ('serviceWorker' in navigator && location.hostname !== 'localhost')
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      gone = true;
      unregister();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      audio.dispose();
      battleRef.current = null;
    };
  }, [chooseMode, refresh]);
  const start = useCallback(() => {
    const b = battleRef.current;
    if (!b || !ready) return;
    if (b.phase === 'won' || b.phase === 'lost') {
      b.reset();
      chooseMode('order');
      setGroup('army');
      openCamp(false);
    }
    b.start();
    sceneRef.current?.focus({ x: -3, z: 5 });
    void audioRef.current?.unlock().then(() => audioRef.current?.cue('start'));
    refresh();
  }, [ready, chooseMode, refresh, openCamp]);
  const select = useCallback(
    (g: 'army' | 'hero' | 'workers') => {
      battleRef.current?.select(g);
      setGroup(g);
      chooseMode('order');
      refresh();
    },
    [chooseMode, refresh],
  );
  const nova = useCallback(() => {
    if (battleRef.current?.nova()) {
      audioRef.current?.cue('magic');
      const h = battleRef.current.hero;
      if (h) sceneRef.current?.focus(h);
      refresh();
    }
  }, [refresh]);
  const recruit = useCallback(
    (kind: 'guard' | 'ranger' | 'worker') => {
      if (battleRef.current?.recruit(kind)) audioRef.current?.cue('recruit');
      refresh();
    },
    [refresh],
  );
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const b = battleRef.current;
      if (!b) return;
      if (help || camp) return;
      if (e.code === 'Space') {
        e.preventDefault();
        b.pause();
        refresh();
      }
      if (e.key.toLowerCase() === 'a') select('army');
      if (e.key === '1') select('hero');
      if (e.key.toLowerCase() === 'q') nova();
      if (e.key.toLowerCase() === 'w' && b.phase === 'playing')
        chooseMode(modeRef.current === 'blizzard' ? 'order' : 'blizzard');
      if (e.key.toLowerCase() === 'r') recruit('guard');
      if (e.key === 'Escape') {
        chooseMode('order');
        openCamp(false);
        openHelp(false);
      }
    }
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [
    select,
    nova,
    recruit,
    chooseMode,
    refresh,
    help,
    camp,
    openCamp,
    openHelp,
  ]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else {
        battleRef.current!.notice =
          '可在浏览器菜单中添加到主屏幕，获得全屏体验。';
        refresh();
      }
    } catch {
      battleRef.current!.notice = '可通过浏览器菜单添加到主屏幕。';
      refresh();
    }
  };
  const toggleSound = () => {
    if (!audioRef.current) return;
    audioRef.current.enabled = !sound;
    setSound(!sound);
    if (!sound)
      void audioRef.current.unlock().then(() => audioRef.current?.cue('order'));
  };
  const active = state.phase === 'playing',
    ended = state.phase === 'won' || state.phase === 'lost';
  return (
    <main
      className={`game-shell ${state.phase === 'ready' ? 'is-prologue' : ''} ${mode !== 'order' ? 'is-targeting' : ''} ${aim ? 'has-staged-target' : ''} ${mapOpen ? 'map-open' : ''}`}
    >
      <div
        className="battlefield"
        ref={mount}
        role="application"
        aria-label="3D 战场。点选友军，点击地面移动；拖动平移，双指缩放。技能需点选位置后确认。"
      />
      <div className="vignette" />
      <header className="topbar">
        <div className="wordmark">
          <Snowflake />
          <span>
            FROSTMARCH<small>霜 境 远 征</small>
          </span>
        </div>
        <div className="resources" aria-label="资源">
          <span title="金币">
            <Coins />
            <b>{state.gold}</b>
          </span>
          <span title="木材">
            <TreePine />
            <b>{state.wood}</b>
          </span>
          <span title="人口，上限 30">
            <Users />
            <b>
              {state.population}
              <em> / 30</em>
            </b>
          </span>
        </div>
        <div className="top-actions">
          <button
            className="icon-button help-toggle"
            onClick={() => openHelp(true)}
            aria-label="操作指南"
          >
            <CircleHelp />
          </button>
          <button
            className="icon-button"
            onClick={toggleSound}
            aria-label={sound ? '关闭声音' : '开启声音'}
            aria-pressed={sound}
          >
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            className="icon-button fullscreen"
            onClick={fullscreen}
            aria-label="切换全屏"
          >
            <Maximize />
          </button>
          <button
            className="icon-button"
            disabled={state.phase === 'ready' || ended}
            onClick={() => {
              battleRef.current?.pause();
              refresh();
            }}
            aria-label={state.phase === 'paused' ? '继续游戏' : '暂停游戏'}
          >
            {state.phase === 'paused' ? <Play /> : <Pause />}
          </button>
        </div>
      </header>
      <aside className="mission">
        <span className="eyebrow">CHAPTER I · 北境战役</span>
        <h2>守住最后的黎明</h2>
        <p>
          <Flag size={14} /> 摧毁寒霜要塞
        </p>
        <Progress
          className="objective-health"
          value={state.enemyHp / 18}
          aria-label="敌方要塞生命"
        />
        <div className="battle-meta">
          <span className="live-dot" />{' '}
          {state.phase === 'ready'
            ? '黎明前夕'
            : `第 ${state.wave} 波 · ${state.nextWave}s 后来袭`}
          <span>{clock(state.time)}</span>
        </div>
      </aside>
      <div className="camera-tools">
        <button
          className="icon-button"
          onClick={() => sceneRef.current?.rotate()}
          aria-label="旋转视角"
        >
          <RotateCcw />
        </button>
        <button
          className="icon-button"
          onClick={() => sceneRef.current?.zoom(-1)}
          aria-label="放大战场"
        >
          <Plus />
        </button>
        <button
          className="icon-button"
          onClick={() => sceneRef.current?.zoom(1)}
          aria-label="缩小战场"
        >
          <Minus />
        </button>
        <button
          className="icon-button"
          onClick={() =>
            sceneRef.current?.focus(battleRef.current?.hero ?? { x: 0, z: 0 })
          }
          aria-label="定位英雄"
        >
          <Crosshair />
        </button>
      </div>
      {state.phase === 'ready' && (
        <section className="prologue">
          <span className="eyebrow">THE NORTHERN FRONT</span>
          <h1>
            寒冬已至。
            <br />
            王国，由你守护。
          </h1>
          <p>
            越过封冻的河流，
            <br className="mobile-break" />
            带领北境军团夺回黎明。
          </p>
          <button
            className="begin"
            onClick={start}
            disabled={!ready || !!error}
          >
            <Swords />
            {ready ? '开始远征' : '正在展开战场…'}
            <span>→</span>
          </button>
          <small>单人战役 · 触控指挥 · 约 3 分钟</small>
          <button className="how-to" onClick={() => openHelp(true)}>
            <CircleHelp size={14} /> 如何指挥
          </button>
        </section>
      )}
      {state.phase !== 'ready' && (
        <>
          <button
            className="map-toggle"
            onClick={() => setMapOpen(!mapOpen)}
            aria-expanded={mapOpen}
            aria-label={mapOpen ? '收起战场地图' : '展开战场地图'}
          >
            <Map />
            <span>{mapOpen ? '收起地图' : '战场地图'}</span>
          </button>
          <div className="minimap-wrap">
            <div className="minimap-head">
              <Compass size={13} />
              <span>霜落隘口</span>
              <span>N ↑</span>
            </div>
            <button
              className="minimap-button"
              aria-label="战场地图，点击位置移动视角；键盘激活回到地图中心"
              onClick={(e) => {
                if (e.detail === 0) {
                  sceneRef.current?.focus({ x: 0, z: 0 });
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                sceneRef.current?.focus({
                  x: ((e.clientX - rect.left) / rect.width) * 66 - 33,
                  z: ((e.clientY - rect.top) / rect.height) * 54 - 27,
                });
              }}
            >
              <svg
                className="minimap"
                viewBox="-33 -27 66 54"
                aria-hidden="true"
              >
                <rect x="-33" y="-27" width="66" height="54" fill="#263f4a" />
                <path d="M-32 -2 Q0 -5 32 1 L32 5 Q0 2 -32 4Z" fill="#6a9aab" />
                {[-27, -23, 23, 27].flatMap((x) =>
                  [-21, -15, -9, 10, 17, 23].map((z) => (
                    <path
                      key={`${x}-${z}`}
                      d={`M${x} ${z - 2}l-2 4h4z`}
                      fill="#64877d"
                    />
                  )),
                )}
                {state.buildings.map((building) => (
                  <rect
                    key={building.id}
                    x={building.x - 2}
                    y={building.z - 2}
                    width={building.kind === 'keep' ? 5 : 3}
                    height={building.kind === 'keep' ? 5 : 3}
                    fill={
                      building.hp <= 0
                        ? '#465b61'
                        : building.team === 'ally'
                          ? '#d9c89d'
                          : '#cf8473'
                    }
                  />
                ))}
                {state.units.map((u) => (
                  <circle
                    key={u.id}
                    cx={u.x}
                    cy={u.z}
                    r={u.kind === 'hero' ? 1.6 : 0.8}
                    fill={
                      u.team === 'enemy'
                        ? '#e38b78'
                        : u.kind === 'worker'
                          ? '#e7c687'
                          : '#b4e4da'
                    }
                  />
                ))}
                <circle cx={MINE.x} cy={MINE.z} r="1.5" fill="#e3b35a" />
                <circle cx={GROVE.x} cy={GROVE.z} r="1.5" fill="#91b9a0" />
              </svg>
            </button>
            <span className="minimap-caption">点击地图查看战场</span>
          </div>
          <div className="squad-select" aria-label="选择部队">
            <button
              className={group === 'hero' ? 'selected' : ''}
              onClick={() => select('hero')}
            >
              <Crown />
              英雄<kbd>1</kbd>
            </button>
            <button
              className={group === 'army' ? 'selected' : ''}
              onClick={() => select('army')}
            >
              <Swords />
              全军<kbd>A</kbd>
            </button>
            <button
              className={group === 'workers' ? 'selected' : ''}
              onClick={() => select('workers')}
            >
              <Pickaxe />
              工人
            </button>
          </div>
          <output className={`hint ${mode !== 'order' ? 'target-hint' : ''}`}>
            {mode === 'tower'
              ? '战术暂停 · 点击南岸空地预览位置'
              : mode === 'blizzard'
                ? '战术暂停 · 点击战场预览技能范围'
                : state.notice}
            {mode !== 'order' && (
              <button
                onClick={() => chooseMode('order')}
                aria-label="取消施法或建造"
              >
                <X size={16} />
              </button>
            )}
          </output>
          <button
            className={`camp-toggle ${camp ? 'selected' : ''}`}
            onClick={() => openCamp(!camp)}
            aria-expanded={camp}
          >
            <Tent />
            营地与招募{state.queue.length > 0 && <b>{state.queue.length}</b>}
            <ChevronRight />
          </button>
        </>
      )}
      {aim && mode !== 'order' && (
        <section className="target-confirm" aria-label="确认技能或建筑落点">
          <p>
            {aim.error ??
              (mode === 'tower' ? '位置可建造' : '范围内的敌人将受到持续伤害')}
          </p>
          <div>
            <button
              className="confirm-placement"
              disabled={!!aim.error || !active}
              onClick={confirmTarget}
            >
              <Check />
              {mode === 'tower' ? '确认建造' : '释放暴风雪'}
            </button>
            <button
              className="cancel-placement"
              onClick={() => chooseMode('order')}
              aria-label="取消落点"
            >
              <X />
            </button>
          </div>
        </section>
      )}
      <Sheet open={camp} onOpenChange={openCamp}>
        <SheetContent
          side="bottom"
          className="camp-panel"
          showCloseButton={false}
        >
          <div className="panel-title">
            <span>
              <Tent /> <SheetTitle>北境营地</SheetTitle>
            </span>
            <button onClick={() => openCamp(false)} aria-label="关闭营地">
              <X />
            </button>
          </div>
          <SheetDescription className="planning-note">
            <Pause />
            战术暂停 · 关闭营地后继续战斗
          </SheetDescription>
          <div className="camp-wallet">
            <span>
              <Coins />
              {state.gold}
            </span>
            <span>
              <TreePine />
              {state.wood}
            </span>
            <span>
              <Users />
              {state.population}/30
            </span>
          </div>
          <span className="section-label">招募军队</span>
          {(
            [
              {
                kind: 'guard',
                name: '霜盾卫兵',
                desc: '近战 · 坚守前线',
                icon: Shield,
              },
              {
                kind: 'ranger',
                name: '游林射手',
                desc: '远程 · 后排输出',
                icon: BowArrow,
              },
              {
                kind: 'worker',
                name: '北境工人',
                desc: '采集 · 自动往返',
                icon: Pickaxe,
              },
            ] as const
          ).map(({ kind, name, desc, icon: Icon }) => (
            <button
              className="recruit-row"
              key={kind}
              disabled={
                !active ||
                state.population + state.queue.length >= 30 ||
                state.gold < COSTS[kind].gold ||
                state.wood < COSTS[kind].wood ||
                state.queue.length >= 5
              }
              onClick={() => recruit(kind)}
            >
              <Icon />
              <span>
                <strong>{name}</strong>
                <small>{desc}</small>
              </span>
              <span className="cost">
                {COSTS[kind].gold}
                <Coins />
                {COSTS[kind].wood > 0 && (
                  <>
                    {COSTS[kind].wood}
                    <TreePine />
                  </>
                )}
              </span>
              <Plus size={16} />
            </button>
          ))}
          <div className="training-queue">
            {state.queue.length ? (
              <>
                <span>训练中 · {Math.ceil(state.queue[0].remaining)}s</span>
                <Progress
                  className="queue-progress"
                  value={((4 - state.queue[0].remaining) / 4) * 100}
                  aria-label="训练进度"
                />
                <small>队列 {state.queue.length} / 5</small>
              </>
            ) : (
              <span>训练队列空闲</span>
            )}
          </div>
          <span className="section-label">资源与防御</span>
          <div className="economy-actions">
            <button
              disabled={!active}
              onClick={() => {
                battleRef.current?.setWork('gold');
                refresh();
              }}
            >
              <Pickaxe />
              采集金币
            </button>
            <button
              disabled={!active}
              onClick={() => {
                battleRef.current?.setWork('wood');
                refresh();
              }}
            >
              <TreePine />
              采集木材
            </button>
          </div>
          <button
            className="build-row"
            disabled={!active || state.gold < 100 || state.wood < 90}
            onClick={() => {
              chooseMode('tower');
              openCamp(false);
            }}
          >
            <Hammer />
            <span>
              建造箭塔<small>100 金币 · 90 木材</small>
            </span>
            <Plus />
          </button>
        </SheetContent>
      </Sheet>
      <footer className="command-bar">
        <button
          className="hero-emblem"
          onClick={() => {
            select('hero');
            sceneRef.current?.focus(battleRef.current?.hero ?? { x: -5, z: 9 });
          }}
          aria-label="选择并定位英雄艾拉"
        >
          <Image
            width={640}
            height={640}
            unoptimized
            src="/hero.webp"
            alt="艾拉，银发霜誓守卫"
          />
          <span>01</span>
        </button>
        <div className="hero-info">
          <span className="eyebrow">霜誓守卫</span>
          <strong>艾拉 · 霜刃</strong>
          <Progress
            className="health hero-health"
            value={state.hp / 6}
            aria-label="英雄生命"
          />
          <Progress
            className="health mana"
            value={state.mana}
            aria-label="英雄法力"
          />
          <small>
            {state.hp} 生命 <span>{state.mana} 法力</span>
          </small>
        </div>
        <div className="command-spacer" />
        <div className="selection-count">
          <Users />
          <b>{state.selected}</b>
          <small>已选单位</small>
        </div>
        <button
          className="action"
          disabled={!active}
          onClick={() => {
            select('army');
            const h = battleRef.current?.hero;
            if (h) {
              battleRef.current?.order({ x: h.x, z: h.z + 2 });
              refresh();
            }
          }}
        >
          <Swords />
          <span>全军集合</span>
          <kbd>A</kbd>
        </button>
        <button
          className="action frost"
          disabled={!active || state.nova > 0 || state.mana < 30}
          onClick={nova}
          title="英雄周围 11 米造成伤害并减速，消耗 30 法力"
        >
          <Snowflake />
          <span>{state.nova ? `${state.nova}s` : '凛冬之环'}</span>
          <kbd>Q</kbd>
          <i>30</i>
        </button>
        <button
          className={`action blizzard ${mode === 'blizzard' ? 'selected' : ''}`}
          disabled={!active || state.blizzard > 0 || state.mana < 55}
          onClick={() => chooseMode(mode === 'blizzard' ? 'order' : 'blizzard')}
          title="选择位置，持续轰击 4 秒，消耗 55 法力"
        >
          <CloudSnow />
          <span>{state.blizzard ? `${state.blizzard}s` : '暴风雪'}</span>
          <kbd>W</kbd>
          <i>55</i>
        </button>
        <button
          className="action recruit-action"
          disabled={
            !active ||
            state.gold < 70 ||
            state.population + state.queue.length >= 30 ||
            state.queue.length >= 5
          }
          onClick={() => recruit('guard')}
        >
          <Shield />
          <span>招募卫兵</span>
          <kbd>R</kbd>
          <i>70</i>
        </button>
      </footer>
      <span className="version">FROSTMARCH / TOUCH EDITION 0.2</span>
      {state.phase === 'paused' && (
        <div className="overlay">
          <section className="result-panel">
            <span className="eyebrow">THE WORLD CAN WAIT</span>
            <Pause size={34} />
            <h2>战场已暂停</h2>
            <p>风雪暂歇，等待你的号令。</p>
            <button
              className="begin"
              onClick={() => {
                battleRef.current?.pause();
                refresh();
              }}
            >
              <Play />
              继续远征
            </button>
            <button className="text-button" onClick={() => openHelp(true)}>
              查看操作指南
            </button>
          </section>
        </div>
      )}
      {ended && (
        <div className="overlay">
          <section className="result-panel">
            <span className="eyebrow">
              {state.phase === 'won'
                ? 'DAWN BELONGS TO US'
                : 'THE NORTH REMEMBERS'}
            </span>
            {state.phase === 'won' ? (
              <Crown className="result-symbol" />
            ) : (
              <Flag className="result-symbol" />
            )}
            <h2>
              {state.phase === 'won' ? '黎明，属于北境。' : '北境，等待归来。'}
            </h2>
            <p>{state.notice}</p>
            <div className="result-stats">
              <span>
                <b>{clock(state.time)}</b>战役用时
              </span>
              <span>
                <b>{state.kills}</b>击败敌军
              </span>
              <span>
                <b>{state.wave}</b>迎战波次
              </span>
            </div>
            <button className="begin" onClick={start}>
              <RotateCcw />
              再次远征
            </button>
          </section>
        </div>
      )}
      <Dialog open={help} onOpenChange={openHelp}>
        <DialogContent className="help-panel" showCloseButton={false}>
          <button
            className="close-help icon-button"
            onClick={() => openHelp(false)}
            aria-label="关闭操作指南"
          >
            <X />
          </button>
          <span className="eyebrow">COMMANDER&apos;S FIELD GUIDE</span>
          <DialogTitle>你的第一场北境战役</DialogTitle>
          <ol>
            <li>
              <b>点选部队，下达命令</b>
              <p>点击英雄或“全军”，再点地面前进。士兵会自动攻击附近敌人。</p>
            </li>
            <li>
              <b>经营营地，补充兵力</b>
              <p>
                工人自动往返采集。打开营地时战斗暂停，可安心招募、切换采集资源或选择建造箭塔。
              </p>
            </li>
            <li>
              <b>让寒冬为你而战</b>
              <p>
                靠近敌军释放凛冬之环；选择暴风雪后点选目标区域，确认再释放。保护英雄，摧毁北岸要塞。
              </p>
            </li>
          </ol>
          <div className="control-notes">
            <span>拖动 · 平移视角</span>
            <span>双指 / 滚轮 · 缩放</span>
            <span>空格 · 暂停</span>
            <span>Q / W · 英雄技能</span>
          </div>
          <button className="begin" onClick={() => openHelp(false)}>
            准备就绪
            <ChevronRight />
          </button>
        </DialogContent>
      </Dialog>
      {error && (
        <div className="overlay">
          <section className="result-panel">
            <h2>战场暂时无法展开</h2>
            <p>请使用支持 WebGL 2 的浏览器，并开启硬件加速。</p>
            <small>{error.slice(0, 180)}</small>
            <button className="begin" onClick={() => location.reload()}>
              重新加载
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
