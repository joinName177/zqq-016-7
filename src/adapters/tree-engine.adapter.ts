import { CounterfactualTree, LifeSpecimen } from '../core/models';
import {
  buildCounterfactualTree,
  waterBranch,
  pruneBranch,
  harvestSpecimen
} from '../core/tree-engine';
import { TreeEnginePort } from '../ports/tree-engine.port';

export class TreeEngineAdapter implements TreeEnginePort {
  createTree(assumption: string): CounterfactualTree {
    return buildCounterfactualTree(assumption);
  }

  water(tree: CounterfactualTree, nodeId: string): CounterfactualTree {
    return waterBranch(tree, nodeId);
  }

  prune(tree: CounterfactualTree, nodeId: string): CounterfactualTree {
    return pruneBranch(tree, nodeId);
  }

  harvest(tree: CounterfactualTree, nodeId: string): LifeSpecimen {
    return harvestSpecimen(tree, nodeId);
  }
}
