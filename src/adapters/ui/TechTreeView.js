import { el, button } from './elements.js';
import { getVisibleTech } from '../../domain/tech/TechVisibility.js';
import hints from '../../../data/tech/layout-hints.json';
import layout from '../../../data/ui/layout.json';
import filters from '../../../data/ui/unit-filters.json';
import balance from '../../infrastructure/BalanceConfig.js';
export class TechTreeView {
  zoom = layout.zoomInitial; host = el('section', '', 'tree-panel'); viewport = el('div', '', 'tree-viewport'); world = el('div', '', 'tree-world'); space = el('div', '', 'tree-space');
  abort = new AbortController(); initialized = false;
  filterId = 'all';
  /** @param {import('../../application/GameCoordinator.js').GameCoordinator} app @param {(key:string,params?:Record<string,string|number>)=>string} t */
  constructor(app, t) {
    this.app = app; this.t = t; const bar = el('div', '', 'panel-heading');
    bar.append(el('h2', t('tree.title')), button(t('tree.zoomOut'), () => this.setZoom(this.zoom - layout.zoomStep)), button(t('tree.zoomIn'), () => this.setZoom(this.zoom + layout.zoomStep)), button(t('tree.center'), () => this.center('hq')));
    const filter = el('select'); const filterLabel = el('label', t('tree.filter'));
    for (const item of filters) { const option = el('option', t(item.labelKey)); option.value = item.id; filter.append(option); }
    filter.addEventListener('change', () => { this.filterId = filter.value; this.render(); }, { signal: this.abort.signal }); filterLabel.append(filter); bar.append(filterLabel);
    this.space.append(this.world); this.viewport.append(this.space); this.host.append(bar, el('p', t('tree.hint'), 'hint'), this.viewport);
    this.viewport.addEventListener('wheel', event => { event.preventDefault(); const rect = this.viewport.getBoundingClientRect(); this.setZoom(this.zoom + (event.deltaY > 0 ? -layout.zoomStep : layout.zoomStep), event.clientX - rect.left, event.clientY - rect.top); }, { passive: false, signal: this.abort.signal });
    let drag = false, x = 0, y = 0;
    this.viewport.addEventListener('pointerdown', event => { if (event.target instanceof Element && event.target.closest('button')) return; drag = true; x = event.clientX; y = event.clientY; this.viewport.setPointerCapture(event.pointerId); }, { signal: this.abort.signal });
    this.viewport.addEventListener('pointermove', event => { if (!drag) return; this.viewport.scrollLeft -= event.clientX - x; this.viewport.scrollTop -= event.clientY - y; x = event.clientX; y = event.clientY; }, { signal: this.abort.signal });
    this.viewport.addEventListener('pointerup', () => { drag = false; }, { signal: this.abort.signal });
    this.viewport.addEventListener('pointercancel', () => { drag = false; }, { signal: this.abort.signal });
    this.setZoom(this.zoom);
  }
  /** @param {number} zoom @param {number} [x] @param {number} [y] */
  setZoom(zoom, x = this.viewport.clientWidth / 2, y = this.viewport.clientHeight / 2) {
    const next = Math.min(layout.zoomMax, Math.max(layout.zoomMin, zoom)); const ratio = next / this.zoom;
    const left = (this.viewport.scrollLeft + x) * ratio - x; const top = (this.viewport.scrollTop + y) * ratio - y;
    this.zoom = next; this.world.style.transform = `scale(${next})`; this.world.style.width = `${hints.width}px`; this.world.style.height = `${hints.height}px`;
    this.space.style.width = `${hints.width * next}px`; this.space.style.height = `${hints.height * next}px`; this.viewport.scrollLeft = left; this.viewport.scrollTop = top;
  }
  /** @param {string} id */ center(id) { const p = /** @type {Record<string,{x:number,y:number}>} */ (hints.positions)[id]; if (!p) return; this.viewport.scrollLeft = (p.x + hints.nodeWidth / 2) * this.zoom - this.viewport.clientWidth / 2; this.viewport.scrollTop = (p.y + hints.nodeHeight / 2) * this.zoom - this.viewport.clientHeight / 2; }
  render() {
    if (!this.app.state) return; const selected = document.activeElement?.id;
    this.world.replaceChildren(); const filter = filters.find(f => f.id === this.filterId) ?? filters[0];
    const visible = getVisibleTech(this.app.config, this.app.state).filter(v => {
      if (v.node.kind !== 'unit' || filter.targetClass === null) return true;
      const stats = /** @type {Record<string,typeof balance.units.rifle>} */ (balance.units)[v.node.id];
      return v.status !== 'locked' && stats && (/** @type {Record<string,number>} */ (stats.modifiers)[filter.targetClass] ?? 0) >= filter.minimumModifier;
    }); const ids = new Set(visible.map(v => v.node.id));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', String(hints.width)); svg.setAttribute('height', String(hints.height)); svg.setAttribute('aria-hidden', 'true');
    const positions = /** @type {Record<string,{x:number,y:number}>} */ (hints.positions);
    for (const { node } of visible) for (const parent of [...node.parentIds, ...(hints.rootLinks.includes(node.id) ? ['hq'] : [])]) {
      if (!ids.has(parent)) continue; const a = positions[parent], b = positions[node.id];
      const line = document.createElementNS(svg.namespaceURI, 'path'); line.setAttribute('d', `M${a.x + hints.nodeWidth / 2},${a.y} V${(a.y + b.y + hints.nodeHeight) / 2} H${b.x + hints.nodeWidth / 2} V${b.y + hints.nodeHeight}`); line.setAttribute('class', parent === 'hq' ? 'tree-link affiliation' : 'tree-link'); svg.append(line);
    }
    this.world.append(svg);
    for (const { node, status, isNew } of visible) {
      const b = button('', () => this.app.selectNode(node.id)); b.id = `node-${node.id}`; b.className = `tech-node ${node.kind} ${status}${node.id === this.app.selectedId ? ' selected' : ''}`;
      b.style.left = `${positions[node.id].x}px`; b.style.top = `${positions[node.id].y}px`; b.style.width = `${hints.nodeWidth}px`; b.style.minHeight = `${hints.nodeHeight}px`;
      b.append(el('small', this.t(`kind.${node.kind}`)), el('strong', this.t(node.labelKey)), el('span', this.t(`status.${status}`)));
      if (isNew) b.append(el('em', this.t('ui.new')));
      b.setAttribute('aria-label', this.t('tree.select', { name: this.t(node.labelKey), status: this.t(`status.${status}`) }) + (isNew ? ' · ' + this.t('ui.new') : '')); this.world.append(b);
    }
    if (selected?.startsWith('node-')) document.getElementById(selected)?.focus({ preventScroll: true });
    if (!this.initialized) { this.initialized = true; requestAnimationFrame(() => this.center('barracks')); }
  }
  dispose() { this.abort.abort(); }
}
