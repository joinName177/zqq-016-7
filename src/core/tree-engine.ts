import {
  CounterfactualTree,
  LifeNode,
  LifeSpecimen,
  LifeCategory
} from './models';

const ERA_LABELS = ['起点分歧点', '+1年·涟漪微漾', '+3年·风向转折', '+5年·航道分野', '+10年·宿命标本'];

const CATEGORY_MAP: Record<LifeCategory, { name: string; color: string }> = {
  career: { name: '职业与天命', color: '#e2b168' },
  romance: { name: '亲密与连结', color: '#d67568' },
  inner: { name: '心性与自洽', color: '#7ba085' },
  twist: { name: '奇点与宿命', color: '#8b80b6' }
};

export function buildCounterfactualTree(assumption: string): CounterfactualTree {
  const seed = [...assumption].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const nodes: Record<string, LifeNode> = {};
  const rootId = 'node-root';

  nodes[rootId] = {
    id: rootId,
    layerIndex: 0,
    eraLabel: ERA_LABELS[0],
    title: `假设原点：${assumption}`,
    scenarioDescription: '如果时间倒流至那个关键的岔路口，世界在一毫秒的迟疑中，分化为两条平行奔流的因果之河。',
    vitality: 100,
    isPruned: false,
    waterCount: 0,
    category: 'twist',
    categoryName: CATEGORY_MAP.twist.name,
    color: CATEGORY_MAP.twist.color,
    specimenQuote: '“所有的未曾发生，都曾在虚空中剧烈生长。”',
    childrenIds: ['node-1-a', 'node-1-b']
  };

  // Branch A: Bold exploration / radical divergence
  // Branch B: Quiet retreat / gentle serenity
  const storiesA = [
    {
      id: 'node-1-a',
      parentId: rootId,
      layerIndex: 1,
      title: '脱轨的列车：辞别熟悉的舒适区',
      desc: '第一年，你承受着剧烈的不安与外界的质疑，但一种近乎野性的专注在你体内觉醒。',
      cat: 'career' as LifeCategory,
      quote: '“当不再寻求所有人的赞许，真正的旅程才刚刚启航。”'
    },
    {
      id: 'node-2-a',
      parentId: 'node-1-a',
      layerIndex: 2,
      title: '暴风雨中的破局：核心技艺的蜕变',
      desc: '第三年，一次濒临崩溃的危机反向倒逼出你最坚韧的潜能，你在此领域建立起辨识度。',
      cat: 'twist' as LifeCategory,
      quote: '“痛苦不是障碍，而是你灵魂被锻造的火候。”'
    },
    {
      id: 'node-3-a',
      parentId: 'node-2-a',
      layerIndex: 3,
      title: '自立的孤岛：同频者的共振群落',
      desc: '第五年，你吸引了一批志同道合的同行者，创建了完全属于你价值观的创作生态。',
      cat: 'romance' as LifeCategory,
      quote: '“孤独的跋涉最终会让你与真正的同类相逢。”'
    },
    {
      id: 'node-4-a',
      parentId: 'node-3-a',
      layerIndex: 4,
      title: '【终局标本】开拓者之果：广袤而沧桑的丰碑',
      desc: '第十年，你成为了许多人眼中的灯塔，虽然偶尔在深夜怀念起最初的温软，但你知道自己从未辜负过那一颗种子。',
      cat: 'inner' as LifeCategory,
      quote: '“我走了一条人迹罕至的路，而这决定了一切。”'
    }
  ];

  const storiesB = [
    {
      id: 'node-1-b',
      parentId: rootId,
      layerIndex: 1,
      title: '扎根的土壤：在细碎日常中重建秩序',
      desc: '第一年，你放下了紧绷的宏大叙事，开始专注照顾一餐一饭，内心的杂音渐渐沉寂。',
      cat: 'inner' as LifeCategory,
      quote: '“平凡不是妥协，而是对生活本质最深沉的温柔。”'
    },
    {
      id: 'node-2-b',
      parentId: 'node-1-b',
      layerIndex: 2,
      title: '暖意融融的小院：建立深刻的情感羁绊',
      desc: '第三年，你与知心的人构筑起温暖稳定的庇护所，生活节奏变得舒缓而富有韵律。',
      cat: 'romance' as LifeCategory,
      quote: '“幸福是一蔬一饭，是夜晚回家时窗前永远亮着的那盏灯。”'
    },
    {
      id: 'node-3-b',
      parentId: 'node-2-b',
      layerIndex: 3,
      title: '岁月的陈酿：掌握了一种从容的生活美学',
      desc: '第五年，你的身心呈现出罕见的澄澈，外界的焦虑风暴无法再穿透你筑起的护城河。',
      cat: 'career' as LifeCategory,
      quote: '“真正的富有，是拥有按自己心意度过清晨与黄昏的自由。”'
    },
    {
      id: 'node-4-b',
      parentId: 'node-3-b',
      layerIndex: 4,
      title: '【终局标本】守常者之花：宁静祥和的心灵绿洲',
      desc: '第十年，你拥有了极其健康的身心与丰盈的家庭记忆。你平静地老去，每一个日子都充盈而踏实。',
      cat: 'inner' as LifeCategory,
      quote: '“此心安处是吾乡，所有的风景都不及内心的明月。”'
    }
  ];

  // Wire children
  const buildNodes = (storyList: typeof storiesA) => {
    storyList.forEach((s, idx) => {
      const next = storyList[idx + 1];
      nodes[s.id] = {
        id: s.id,
        parentId: s.parentId,
        layerIndex: s.layerIndex,
        eraLabel: ERA_LABELS[s.layerIndex],
        title: s.title,
        scenarioDescription: s.desc,
        vitality: 70 + ((seed + idx * 11) % 25),
        isPruned: false,
        waterCount: 0,
        category: s.cat,
        categoryName: CATEGORY_MAP[s.cat].name,
        color: CATEGORY_MAP[s.cat].color,
        specimenQuote: s.quote,
        childrenIds: next ? [next.id] : []
      };
    });
  };

  buildNodes(storiesA);
  buildNodes(storiesB);

  return {
    id: `tree-${Date.now()}`,
    assumption,
    rootId,
    nodes,
    createdAt: new Date().toLocaleDateString('zh-CN'),
    specimens: []
  };
}

