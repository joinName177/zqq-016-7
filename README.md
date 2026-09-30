# zqq-016 · 反事实平行人生树 · 平行人生标本集

纯前端反事实人生分支树演算系统。用户输入一个"如果当初……"的假设，系统基于该假设生长出一棵多代际分歧的"反事实树"，每个分叉代表一种可能的人生走向（1年涟漪、3年质变、5年分流、10年宿命结局）。用户可通过浇水注入生命力（可能催生意外奇遇分支）、修剪枝桠来探索不同路径，并可将动人的平行命运定格采集为"平行人生标本集"。

## 架构说明（分层架构：核心层 / 端口层 / 适配器层）

- `src/core`：领域模型（`LifeNode`、`LifeSpecimen`、`CounterfactualTree`）与反事实树演化引擎（生长算法、浇水滋养规则、枝桠修剪级联、标本溯源提取）。
- `src/ports`：端口层契约（`TreeEnginePort` 树引擎运算端口、`SpecimenStoragePort` 标本持久化存储端口）。
- `src/adapters`：适配器层（预设故事生成与通用假设演化适配器、LocalStorage 标本馆持久化适配器）。
- `src/ui`：原生 CSS 植物标本馆古典深林美学视觉呈现层，包含分代际时空轨道、生命力灌溉指示器、枝桠修剪动效与平行标本陈列馆。

## 本地运行

```bash
npm install
npm run dev
```

## 构建验证

```bash
npm run build
```

标本馆持久化恢复校验（覆盖 JSON 损坏、异常数组项、缺字段与隔离区恢复）：

```bash
npm run verify:specimens
```

## Docker 容器化部署

```bash
docker compose up --build
```
访问：`http://localhost:8016`
