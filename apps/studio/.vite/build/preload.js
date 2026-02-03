"use strict";
const electron = require("electron");
const store = {
  get(key) {
    return electron.ipcRenderer.invoke("store:get", key);
  },
  set(key, value) {
    return electron.ipcRenderer.invoke("store:set", key, value);
  },
  has(key) {
    return electron.ipcRenderer.invoke("store:has", key);
  },
  delete(key) {
    return electron.ipcRenderer.invoke("store:delete", key);
  },
  clear() {
    return electron.ipcRenderer.invoke("store:clear");
  },
  keys() {
    return electron.ipcRenderer.invoke("store:keys");
  }
};
const dialog = {
  open(options) {
    return electron.ipcRenderer.invoke("dialog:open", options);
  },
  save(options) {
    return electron.ipcRenderer.invoke("dialog:save", options);
  }
};
const app = {
  onMessage(callback) {
    function handler(_, payload) {
      callback(payload);
    }
    electron.ipcRenderer.on("main-process-message", handler);
    return function() {
      electron.ipcRenderer.removeListener("main-process-message", handler);
    };
  }
};
const database = {
  query(sql, params) {
    return electron.ipcRenderer.invoke("db:query", sql, params ?? []);
  },
  execute(sql, params) {
    return electron.ipcRenderer.invoke("db:execute", sql, params ?? []);
  },
  close() {
    return electron.ipcRenderer.invoke("db:close");
  }
};
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, function(event, ...a) {
      listener(event, ...a);
    });
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  store,
  dialog,
  app,
  database
});
