import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, relative, sep } from "node:path";
import { watch, readdirSync, statSync } from "node:fs";
createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    // width: 800,
    width: 1200,
    // minWidth: 800,
    // height: 600,
    height: 800,
    // minHeight: 600,
    center: true,
    movable: true,
    roundedCorners: true,
    // backgroundMaterial: 'acrylic',
    // transparent: true,
    maximizable: true,
    icon: join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: join(__dirname, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", function() {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.openDevTools({
    mode: "right"
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", function() {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (!BrowserWindow.getAllWindows().length) {
    createWindow();
  }
});
app.whenReady().then(createWindow).then(function() {
  Menu.setApplicationMenu(null);
  ipcMain.on("monitor-changes", async function(event) {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });
    if (canceled) return;
    const [folderPath] = filePaths;
    const allFilePaths = useFilePaths(folderPath);
    watch(folderPath, (eventType, filename) => {
      console.log("File changed:", filename);
      console.log("Event type:", eventType);
      const updatedPaths = useFilePaths(folderPath);
      event.sender.send("monitor-changes", updatedPaths);
    });
    event.sender.send("monitor-changes", folderPath, allFilePaths);
  });
});
function useFilePaths(basePath) {
  const results = [];
  const baseFolder = basename(basePath);
  function traverse(dirPath) {
    const dirs = readdirSync(dirPath);
    for (const file of dirs) {
      const fullPath = join(dirPath, file);
      const stat = statSync(fullPath);
      const isDirectory = stat.isDirectory();
      if (isDirectory) traverse(fullPath);
      else {
        const relativePath = relative(basePath, fullPath);
        results.push(`${baseFolder}/${relativePath.split(sep).join("/")}`);
      }
    }
  }
  traverse(basePath);
  return results;
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
