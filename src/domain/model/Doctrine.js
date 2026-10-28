import { success, failure } from '../util/Result.js';
// 52-week candidate doctrine values from G; no old G rank multipliers.
/** @type {Record<'primary'|'secondary',{id:string,minWave:number,modifiers:Record<string,{hp?:number,damage?:number,armorModifier?:number,airModifier?:number}>}[]>} */
export const doctrineChoices = {
  "primary": [
    {
      "id": "artillery",
      "minWave": 10,
      "modifiers": {
        "mortar": {
          "damage": 1.2
        },
        "gun": {
          "damage": 1.2
        },
        "at": {
          "damage": 1.07
        }
      }
    },
    {
      "id": "armor",
      "minWave": 10,
      "modifiers": {
        "at": {
          "hp": 1.16
        },
        "car": {
          "hp": 1.16,
          "damage": 1.08
        },
        "tank": {
          "hp": 1.16,
          "damage": 1.08
        },
        "heavy": {
          "hp": 1.16,
          "damage": 1.08
        },
        "destroyer": {
          "hp": 1.16,
          "damage": 1.08
        }
      }
    }
  ],
  "secondary": [
    {
      "id": "airDefense",
      "minWave": 38,
      "modifiers": {
        "fighter": {
          "airModifier": 1.35
        },
        "mg": {
          "airModifier": 1.5
        }
      }
    },
    {
      "id": "antiArmor",
      "minWave": 38,
      "modifiers": {
        "at": {
          "armorModifier": 1.3
        },
        "destroyer": {
          "armorModifier": 1.3
        },
        "gun": {
          "armorModifier": 1.15
        }
      }
    },
    {
      "id": "fortification",
      "minWave": 38,
      "modifiers": {
        "ALL": {
          "hp": 1.12
        },
        "HQ": {
          "hp": 1.12
        }
      }
    }
  ]
};
export const doctrineWaves = { primary: 10, secondary: 38 };
/** @param {'primary'|'secondary'} slot @param {string|null} id */
export function isDoctrineChoice(slot, id) {
  return id === null || doctrineChoices[slot]?.some(choice => choice.id === id) === true;
}
/** @param {import('./contracts.js').GameState} state @param {'primary'|'secondary'} slot @param {string} id */
export function chooseDoctrine(state, slot, id) {
  if (state.phase !== 'preparation' || state.mode !== 'campaign') return failure('PHASE_LOCKED');
  if (!Object.hasOwn(doctrineWaves, slot) || state.wave < doctrineWaves[slot] ||
    !isDoctrineChoice(slot, id) || id === null) return failure('LOCKED');
  if (!state.doctrines || state.doctrines[slot] !== null) return failure('ALREADY_DONE');
  const next = structuredClone(state);
  next.doctrines[slot] = id;
  if (id === 'fortification') next.hqHp = 504;
  return success(next);
}
/** @param {{primary:string|null,secondary:string|null}|undefined} selected @param {string} unitId */
export function doctrineMultipliers(selected, unitId) {
  const bonuses = { hp: 1, damage: 1, armor: 1, aircraft: 1 };
  for (const slot of /** @type {const} */ (['primary','secondary'])) {
    const choice = doctrineChoices[slot].find(c => c.id === selected?.[slot]);
    const modifier = choice?.modifiers[unitId] ?? choice?.modifiers.ALL;
    if (!modifier) continue;
    bonuses.hp *= modifier.hp ?? 1;
    bonuses.damage *= modifier.damage ?? 1;
    bonuses.armor *= modifier.armorModifier ?? 1;
    bonuses.aircraft *= modifier.airModifier ?? 1;
  }
  return bonuses;
}
/** @param {{primary:string|null,secondary:string|null}|undefined} selected */
export const maxHqHp = selected => selected?.secondary === 'fortification' ? 504 : 450;
