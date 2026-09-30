export type LifeCategory = 'career' | 'romance' | 'inner' | 'twist';

export interface LifeNode {
  id: string;
  parentId?: string;
  layerIndex: number; // 0: 假说分歧点, 1: 1年后涟漪, 2: 3年后质变, 3: 5年后分道, 4: 10年后平行归宿
  eraLabel: string;
  title: string;
  scenarioDescription: string;
  vitality: number; // 0 - 100
  isPruned: boolean;
  waterCount: number;
  category: LifeCategory;
  categoryName: string;
  color: string;
  specimenQuote: string;
  childrenIds: string[];
}

export interface LifeSpecimen {
  id: string;
  nodeId: string;
  title: string;
  eraLabel: string;
  assumption: string;
  pathWay: string[];
  quote: string;
  butterflyTag: string;
  resonanceRating: number;
  harvestedAt: string;
}

export interface CounterfactualTree {
  id: string;
  assumption: string;
  rootId: string;
  nodes: Record<string, LifeNode>;
  createdAt: string;
  specimens: LifeSpecimen[];
}

/** 无法自动复原的受损标本记录（仅保留提示信息，不参与正常渲染） */
export interface CorruptedSpecimenRecord {
  key: string; // 稳定标识（基于存储下标生成）
  reason: string; // 人类可读的损坏原因
  preview: string; // 残留数据片段预览（截断）
}

/** 标本馆读取结果：健康标本 + 自动修复标记 + 受损记录提示 */
export interface SpecimenLoadResult {
  specimens: LifeSpecimen[]; // 可正常展示的标本（缺字段的已自动补齐默认值）
  repairedIds: string[]; // 曾被自动修补字段的标本 id
  corrupted: CorruptedSpecimenRecord[]; // 无法复原的异常记录
}
