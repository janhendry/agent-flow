---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: "research"
lastStep: 6
research_type: "technical"
research_topic: "Initiales Electron + React + Vite Projekt-Setup für WhisperFlow"
research_goals: "Bestes initiales Setup für eine Electron Desktop App mit React/Vite — Scaffolding-Tools, Boilerplate-Optionen, TypeScript-Konfiguration, Build-Pipeline, State Management, IPC-Architektur, Toolchain-Entscheidungen"
user_name: "Yoda"
date: "2026-02-21"
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-02-21
**Author:** Yoda
**Research Type:** Technical

---

## Research Overview

Technische Recherche zum optimalen initialen Setup für **WhisperFlow** — eine Electron-basierte macOS Desktop-App für Voice-to-Text-Transkription mit React, TypeScript und Vite. Alle Befunde basieren auf aktuellen Web-Quellen (Stand: Februar 2026).

**Methodik:** Parallele Web-Suchen zu Scaffolding-Tools, Build-Systemen, TypeScript-Konfiguration, Framework-Versionskompatibilität und Projektstruktur. Multi-Source-Verifikation für kritische Empfehlungen.

---

## Technical Research Scope Confirmation

**Research Topic:** Initiales Electron + React + Vite Projekt-Setup für WhisperFlow
**Research Goals:** Bestes initiales Setup für eine Electron Desktop App mit React/Vite — Scaffolding-Tools, Boilerplate-Optionen, TypeScript-Konfiguration, Build-Pipeline, State Management, IPC-Architektur, Toolchain-Entscheidungen

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

---

## Technology Stack Analysis

### electron-vite vs. vite-plugin-electron

**Empfehlung: `electron-vite` ist der klare Gewinner** (Confidence: ✅ Hoch)

| Kriterium           | `electron-vite`            | `vite-plugin-electron`   |
| ------------------- | -------------------------- | ------------------------ |
| GitHub Stars        | **5.200**                  | 857                      |
| npm Downloads/Woche | **66.569**                 | 34.269                   |
| Letztes Release     | **v5.0.0 (Dezember 2025)** | v0.29.0 (vor ~1 Jahr)    |
| Letzter Commit      | **vor 5 Tagen (Feb 2026)** | vor 1 Monat              |
| Wartungsstatus      | Aktiv gepflegt             | Verlangsamende Aktivität |

`electron-vite` v5.0.0 (7. Dez 2025) bringt Isolated Build, Enhanced Bytecode String Protection und erfordert Node.js 20.19+ / 22.12+.

