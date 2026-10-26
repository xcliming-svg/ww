/** @template T @param {T} data @returns {import('../model/contracts.js').Result<T>} */
export const success = data => ({ ok: true, data });
/** @param {string} errorCode @param {Record<string,string|number>} [params] @returns {{ok:false,errorCode:string,messageKey:string,params:Record<string,string|number>}} */
export const failure = (errorCode, params = {}) => ({ ok: false, errorCode, messageKey: `error.${errorCode}`, params });
/** @param {unknown} value @returns {value is number} */
export const isAmount = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
