import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function moduleAt(path) {
  const m = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    { exports: m.exports, module: m, require, Map, Set, Uint32Array, console },
  );
  return m.exports;
}
const lib = moduleAt('lib/chem.ts'),
  interaction = moduleAt('lib/interactions.ts');
const project = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const parsed = lib.parseInput(project.raw),
  made = lib.makeRecords(parsed, project.mapping);
const RDKit = await require('@rdkit/rdkit')();
let result;
const ctx = vm.createContext({
  console,
  Uint32Array,
  Float32Array,
  Uint8Array,
  Map,
  Set,
  importScripts() {},
  initRDKitModule: async () => RDKit,
  postMessage(data) {
    if (['result', 'error'].includes(data.type)) result = data;
  },
});
for (const path of ['chem-core', 'scaffold', 'chem-worker'])
  vm.runInContext(fs.readFileSync(`public/${path}.js`, 'utf8'), ctx);
const summaries = [];
for (const threshold of [0.35, 0.5, 0.65, 0.8]) {
  await ctx.onmessage({
    data: {
      records: made.records,
      threshold,
      radius: project.radius,
      nBits: project.nBits,
      basis: project.basis,
      chirality: project.chirality,
    },
  });
  assert.equal(result.type, 'result', result.message);
  assert.equal(result.rows.length, 2676);
  assert.equal(new Set(result.clusters.flatMap((c) => c.members)).size, 2676);
  assert.ok(result.rows.every((r) => project.poses[r.key]));
  for (const c of result.clusters)
    for (const i of c.members)
      assert.ok(
        lib.similarity(result.rows[i], result.rows[c.center]) >=
          threshold - 1e-12,
      );
  summaries.push({
    threshold,
    clusters: result.clusters.length,
    singletons: result.clusters.filter((c) => c.members.length === 1).length,
    largest: Math.max(...result.clusters.map((c) => c.members.length)),
    uniqueScaffolds: new Set(result.rows.map((r) => r.scaffold).filter(Boolean)).size,
    acyclic: result.rows.filter(r => !r.scaffold).length,
  });
}
const cached = Object.values(project.interactionCache)[0],
  state = interaction.residueInteractionState;
assert.equal(state(undefined, ['A:GLU509']), 'unknown');
assert.equal(state(cached, ['A:GLU509']), 'yes');
assert.equal(state(cached, ['A:GLU509'], 'halogen'), 'no');
assert.equal(state(cached, ['A:SER752', 'A:GLU509'], 'hbond', 'all'), 'yes');
assert.equal(state(cached, ['A:SER752', 'A:ALA447'], 'hbond', 'any'), 'yes');
assert.equal(state(cached, ['A:SER752', 'A:ALA447'], 'hbond', 'all'), 'no');
assert.equal(state(cached, ['B:GLU509']), 'no');
assert.equal(
  state({ ...cached, errors: ['halogen: failed'] }, ['A:ALA447']),
  'unknown',
);
assert.equal(
  state({ ...cached, errors: ['halogen: failed'] }, ['A:ALA447'], 'hbond'),
  'no',
);
assert.equal(
  state({ ...cached, errors: ['halogen: failed'] }, ['A:GLU509']),
  'yes',
);
const audit = {
  records: result.rows.length,
  issues: result.issues.length,
  unique: new Set(result.rows.map((r) => r.canonical)).size,
  docking: result.rows.filter((r) => r.docking !== null).length,
  mmgbsa: result.rows.filter((r) => r.mmgbsa !== null).length,
  mmgbsaRange: [
    Math.min(...result.rows.map((r) => r.mmgbsa ?? Infinity)),
    Math.max(...result.rows.map((r) => r.mmgbsa ?? -Infinity)),
  ],
  scaffoldSweep: summaries,
  interactionRegression: 'passed',
};
fs.mkdirSync('outputs', { recursive: true });
fs.writeFileSync('outputs/project-audit.json', JSON.stringify(audit, null, 2));
console.log(JSON.stringify(audit, null, 2));
