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
} from 'lucide-react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
    modeRef = useRef<Mode>('order');
  const [state, setState] = useState<Snapshot>(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [mode, setMode] = useState<Mode>('order'),
    [camp, setCamp] = useState(false),
    [help, setHelp] = useState(false),
    [sound, setSound] = useState(true),
    [group, setGroup] = useState('army');
  const refresh = useCallback(() => {
    if (battleRef.current) setState(battleRef.current.snapshot());
  }, []);
  const chooseMode = useCallback((next: Mode) => {
    modeRef.current = next;
    setMode(next);
  }, []);
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
              if (modeRef.current === 'tower') {
                if (battle.build(p)) {
                  chooseMode('order');
                  audio.cue('recruit');
                }
              } else if (modeRef.current === 'blizzard') {
                if (battle.blizzard(p)) {
                  chooseMode('order');
                  audio.cue('magic');
                }
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
          setError(
            e instanceof Error
              ? e.message
              : 'Could not initialize the 3D battlefield',
          );
        }
      })
      .catch(() =>
        setError('The battlefield failed to load. Refresh to try again.'),
      );
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
      setCamp(false);
    }
    b.start();
    sceneRef.current?.focus({ x: -3, z: 5 });
    void audioRef.current?.unlock().then(() => audioRef.current?.cue('start'));
    refresh();
  }, [ready, chooseMode, refresh]);
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
        setCamp(false);
        setHelp(false);
      }
    }
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [select, nova, recruit, chooseMode, refresh]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else {
        battleRef.current!.notice =
          'Add to Home Screen from your browser menu for a fullscreen experience.';
        refresh();
      }
    } catch {
      battleRef.current!.notice =
        'Choose Add to Home Screen in your browser menu.';
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
      className={`game-shell ${state.phase === 'ready' ? 'is-prologue' : ''} ${mode !== 'order' ? 'is-targeting' : ''}`}
    >
      <div
        className="battlefield"
        ref={mount}
        role="application"
        aria-label="3D battlefield. Select allies and click the ground to move. Drag to pan and pinch to zoom."
      />
      <div className="vignette" />
      <header className="topbar">
        <div className="wordmark">
          <Snowflake />
          <span>
            FROSTMARCH<small>THE NORTHERN FRONT</small>
          </span>
        </div>
        <div className="resources" aria-label="Resources">
          <span title="Gold">
            <Coins />
            <b>{state.gold}</b>
          </span>
          <span title="Wood">
            <TreePine />
            <b>{state.wood}</b>
          </span>
          <span title="Population, maximum 30">
            <Users />
            <b>
              {state.population}
              <em> / 30</em>
            </b>
          </span>
        </div>
        <div className="top-actions">
          <button
            className="icon-button"
            onClick={toggleSound}
            aria-label={sound ? 'Mute sound' : 'Enable sound'}
            aria-pressed={sound}
          >
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            className="icon-button fullscreen"
            onClick={fullscreen}
            aria-label="Toggle fullscreen"
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
            aria-label={state.phase === 'paused' ? 'Resume game' : 'Pause game'}
          >
            {state.phase === 'paused' ? <Play /> : <Pause />}
          </button>
        </div>
      </header>
      <aside className="mission">
        <span className="eyebrow">CHAPTER I · THE NORTHERN FRONT</span>
        <h2>Hold the Last Dawn</h2>
        <p>
          <Flag size={14} /> Destroy Frostkeep
        </p>
        <Progress
          className="objective-health"
          value={state.enemyHp / 18}
          aria-label="Enemy keep health"
        />
        <div className="battle-meta">
          <span className="live-dot" />{' '}
          {state.phase === 'ready'
            ? 'Before the dawn'
            : `Wave ${state.wave} · Next in ${state.nextWave}s`}
          <span>{clock(state.time)}</span>
        </div>
      </aside>
      <div className="camera-tools">
        <button
          className="icon-button"
          onClick={() => sceneRef.current?.rotate()}
          aria-label="Rotate camera"
        >
          <RotateCcw />
        </button>
        <button
          className="icon-button"
          onClick={() => sceneRef.current?.zoom(-1)}
          aria-label="Zoom in"
        >
          <Plus />
        </button>
        <button
          className="icon-button"
          onClick={() => sceneRef.current?.zoom(1)}
          aria-label="Zoom out"
        >
          <Minus />
        </button>
        <button
          className="icon-button"
          onClick={() =>
            sceneRef.current?.focus(battleRef.current?.hero ?? { x: 0, z: 0 })
          }
          aria-label="Focus hero"
        >
          <Crosshair />
        </button>
      </div>
      {state.phase === 'ready' && (
        <section className="prologue">
          <span className="eyebrow">THE NORTHERN FRONT</span>
          <h1>
            Winter has come.
            <br />
            Hold the North.
          </h1>
          <p>
            Cross the frozen river. <br className="mobile-break" />
            Lead your legion. Reclaim the dawn.
          </p>
          <button
            className="begin"
            onClick={start}
            disabled={!ready || !!error}
          >
            <Swords />
            {ready ? 'Begin Campaign' : 'Preparing battlefield…'}
            <span>→</span>
          </button>
          <small>Single player · A short RTS campaign</small>
          <button className="how-to" onClick={() => setHelp(true)}>
            <CircleHelp size={14} /> How to Play
          </button>
        </section>
      )}
      {state.phase !== 'ready' && (
        <>
          <div className="minimap-wrap">
            <div className="minimap-head">
              <Compass size={13} />
              <span>Frostfall Pass</span>
              <span>N ↑</span>
            </div>
            <button
              className="minimap-button"
              aria-label="Battle map. Click to move the camera; keyboard activation centers the map."
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
            <span className="minimap-caption">
              Click the map to look around
            </span>
          </div>
          <div className="squad-select" aria-label="Select troops">
            <button
              className={group === 'hero' ? 'selected' : ''}
              onClick={() => select('hero')}
            >
              <Crown />
              Hero<kbd>1</kbd>
            </button>
            <button
              className={group === 'army' ? 'selected' : ''}
              onClick={() => select('army')}
            >
              <Swords />
              Army<kbd>A</kbd>
            </button>
            <button
              className={group === 'workers' ? 'selected' : ''}
              onClick={() => select('workers')}
            >
              <Pickaxe />
              Workers
            </button>
          </div>
          <output className={`hint ${mode !== 'order' ? 'target-hint' : ''}`}>
            {mode === 'tower'
              ? 'Choose a tower site south of the river'
              : mode === 'blizzard'
                ? 'Choose where to cast Blizzard'
                : state.notice}
            {mode !== 'order' && (
              <button
                onClick={() => chooseMode('order')}
                aria-label="Cancel spell or construction"
              >
                <X size={16} />
              </button>
            )}
          </output>
          <button
            className={`camp-toggle ${camp ? 'selected' : ''}`}
            onClick={() => setCamp(!camp)}
            aria-expanded={camp}
          >
            <Tent />
            Camp & Recruit
            {state.queue.length > 0 && <b>{state.queue.length}</b>}
            <ChevronRight />
          </button>
        </>
      )}
      {camp && (
        <aside className="camp-panel" aria-label="Camp & Recruit">
          <div className="panel-title">
            <span>
              <Tent /> Northern Camp
            </span>
            <button onClick={() => setCamp(false)} aria-label="Close camp">
              <X />
            </button>
          </div>
          <span className="section-label">Recruit Troops</span>
          {(
            [
              {
                kind: 'guard',
                name: 'Frostguard',
                desc: 'Melee · Hold the line',
                icon: Shield,
              },
              {
                kind: 'ranger',
                name: 'Ranger',
                desc: 'Ranged · Cover the front',
                icon: BowArrow,
              },
              {
                kind: 'worker',
                name: 'Worker',
                desc: 'Gatherer · Works automatically',
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
                <span>Training · {Math.ceil(state.queue[0].remaining)}s</span>
                <Progress
                  className="queue-progress"
                  value={((4 - state.queue[0].remaining) / 4) * 100}
                  aria-label="Training progress"
                />
                <small>Queue {state.queue.length} / 5</small>
              </>
            ) : (
              <span>Training queue idle</span>
            )}
          </div>
          <span className="section-label">Resources & Defense</span>
          <div className="economy-actions">
            <button
              disabled={!active}
              onClick={() => {
                battleRef.current?.setWork('gold');
                refresh();
              }}
            >
              <Pickaxe />
              Mine Gold
            </button>
            <button
              disabled={!active}
              onClick={() => {
                battleRef.current?.setWork('wood');
                refresh();
              }}
            >
              <TreePine />
              Gather Wood
            </button>
          </div>
          <button
            className="build-row"
            disabled={!active || state.gold < 100 || state.wood < 90}
            onClick={() => {
              chooseMode('tower');
              setCamp(false);
            }}
          >
            <Hammer />
            <span>
              Build Tower<small>100 gold · 90 wood</small>
            </span>
            <Plus />
          </button>
        </aside>
      )}
      <footer className="command-bar">
        <button
          className="hero-emblem"
          onClick={() => {
            select('hero');
            sceneRef.current?.focus(battleRef.current?.hero ?? { x: -5, z: 9 });
          }}
          aria-label="Select and focus Ayla"
        >
          <Image
            width={640}
            height={640}
            unoptimized
            src="/hero.webp"
            alt="Ayla, the silver-haired Frostsworn Warden"
          />
          <span>01</span>
        </button>
        <div className="hero-info">
          <span className="eyebrow">Frostsworn Warden</span>
          <strong>Ayla Frostblade</strong>
          <Progress
            className="health hero-health"
            value={state.hp / 6}
            aria-label="Hero health"
          />
          <Progress
            className="health mana"
            value={state.mana}
            aria-label="Hero mana"
          />
          <small>
            {state.hp} HP <span>{state.mana} Mana</span>
          </small>
        </div>
        <div className="command-spacer" />
        <div className="selection-count">
          <Users />
          <b>{state.selected}</b>
          <small>Selected</small>
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
          <span>Rally Army</span>
          <kbd>A</kbd>
        </button>
        <button
          className="action frost"
          disabled={!active || state.nova > 0 || state.mana < 30}
          onClick={nova}
          title="Damage and slow enemies within 11 m of your hero. Costs 30 mana."
        >
          <Snowflake />
          <span>{state.nova ? `${state.nova}s` : 'Frost Nova'}</span>
          <kbd>Q</kbd>
          <i>30</i>
        </button>
        <button
          className={`action blizzard ${mode === 'blizzard' ? 'selected' : ''}`}
          disabled={!active || state.blizzard > 0 || state.mana < 55}
          onClick={() => chooseMode(mode === 'blizzard' ? 'order' : 'blizzard')}
          title="Target an area for 4 seconds of ice damage. Costs 55 mana."
        >
          <CloudSnow />
          <span>{state.blizzard ? `${state.blizzard}s` : 'Blizzard'}</span>
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
          <span>Train Guard</span>
          <kbd>R</kbd>
          <i>70</i>
        </button>
      </footer>
      <span className="version">FROSTMARCH / WEB DEMO 0.1.1</span>
      {state.phase === 'paused' && (
        <div className="overlay">
          <section className="result-panel">
            <span className="eyebrow">THE WORLD CAN WAIT</span>
            <Pause size={34} />
            <h2>Battle Paused</h2>
            <p>The storm waits for your command.</p>
            <button
              className="begin"
              onClick={() => {
                battleRef.current?.pause();
                refresh();
              }}
            >
              <Play />
              Resume Campaign
            </button>
            <button className="text-button" onClick={() => setHelp(true)}>
              View Controls
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
              {state.phase === 'won'
                ? 'The dawn is ours.'
                : 'The North awaits your return.'}
            </h2>
            <p>{state.notice}</p>
            <div className="result-stats">
              <span>
                <b>{clock(state.time)}</b>Battle Time
              </span>
              <span>
                <b>{state.kills}</b>Enemies Defeated
              </span>
              <span>
                <b>{state.wave}</b>Waves Faced
              </span>
            </div>
            <button className="begin" onClick={start}>
              <RotateCcw />
              Play Again
            </button>
          </section>
        </div>
      )}
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-panel" showCloseButton={false}>
          <button
            className="close-help icon-button"
            onClick={() => setHelp(false)}
            aria-label="Close controls"
          >
            <X />
          </button>
          <span className="eyebrow">COMMANDER&apos;S FIELD GUIDE</span>
          <DialogTitle>Your First Northern Campaign</DialogTitle>
          <ol>
            <li>
              <b>Select troops. Give an order.</b>
              <p>
                Select your hero or Army, then click the ground to move. Troops
                attack nearby enemies automatically.
              </p>
            </li>
            <li>
              <b>Build your force.</b>
              <p>
                Workers gather resources automatically. Open Camp to assign gold
                or wood, recruit troops, and build towers.
              </p>
            </li>
            <li>
              <b>Make winter your weapon.</b>
              <p>
                Cast Frost Nova near enemies. Select Blizzard, then click a
                target area. Protect your hero and destroy Frostkeep.
              </p>
            </li>
          </ol>
          <div className="control-notes">
            <span>Drag · Pan camera</span>
            <span>Pinch / Scroll · Zoom</span>
            <span>Space · Pause</span>
            <span>Q / W · Hero abilities</span>
          </div>
          <button className="begin" onClick={() => setHelp(false)}>
            Ready to Command
            <ChevronRight />
          </button>
        </DialogContent>
      </Dialog>
      {error && (
        <div className="overlay">
          <section className="result-panel">
            <h2>Battlefield Unavailable</h2>
            <p>
              Use a browser with WebGL 2 support and enable hardware
              acceleration.
            </p>
            <small>{error.slice(0, 180)}</small>
            <button className="begin" onClick={() => location.reload()}>
              Reload
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
