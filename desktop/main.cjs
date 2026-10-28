const { app, BrowserWindow, ipcMain, session, protocol, net } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const layout = require('../data/ui/layout.json');
const rules = require('../data/rules.json');
const locale = require('../locales/ko-KR.json');
/** @type {import('electron').BrowserWindow|null} */
let windowRef = null;
let allowClose = false;
/** @type {Promise<unknown>} */
let writeQueue = Promise.resolve();
const contentRoot = path.resolve(__dirname, '../dist');
const entryUrl = 'ww://game/index.html';
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ww',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);
/** @param {import('electron').IpcMainInvokeEvent} event */
function assertSender(event) {
  if (
    !windowRef ||
    event.sender !== windowRef.webContents ||
    event.senderFrame !== windowRef.webContents.mainFrame ||
    event.senderFrame?.url !== entryUrl
  )
    throw new Error('INVALID_SENDER');
}
app
  .whenReady()
  .then(() => {
    protocol.handle('ww', (request) => {
      const url = new URL(request.url);
      if (url.hostname !== 'game' || !['GET', 'HEAD'].includes(request.method))
        return new Response(null, { status: 403 });
      let decoded;
      try {
        decoded = decodeURIComponent(url.pathname);
      } catch {
        return new Response(null, { status: 400 });
      }
      const target = path.resolve(contentRoot, `.${decoded}`);
      const relative = path.relative(contentRoot, target);
      if (relative.startsWith('..') || path.isAbsolute(relative) || decoded.includes('\\'))
        return new Response(null, { status: 403 });
      return net.fetch(pathToFileURL(target).href);
    });
    const savePath = path.join(app.getPath('userData'), 'campaign-v1.json');
    ipcMain.handle('save:read', async (event, backup) => {
      assertSender(event);
      if (typeof backup !== 'boolean') throw new Error('INVALID_ARGUMENT');
      await writeQueue;
      try {
        const target = backup ? `${savePath}.bak` : savePath;
        if ((await fs.stat(target)).size > layout.saveMaxBytes) throw new Error('SAVE_TOO_LARGE');
        return await fs.readFile(target, 'utf8');
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
        throw error;
      }
    });
    ipcMain.handle('save:write', (event, raw, preserveOriginal) => {
      assertSender(event);
      if (
        typeof raw !== 'string' ||
        typeof preserveOriginal !== 'boolean' ||
        Buffer.byteLength(raw) > layout.saveMaxBytes
      )
        throw new Error('INVALID_ARGUMENT');
      const parsed = JSON.parse(raw);
      if (parsed?.schemaVersion !== rules.schemaVersion) throw new Error('INVALID_SAVE');
      const task = writeQueue.then(async () => {
        await fs.mkdir(path.dirname(savePath), { recursive: true });
        const temporary = `${savePath}.tmp`;
        const handle = await fs.open(temporary, 'w');
        try {
          await handle.writeFile(raw, 'utf8');
          await handle.sync();
        } finally {
          await handle.close();
        }
        try {
          await fs.copyFile(
            savePath,
            preserveOriginal ? `${savePath}.corrupt.${Date.now()}` : `${savePath}.bak`,
          );
        } catch (error) {
          if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
        }
        await fs.rename(temporary, savePath);
      });
      writeQueue = task.catch(() => undefined);
      return task;
    });
    ipcMain.handle('app:quit', async (event) => {
      assertSender(event);
      await writeQueue;
      allowClose = true;
      app.quit();
    });
    session.defaultSession.setPermissionRequestHandler((_web, _permission, callback) =>
      callback(false),
    );
    session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
      callback({
        cancel: !['ww:', 'file:', 'data:', 'blob:'].some((s) => details.url.startsWith(s)),
      }),
    );
    windowRef = new BrowserWindow({
      width: layout.minWidth,
      height: layout.minHeight,
      minWidth: layout.minWidth,
      minHeight: layout.minHeight,
      title: locale['app.title'],
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    windowRef.removeMenu();
    windowRef.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    windowRef.webContents.on('will-navigate', (event) => event.preventDefault());
    windowRef.webContents.on('will-attach-webview', (event) => event.preventDefault());
    windowRef.on('close', (event) => {
      if (!allowClose) {
        event.preventDefault();
        windowRef?.webContents.send('app:close-request');
      }
    });
    windowRef.once('ready-to-show', () => windowRef?.show());
    windowRef.loadURL(entryUrl).catch((error) => {
      console.error(error);
      allowClose = true;
      app.quit();
    });
  })
  .catch((error) => {
    console.error(error);
    app.quit();
  });
app.on('window-all-closed', () => app.quit());
