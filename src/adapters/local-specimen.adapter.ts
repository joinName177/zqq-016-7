import { LifeSpecimen, LifeSpecimenRecovery } from '../core/models';
import { SpecimenStoragePort } from '../ports/specimen-storage.port';

export const SPECIMEN_STORAGE_KEY = 'parallel_life_specimens_v1';
export const SPECIMEN_QUARANTINE_KEY = 'parallel_life_specimens_quarantine_v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface QuarantineItem {
  id: string;
  reason: string;
  source: string;
  createdAt: string;
  raw: unknown;
}

interface QuarantineStore {
  version: 1;
  items: QuarantineItem[];
}

interface LoadedCollection {
  specimens: LifeSpecimen[];
  quarantine: QuarantineItem[];
  specimensChanged: boolean;
  quarantineChanged: boolean;
}

const FALLBACK_TITLE = '未命名标本';
const FALLBACK_NODE = 'unknown-node';
const FALLBACK_ERA = '未知时空';
const FALLBACK_ASSUMPTION = '（原假设缺失）';
const FALLBACK_PATH = '（缺失的演化因果链）';
const FALLBACK_QUOTE = '（引文缺失）';
const FALLBACK_TAG = '未知领域';
const FALLBACK_HARVESTED_AT = '未知采集时间';

const nowLabel = () => new Date().toLocaleString('zh-CN', { hour12: false });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stableHash = (value: unknown): string => {
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).padStart(6, '0');
};

const scalarToText = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return undefined;
};

const readText = (
  record: Record<string, unknown>,
  field: string,
  label: string,
  fallback: string,
  issues: string[]
): string => {
  const value = scalarToText(record[field])?.trim();
  if (value) return value;
  issues.push(`${label}缺失或格式不正确，已使用占位内容`);
  return fallback;
};

const readPathWay = (record: Record<string, unknown>, issues: string[]): string[] => {
  const rawPath = record.pathWay;
  if (!Array.isArray(rawPath)) {
    issues.push('演化因果链缺失或不是数组，已补充恢复占位');
    return [FALLBACK_PATH];
  }

  const pathWay = rawPath
    .map(item => scalarToText(item)?.trim())
    .filter((item): item is string => Boolean(item));

  if (rawPath.length !== pathWay.length) {
    issues.push('演化因果链中存在无法读取的节点，已跳过损坏片段');
  }
  if (pathWay.length === 0) {
    issues.push('演化因果链为空，已补充恢复占位');
    return [FALLBACK_PATH];
  }
  return pathWay;
};

const readRating = (record: Record<string, unknown>, issues: string[]): number => {
  const rawRating = record.resonanceRating;
  const rating =
    typeof rawRating === 'number'
      ? rawRating
      : typeof rawRating === 'string' && rawRating.trim()
        ? Number(rawRating)
        : Number.NaN;

  if (!Number.isFinite(rating)) {
    issues.push('共鸣指数缺失或不是数字，已临时标记为 0');
    return 0;
  }
  if (rating < 0 || rating > 100) {
    issues.push('共鸣指数超出 0-100 范围，已修正到有效区间');
  }
  return Math.min(100, Math.max(0, rating));
};

const createFallbackSpecimen = (
  id: string,
  title: string,
  issues: string[],
  raw: unknown,
  source: string,
  status: LifeSpecimenRecovery['status'] = 'recovered'
): LifeSpecimen => ({
  id,
  nodeId: FALLBACK_NODE,
  title,
  eraLabel: FALLBACK_ERA,
  assumption: FALLBACK_ASSUMPTION,
  pathWay: [FALLBACK_PATH],
  quote: FALLBACK_QUOTE,
  butterflyTag: FALLBACK_TAG,
  resonanceRating: 0,
  harvestedAt: FALLBACK_HARVESTED_AT,
  recovery: {
    status,
    issues,
    source,
    recoveredAt: nowLabel(),
    raw
  }
});

