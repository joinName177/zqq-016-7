import { CounterfactualTree, LifeSpecimen, LifeNode } from '../core/models';

export interface TreeUIHandlers {
  onGrowNewTree: (assumption: string) => void;
  onWaterNode: (nodeId: string) => void;
  onPruneNode: (nodeId: string) => void;
  onHarvestNode: (nodeId: string) => void;
  onDeleteSpecimen: (id: string) => void;
  onToggleCabinet: (open: boolean) => void;
}

export function renderTreeApp(
  container: HTMLElement,
  tree: CounterfactualTree,
  specimens: LifeSpecimen[],
  isCabinetOpen: boolean,
  presets: string[],
  handlers: TreeUIHandlers
) {
  const esc = (s: string) =>
    s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

  // Organize nodes by layer index (0 to 4)
  const layers: LifeNode[][] = [[], [], [], [], []];
  Object.values(tree.nodes).forEach(n => {
    if (layers[n.layerIndex]) {
      layers[n.layerIndex].push(n);
    }
  });

  const eraTitles = ['起点分歧点', '+1年·涟漪微漾', '+3年·风向转折', '+5年·航道分野', '+10年·宿命标本'];
  const recoveredSpecimens = specimens.filter(specimen => Boolean(specimen.recovery));

  const formatRecoveryRaw = (raw: unknown) => {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  };

  container.innerHTML = `
    <div class="tree-app">
      <header class="app-header">
        <div class="brand">
          <div class="tree-icon">🌿</div>
          <div>
            <h1>反事实平行人生树 · 平行人生标本集</h1>
            <p>COUNTERFACTUAL LIFE TREE &amp; PARALLEL SPECIMENS · v1.0.0</p>
          </div>
        </div>
        <button class="cabinet-btn" id="btnOpenCabinet">
          🗄️ 平行人生标本馆 (${specimens.length})${recoveredSpecimens.length > 0 ? ` · ${recoveredSpecimens.length} 项待恢复` : ''}
        </button>
      </header>

      <!-- Assumption Generator Hub -->
      <section class="generator-hub">
        <div class="assumption-input-wrap">
          <input type="text" class="assumption-input" id="assumptionInput" value="${esc(tree.assumption)}" placeholder="输入一个'如果当初……'的假设，观察平行人生分支生长" />
          <button class="btn-grow" id="btnGrowTree">生长反事实树 🌱</button>
        </div>
        <div class="preset-list">
          <span style="color:var(--text-muted);">经典假设母题：</span>
          ${presets.map(p => `<button class="btn-preset" data-preset="${esc(p)}">${esc(p)}</button>`).join('')}
        </div>
      </section>

      <!-- Main Tree Container -->
      <main class="tree-container">
        <div class="tree-header">
          <h2>🌳 当前反事实时空谱系：${esc(tree.assumption)}</h2>
          <span style="font-size:12px;color:var(--text-muted);">
            提示：点击【💧浇水】注入可能性能量，点击【✂️修剪】减除不想要的走向，点击【📌采集】定格标本
          </span>
        </div>

        <div class="generations-track">
          ${layers
            .map(
              (layerNodes, idx) => `
            <div class="generation-column">
              <div class="column-header">${eraTitles[idx]}</div>
              ${layerNodes
                .map(
                  node => `
                <div class="node-card ${node.isPruned ? 'pruned' : ''}" 
                     style="--cat-color: ${node.color};" 
                     data-id="${node.id}">
                  <span class="node-category-tag">${esc(node.categoryName)}</span>
                  <div class="node-title">${esc(node.title)}</div>
                  <div class="node-desc">${esc(node.scenarioDescription)}</div>
                  <div class="node-quote">${esc(node.specimenQuote)}</div>
                  
                  <div class="vitality-bar-bg">
                    <div class="vitality-bar-fill" style="width: ${node.vitality}%;"></div>
                  </div>

                  <div class="node-actions">
                    <button class="btn-action btn-water" data-id="${node.id}" title="注入生命力" ${node.isPruned ? 'disabled' : ''}>
                      💧 浇水 (${node.waterCount})
                    </button>
                    <button class="btn-action btn-prune" data-id="${node.id}" title="剪除此分支">
                      ✂️ 修剪
                    </button>
                    <button class="btn-action btn-harvest" data-id="${node.id}" title="收录进标本馆">
                      📌 采集标本
                    </button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>
      </main>

      <!-- Specimen Cabinet Modal -->
      ${
        isCabinetOpen
          ? `
        <div class="modal-overlay" id="cabinetOverlay">
          <div class="modal-content">
            <div class="cabinet-header">
              <h2>🗄️ 平行人生植物学标本集 (Herbarium of What-Ifs)</h2>
              <button class="btn-action" id="btnCloseCabinet" style="font-size:16px;">✕ 关闭</button>
            </div>

            ${
              specimens.length === 0
                ? `
              <div style="text-align:center;padding:40px;color:var(--text-muted);">
                🌱 标本柜暂空。请在反事实树上点击节点的【📌 采集标本】按钮，将某段平行人生命运封存入馆。
              </div>
            `
                : `
              ${
                recoveredSpecimens.length > 0
                  ? `
                <div class="recovery-banner" role="alert">
                  <strong>🩹 检测到 ${recoveredSpecimens.length} 项异常标本资料。</strong>
                  <span>其余正常标本仍正常显示；异常卡片已保留恢复提示，核对原始资料后可移出标本集，或重新采集对应节点。</span>
                </div>
              `
                  : ''
              }
              <div class="specimens-grid">
                ${specimens
                  .map(
                    s => `
                  <div class="specimen-card ${s.recovery ? 'specimen-card-damaged' : ''}">
                    <div class="specimen-card-tags">
                      <span class="specimen-tag">标本领域 · ${esc(s.butterflyTag)}</span>
                      ${s.recovery ? `<span class="specimen-recovery-tag">${s.recovery.status === 'quarantined' ? '隔离区恢复' : '已自动修复'}</span>` : ''}
                    </div>
                    <div class="specimen-title">${esc(s.title)}</div>
                    <div class="specimen-quote">${esc(s.quote)}</div>
                    ${
                      s.recovery
                        ? `
                      <div class="specimen-recovery-notice">
                        <div class="specimen-recovery-title">恢复提示 · ${esc(s.recovery.recoveredAt)}</div>
                        <ul>
                          ${s.recovery.issues.map(issue => `<li>${esc(issue)}</li>`).join('')}
                        </ul>
                        ${
                          s.recovery.source
                            ? `<div class="specimen-recovery-source">来源：${esc(s.recovery.source)}</div>`
                            : ''
                        }
                        <details>
                          <summary>查看保留的原始资料</summary>
                          <pre>${esc(formatRecoveryRaw(s.recovery.raw))}</pre>
                        </details>
                      </div>
                    `
                        : ''
                    }
                    <div class="specimen-path">
                      <strong>演化因果链：</strong><br />
                      ${s.pathWay.map(p => `↳ ${esc(p)}`).join('<br />')}
                    </div>
                    <div class="specimen-footer">
                      <span>采集时空：${esc(s.harvestedAt)}</span>
                      <button class="btn-del-specimen" data-delid="${esc(s.id)}">移出标本集</button>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div style="text-align:right;margin-top:24px;">
                <button class="cabinet-btn" onclick="window.print()">🖨️ 导出 / 打印标本图册</button>
              </div>
            `
            }
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  // Attach event listeners
  container.querySelector('#btnOpenCabinet')?.addEventListener('click', () => handlers.onToggleCabinet(true));
  container.querySelector('#btnCloseCabinet')?.addEventListener('click', () => handlers.onToggleCabinet(false));
  container.querySelector('#cabinetOverlay')?.addEventListener('click', e => {
    if (e.target === container.querySelector('#cabinetOverlay')) {
      handlers.onToggleCabinet(false);
    }
  });

  const inputEl = container.querySelector('#assumptionInput') as HTMLInputElement;
  const triggerGrow = () => {
    const val = inputEl.value.trim();
    if (val) handlers.onGrowNewTree(val);
  };

  container.querySelector('#btnGrowTree')?.addEventListener('click', triggerGrow);
  inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerGrow();
  });

  container.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      if (preset) {
        inputEl.value = preset;
        handlers.onGrowNewTree(preset);
      }
    });
  });

  // Action buttons on nodes
  container.querySelectorAll('.btn-water').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onWaterNode(id);
    });
  });

  container.querySelectorAll('.btn-prune').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onPruneNode(id);
    });
  });

  container.querySelectorAll('.btn-harvest').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onHarvestNode(id);
    });
  });

  container.querySelectorAll('.btn-del-specimen').forEach(btn => {
    btn.addEventListener('click', () => {
      const delId = btn.getAttribute('data-delid');
      if (delId) handlers.onDeleteSpecimen(delId);
    });
  });
}
