import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../game/simulation.ts';
import { registerGameTools } from '../game/webmcp.ts';
// Contract harness only; this is not a substitute for validation in a supporting browser.
test('optional WebMCP tools share the battle state and reject invalid or inactive commands', () => {
  const tools = new Map();
  let signal;
  let updates = 0;
  globalThis.document = {
    modelContext: {
      registerTool(tool, options) {
        tools.set(tool.name, tool);
        signal = options.signal;
      },
    },
  };
  const b = new Battle();
  const cleanup = registerGameTools(b, () => updates++);
  assert.equal(tools.size, 2);
  const read = tools.get('read_frostmarch_battle'),
    command = tools.get('command_frostmarch_army');
  assert.equal(read.annotations.readOnlyHint, true);
  assert.equal(command.annotations.readOnlyHint, false);
  assert.deepEqual(command.inputSchema.required, ['x', 'z']);
  assert.throws(() => command.execute({ x: 0, z: 0 }), /Start or resume/);
  b.start();
  const before = b.snapshot();
  assert.throws(() => command.execute({ x: Infinity, z: 0 }), /finite/);
  assert.throws(() => command.execute({ x: 0, z: 25 }), /finite/);
  assert.deepEqual(b.snapshot(), before);
  const result = command.execute({ x: 3, z: 2 });
  assert.equal(result.accepted, true);
  assert.equal(result.selected, 7);
  assert.equal(updates, 1);
  assert.deepEqual(read.execute({}), b.snapshot());
  cleanup();
  assert.equal(signal.aborted, true);
  delete globalThis.document;
});
test('browsers without WebMCP remain fully playable', () => {
  globalThis.document = {};
  const b = new Battle();
  const cleanup = registerGameTools(b, () => {});
  b.start();
  assert(b.order({ x: 0, z: 0 }));
  cleanup();
  delete globalThis.document;
});
