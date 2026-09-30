// 标本馆损坏数据回归验证：
// 复现「损坏资料 / 缺字段」场景，验证修复后正常标本可见、异常项有恢复提示。
// 运行：node scripts/verify-specimen-integrity.mjs
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zqq-specimen-verify-'));

// 1) 编译相关模块为 CommonJS（无需 DOM 即可在 Node 中运行）
execFileSync(
  path.join(root, 'node_modules', '.bin', 'tsc'),
  [
    'src/core/models.ts',
    'src/core/specimen-sanitizer.ts',
    'src/ports/specimen-storage.port.ts',
    'src/adapters/local-specimen.adapter.ts',
    'src/ui/app.ts',
    '--outDir', tmp,
    '--module', 'commonjs',
    '--target', 'es2020',
    '--moduleResolution', 'node',
    '--skipLibCheck'
  ],
  { cwd: root, stdio: 'inherit' }
);

// 2) 浏览器环境 shim
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};

const require = createRequire(import.meta.url);
const { LocalSpecimenAdapter } = require(path.join(tmp, 'adapters', 'local-specimen.adapter.js'));
const { renderTreeApp } = require(path.join(tmp, 'ui', 'app.js'));

const STORAGE_KEY = 'parallel_life_specimens_v1';
const tree = { id: 't1', assumption: '如果当初我留在了故乡小城', rootId: 'node-root', nodes: {}, createdAt: '', specimens: [] };
const newContainer = () => ({ innerHTML: '', querySelector: () => null, querySelectorAll: () => [] });

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};
const count = (haystack, needle) => haystack.split(needle).length - 1;

// ---- 场景 A：健康标本 + 缺字段标本 + 非对象垃圾记录 混合 ----
const healthy1 = {
  id: 'specimen-ok-1', nodeId: 'node-4-a', title: '【终局标本】开拓者之果',
  eraLabel: '+10年·宿命标本', assumption: '如果当初我留在了故乡小城',
  pathWay: ['假设原点', '开拓者之果'], quote: '“我走了一条人迹罕至的路。”',
  butterflyTag: '心性与自洽', resonanceRating: 88, harvestedAt: '2026/9/30 10:00:00'
};
const healthy2 = { ...healthy1, id: 'specimen-ok-2', title: '【终局标本】守常者之花' };
const brokenMissingFields = { id: 'specimen-broken-1', nodeId: 'node-2-a' }; // 缺 title/pathWay/quote 等
const brokenNoPathWay = { ...healthy1, id: 'specimen-broken-2', pathWay: undefined, title: undefined };

store.set(STORAGE_KEY, JSON.stringify([
  healthy1, brokenMissingFields, 'garbage-string', 42, null, brokenNoPathWay, healthy2
]));

const adapter = new LocalSpecimenAdapter();
const result = adapter.load();

check('A1 健康+可修复标本全部保留（4 条）', result.specimens.length === 4);
check('A2 无法复原的异常记录被隔离（3 条）', result.corrupted.length === 3);
check('A3 缺字段标本被标记为已修复（2 条）',
  result.repairedIds.includes('specimen-broken-1') && result.repairedIds.includes('specimen-broken-2'));

const c1 = newContainer();
let crashed = false;
try {
  renderTreeApp(c1, tree, result, true, [], {});
} catch (e) {
  crashed = true;
  console.error('   渲染异常:', e.message);
}
check('A4 打开标本馆渲染不再崩溃', !crashed && c1.innerHTML.length > 0);
check('A5 正常标本继续可见', c1.innerHTML.includes('开拓者之果') && c1.innerHTML.includes('守常者之花'));
check('A6 异常项渲染恢复提示卡（3 张）', count(c1.innerHTML, '标本记录受损') === 3);
check('A7 恢复提示文案存在', c1.innerHTML.includes('恢复提示'));
check('A8 已修复标本带提示标记（2 处）', count(c1.innerHTML, '已自动修补缺失字段') === 2);
check('A9 提供清理入口', c1.innerHTML.includes('清理全部受损记录 (3)'));

const c2 = newContainer();
let crashedClosed = false;
try {
  renderTreeApp(c2, tree, result, false, [], {});
} catch {
  crashedClosed = true;
}
check('A10 标本馆关闭时整页渲染正常（不再整页空白）', !crashedClosed && c2.innerHTML.length > 0);

// ---- 场景 B：save/remove 非破坏性，受损记录保留待用户确认 ----
adapter.save({ ...healthy1, id: 'specimen-ok-3', title: '新采集标本' });
const afterSave = adapter.load();
check('B1 save 后新标本入库', afterSave.specimens.some(s => s.id === 'specimen-ok-3'));
check('B2 save 不清除受损记录（仍 3 条）', afterSave.corrupted.length === 3);
adapter.remove('specimen-ok-3');
const afterRemove = adapter.load();
check('B3 remove 正常生效', !afterRemove.specimens.some(s => s.id === 'specimen-ok-3'));
check('B4 remove 不清除受损记录', afterRemove.corrupted.length === 3);

// ---- 场景 C：purgeCorrupted 清理受损项并落盘修复结果 ----
adapter.purgeCorrupted();
const afterPurge = adapter.load();
check('C1 清理后受损记录为 0', afterPurge.corrupted.length === 0);
check('C2 清理后健康标本完整（4 条）', afterPurge.specimens.length === 4);
const rawAfterPurge = JSON.parse(store.get(STORAGE_KEY));
check('C3 落盘数据全部为字段完备的健康记录',
  rawAfterPurge.every(s => typeof s.title === 'string' && Array.isArray(s.pathWay)));

// ---- 场景 D：整体 JSON 损坏（被截断的写入） ----
store.set(STORAGE_KEY, '[{"id":"specimen-x","title":"未写完的标本"');
const brokenJson = adapter.load();
check('D1 整体 JSON 损坏 → 1 条受损提示', brokenJson.corrupted.length === 1 && brokenJson.specimens.length === 0);
const c3 = newContainer();
let crashedD = false;
try {
  renderTreeApp(c3, tree, brokenJson, true, [], {});
} catch {
  crashedD = true;
}
check('D2 整体损坏时渲染不崩溃且有恢复提示', !crashedD && c3.innerHTML.includes('标本记录受损'));

// ---- 场景 E：空存储 ----
adapter.clear();
const empty = adapter.load();
const c4 = newContainer();
let crashedE = false;
try {
  renderTreeApp(c4, tree, empty, true, [], {});
} catch {
  crashedE = true;
}
check('E1 空存储正常渲染空馆提示', !crashedE && c4.innerHTML.includes('标本柜暂空'));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures === 0 ? '\n全部断言通过 🎉' : `\n${failures} 条断言失败`);
process.exit(failures === 0 ? 0 : 1);
