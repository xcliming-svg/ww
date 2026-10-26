/** @template {keyof HTMLElementTagNameMap} K @param {K} tag @param {string} [text] @param {string} [className] @returns {HTMLElementTagNameMap[K]} */
export function el(tag, text = '', className = '') { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; }
/** @param {string} text @param {()=>void} onClick @param {boolean} [disabled] */
export function button(text, onClick, disabled = false) { const node = el('button', text); node.type = 'button'; node.disabled = disabled; node.addEventListener('click', onClick); return node; }