function normalizeSpecimen(
  input: unknown,
  index: number,
  idPrefix: string,
  usedIds: Set<string>,
  source: string,
  contextIssues: string[] = []
): LifeSpecimen {
  const generatedId = `${idPrefix}-${index + 1}-${stableHash(input ?? 'null')}`;

  if (!isRecord(input)) {
    const id = usedIds.has(generatedId) ? `${generatedId}-${index + 1}` : generatedId;
    usedIds.add(id);
    return createFallbackSpecimen(
      id,
      '无法识别的损坏标本',
      [
        ...contextIssues,
        `标本记录不是对象（收到 ${input === null ? 'null' : typeof input}），已生成恢复卡片`
      ],
      input,
      source
    );
  }

  const issues: string[] = [];
  const rawId = scalarToText(input.id)?.trim();
  const id = rawId || generatedId;
  if (!rawId) {
    issues.push('标本 ID 缺失，已生成临时 ID');
  }
  if (usedIds.has(id)) {
    issues.push('标本 ID 与其他记录重复，保存或删除时请核对原始 ID');
  }
  usedIds.add(id);

  const specimen: LifeSpecimen = {
    id,
    nodeId: readText(input, 'nodeId', '节点 ID', FALLBACK_NODE, issues),
    title: readText(input, 'title', '标题', FALLBACK_TITLE, issues),
    eraLabel: readText(input, 'eraLabel', '时代标签', FALLBACK_ERA, issues),
    assumption: readText(input, 'assumption', '原假设', FALLBACK_ASSUMPTION, issues),
    pathWay: readPathWay(input, issues),
    quote: readText(input, 'quote', '引文', FALLBACK_QUOTE, issues),
    butterflyTag: readText(input, 'butterflyTag', '蝴蝶标签', FALLBACK_TAG, issues),
    resonanceRating: readRating(input, issues),
    harvestedAt: readText(input, 'harvestedAt', '采集时间', FALLBACK_HARVESTED_AT, issues)
  };

  const existingRecovery = isRecord(input.recovery) ? input.recovery : undefined;
  const existingIssues = Array.isArray(existingRecovery?.issues)
    ? existingRecovery.issues.flatMap(issue => (scalarToText(issue) ? [String(issue)] : []))
    : [];
  const allIssues = [...new Set([...contextIssues, ...existingIssues, ...issues])];

  if (allIssues.length > 0 || existingRecovery) {
    const status =
      existingRecovery?.status === 'quarantined' || existingRecovery?.status === 'recovered'
        ? existingRecovery.status
        : 'recovered';
    const existingSource = scalarToText(existingRecovery?.source)?.trim();
    const recoveredAt =
      scalarToText(existingRecovery?.recoveredAt)?.trim() || nowLabel();

    specimen.recovery = {
      status,
      issues: allIssues,
      source: existingSource || source,
      recoveredAt,
      raw: existingRecovery && 'raw' in existingRecovery ? existingRecovery.raw : input
    };
  }

  return specimen;
}

function normalizeQuarantineItem(
  input: unknown,
  index: number,
  usedIds: Set<string>
): QuarantineItem {
  if (!isRecord(input)) {
    return {
      id: usedIds.has(`quarantine-${index + 1}`)
        ? `quarantine-${index + 1}-${stableHash(input)}`
        : `quarantine-${index + 1}`,
      reason: '隔离区条目不是对象，已保留原始内容',
      source: '标本隔离区',
      createdAt: nowLabel(),
      raw: input
    };
  }

  const fallbackId = `quarantine-${index + 1}-${stableHash(input.raw ?? input)}`;
  const id = scalarToText(input.id)?.trim() || fallbackId;
  const reason = scalarToText(input.reason)?.trim() || '标本曾被隔离，原始资料需要人工核对';
  const source = scalarToText(input.source)?.trim() || '标本隔离区';
  const createdAt = scalarToText(input.createdAt)?.trim() || nowLabel();

  return { id, reason, source, createdAt, raw: 'raw' in input ? input.raw : input };
}

function quarantineToSpecimen(item: QuarantineItem, index: number, usedIds: Set<string>): LifeSpecimen {
  const base = normalizeSpecimen(item.raw, index, 'quarantine', new Set(), item.source);
  let id = usedIds.has(item.id) ? `${item.id}-duplicate-${index + 1}` : item.id;
  usedIds.add(id);

  const title = isRecord(item.raw)
    ? scalarToText(item.raw.title)?.trim() || base.title
    : '从隔离区恢复的损坏标本';
  const issues = [...new Set([...(base.recovery?.issues ?? []), item.reason])];

  return {
    ...base,
    id,
    title,
    recovery: {
      status: 'quarantined',
      issues,
      source: item.source,
      recoveredAt: item.createdAt,
      raw: item.raw
    }
  };
}

export class LocalSpecimenAdapter implements SpecimenStoragePort {
  constructor(private readonly storage: StorageLike = localStorage) {}

  getAll(): LifeSpecimen[] {
    try {
      const loaded = this.loadCollection();
      if (loaded.specimensChanged) {
        this.writeJson(SPECIMEN_STORAGE_KEY, loaded.specimens);
      }
      if (loaded.quarantineChanged) {
        this.writeJson(SPECIMEN_QUARANTINE_KEY, {
          version: 1,
          items: loaded.quarantine
        } satisfies QuarantineStore);
      }

      const usedIds = new Set(loaded.specimens.map(specimen => specimen.id));
      const quarantined = loaded.quarantine
        .filter(item => !usedIds.has(item.id))
        .map((item, index) => quarantineToSpecimen(item, index, usedIds));

      return [...quarantined, ...loaded.specimens];
    } catch (error) {
      console.warn('标本馆资料读取失败，已切换到空馆模式。', error);
      return [];
    }
  }

