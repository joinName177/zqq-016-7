import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const projectRoot = process.cwd();
const outDir = mkdtempSync(join(tmpdir(), 'specimen-storage-'));
const bundlePath = join(outDir, 'adapter.mjs');

const esbuildBin = join(projectRoot, 'node_modules', '.bin', 'esbuild');
const build = spawnSync(
  esbuildBin,
  [
    join(projectRoot, 'src', 'adapters', 'local-specimen.adapter.ts'),
    '--bundle',
    '--format=esm',
    '--platform=node',
    '--outfile=' + bundlePath
  ],
  { encoding: 'utf8' }
);

if (build.status !== 0) {
  console.error(build.stderr || build.stdout);
  process.exit(build.status ?? 1);
}

const { LocalSpecimenAdapter, SPECIMEN_STORAGE_KEY, SPECIMEN_QUARANTINE_KEY } = await import(
  pathToFileURL(bundlePath).href
);

class MemoryStorage {
  constructor(initial = {}) {
    this.items = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.items.delete(key);
  }
}

// This is the operation previously performed by the cabinet renderer. Missing
// pathWay used to throw and prevent every normal specimen from being rendered.
function renderCabinet(specimens) {
  return specimens
    .map(
      specimen => `
      <article>
        <h3>${specimen.title}</h3>
        ${specimen.pathWay.map(path => `<p>${path}</p>`).join('')}
      </article>
    `
    )
    .join('');
}

const validSpecimen = {
  id: 'healthy-specimen',
  nodeId: 'node-4-a',
  title: '仍然可见的正常标本',
  eraLabel: '+10年·宿命标本',
  assumption: '如果当初选择了远行',
  pathWay: ['起点', '远行'],
  quote: '正常引文',
  butterflyTag: '职业与天命',
  resonanceRating: 88,
  harvestedAt: '2026/9/30 10:00:00'
};

{
  // Corrupt and partially missing records appear alongside one good record.
  const storage = new MemoryStorage({
    [SPECIMEN_STORAGE_KEY]: JSON.stringify([
      validSpecimen,
      {
        id: 'damaged-with-missing-fields',
        nodeId: 'node-x',
        pathWay: '不是数组'
      },
      null,
      {
        ...validSpecimen,
        id: 'damaged-path-items',
        pathWay: ['正常节点', null, { inaccessible: true }, '可恢复节点']
      }
    ])
  });

  const adapter = new LocalSpecimenAdapter(storage);
  const specimens = adapter.getAll();
  const html = renderCabinet(specimens);

  assert.equal(specimens.length, 4);
  assert.match(html, /仍然可见的正常标本/);
  assert.match(html, /可恢复节点/);
  assert.equal(specimens[0].recovery, undefined);
  assert.ok(specimens[1].recovery, 'missing-field record should carry a recovery hint');
  assert.match(specimens[1].recovery.issues.join('；'), /标题/);
  assert.equal(specimens[1].title, '未命名标本');
  assert.deepEqual(specimens[1].pathWay, ['（缺失的演化因果链）']);
  assert.ok(specimens[2].recovery, 'null record should become a recovery placeholder');
  assert.match(specimens[2].recovery.issues.join('；'), /不是对象/);
  assert.deepEqual(specimens[3].pathWay, ['正常节点', '可恢复节点']);

  const cabinet = `
    ${specimens.some(specimen => specimen.recovery) ? '检测到异常标本资料' : ''}
    ${specimens
      .map(
        specimen => `
          <article class="${specimen.recovery ? 'specimen-card-damaged' : ''}">
            <h3>${specimen.title}</h3>
            ${specimen.recovery ? `<p>${specimen.recovery.issues.join('；')}</p>` : ''}
            ${specimen.pathWay.map(path => `<p>${path}</p>`).join('')}
          </article>
        `
      )
      .join('')}
  `;
  assert.match(cabinet, /检测到异常标本资料/);
  assert.match(cabinet, /仍然可见的正常标本/);
  assert.match(cabinet, /specimen-card-damaged/);

  const persisted = JSON.parse(storage.getItem(SPECIMEN_STORAGE_KEY));
  assert.equal(persisted.length, 4);
  assert.equal(persisted[0].id, 'healthy-specimen');
  assert.ok(persisted[1].recovery);
}

{
  // A single mistakenly written top-level record must still be rendered safely.
  const storage = new MemoryStorage({
    [SPECIMEN_STORAGE_KEY]: JSON.stringify({ title: '误写成对象的标本', id: 'object-root' })
  });
  const adapter = new LocalSpecimenAdapter(storage);
  const specimens = adapter.getAll();

  assert.equal(specimens.length, 1);
  assert.equal(specimens[0].id, 'object-root');
  assert.equal(specimens[0].title, '误写成对象的标本');
  assert.ok(specimens[0].recovery);
  assert.match(specimens[0].recovery.issues.join('；'), /顶层数据不是数组/);
  assert.doesNotThrow(() => renderCabinet(specimens));
}

{
  // Completely unreadable historical JSON must not be silently discarded.
  const storage = new MemoryStorage({
    [SPECIMEN_STORAGE_KEY]: '{broken json after a browser interruption'
  });
  const adapter = new LocalSpecimenAdapter(storage);
  const specimens = adapter.getAll();

  assert.equal(specimens.length, 1);
  assert.ok(specimens[0].recovery);
  assert.match(specimens[0].title, /无法读取/);
  assert.match(specimens[0].recovery.issues.join('；'), /JSON/);
  assert.ok(storage.getItem(SPECIMEN_QUARANTINE_KEY));
  assert.doesNotThrow(() => renderCabinet(specimens));
}

{
  // Previously quarantined raw data is surfaced as a recoverable warning while
  // normal records remain visible.
  const quarantineItem = {
    id: 'quarantined-record',
    reason: '旧版标本记录结构不完整',
    source: 'manual-check',
    raw: { title: '隔离区中的命运' },
    createdAt: '2026/9/29 09:00:00'
  };
  const storage = new MemoryStorage({
    [SPECIMEN_STORAGE_KEY]: JSON.stringify([validSpecimen]),
    [SPECIMEN_QUARANTINE_KEY]: JSON.stringify({ version: 1, items: [quarantineItem] })
  });
  const adapter = new LocalSpecimenAdapter(storage);
  const specimens = adapter.getAll();

  assert.equal(specimens.length, 2);
  assert.equal(specimens[0].id, 'quarantined-record');
  assert.equal(specimens[0].title, '隔离区中的命运');
  assert.equal(specimens[1].id, 'healthy-specimen');
  assert.match(specimens[0].recovery.issues.join('；'), /旧版标本记录结构不完整/);

  adapter.remove('quarantined-record');
  const afterRemove = adapter.getAll();
  assert.deepEqual(afterRemove.map(item => item.id), ['healthy-specimen']);
  const quarantineAfterRemove = JSON.parse(storage.getItem(SPECIMEN_QUARANTINE_KEY));
  assert.deepEqual(quarantineAfterRemove.items, []);
}

{
  // Saving a new specimen must not discard the recovery warning.
  const storage = new MemoryStorage({
    [SPECIMEN_STORAGE_KEY]: '[{ "id": "damaged" }]'
  });
  const adapter = new LocalSpecimenAdapter(storage);
  adapter.getAll();
  adapter.save({ ...validSpecimen, id: 'new-healthy' });
  const specimens = adapter.getAll();

  assert.deepEqual(specimens.map(item => item.id), ['new-healthy', 'damaged']);
  assert.ok(specimens.find(item => item.id === 'damaged').recovery);
}

console.log('specimen storage recovery checks passed');
