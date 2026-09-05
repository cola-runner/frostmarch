import type { Battle } from './simulation';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type Context = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerGameTools(battle: Battle, refresh: () => void) {
  const ctx = (document as Document & { modelContext?: Context }).modelContext;
  if (!ctx?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools: Tool[] = [
    {
      name: 'read_frostmarch_battle',
      description:
        'Read the current Frostmarch battle, economy, hero health, cooldowns and result.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => battle.snapshot(),
    },
    {
      name: 'command_frostmarch_army',
      description:
        'Select the army and issue a move/attack order to a world position during an active battle. Does not start or restart a game.',
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'number', minimum: -28, maximum: 28 },
          z: { type: 'number', minimum: -23, maximum: 23 },
        },
        required: ['x', 'z'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        const p = input as { x?: unknown; z?: unknown };
        if (
          !p ||
          typeof p.x !== 'number' ||
          typeof p.z !== 'number' ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.z) ||
          Math.abs(p.x) > 28 ||
          Math.abs(p.z) > 23
        )
          throw new Error(
            'Expected finite battlefield coordinates x ∈ [-28,28], z ∈ [-23,23].',
          );
        if (battle.phase !== 'playing')
          throw new Error(
            'Start or resume the battle using the game interface first.',
          );
        battle.select('army');
        const accepted = battle.order({ x: p.x, z: p.z });
        refresh();
        return { accepted, selected: battle.selected.length };
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        ctx.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional browser proposal: never prevent gameplay. */
    }
  }
  return () => lifecycle.abort();
}