export function waterBranch(tree: CounterfactualTree, nodeId: string): CounterfactualTree {
  const target = tree.nodes[nodeId];
  if (!target) return tree;

  target.vitality = Math.min(100, target.vitality + 20);
  target.waterCount += 1;

  // If watered 2 times and in layer 1 or 2, sprout a serendipity branch!
  if (target.waterCount === 2 && target.layerIndex < 3 && target.childrenIds.length < 2) {
    const newId = `node-${target.layerIndex + 1}-twist-${Date.now().toString(36).slice(-4)}`;
    const nextLayer = target.layerIndex + 1;
    const cat: LifeCategory = 'twist';
    tree.nodes[newId] = {
      id: newId,
      parentId: target.id,
      layerIndex: nextLayer,
      eraLabel: `${ERA_LABELS[nextLayer]}·奇遇枝桠`,
      title: '因浇水而盛放的意外分支：突发奇遇',
      scenarioDescription: '生命在持续的滋养中孕育出意想不到的转折——一位旅人带来的消息彻底重构了你的人生构想。',
      vitality: 88,
      isPruned: false,
      waterCount: 0,
      category: cat,
      categoryName: CATEGORY_MAP[cat].name,
      color: CATEGORY_MAP[cat].color,
      specimenQuote: '“当你足够专注地灌溉，奇迹就会在干涸的断枝上抽芽。”',
      childrenIds: []
    };
    target.childrenIds.push(newId);
  }

  return { ...tree };
}

export function pruneBranch(tree: CounterfactualTree, nodeId: string): CounterfactualTree {
  const pruneRecursive = (id: string) => {
    const n = tree.nodes[id];
    if (!n) return;
    n.isPruned = true;
    n.vitality = 0;
    n.childrenIds.forEach(pruneRecursive);
  };

  pruneRecursive(nodeId);
  return { ...tree };
}

export function harvestSpecimen(tree: CounterfactualTree, nodeId: string): LifeSpecimen {
  const node = tree.nodes[nodeId];
  if (!node) throw new Error('节点不存在');

  // Trace pathway back to root
  const pathWay: string[] = [];
  let curr: LifeNode | undefined = node;
  while (curr) {
    pathWay.unshift(curr.title);
    curr = curr.parentId ? tree.nodes[curr.parentId] : undefined;
  }

  const specimen: LifeSpecimen = {
    id: `specimen-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nodeId: node.id,
    title: node.title,
    eraLabel: node.eraLabel,
    assumption: tree.assumption,
    pathWay,
    quote: node.specimenQuote,
    butterflyTag: node.categoryName,
    resonanceRating: Math.min(99, 65 + node.vitality / 3),
    harvestedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };

  tree.specimens.push(specimen);
  return specimen;
}
