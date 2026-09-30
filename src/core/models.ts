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

export interface LifeSpecimenRecovery {
  status: 'recovered' | 'quarantined';
  issues: string[];
  source?: string;
  recoveredAt: string;
  raw?: unknown;
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
  recovery?: LifeSpecimenRecovery;
}

export interface CounterfactualTree {
  id: string;
  assumption: string;
  rootId: string;
  nodes: Record<string, LifeNode>;
  createdAt: string;
  specimens: LifeSpecimen[];
}
