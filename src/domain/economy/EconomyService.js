import { success, failure, isAmount } from '../util/Result.js';
import { isDone, isUnlocked, revealChildren } from '../tech/TechGraph.js';
import { sameCell, usableCell } from '../waves/FormationService.js';
import { validateState } from '../model/GameState.js';
import { quoteRefund, applyRefund } from './RefundService.js';
/** Every accepted command produces one immutable state. No renderer or storage side effects.
 * @param {import('../model/contracts.js').GameState} state
 * @param {import('../model/contracts.js').PreparationCommand} command
 * @param {import('../model/contracts.js').DomainConfig} config
 * @returns {import('../model/contracts.js').Result<import('../model/contracts.js').GameState>} */
export function dispatchPreparationCommand(state, command, config) {
  if (!validateState(state, config)) return failure('INVALID_STATE');
  if (!command || typeof command.commandId !== 'string' || !command.commandId.trim())
    return failure('INVALID_COMMAND');
  if (state.phase !== 'preparation') return failure('PHASE_LOCKED');
  if (state.commandIds.includes(command.commandId)) return failure('DUPLICATE_COMMAND');
  const next = structuredClone(state);
  const node = config.nodes.find((n) => n.id === command.nodeId);
  const instance = next.placements.find((p) => p.instanceId === command.instanceId);
  /** @param {number|null|undefined} amount */
  function spend(amount) {
    if (!isAmount(amount) || !isAmount(next.supplies)) return failure('BALANCE_UNRESOLVED');
    if (next.supplies < amount) return failure('INSUFFICIENT_SUPPLIES');
    next.supplies -= amount;
    return success(amount);
  }
  switch (command.type) {
    case 'refund': {
      if (!command.nodeId) return failure('INVALID_COMMAND');
      const quote = quoteRefund(state, command.nodeId, config, command.profileId);
      if (!quote.ok) return quote;
      if (command.refundToken !== quote.data.token) return failure('REFUND_CHANGED');
      applyRefund(next, quote.data);
      break;
    }
    case 'acknowledge':
      if (!node) return failure('UNKNOWN_NODE');
      if (!next.revealedNodeIds.includes(node.id) || !isUnlocked(node, state, config.nodes))
        return failure('LOCKED');
      if (!next.acknowledgedNodeIds.includes(node.id)) next.acknowledgedNodeIds.push(node.id);
      break;
    case 'build':
    case 'research':
    case 'place':
    case 'upgrade': {
      if (!node) return failure('UNKNOWN_NODE');
      if (!next.revealedNodeIds.includes(node.id) || !isUnlocked(node, state, config.nodes))
        return failure('LOCKED');
      if (command.type === 'build' || command.type === 'research') {
        if (
          !(command.type === 'build'
            ? ['hq', 'building'].includes(node.kind)
            : node.kind === 'research')
        )
          return failure('INVALID_COMMAND');
        if (isDone(node, state)) return failure('ALREADY_DONE');
        const debit = spend(config.costs[node.id]);
        if (!debit.ok) return debit;
        (command.type === 'build' ? next.buildingIds : next.researchIds).push(node.id);
        revealChildren(next, node.id, config.nodes);
        const kind = command.type === 'build' ? 'building' : 'research';
        next.investments.push({
          id: `${kind}:${node.id}`,
          kind,
          nodeId: node.id,
          profileId: null,
          level: 0,
          paidCost: debit.data,
        });
      } else if (command.type === 'place') {
        if (node.kind !== 'unit') return failure('INVALID_COMMAND');
        const cell =
          command.cell ??
          config.layouts[state.formationStage]?.find(
            (c) =>
              !sameCell(c, config.rules.hq) && !state.placements.some((p) => sameCell(p.cell, c)),
          );
        if (!cell || !usableCell(config, state.formationStage, cell))
          return failure('INVALID_CELL');
        if (state.placements.some((p) => sameCell(p.cell, cell))) return failure('OCCUPIED');
        const debit = spend(config.costs[node.id]);
        if (!debit.ok) return debit;
        next.placements.push({
          instanceId: command.commandId,
          unitId: node.id,
          cell: { ...cell },
          paidCost: debit.data,
        });
      } else {
        if (node.kind !== 'unit' && !isDone(node, state)) return failure('LOCKED');
        const profile = config.upgrades.find(
          (p) => p.id === command.profileId && (p.nodeKinds ?? ['unit']).includes(node.kind),
        );
        if (!profile) return failure('INVALID_COMMAND');
        if (!profile.costs || !profile.multipliers) return failure('BALANCE_UNRESOLVED');
        const levels = next.upgradeLevels[node.id] ?? {};
        const level = levels[profile.id] ?? 0;
        if (level >= profile.costs.length) return failure('MAX_UPGRADE');
        const base = config.costs[node.id];
        if (!isAmount(base)) return failure('BALANCE_UNRESOLVED');
        const debit = spend(Math.ceil(base * profile.costs[level]));
        if (!debit.ok) return debit;
        next.upgradeLevels[node.id] = { ...levels, [profile.id]: level + 1 };
        next.investments.push({
          id: `upgrade:${node.id}:${profile.id}:${level + 1}`,
          kind: 'upgrade',
          nodeId: node.id,
          profileId: profile.id,
          level: level + 1,
          paidCost: debit.data,
        });
      }
      break;
    }
    case 'cancel':
      if (!instance) return failure('UNKNOWN_PLACEMENT');
      if (!isAmount(next.supplies)) return failure('BALANCE_UNRESOLVED');
      if (!isAmount(next.supplies + instance.paidCost)) return failure('OVERFLOW');
      next.supplies += instance.paidCost;
      next.placements = next.placements.filter((p) => p.instanceId !== instance.instanceId);
      break;
    case 'move':
      if (!instance) return failure('UNKNOWN_PLACEMENT');
      if (!command.cell || !usableCell(config, state.formationStage, command.cell))
        return failure('INVALID_CELL');
      if (next.placements.some((p) => command.cell && sameCell(p.cell, command.cell)))
        return failure('OCCUPIED');
      instance.cell = { ...command.cell };
      break;
    case 'swap': {
      const other = next.placements.find((p) => p.instanceId === command.otherId);
      if (!instance || !other || instance === other) return failure('UNKNOWN_PLACEMENT');
      [instance.cell, other.cell] = [other.cell, instance.cell];
      break;
    }
    default:
      return failure('INVALID_COMMAND');
  }
  next.commandIds.push(command.commandId);
  return validateState(next, config) ? success(next) : failure('INVALID_STATE');
}
