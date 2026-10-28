/** @typedef {{readSave:(backup:boolean)=>Promise<string|null>,writeSave:(raw:string,preserveOriginal:boolean)=>Promise<void>,quit:()=>Promise<void>,onClose:(callback:()=>void)=>(()=>void)}} DesktopApi */
/** @returns {DesktopApi|undefined} */
export function getDesktop() {
  return /** @type {Window & {wwDesktop?:DesktopApi}} */ (window).wwDesktop;
}
/** @returns {import('../domain/model/contracts.js').SaveAdapter} */
export function createSaveAdapter() {
  const desktop = getDesktop();
  if (desktop)
    return {
      read: (backup = false) => desktop.readSave(backup),
      write: (raw, preserveOriginal) => desktop.writeSave(raw, preserveOriginal),
    };
  const key = 'ww.campaign.v1';
  return {
    read: async (backup = false) => localStorage.getItem(backup ? `${key}.backup` : key),
    write: async (raw, preserveOriginal) => {
      const old = localStorage.getItem(key);
      // Each setItem is atomic. Backup failure leaves the primary untouched.
      if (old !== null)
        localStorage.setItem(
          preserveOriginal ? `${key}.corrupt.${Date.now()}` : `${key}.backup`,
          old,
        );
      localStorage.setItem(key, raw);
    },
  };
}