  save(specimen: LifeSpecimen): void {
    const loaded = this.loadCollection();
    const normalized = normalizeSpecimen(
      specimen,
      loaded.specimens.length,
      'specimen',
      new Set(),
      'localStorage'
    );
    const existingIdx = loaded.specimens.findIndex(s => s.id === normalized.id);
    if (existingIdx >= 0) {
      loaded.specimens[existingIdx] = normalized;
    } else {
      loaded.specimens.unshift(normalized);
    }

    const remainingQuarantine = loaded.quarantine.filter(item => item.id !== normalized.id);
    this.writeJson(SPECIMEN_STORAGE_KEY, loaded.specimens);
    this.writeJson(SPECIMEN_QUARANTINE_KEY, {
      version: 1,
      items: remainingQuarantine
    } satisfies QuarantineStore);
  }

  remove(id: string): void {
    const loaded = this.loadCollection();
    this.writeJson(
      SPECIMEN_STORAGE_KEY,
      loaded.specimens.filter(specimen => specimen.id !== id)
    );
    this.writeJson(SPECIMEN_QUARANTINE_KEY, {
      version: 1,
      items: loaded.quarantine.filter(item => item.id !== id)
    } satisfies QuarantineStore);
  }

  clear(): void {
    try {
      this.storage.removeItem(SPECIMEN_STORAGE_KEY);
      this.storage.removeItem(SPECIMEN_QUARANTINE_KEY);
    } catch (error) {
      console.warn('标本馆清空失败。', error);
    }
  }

  private loadCollection(): LoadedCollection {
    const raw = this.storage.getItem(SPECIMEN_STORAGE_KEY);
    const usedIds = new Set<string>();
    const specimens: LifeSpecimen[] = [];
    const quarantine: QuarantineItem[] = [];
    let specimensChanged = false;
    let quarantineChanged = false;

    if (!raw) {
      const loadedQuarantine = this.loadQuarantine();
      return {
        specimens,
        quarantine: loadedQuarantine.items,
        specimensChanged: false,
        quarantineChanged: loadedQuarantine.changed
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const id = `unparsed-${stableHash(raw)}`;
      const issue = `整个标本馆 JSON 无法解析：${error instanceof Error ? error.message : '未知语法错误'}`;
      specimens.push(
        createFallbackSpecimen(id, '无法读取的损坏标本', [issue], raw, 'localStorage')
      );
      quarantine.push({
        id,
        reason: issue,
        source: 'localStorage',
        createdAt: nowLabel(),
        raw
      });
      const loadedQuarantine = this.loadQuarantine(quarantine);

      return {
        specimens,
        quarantine: loadedQuarantine.items,
        specimensChanged: true,
        quarantineChanged: loadedQuarantine.changed
      };
    }

    if (Array.isArray(parsed)) {
      parsed.forEach((item, index) => {
        specimens.push(normalizeSpecimen(item, index, 'specimen', usedIds, 'localStorage'));
      });
      specimensChanged = specimens.some(specimen => Boolean(specimen.recovery));
    } else if (isRecord(parsed)) {
      specimens.push(
        normalizeSpecimen(
          parsed,
          0,
          'specimen',
          usedIds,
          'localStorage',
          ['标本馆顶层数据不是数组，已生成恢复卡片']
        )
      );
      specimensChanged = true;
    } else {
      const id = `invalid-root-${stableHash(raw)}`;
      specimens.push(
        createFallbackSpecimen(
          id,
          '无法识别的标本馆资料',
          ['标本馆顶层数据不是数组，已生成恢复卡片'],
          parsed,
          'localStorage'
        )
      );
      specimensChanged = true;
    }

    const loadedQuarantine = this.loadQuarantine(quarantine);
    return {
      specimens,
      quarantine: loadedQuarantine.items,
      specimensChanged,
      quarantineChanged: loadedQuarantine.changed
    };
  }

  private loadQuarantine(existing: QuarantineItem[] = []): {
    items: QuarantineItem[];
    changed: boolean;
  } {
    const raw = this.storage.getItem(SPECIMEN_QUARANTINE_KEY);
    if (!raw) {
      return { items: existing, changed: existing.length > 0 };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return {
        items: [
          ...existing,
          {
            id: `quarantine-unparsed-${stableHash(raw)}`,
            reason: `隔离区 JSON 无法解析：${error instanceof Error ? error.message : '未知语法错误'}`,
            source: '标本隔离区',
            createdAt: nowLabel(),
            raw
          }
        ],
        changed: true
      };
    }

    const incomingItems =
      isRecord(parsed) && Array.isArray(parsed.items)
        ? parsed.items
        : Array.isArray(parsed)
          ? parsed
          : [parsed];
    const normalized = incomingItems.map((item, index) =>
      normalizeQuarantineItem(item, index, new Set())
    );

    const seenIds = new Set<string>();
    const seenRaw = new Set<string>();
    const merged = [...existing, ...normalized].filter(item => {
      const rawKey = stableHash(item.raw);
      if (seenIds.has(item.id) || seenRaw.has(rawKey)) return false;
      seenIds.add(item.id);
      seenRaw.add(rawKey);
      return true;
    });

    return {
      items: merged,
      changed: JSON.stringify({ version: 1, items: merged }) !== raw
    };
  }

  private writeJson(key: string, value: unknown): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`标本馆资料暂时无法写入（${key}）。`, error);
    }
  }
}
