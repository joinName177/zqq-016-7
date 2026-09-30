import { LifeSpecimen, SpecimenLoadResult } from '../core/models';
import { sanitizeSpecimenRecords } from '../core/specimen-sanitizer';
import { SpecimenStoragePort } from '../ports/specimen-storage.port';

const SPECIMEN_STORAGE_KEY = 'parallel_life_specimens_v1';

export class LocalSpecimenAdapter implements SpecimenStoragePort {
  load(): SpecimenLoadResult {
    const { specimens, repairedIds, corrupted } = sanitizeSpecimenRecords(this.readRaw());
    return {
      specimens,
      repairedIds,
      // 对端口层隐藏原始数据，只暴露提示信息
      corrupted: corrupted.map(({ key, reason, preview }) => ({ key, reason, preview }))
    };
  }

  save(specimen: LifeSpecimen): void {
    const { healthy, corruptedRaw } = this.readAll();
    const existingIdx = healthy.findIndex(s => s.id === specimen.id);
    if (existingIdx >= 0) {
      healthy[existingIdx] = specimen;
    } else {
      healthy.unshift(specimen);
    }
    this.writeAll(healthy, corruptedRaw);
  }

  remove(id: string): void {
    const { healthy, corruptedRaw } = this.readAll();
    this.writeAll(healthy.filter(s => s.id !== id), corruptedRaw);
  }

  purgeCorrupted(): void {
    const { healthy } = this.readAll();
    this.writeAll(healthy, []);
  }

  clear(): void {
    localStorage.removeItem(SPECIMEN_STORAGE_KEY);
  }

  /** 读取原始存储内容；JSON 无法解析时把原文交给消毒器生成受损提示 */
  private readRaw(): unknown {
    const raw = localStorage.getItem(SPECIMEN_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private readAll(): { healthy: LifeSpecimen[]; corruptedRaw: unknown[] } {
    const result = sanitizeSpecimenRecords(this.readRaw());
    return {
      healthy: result.specimens,
      corruptedRaw: result.corrupted.map(c => c.raw)
    };
  }

  /** 写回时保留受损原始记录，等待用户确认清理，不静默丢数据 */
  private writeAll(healthy: LifeSpecimen[], corruptedRaw: unknown[]): void {
    localStorage.setItem(SPECIMEN_STORAGE_KEY, JSON.stringify([...healthy, ...corruptedRaw]));
  }
}
