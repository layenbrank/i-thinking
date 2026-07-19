# Findings: Studio 文档

## Source of truth
- IPC: `src/shared/ipc/{channels,contracts,schemas,result}.ts`
- Bridge: `src/preload/preload.ts` → `window.studio`
- Composition root: `src/main/bootstrap.ts`
- Paths (no import.meta.url): `src/main/paths.ts`
- Bin allowlist: corex.exe / generate.exe / service.exe