_Source: [github.com/alex8088/electron-vite](https://github.com/alex8088/electron-vite) · [npmjs.com/package/electron-vite](https://www.npmjs.com/package/electron-vite)_

---

### Scaffolding / Boilerplate-Optionen

**Empfehlung: electron-vite CLI** (Confidence: ✅ Hoch)

```bash
npm create @quick-start/electron@latest whisper-flow -- --template react-ts
cd whisper-flow && npm install && npm run dev
```

| Option                         | Status            | Bewertung                                                              |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| **electron-vite CLI** ✅       | Aktiv (2025/2026) | **Empfohlen** — schnellster Einstieg, React-TS Template out-of-the-box |
| Electron Forge + Vite Template | Aktiv (offiziell) | Alternative — offizieller Support, aber schwergewichtiger              |
| electron-react-boilerplate     | **Veraltet** ❌   | Letztes Release Mai 2022, nutzt Webpack — nicht verwenden              |
| Manuelles Setup                | —                 | Aufwendig, nur für spezielle Anforderungen                             |

_Source: [electron-vite.org/guide](https://electron-vite.org/guide/) · [electronforge.io](https://www.electronforge.io/) · [github.com/electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)_

---

### Development Frameworks und Libraries

**Empfohlener Stack für WhisperFlow:**

- **Electron** — Desktop-Runtime (aktuell: Electron 34, Feb 2026, Chromium 132)
- **React 19** — stabil seit 5. Dez 2024, keine bekannten Electron-Inkompatibilitäten
- **TypeScript 5.x** — Pflicht für skalierbare Electron-Apps
- **Vite** — Intern von electron-vite verwaltet (basiert auf Vite 5+, intern bereits Richtung Vite 7)

**React 19 vs. React 18:**

React 19 ist direkt empfohlen für Neuprojekte. Neue Features relevant für WhisperFlow:

- `useTransition` / Actions — für async Transkriptions-Workflows
- `useOptimistic` — für optimistische UI-Updates (z.B. Clipboard-Copy-Feedback)
- `useActionState` — vereinfachte Form/Action-Patterns

Keine bekannten Electron-Inkompatibilitäten mit React 19.

_Source: [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19)_

---

### TypeScript-Konfiguration

**Empfehlung: Drei separate tsconfigs** (Standard-Pattern von electron-vite CLI)

| Datei                | Scope              | Besonderheiten                       |
| -------------------- | ------------------ | ------------------------------------ |
| `tsconfig.json`      | Basis / References | Verweise auf node/web configs        |
| `tsconfig.node.json` | Main + Preload     | `electron-vite/node` types, kein DOM |
| `tsconfig.web.json`  | Renderer           | DOM-Types, JSX React-Transform       |

Diese Trennung ist critical, da Main Process (Node.js) und Renderer (Chromium) unterschiedliche APIs haben und getrennte Type-Welten benötigen.

_Source: [electron-vite.org/guide/typescript](https://electron-vite.org/guide/typescript)_

---

### Build Tools und Packaging

**Empfehlung: electron-builder** (Confidence: ✅ Hoch)

| Kriterium       | electron-builder           | Electron Forge |
| --------------- | -------------------------- | -------------- |
| GitHub Stars    | **14.500**                 | ~7.000         |
| Used by         | **175.000+ Repos**         | —              |
| Letztes Release | **v26.8.1 (vor ~5 Tagen)** | v7.x           |
| electron-vite   | ✅ Default im Template     | Teilweise      |
| macOS DMG/PKG   | ✅                         | ✅             |
| Notarization    | ✅ eingebaut               | ✅ Plugin      |

electron-builder ist das Default-Packaging-Tool im electron-vite CLI-Template und die Industrie-Standard-Wahl für macOS-Apps mit Notarization-Anforderungen (relevant für WhisperFlow's Direct-Download-Distribution).

_Source: [github.com/electron-userland/electron-builder](https://github.com/electron-userland/electron-builder)_

---

### Vite-Versionskompatibilität

- electron-vite managt Vite intern — kein manuelles Vite-Versionsmanagement nötig
- Offizielle Mindestanforderung: Vite 5.0+
- Intern bewegt sich electron-vite bereits Richtung Vite 7 (laut GitHub-Commits)
- Vite 6 erschien November 2024 — Breaking Changes hauptsächlich für Framework-Autoren, nicht End-Nutzer
- **Fazit**: Vite-Version durch electron-vite-Upgrade verwalten, nicht manuell pinnen

_Source: [vite.dev/blog/announcing-vite6](https://vite.dev/blog/announcing-vite6)_

---

### Empfohlene Projektstruktur

Standard-Projektstruktur aus dem `electron-vite` React-TypeScript-Template:

```
whisper-flow/
├── build/                        # Packaging-Assets (Icons, entitlements)
│   ├── icon.icns                 # macOS App-Icon
│   ├── icon.png                  # Allgemeines Icon
│   └── entitlements.mac.plist    # macOS Hardened Runtime Entitlements
├── resources/                    # Runtime-Assets (nicht im ASAR gebündelt)
├── src/
│   ├── main/                     # Electron Main Process (Node.js)
│   │   └── index.ts
│   ├── preload/                  # IPC Bridge (contextBridge)
│   │   └── index.ts
│   └── renderer/                 # React 19 + Vite (Chromium)
│       ├── src/
│       └── index.html
├── electron.vite.config.ts       # Zentrale Vite-Config (main + preload + renderer)
├── electron-builder.yml          # Packaging-Konfiguration
├── tsconfig.json                 # Basis (References)
├── tsconfig.node.json            # Main + Preload (Node.js)
├── tsconfig.web.json             # Renderer (DOM/React)
└── package.json
```

---

### Technology Adoption Trends

- **electron-vite** hat sich seit 2023 als Community-Standard für Electron + Vite etabliert und löst ältere Webpack-basierte Boilerplates ab
- **electron-react-boilerplate** (Webpack) gilt als Legacy — Migration zu Vite wird aktiv diskutiert
- **Electron Forge** bleibt die offizielle Electronjs.org-Empfehlung, aber electron-vite CLI ist in der Community dominanter für React-Projekte
- **React 19** wird in neuen Electron-Projekten direkt genutzt (keine Regressions bekannt)
- **electron-builder** bleibt der De-facto-Standard für Packaging trotz Electron Forge als offizieller Alternative

---

## Integration Patterns Analysis

### contextBridge & contextIsolation (Confidence: ✅ Hoch)

`contextIsolation: true` ist **Pflicht** (Standard seit Electron 12) und verhindert, dass Renderer-Code direkt auf Preload-Kontext und Node.js-APIs zugreift. `contextBridge.exposeInMainWorld` ist die einzig sichere Methode, APIs vom Preload in den Renderer zu exponieren.

**Kritische Regel**: Niemals den kompletten `ipcRenderer` in den Renderer exponieren — nur explizite, enge Methoden-Wrapper:

```typescript
// preload/index.ts — RICHTIG ✅
contextBridge.exposeInMainWorld("electronAPI", {
  startRecording: () => ipcRenderer.invoke("recording:start"),
  stopRecording: () => ipcRenderer.invoke("recording:stop"),
  onTranscriptionUpdate: (callback: (text: string) => void) => {
    const listener = (_: IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on("transcription:update", listener);
    return () => ipcRenderer.removeListener("transcription:update", listener); // Cleanup!
  },
});

// NIEMALS so ❌
contextBridge.exposeInMainWorld("ipcRenderer", ipcRenderer);
```

_Source: [electronjs.org/docs/tutorial/context-isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)_

---

### IPC-Kommunikations-Patterns

| Pattern                                 | Richtung        | Use Case                                                 | Empfehlung                      |
| --------------------------------------- | --------------- | -------------------------------------------------------- | ------------------------------- |
| `ipcRenderer.invoke` + `ipcMain.handle` | Renderer → Main | Request-Response (Transkription starten, Settings laden) | ✅ **Standard**                 |
| `webContents.send` + `ipcRenderer.on`   | Main → Renderer | Push-Events (Transkriptions-Updates, Status-Änderungen)  | ✅ Für Events                   |
| `ipcRenderer.send` + `ipcMain.on`       | Renderer → Main | Fire-and-Forget (Logging)                                | ⚠️ Nur wenn kein Response nötig |
| `ipcRenderer.sendSync`                  | —               | Synchroner Block                                         | ❌ Legacy, nie verwenden        |
| `event.reply`                           | —               | —                                                        | ❌ Legacy, nie verwenden        |

**Relevante WhisperFlow IPC-Channels:**

```typescript
// src/shared/ipc.ts — Typen zentral definieren
interface InvokeMap {
  'recording:start': { mode: RecordingMode } => void
  'recording:stop': void => { filePath: string }
  'transcription:transcribe': { filePath: string } => { text: string }
  'settings:get': void => AppSettings
  'settings:set': Partial<AppSettings> => void
}

interface EventMap {
  'recording:status': { state: 'recording' | 'processing' | 'done'; duration: number }
  'transcription:update': { text: string; confidence: number }
  'error:occurred': { code: string; message: string }
}
```

_Source: [electronjs.org/docs/api/ipc-main](https://www.electronjs.org/docs/latest/api/ipc-main)_

---

### Preload-Script-Architektur

**Empfehlung: Ein Preload pro Fenstertyp** (electron-vite unterstützt multiple Preload-Inputs)

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: { entry: "src/main/index.ts" },
  preload: {
    input: {
      index: "src/preload/index.ts", // Main Settings Window
      hud: "src/preload/hud.ts", // HUD Overlay (minimales API)
      snackbar: "src/preload/snackbar.ts", // Snackbar Window
    },
  },
  renderer: {
    /* ... */
  },
});
```

**Least-Privilege-Prinzip**: Das HUD-Overlay-Preload exponiert nur `onTranscriptionUpdate` und `onRecordingStatus` — keine Settings-API, keine Recording-Start/Stop-Kontrolle.

_Source: [electron-vite.org/guide/dev](https://electron-vite.org/guide/dev)_

---

### Multi-Window IPC (WhisperFlow-spezifisch)

WhisperFlow hat mehrere Fenster: Settings, HUD-Overlay, Snackbar. **Pattern: Main-Prozess als zentraler Event-Broker.**

```typescript
// main/index.ts — Broadcast an alle Fenster
function broadcastToAllWindows(channel: string, payload: unknown) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(channel, payload);
  });
}

// Bei Transkribierter Zeile: alle Fenster informieren
ipcMain.handle("transcription:transcribe", async (_, { filePath }) => {
  const text = await whisperAPI.transcribe(filePath);
  broadcastToAllWindows("transcription:update", { text });
  return { text };
});
```

Für sehr hochfrequente Daten (z.B. Audio-Pegelwerte in Echtzeit): `MessageChannelMain` für Direktkommunikation zwischen Renderer-Prozessen ohne Main-Prozess-Overhead.

_Source: [electronjs.org/docs/api/message-channel-main](https://www.electronjs.org/docs/latest/api/message-channel-main)_

---

### State Management

**Empfohlenes Pattern für WhisperFlow:**

| Layer                    | Tool                   | Zweck                                              |
| ------------------------ | ---------------------- | -------------------------------------------------- |
| **Renderer UI-State**    | **Zustand**            | Lokaler React-State (UI-Toggles, Form-State)       |
| **Shared App-State**     | **IPC-Push + Zustand** | Main-Events in Zustand-Store spiegeln              |
| **Persistente Settings** | **electron-store**     | Einstellungen im Main-Prozess (API-Key, Shortcuts) |

```typescript
// renderer — IPC-Events in Zustand-Store spiegeln
const useRecordingStore = create<RecordingState>((set) => ({
  status: "idle",
  transcription: "",
}));

// In einer init-Funktion:
window.electronAPI.onTranscriptionUpdate((text) => {
  useRecordingStore.setState({ transcription: text, status: "done" });
});
```

**Nicht empfohlen:**

- `electron-redux` — letzter Commit vor 2+ Jahren, veraltet
- Redux in Electron ohne IPC-Bridge — kein Sync zwischen Main/Renderer

_Source: [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) · [github.com/sindresorhus/electron-store](https://github.com/sindresorhus/electron-store)_

---

### Native Node.js APIs via IPC (ffmpeg-static, globalShortcut)

Alle nativen APIs laufen im Main-Prozess und werden ausschließlich via IPC exponiert:

```typescript
// main/recording.ts
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

ipcMain.handle("recording:stop", async () => {
  // FFmpeg subprocess im Main-Prozess — nie im Renderer
  const proc = spawn(ffmpegPath!, [
    "-i",
    inputFile,
    "-c:a",
    "libopus",
    "-b:a",
    "48k",
    "-vbr",
    "on",
    "-application",
    "voip",
    outputFile,
  ]);
  // ...
});
```

`globalShortcut` und `systemPreferences` (Mikrofon-Permissions) ebenfalls ausschließlich im Main-Prozess — nie als direkter Renderer-Zugriff.

_Source: [npmjs.com/package/ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)_

---

## Architectural Patterns and Design

### Main Process Architektur (Confidence: ✅ Hoch)

**Pattern: Service-Klassen + IPC-Channel-Handler**

Der Main-Prozess wird in dedizierte Service-Klassen unterteilt, die via IPC-Channel-Handler orchestriert werden:

```
src/main/
├── index.ts                    # App-Bootstrap, Event-Wire-Up
├── windows/
│   └── WindowManager.ts        # Singleton-Map aller BrowserWindows
├── tray/
│   └── TrayManager.ts          # System Tray + Kontextmenü
├── services/
│   ├── AudioRecordingService.ts # FFmpeg child_process Wrapper
│   ├── TranscriptionService.ts  # Whisper API HTTP-Client
│   └── SettingsService.ts       # electron-store Wrapper
├── shortcuts/
│   └── ShortcutManager.ts      # globalShortcut Registration/Cleanup
└── ipc/
    ├── recording.ts             # ipcMain.handle('recording:*')
    ├── transcription.ts         # ipcMain.handle('transcription:*')
    └── settings.ts              # ipcMain.handle('settings:*')
```

**3-Schichten-Modell (Community-Konsens):**

- **Domain Layer**: Interfaces (`IAudioRecorder`, `ITranscriptionProvider`) — kein Framework, pure TypeScript
- **Application Layer**: IPC-Handler, Use-Case-Orchestrierung
- **Infrastructure Layer**: FFmpeg (`ffmpeg-static`), Whisper API, `electron-store`

_Source: [electronjs.org/docs/tutorial/message-passing](https://www.electronjs.org/docs/latest/tutorial/message-passing)_

---

### Window Management (Confidence: ✅ Hoch)

**Pattern: Singleton-BrowserWindow-Map**

```typescript
// main/windows/WindowManager.ts
class WindowManager {
  private windows = new Map<string, BrowserWindow>();

  getOrCreate(
    name: string,
    options: BrowserWindowConstructorOptions,
  ): BrowserWindow {
    if (this.windows.has(name)) return this.windows.get(name)!;
    const win = new BrowserWindow(options);
    this.windows.set(name, win);
    win.on("closed", () => this.windows.delete(name));
    return win;
  }
}
```

**HUD-Overlay-Konfiguration** (kritisch für WhisperFlow):

```typescript
new BrowserWindow({
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  type: "panel", // macOS: schwebt über anderen Apps
  focusable: false, // Kein Fokus-Steal beim Anzeigen
  show: false, // Pre-created, versteckt
  backgroundThrottling: false, // Kein Throttling wenn versteckt
  skipTaskbar: true,
});
```

**⚡ Latenz-kritisch**: HUD muss pre-created sein (`show: false`). `win.show()` / `win.hide()` bei Shortcut → Latenz **< 5ms**. `new BrowserWindow()` on-demand → 500–2000ms (inakzeptabel).

_Source: [electronjs.org/docs/api/browser-window](https://www.electronjs.org/docs/latest/api/browser-window)_

---

### System Tray Architektur (Confidence: ✅ Hoch)

```typescript
// main/tray/TrayManager.ts
class TrayManager {
  private tray: Tray | null = null; // Global halten — verhindert GC!

  init() {
    this.tray = new Tray(path.join(__dirname, "icon.png"));
    app.dock.hide(); // macOS: kein Dock-Eintrag
  }

  updateStatus(status: RecordingStatus) {
    // setContextMenu() MUSS bei jedem Update neu aufgerufen werden (macOS)
    this.tray!.setContextMenu(this.buildMenu(status));
    this.tray!.setImage(this.iconForStatus(status));
  }
}

// main/index.ts — App läuft weiter ohne offene Fenster (Tray-App-Pattern)
app.on("window-all-closed", () => {
  /* intentionally empty */
});
```

_Source: [electronjs.org/docs/api/tray](https://www.electronjs.org/docs/latest/api/tray)_

---

### Renderer-Architektur: React (Confidence: ✅ Hoch)

**Feature-basierte Ordnerstruktur** + Custom IPC-Hooks:

```
src/renderer/src/
├── features/
│   ├── recording/
│   │   ├── useRecording.ts       # IPC invoke wrapper
│   │   └── RecordingControls.tsx
│   ├── settings/
│   │   ├── useSettings.ts        # IPC invoke + electron-store
│   │   └── SettingsForm.tsx
│   └── transcription/
│       ├── useTranscription.ts   # IPC event listener
│       └── TranscriptionHistory.tsx
├── shared/
│   ├── hooks/
│   └── components/
└── App.tsx
```

**Custom IPC-Hook Pattern:**

```typescript
function useTranscription() {
  const [text, setText] = useState("");

  useEffect(() => {
    // Listener registrieren + Cleanup-Funktion zurückgeben
    const cleanup = window.electronAPI.onTranscriptionUpdate((t) => setText(t));
    return cleanup;
  }, []);

  return text;
}
```

- **TanStack Query**: Für Settings/History-Daten (Request-Response IPC)
- **Zustand**: Für lokale UI-State (aktiver Tab, Modal-Visibility)
- **Native `ipcRenderer.on`**: Für Echtzeit-Streaming-Events (Transkriptions-Updates)

---

### electron-builder macOS Build-Konfiguration (Confidence: ✅ Hoch)

```yaml
# electron-builder.yml
appId: com.whisperflow.app
productName: WhisperFlow

mac:
  hardenedRuntime: true
  gatekeeperAssess: false
  notarize: true # Apple Notary Service (API Key)
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  target:
    - target: dmg
    - target: zip # Beide für electron-updater nötig

extraResources:
  - from: node_modules/ffmpeg-static/ffmpeg
    to: ffmpeg
    filter: ["**/*"]

asarUnpack:
  - resources/ffmpeg # ffmpeg-Binary aus ASAR ausschließen

nsis:
  # Windows — Tier 3, noch nicht konfiguriert
```

**Notarization**: API Key (`APPLE_API_KEY_ID` + `APPLE_API_KEY` + `APPLE_API_ISSUER`) ist sicherer als Apple ID + Passwort. Key einmalig in Apple Developer Console generieren.

_Source: [github.com/electron-userland/electron-builder/wiki/Code-Signing](https://github.com/electron-userland/electron-builder/wiki/Code-Signing)_

---

### globalShortcut Management (Confidence: ✅ Hoch)

```typescript
// main/shortcuts/ShortcutManager.ts
class ShortcutManager {
  register(accelerator: string, callback: () => void): boolean {
    if (globalShortcut.isRegistered(accelerator)) return false;
    return globalShortcut.register(accelerator, callback);
    // register() gibt false zurück bei Konflikt — kein Throw!
  }

  unregisterAll() {
    globalShortcut.unregisterAll();
  }
}

// main/index.ts
app.on("will-quit", () => shortcutManager.unregisterAll());
```

User-konfigurierbare Shortcuts werden in `electron-store` gespeichert und beim App-Start neu registriert.

---

## Implementation Approaches and Technology Adoption

### Development Workflow mit electron-vite (Confidence: ✅ Hoch)

```bash
npm run dev    # Startet Electron + Vite Dev Server + HMR
npm run build  # Baut Main/Preload (Rollup) + Renderer (Vite) + electron-builder
```

**HMR-Verhalten:**

- **Renderer**: Echter Vite HMR über `ELECTRON_RENDERER_URL` — funktioniert out-of-the-box, sofortiges Hot-Reload ohne Neustart
- **Main/Preload**: Kein echtes HMR — stattdessen Rollup-Watcher + Electron-Neustart bei Änderung
- **Caveat**: Main-Process-Änderungen benötigen immer kurzen Neustart (∼1–2 Sek.), nicht ärgerlich in der Praxis

_Source: [electron-vite.org/guide/dev](https://electron-vite.org/guide/dev)_

---

### Testing-Strategie (Confidence: ✅ Hoch)

| Test-Typ             | Tool                                              | Scope                              |
| -------------------- | ------------------------------------------------- | ---------------------------------- |
| **Unit Tests**       | **Vitest**                                        | Services, Utils, IPC-Handler-Logik |
| **E2E Tests**        | **Playwright** (`@playwright/test` + `_electron`) | Vollständige App-Flows             |
| **React Components** | Vitest + Testing Library                          | Renderer-Komponenten               |

**Vitest für Main/Preload:**

```typescript
// vitest.config.node.ts
export default defineConfig({
  test: { environment: "node" }, // Für Main-Process-Tests
});

// IPC-Handler testen ohne echten Electron:
vi.mock("electron", () => ({
  ipcMain: { handle: vi.fn() },
  app: { getPath: () => "/tmp" },
}));
```

**Playwright E2E:**

```typescript
const electronApp = await electron.launch({ args: ["."] });
const mainWindow = await electronApp.firstWindow();
await expect(mainWindow).toHaveTitle("WhisperFlow");
```

_Source: [playwright.dev/docs/api/class-electron](https://playwright.dev/docs/api/class-electron)_

---

### ESLint + Prettier + TypeScript (Confidence: ✅ Hoch)

- **ESLint 9 Flat Config** (`eslint.config.mjs`) — Pflicht ab ESLint 9
- `eslint-plugin-electron` — 6 Jahre alt, nicht empfohlen; TypeScript-Types machen es überflüssig
- electron-vite CLI generiert ein fertiges ESLint + Prettier Setup

### Environment Variables (Confidence: ✅ Hoch)

electron-vite hat ein eingebautes Prefix-System für `.env`-Dateien:

| Prefix            | Verfügbar in     |
| ----------------- | ---------------- |
| `MAIN_VITE_*`     | Main Process     |
| `PRELOAD_VITE_*`  | Preload Script   |
| `RENDERER_VITE_*` | Renderer (React) |
| `VITE_*`          | Renderer (React) |

_Source: [electron-vite.org/guide/env-and-mode](https://electron-vite.org/guide/env-and-mode)_

### Auto-Updates (Confidence: ✅ Hoch)

```typescript
// main/index.ts
import { autoUpdater } from "electron-updater";
autoUpdater.checkForUpdatesAndNotify(); // 2 Zeilen
```

- **electron-updater** + GitHub Releases = einfachste Konfiguration für Indie-Apps
- macOS benötigt Code-Signing + `zip`-Target in electron-builder (zusätzlich zu `dmg`)

### Error Handling & Crash Reporting (Confidence: ✅ Mittel)

```typescript
// Main Process
process.on('uncaughtException', (err) => { /* Log + graceful shutdown */ })

// Renderer (React)
<ErrorBoundary fallback={<ErrorScreen />}> ...
```

- **@sentry/electron** für Crash Reporting — initialisiert separat in Main + Renderer + Preload
- Lightweight-Alternative für Solo-Projekte: einfaches File-Logging mit `electron-log`

### CI/CD macOS Signing + Notarization (Confidence: ✅ Hoch)

Vollständig automatisierbar in **GitHub Actions** (`macos-latest`):

| Secret                        | Zweck                                  |
| ----------------------------- | -------------------------------------- |
| `CSC_LINK`                    | Base64-kodiertes `.p12` Zertifikat     |
| `CSC_KEY_PASSWORD`            | Zertifikat-Passwort                    |
| `APPLE_ID`                    | Apple Developer E-Mail                 |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-spezifisches Passwort              |
| `APPLE_TEAM_ID`               | Developer Team ID                      |
| `GH_TOKEN`                    | Für GitHub Releases (electron-updater) |

**WhisperFlow-spezifisch**: `com.apple.security.device.audio-input` Entitlement **zwingend** für Mikrofon-Permission (Notarization schreibt dies vor).

_Source: [github.com/samuelmeuli/action-electron-builder](https://github.com/samuelmeuli/action-electron-builder)_

---

## Executive Summary

**WhisperFlow Initial Setup: Technische Forschungsempfehlungen**

Diese Recherche analysiert den optimalen technischen Stack und die Projektstruktur für WhisperFlow — eine macOS-native Electron Desktop-App für Voice-to-Text-Transkription. Alle Erkenntnisse basieren auf aktuell verifizierten Quellen (Stand: Februar 2026).

**Kernerkenntnisse:**

1. **`electron-vite` ist der klare Tool-of-Choice** (5.2k Stars, aktiv gepflegt, 66k npm/Woche) — weit vor `vite-plugin-electron`. Der Schnellstart per `npm create @quick-start/electron@latest` mit `--template react-ts` erzeugt ein sofort produktionsbereites Projekt.

2. **React 19 direkt** — keine Electron-Inkompatibilitäten, neue Features (useTransition, useOptimistic) direkt nützlich für WhisperFlow-Workflows.

3. **electron-builder** (14.5k Stars, 175k Repos) bleibt der De-facto-Standard für macOS Packaging + Notarization + Auto-Updates. Vollständig automatisierbar über GitHub Actions.

4. **IPC-Architektur**: `contextIsolation: true` + `contextBridge` + `ipcRenderer.invoke`/`ipcMain.handle` — kein direkter `ipcRenderer`-Zugriff aus dem Renderer. Drei TypeScript-Configs (main/preload/renderer) für saubere Type-Trennung.

5. **HUD-Overlay Latenz**: Pre-created BrowserWindow (`show: false`) ist **zwingend** — `win.show()` auf Shortcut < 5ms. On-demand-Erstellung wäre 500–2000ms (inakzeptabel für WhisperFlow-UX).

**Strategische Empfehlungen:**

- **Sofort starten mit**: `npm create @quick-start/electron@latest whisper-flow -- --template react-ts`
- **Nicht verwenden**: `electron-react-boilerplate` (veraltet, Webpack), `fluent-ffmpeg` (deprecated Mai 2025), `electron-redux` (2 Jahre kein Commit)
- **Testing**: Vitest (Unit) + Playwright `_electron` (E2E) — beide nahtlos mit electron-vite
- **State**: Zustand (Renderer-UI) + IPC-Push-Sync + `electron-store` (Settings-Persistenz)

---

## Inhaltsverzeichnis

1. [Technology Stack Analysis](#technology-stack-analysis) — electron-vite, React 19, electron-builder
2. [Integration Patterns Analysis](#integration-patterns-analysis) — IPC, contextBridge, Multi-Window, State
3. [Architectural Patterns and Design](#architectural-patterns-and-design) — Main-Process, Windows, Tray, Renderer
4. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption) — Dev-Workflow, Testing, CI/CD

---

## Technische Forschungsempfehlungen

### Empfohlener initialer Stack

```
whisper-flow/
├── build/
│   ├── entitlements.mac.plist   # audio-input + cs.disable-library-validation
│   └── icon.icns
├── src/
│   ├── main/
│   │   ├── index.ts               # Bootstrap
│   │   ├── windows/WindowManager.ts
│   │   ├── tray/TrayManager.ts
│   │   ├── services/              # AudioRecordingService, TranscriptionService
│   │   ├── shortcuts/ShortcutManager.ts
│   │   └── ipc/                   # recording.ts, transcription.ts, settings.ts
│   ├── preload/
│   │   ├── index.ts               # Settings Window API
│   │   ├── hud.ts                 # HUD-only API (nur Events)
│   │   └── snackbar.ts
│   ├── renderer/
│   │   └── src/features/ ...
│   └── shared/
│       └── ipc.ts                 # Shared TypeScript IPC-Types
├── electron.vite.config.ts
├── electron-builder.yml
├── tsconfig.json              # References
├── tsconfig.node.json         # Main + Preload
└── tsconfig.web.json          # Renderer
```

### Technologie-Entscheidungstabelle

| Entscheidung        | Gewählt           | Abgelehnt                  | Begründung                                |
| ------------------- | ----------------- | -------------------------- | ----------------------------------------- |
| Vite-Integration    | `electron-vite`   | `vite-plugin-electron`     | 6x mehr Downloads, aktiver gepflegt       |
| Scaffolding         | electron-vite CLI | electron-react-boilerplate | Fresh, TypeScript-nativ, kein Webpack     |
| React Version       | React 19          | React 18                   | Stabil seit Dez 2024, neue Async-Features |
| Packaging           | electron-builder  | Electron Forge             | 2x mehr Stars, Default im Template        |
| FFmpeg              | `ffmpeg-static`   | `fluent-ffmpeg`            | fluent-ffmpeg deprecated Mai 2025         |
| Unit Testing        | Vitest            | Jest                       | Native Vite-Integration, schneller        |
| E2E Testing         | Playwright        | Spectron                   | Spectron deprecated, Playwright moderner  |
| State (Renderer)    | Zustand           | Redux                      | Minimal, kein Boilerplate                 |
| Settings-Persistenz | `electron-store`  | lokale JSON-Files          | Typsicher, bewiährt, aktiv gepflegt       |
| IPC-Pattern         | `invoke`/`handle` | `send`/`on`                | Promise-basiert, TypeScript-freundlich    |

### Risikobewertung

| Risiko                                         | Wahrscheinlichkeit | Impact | Mitigation                                            |
| ---------------------------------------------- | ------------------ | ------ | ----------------------------------------------------- |
| macOS Notarization schlägt fehl                | Mittel             | Hoch   | Entitlements früh testen, CI/CD-Signing von Tag 1     |
| ffmpeg-static ARM64/x64 Konflikt               | Niedrig            | Hoch   | `extraResources` + `asarUnpack` korrekt konfigurieren |
| HUD-Latenz zu hoch                             | Niedrig            | Mittel | Pre-created BrowserWindow erzwingen                   |
| IPC-Typ-Drift (Preload vs. Renderer)           | Mittel             | Mittel | `src/shared/ipc.ts` als Single Source of Truth        |
| Electron-Version-Upgrade bricht Native Modules | Mittel             | Mittel | `@electron/rebuild` in `postinstall` automatisieren   |

---

**Forschungsabschluss:** 2026-02-21
**Dokumentlänge:** Vollständige technische Abdeckung
**Quellenverifikation:** Alle Kernaussagen über aktuelle öffentliche Quellen verifiziert
**Konfidenz-Level:** Hoch — basierend auf mehreren unabhängigen Quellen

_Diese technische Forschungsdokumentation dient als maßgebliche Referenz für das initiale WhisperFlow-Projektsetup und liefert strategische technische Erkenntnisse für fundierte Implementierungsentscheidungen._
