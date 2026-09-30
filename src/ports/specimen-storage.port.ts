import { LifeSpecimen, SpecimenLoadResult } from '../core/models';

export interface SpecimenStoragePort {
  /** 读取标本馆：返回健康标本 + 自动修复标记 + 受损记录提示，永不抛异常 */
  load(): SpecimenLoadResult;
  save(specimen: LifeSpecimen): void;
  remove(id: string): void;
  /** 清理全部受损记录（保留健康标本，并将自动修复结果落盘） */
  purgeCorrupted(): void;
  clear(): void;
}
