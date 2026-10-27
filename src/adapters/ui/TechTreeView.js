import { el, button } from './elements.js';
import { getVisibleTech } from '../../domain/tech/TechVisibility.js';
import hints from '../../../data/tech/layout-hints.json';
import layout from '../../../data/ui/layout.json';
import filters from '../../../data/ui/unit-filters.json';
import balance from '../../infrastructure/ImplementationBalanceConfig.js';

/** Technology canvas: wheel zoom, captured node/background drag, click vs pan threshold. */
export class TechTreeView {
  zoom = layout.zoomInitial;
  host = el('section', '', 'tree-panel');
  viewport = el('div', '', 'tree-viewport');
  world = el('div', '', 'tree-world');
  space = el('div', '', 'tree-space');
  abort = new AbortController();
  initialized = false;
  filterId = 'all';
  /** @type {{pointerId:number,x:number,y:number,lastX:number,lastY:number,moved:boolean,nodeId:string|null}|null} */
  gesture = null;
  /** @param {import('../../application/GameCoordinator.js').GameCoordinator} app
   * @param {(key:string,params?:Record<string,string|number>)=>string} t
   * @param {(id:string)=>void} onSelect */
  constructor(app, t, onSelect) {
    this.app = app; this.t = t; this.onSelect = onSelect;
    const heading = el('div', '', 'panel-heading');
    heading.append(el('h2', t('tree.title')), button(t('tree.zoomOut'), () => this.setZoom(this.zoom - layout.zoomStep)),
      button(t('tree.zoomIn'), () => this.setZoom(this.zoom + layout.zoomStep)), button(t('tree.center'), () => this.center('hq')));
    const filter = el('select'), filterLabel = el('label', t('tree.filter'));
    for (const f of filters) { const opt = el('option', t(f.labelKey)); opt.value = f.id; filter.append(opt); }
    filter.addEventListener('change', () => { this.filterId = filter.value; this.render(); }, { signal: this.abort.signal });
    filterLabel.append(filter); heading.append(filterLabel);
    this.space.append(this.world); this.viewport.append(this.space);
    this.host.append(heading, el('p', t('tree.hint'), 'hint'), this.viewport);
    this.viewport.addEventListener('wheel', e => {
      e.preventDefault(); const rect = this.viewport.getBoundingClientRect();
      this.setZoom(this.zoom + (e.deltaY > 0 ? -layout.zoomStep : layout.zoomStep), e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false, signal: this.abort.signal });
    this.viewport.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const node = e.target instanceof Element ? e.target.closest('.tech-node') : null;
      this.gesture = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false, nodeId: node?.getAttribute('data-node-id') ?? null };
      this.viewport.setPointerCapture(e.pointerId);
    }, { signal: this.abort.signal });
    this.viewport.addEventListener('pointermove', e => {
      const g = this.gesture; if (!g || g.pointerId !== e.pointerId) return;
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > layout.dragThresholdPx) g.moved = true;
      if (g.moved) {
        this.viewport.scrollLeft -= e.clientX - g.lastX;
        this.viewport.scrollTop -= e.clientY - g.lastY;
      }
      g.lastX = e.clientX; g.lastY = e.clientY;
    }, { signal: this.abort.signal });
    this.viewport.addEventListener('pointerup', e => {
      const g = this.gesture; if (!g || g.pointerId !== e.pointerId) return;
      this.gesture = null;
      if (this.viewport.hasPointerCapture(e.pointerId)) this.viewport.releasePointerCapture(e.pointerId);
      if (!g.moved && g.nodeId) this.onSelect(g.nodeId);
    }, { signal: this.abort.signal });
    for (const type of ['pointercancel', 'lostpointercapture']) this.viewport.addEventListener(type, () => { this.gesture = null; }, { signal: this.abort.signal });
    this.setZoom(this.zoom);
  }
  /** @param {number} zoom @param {number} [x] @param {number} [y] */
  setZoom(zoom, x = this.viewport.clientWidth / 2, y = this.viewport.clientHeight / 2) {
    const next = Math.max(layout.zoomMin, Math.min(layout.zoomMax, zoom));
    const ratio = next / this.zoom;
    const left = (this.viewport.scrollLeft + x) * ratio - x, top = (this.viewport.scrollTop + y) * ratio - y;
    this.zoom = next; this.world.style.transform = `scale(${next})`;
    this.world.style.width = `${hints.width}px`; this.world.style.height = `${hints.height}px`;
    this.space.style.width = `${hints.width * next}px`; this.space.style.height = `${hints.height * next}px`;
    this.viewport.scrollLeft = left; this.viewport.scrollTop = top;
  }
  /** @param {string} id */
  center(id) {
    const p = /** @type {Record<string,{x:number,y:number}>} */ (hints.positions)[id];
    if (!p) return;
    this.viewport.scrollLeft = (p.x + hints.nodeWidth / 2) * this.zoom - this.viewport.clientWidth / 2;
    this.viewport.scrollTop = (p.y + hints.nodeHeight / 2) * this.zoom - this.viewport.clientHeight / 2;
  }
  render() {
    if (!this.app.state) return;
    const selected = document.activeElement?.id;
    this.world.replaceChildren();
    const filter = filters.find(f => f.id === this.filterId) ?? filters[0];
    const visible = getVisibleTech(this.app.config, this.app.state).filter(v => {
      if (v.node.kind !== 'unit' || filter.targetClass === null) return true;
      const stats = /** @type {Record<string,typeof balance.units.rifle>} */ (balance.units)[v.node.id];
      return v.status !== 'locked' && !!stats && (/** @type {Record<string,number>} */ (stats.modifiers)[filter.targetClass] ?? 0) >= filter.minimumModifier;
    });
    const ids = new Set(visible.map(v => v.node.id));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(hints.width)); svg.setAttribute('height', String(hints.height)); svg.setAttribute('aria-hidden', 'true');
    const positions = /** @type {Record<string,{x:number,y:number}>} */ (hints.positions);
    for (const { node } of visible) for (const parent of new Set([...node.parentIds, ...node.revealParentIds])) {
      if (!ids.has(parent)) continue;
      const a = positions[parent], b = positions[node.id];
      const link = document.createElementNS(svg.namespaceURI, 'path');
      link.setAttribute('d', `M${a.x + hints.nodeWidth / 2},${a.y} V${(a.y + b.y + hints.nodeHeight) / 2} H${b.x + hints.nodeWidth / 2} V${b.y + hints.nodeHeight}`);
      link.setAttribute('class', node.parentIds.includes(parent) ? 'tree-link' : 'tree-link affiliation'); svg.append(link);
    }
    this.world.append(svg);
    for (const { node, status, isNew } of visible) {
      const b = button('', () => { /* Pointer selection handled on pointerup; keyboard below. */ });
      b.addEventListener('click', e => { if (e.detail === 0) this.onSelect(node.id); });
      b.id = `node-${node.id}`; b.setAttribute('data-node-id', node.id);
      b.className = `tech-node ${node.kind} ${status}${node.id === this.app.selectedId ? ' selected' : ''}`;
      b.style.left = `${positions[node.id].x}px`; b.style.top = `${positions[node.id].y}px`;
      b.style.width = `${hints.nodeWidth}px`; b.style.height = `${hints.nodeHeight}px`;
      b.append(el('small', this.t(`kind.${node.kind}`)), el('strong', this.t(node.labelKey)), el('span', this.t(`status.${status}`)));
      if (status === 'locked') { const lock = el('em', '🔒', 'lock-icon'); lock.setAttribute('aria-hidden', 'true'); b.append(lock); }
      if (node.kind !== 'hq' && isNew) b.append(el('em', this.t('ui.new')));
      b.setAttribute('aria-label', this.t('tree.select', { name: this.t(node.labelKey), status: this.t(`status.${status}`) }) + (isNew ? ' · ' + this.t('ui.new') : ''));
      this.world.append(b);
    }
    if (selected?.startsWith('node-')) document.getElementById(selected)?.focus({ preventScroll: true });
    if (!this.initialized) { this.initialized = true; requestAnimationFrame(() => this.center('hq')); }
  }
  dispose() { this.abort.abort(); }
}
