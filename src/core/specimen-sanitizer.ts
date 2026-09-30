import { CorruptedSpecimenRecord, LifeSpecimen, SpecimenLoadResult } from './models';

/** 受损记录（含原始数据，供适配器在写回时保留，避免静默丢数据） */
export interface SanitizedCorruptedRecord extends CorruptedSpecimenRecord {
  raw: unknown;
}

export interface SpecimenSanitizeResult extends SpecimenLoadResult {
  corrupted: SanitizedCorruptedRecord[];
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const previewOf = (raw: unknown): string => {
  let text: string;
  try {
    text = typeof raw === 'string' ? raw : JSON.stringify(raw) ?? String(raw);
  } catch {
    text = String(raw);
  }
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

/**
 * 将任意来源（localStorage / 旧版本数据 / 被截断的写入）的标本记录
 * 分类为：可展示的健康标本（缺字段自动补齐默认值）、无法复原的受损记录。
 * 保证返回的每个 LifeSpecimen 字段完备，渲染层不会再因缺字段崩溃。
 */
export function sanitizeSpecimenRecords(input: unknown): SpecimenSanitizeResult {
  const specimens: LifeSpecimen[] = [];
  const repairedIds: string[] = [];
  const corrupted: SanitizedCorruptedRecord[] = [];

  if (input === null || input === undefined) {
    return { specimens, repairedIds, corrupted };
  }

  if (!Array.isArray(input)) {
    corrupted.push({
      key: 'corrupted-root',
      reason: '存储内容不是标本列表（JSON 结构已损坏）',
      preview: previewOf(input),
      raw: input
    });
    return { specimens, repairedIds, corrupted };
  }

  input.forEach((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      corrupted.push({
        key: `corrupted-${index}`,
        reason: '记录不是有效的标本对象',
        preview: previewOf(item),
        raw: item
      });
      return;
    }

    const rec = item as Record<string, unknown>;
    if (!isNonEmptyString(rec.id)) {
      corrupted.push({
        key: `corrupted-${index}`,
        reason: '缺少标本编号 id，无法安全复原',
        preview: previewOf(item),
        raw: item
      });
      return;
    }

    // 逐字段修复：缺失/类型错误的字段填入占位默认值，并标记为已修复
    let repaired = false;
    const pickString = (value: unknown, fallback: string): string => {
      if (isNonEmptyString(value)) return value;
      repaired = true;
      return fallback;
    };

    let pathWay: string[];
    if (Array.isArray(rec.pathWay)) {
      pathWay = rec.pathWay.filter((p): p is string => typeof p === 'string');
      if (pathWay.length !== rec.pathWay.length) repaired = true;
      if (pathWay.length === 0) {
        pathWay = ['（演化因果链记录缺失）'];
        repaired = true;
      }
    } else {
      pathWay = ['（演化因果链记录缺失）'];
      repaired = true;
    }

    let resonanceRating = 0;
    if (typeof rec.resonanceRating === 'number' && Number.isFinite(rec.resonanceRating)) {
      resonanceRating = Math.min(99, Math.max(0, rec.resonanceRating));
    } else {
      repaired = true;
    }

    specimens.push({
      id: rec.id,
      nodeId: typeof rec.nodeId === 'string' ? rec.nodeId : '',
      title: pickString(rec.title, '（未命名的平行人生标本）'),
      eraLabel: pickString(rec.eraLabel, '未知时空层'),
      assumption: pickString(rec.assumption, '（假设原文已遗失）'),
      pathWay,
      quote: pickString(rec.quote, '“……”（标本寄语缺失）'),
      butterflyTag: pickString(rec.butterflyTag, '未知领域'),
      resonanceRating,
      harvestedAt: pickString(rec.harvestedAt, '采集时间未知')
    });
    if (repaired) repairedIds.push(rec.id);
  });

  return { specimens, repairedIds, corrupted };
}
