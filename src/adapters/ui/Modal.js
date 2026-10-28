import { el, button } from './elements.js';
/** @param {HTMLElement} host @param {string} title @param {HTMLElement} content @param {(key:string,params?:Record<string,string|number>)=>string} t */
export function openModal(host, title, content, t) {
  const previous = document.activeElement;
  const dialog = el('dialog');
  const heading = el('h2', title);
  const previousId = previous instanceof HTMLElement ? previous.id : '';
  heading.id = 'modal-heading';
  dialog.setAttribute('aria-labelledby', heading.id);
  dialog.append(
    heading,
    content,
    button(t('ui.close'), () => dialog.close()),
  );
  host.append(dialog);
  dialog.addEventListener(
    'close',
    () => {
      dialog.remove();
      const replacement = previousId ? document.getElementById(previousId) : null;
      const candidates = [
        previous,
        replacement,
        ...(host.parentElement?.querySelectorAll(
          '.tech-node.selected, .battle-controls button:not(:disabled), .title-screen button:not(:disabled)',
        ) ?? []),
      ];
      const target = candidates.find(
        (e) => e instanceof HTMLElement && e.isConnected && e.getClientRects().length,
      );
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    },
    { once: true },
  );
  dialog.showModal();
  return dialog;
}
