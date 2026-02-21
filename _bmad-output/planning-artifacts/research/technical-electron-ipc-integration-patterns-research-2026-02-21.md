# Technische Recherche: Electron IPC Integration Patterns (2025/2026)

**Projekt:** WhisperFlow – macOS Voice-to-Text App  
**Datum:** 21. Februar 2026  
**Status:** Abgeschlossen  
**Konfidenz-Legende:** 🟢 Hoch (offizielle Docs / aktiv gepflegt) | 🟡 Mittel (Community-Konsens) | 🔴 Niedrig (veraltet / experimentell)

---

## Thema 1: contextBridge + contextIsolation

### Empfehlung: `contextBridge.exposeInMainWorld` + `contextIsolation: true` (Standard seit Electron 12) 🟢

### Was ist contextIsolation?

Context Isolation ist ein Electron-Feature, das sicherstellt, dass Preload-Skripte und Electron-Interna in einem **separaten JavaScript-Kontext** laufen als die geladene Webseite. Das bedeutet:

- Das `window`-Objekt im Preload-Skript ist ein _anderes_ `window` als das der Renderer-Seite.
- Preload-Skripte können keine Prototype-Manipulation durch Renderer-Code erleiden (z.B. `Array.prototype.push`-Überschreibung).
- **Standard seit Electron 12.0.0**, Pflicht in jeder modernen App.

**Warum es Pflicht ist:**

- Schützt die Node.js-APIs, auf die das Preload-Skript Zugriff hat.
- Verhindert XSS-Angriffe von geladenen Websites, die auf Electron-interne APIs zugreifen könnten.
- Selbst `nodeIntegration: false` reicht nicht aus – ohne `contextIsolation: true` ist die Isolation unvollständig.

### `contextBridge.exposeInMainWorld` – funktionsweise

`contextBridge.exposeInMainWorld(apiKey, api)` exponiert ein API-Objekt aus dem isolierten Preload-Kontext sicher in den Hauptwelt (Renderer)-Kontext. Es wird über `window[apiKey]` zugänglich.

**Unterstützte Typen, die über die Brücke gehen können:**

| Typ                                  | Unterstützt | Hinweis                                                               |
| ------------------------------------ | ----------- | --------------------------------------------------------------------- |
| `string`, `number`, `boolean`        | ✅          | Direkt                                                                |
| `Object`, `Array`                    | ✅          | Keys müssen primitive Typen sein; Prototype-Modifikationen fallen weg |
| `Function`                           | ✅          | Wird als Proxy übertragen; Prototypen fallen weg                      |
| `Promise`                            | ✅          | Unterstützt                                                           |
| `Error`                              | ✅          | Wird kopiert; custom Properties gehen verloren                        |
| `Symbol`                             | ❌          | Nicht unterstützt                                                     |
| DOM-Objekte (`Element`, `DOMMatrix`) | ❌          | Nicht serialisierbar                                                  |
| Electron/Node.js C++-Klassen         | ❌          | Nicht serialisierbar                                                  |

### Best Practice: Explizite, enge API statt Freigabe des ganzen `ipcRenderer`

```typescript
// ❌ SCHLECHT – gibt kompletten ipcRenderer frei (Sicherheitsrisiko!)
contextBridge.exposeInMainWorld("electronAPI", {
  send: ipcRenderer.send,
});

// ✅ GUT – nur explizit definierte Methoden nach außen
contextBridge.exposeInMainWorld("electronAPI", {
  startRecording: () => ipcRenderer.invoke("recording:start"),
  stopRecording: () => ipcRenderer.invoke("recording:stop"),
  onTranscription: (callback: (text: string) => void) =>
    ipcRenderer.on("transcription:result", (_event, text) => callback(text)),
});
```

### TypeScript-Typisierung für Renderer

```typescript
// src/preload/index.d.ts (oder interface.d.ts)
export interface IElectronAPI {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  onTranscription: (callback: (text: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
```

```typescript
// In der Renderer-Komponente
window.electronAPI.startRecording();
window.electronAPI.onTranscription((text) => setTranscription(text));
```

### Quellen

- https://www.electronjs.org/docs/latest/tutorial/context-isolation
- https://www.electronjs.org/docs/latest/api/context-bridge
- https://www.electronjs.org/docs/latest/tutorial/security#3-enable-context-isolation

---

## Thema 2: IPC Patterns – `ipcMain.handle` vs. `ipcMain.on`

### Empfehlung: `ipcRenderer.invoke` + `ipcMain.handle` für alle Request-Response-Kommunikation 🟢

### Übersicht der Patterns

| Pattern       | Richtung                        | API                                          | Use Case                                                        |
| ------------- | ------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| **Pattern 1** | Renderer → Main (einseitig)     | `ipcRenderer.send` + `ipcMain.on`            | Feuern & Vergessen (Logging, Einstellungen setzen)              |
| **Pattern 2** | Renderer → Main (bidirektional) | `ipcRenderer.invoke` + `ipcMain.handle`      | Request-Response (Daten abrufen, Aktionen mit Ergebnis)         |
| **Pattern 3** | Main → Renderer                 | `webContents.send` + `ipcRenderer.on`        | Push-Benachrichtigungen vom Main (Transkription, Statusupdates) |
| **Pattern 4** | Renderer → Renderer             | Via Main-Prozess als Broker oder MessagePort | Fenster-übergreifende Kommunikation                             |

### Pattern 2 im Detail: `invoke` / `handle` (bevorzugt)

```typescript
// Main-Prozess (main/index.ts)
import { ipcMain } from "electron";

ipcMain.handle("transcription:start", async (event, audioPath: string) => {
  // Sender validieren (Security Best Practice!)
  if (!validateSender(event.senderFrame)) return null;
  const result = await processAudio(audioPath);
  return result;
});

function validateSender(frame: Electron.WebFrameMain): boolean {
  // In Production: Frame-URL validieren
  return new URL(frame.url).protocol === "app:";
}
```

```typescript
// Preload (preload/index.ts)
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  startTranscription: (path: string) =>
    ipcRenderer.invoke("transcription:start", path),
});
```

```typescript
// Renderer (React-Komponente)
const result = await window.electronAPI.startTranscription(
  "/path/to/audio.webm",
);
```

**Vorteile von `invoke`/`handle`:**

- Promise-basierte API – sauber mit async/await verwendbar
- Automatisches Error-Handling (Fehler im `handle`-Handler werden zu rejected Promises im Renderer)
- Keine manuelle Korrelation von Requests und Responses nötig
- **Offiziell empfohlen** seit Electron 7

**Hinweis zu Fehlerübertragung:** Fehler, die in `ipcMain.handle` geworfen werden, werden serialisiert – nur die `message`-Property ist im Renderer verfügbar (kein Stack-Trace, keine Custom-Properties). Für detailliertere Fehlerinformation im Renderer: Fehler manuell als Rückgabewert kapseln.

```typescript
// Explizite Fehlerkapselung
ipcMain.handle("risky-operation", async () => {
  try {
    return { success: true, data: await doRiskyThing() };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
});
```

### Pattern 1: Fire-and-Forget (`send` / `on`)

```typescript
// Für Aktionen ohne Rückgabewert:
// Preload
contextBridge.exposeInMainWorld("electronAPI", {
  setWindowTitle: (title: string) =>
    ipcRenderer.send("window:set-title", title),
  logEvent: (event: string) => ipcRenderer.send("app:log-event", event),
});

// Main
ipcMain.on("window:set-title", (event, title: string) => {
  BrowserWindow.fromWebContents(event.sender)?.setTitle(title);
});
```

**Use Cases für `send`/`on`:**

- Logging/Analytics (keine Antwort benötigt)
- UI-Zustands-Änderungen, die nur den Main informieren (Fenstergröße, Tray-Update)
- Bestätigungen, die nicht geblockt werden sollen

### Pattern 3: Main → Renderer Push

```typescript
// Main: Ergebnis an Renderer senden
mainWindow.webContents.send("transcription:result", {
  text: "Transkribierter Text",
  confidence: 0.95,
});

// Preload: Listener sicher exponieren
contextBridge.exposeInMainWorld("electronAPI", {
  // ✅ Callback kapseln – KEIN Event-Objekt leaken!
  onTranscriptionResult: (
    callback: (result: { text: string; confidence: number }) => void,
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      result: typeof callback extends (r: infer R) => void ? R : never,
    ) => callback(result);
    ipcRenderer.on("transcription:result", handler);
    // Cleanup-Funktion zurückgeben
    return () => ipcRenderer.removeListener("transcription:result", handler);
  },
});
```

```typescript
// React-Renderer: Listener mit Cleanup in useEffect
useEffect(() => {
  const removeListener = window.electronAPI.onTranscriptionResult((result) => {
    setTranscription(result.text);
  });
  return removeListener; // Cleanup beim Unmount
}, []);
```

**Wichtig:** Den Callback **nicht direkt** an `ipcRenderer.on` weitergeben! Das würde den IPC-Event (mit `event.sender`) leaken. Immer eine Wrapper-Funktion verwenden.

### TypeScript-Typisierung von IPC-Kanälen

**Community-Pattern: Shared Channel-Typ-Definitionen**

```typescript
// src/shared/ipc-channels.ts (Von Main UND Preload importierbar)

// Definiert alle Channels mit ihrer Payload-Signatur
export interface IPCChannels {
  // invoke/handle Channels (Renderer → Main, mit Response)
  "recording:start": { params: void; response: { sessionId: string } };
  "recording:stop": {
    params: { sessionId: string };
    response: { audioPath: string };
  };
  "transcription:run": { params: { audioPath: string }; response: string };
  "settings:get": { params: void; response: AppSettings };
  "settings:set": { params: Partial<AppSettings>; response: void };

  // on-Event-Channels (Main → Renderer, Push)
  "transcription:progress": { payload: { percent: number; text: string } };
  "recording:status": { payload: "idle" | "recording" | "processing" };
}

// Typehelper für invoke-Calls
export type InvokeChannels = Pick<
  IPCChannels,
  | "recording:start"
  | "recording:stop"
  | "transcription:run"
  | "settings:get"
  | "settings:set"
>;

// Typehelper für Event-Channels
export type EventChannels = Pick<
  IPCChannels,
  "transcription:progress" | "recording:status"
>;
```

**Hinweis:** electron-vite selbst bietet keine typsicheren IPC-Utilities; das obige Muster ist ein Community-Standard. Es gibt keine offizielle Lösung à la tRPC für Electron-IPC in 2025/2026.

### Quellen

- https://www.electronjs.org/docs/latest/tutorial/ipc
- https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages
- https://www.electronjs.org/docs/latest/tutorial/security#20-do-not-expose-electron-apis-to-untrusted-web-content

---

## Thema 3: Preload-Script-Architektur

### Empfehlung: Ein Preload pro Fenstertyp; strukturiert nach Domain-Bereichen 🟢

### Grundstruktur für WhisperFlow

electron-vite unterstützt nativ mehrere Preload-Skripte (via `rollupOptions.input`):

```typescript
// electron.vite.config.ts
export default defineConfig({
  preload: {
    build: {
      rollupOptions: {
        input: {
          // Ein Preload pro Fenstertyp
          main: resolve(__dirname, "src/preload/main-window.ts"),
          hud: resolve(__dirname, "src/preload/hud-overlay.ts"),
          snackbar: resolve(__dirname, "src/preload/snackbar.ts"),
        },
      },
    },
  },
  // ...
});
```

```typescript
// BrowserWindow-Erstellung mit spezifischem Preload
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: join(import.meta.dirname, "../preload/main-window.js"),
    contextIsolation: true, // ✅ Pflicht
    sandbox: true, // ✅ Standard seit Electron 20
    nodeIntegration: false, // ✅ Pflicht (Standard)
  },
});

const hudWindow = new BrowserWindow({
  webPreferences: {
    preload: join(import.meta.dirname, "../preload/hud-overlay.js"),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    transparent: true, // Für HUD-Overlay
  },
});
```

### Empfohlene Preload-Struktur für WhisperFlow

```
src/preload/
├── main-window.ts       # Vollständige API für das Haupt-Settings-Fenster
├── hud-overlay.ts       # Minimale API nur für HUD-Daten (Transkription, Status)
├── snackbar.ts          # Minimale API für Benachrichtigungs-Overlay
└── _shared/
    ├── recording-api.ts # Geteilte Aufnahme-Funktionen
    ├── settings-api.ts  # Geteilte Einstellungs-Funktionen
    └── types.ts         # Geteilte Typen
```

**Prinzip: Minimale Exposition (Least Privilege)**

- Das HUD-Overlay braucht nur `onTranscriptionUpdate` und `onStatusChange` – **nicht** die vollständige Settings-API
- Das Snackbar-Overlay braucht nur `onNotification`
- Jedes Fenster bekommt nur die APIs, die es benötigt

```typescript
// src/preload/hud-overlay.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("hudAPI", {
  // Minimale API – nur was das HUD wirklich braucht
  onTranscriptionUpdate: (cb: (text: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, text: string) => cb(text);
    ipcRenderer.on("transcription:update", handler);
    return () => ipcRenderer.removeListener("transcription:update", handler);
  },
  onRecordingStatus: (cb: (status: "idle" | "recording") => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: string) =>
      cb(status as any);
    ipcRenderer.on("recording:status", handler);
    return () => ipcRenderer.removeListener("recording:status", handler);
  },
});
```

### `@electron-toolkit/preload` – Hilfsbibliothek

electron-vite empfiehlt `@electron-toolkit/preload` für die Entwicklungsphase. Sie exponiert sicher `ipcRenderer`, `webFrame`, `process` und `webUtils`:

```typescript
// Mit @electron-toolkit/preload
import { contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // Fallback für Umgebungen ohne contextIsolation (sollte nie auftreten)
  window.electron = electronAPI;
}
```

> **Hinweis:** `@electron-toolkit/preload` ist nützlich für die Entwicklung, aber für Production sollte man eigene, explizit begrenzte APIs exponieren. Die Bibliothek gibt den vollen `ipcRenderer` frei.

### Quellen

- https://electron-vite.org/guide/dev#multiple-windows-app
- https://electron-vite.org/guide/dev#using-preload-scripts
- https://github.com/alex8088/electron-toolkit/tree/master/packages/preload

---

## Thema 4: Multi-Window IPC – WhisperFlow-Architektur

### Übersicht der WhisperFlow-Fenster

| Fenster      | Typ                                          | Zweck                        | IPC-Bedarf                                                |
| ------------ | -------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| `mainWindow` | `BrowserWindow`                              | Settings, Verlauf, Steuerung | Voll (Settings lesen/schreiben, Aufnahme starten/stoppen) |
| `hudOverlay` | `BrowserWindow` (transparent, `alwaysOnTop`) | Live-Transkription anzeigen  | Push-only von Main (Transkriptions-Updates)               |
| `snackbar`   | `BrowserWindow` (klein, temporär)            | Statusbenachrichtigungen     | Push-only von Main                                        |
| `tray`       | `Tray` (kein Fenster)                        | macOS-Menüleiste             | Direkte Main-Interaktion, kein IPC                        |

### Pattern A: Main-Prozess als zentraler IPC-Broker (Empfohlen für WhisperFlow) 🟢

Der Main-Prozess verwaltet den gesamten Zustand. Renderer kommunizieren nur mit dem Main, nie direkt untereinander.

**Fluss:**

```
[Renderer A] --invoke--> [Main Process] --webContents.send--> [Renderer B]
```

```typescript
// main/ipc-controller.ts – Zentraler IPC-Handler

import { ipcMain, BrowserWindow } from "electron";
import { WindowManager } from "./window-manager";

export function setupIPCHandlers(windowManager: WindowManager) {
  // Aufnahme starten: Renderer → Main → alle Fenster benachrichtigen
  ipcMain.handle("recording:start", async (event) => {
    if (!validateSender(event.senderFrame)) throw new Error("Unauthorized");

    const sessionId = await recordingService.start();

    // Alle Fenster über neuen Status informieren
    windowManager.broadcastToAll("recording:status", "recording");

    return { sessionId };
  });

  // Wenn Transkription verfügbar: An HUD und ggf. Hauptfenster pushen
  recordingService.on("transcription", (text: string) => {
    windowManager
      .getHudWindow()
      ?.webContents.send("transcription:update", text);
    windowManager
      .getMainWindow()
      ?.webContents.send("transcription:update", text);
  });
}
```

```typescript
// main/window-manager.ts – Zentrale Fensterverwaltung

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private hudWindow: BrowserWindow | null = null;
  private snackbarWindow: BrowserWindow | null = null;

  broadcastToAll(channel: string, ...args: unknown[]) {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args);
      }
    }
  }

  getMainWindow() {
    return this.mainWindow;
  }
  getHudWindow() {
    return this.hudWindow;
  }

  // ... createWindows etc.
}
```

### Pattern B: MessagePort für direkte Renderer-zu-Renderer-Kommunikation 🟡

Für Hochfrequenz-Daten (z.B. Echtzeit-Audio-Chunks) kann `MessageChannelMain` effizienter sein als der Umweg über den Main-Prozess.

```typescript
// main: Kanal zwischen zwei Renderern aufbauen
import { MessageChannelMain } from "electron";

const { port1, port2 } = new MessageChannelMain();

// Port1 an Fenster A schicken
windowA.webContents.postMessage("direct-channel", null, [port1]);
// Port2 an Fenster B schicken
windowB.webContents.postMessage("direct-channel", null, [port2]);

// Jetzt können A und B direkt kommunizieren (ohne Main als Broker)
```

**Wann MessagePort für WhisperFlow sinnvoll ist:**

- Bei sehr hoher Frequenz (z.B. Live-Waveform-Daten von Worker-Prozess an HUD)
- Wenn Main-Prozess nicht als Bottleneck dienen soll
- **Nicht** für normale Steuerbefehle (invoke/handle bleibt besser)

### Pattern C: geteilter IPC-Kanal über `ipcRenderer.on` (für Broadcasts)

```typescript
// WhisperFlow: Recording-Status-Broadcast an alle Fenster
// Main
function broadcastRecordingStatus(status: "idle" | "recording" | "processing") {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("recording:status", status);
  }
}
```

### Quellen

- https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-4-renderer-to-renderer
- https://www.electronjs.org/docs/latest/tutorial/message-ports

---

## Thema 5: State Management in Electron + React

### Empfehlung für WhisperFlow: Zustand (Renderer-lokal) + IPC-gesteuerter Main-Prozess-State 🟢

### Analyse der Optionen

| Option                              | Eignung für Electron | Multi-Window-Support                    | Komplexität  | Empfehlung                       |
| ----------------------------------- | -------------------- | --------------------------------------- | ------------ | -------------------------------- |
| **Zustand** (zustand)               | ✅ Gut               | Nur per Window (kein Sync ohne Aufwand) | Niedrig      | ✅ Empfohlen für UI-State        |
| **Jotai**                           | ✅ Gut               | Nur per Window                          | Niedrig      | ✅ Gut für atomischen State      |
| **Redux Toolkit + electron-redux**  | 🟡 Mittel            | ✅ Cross-Window via IPC                 | Hoch         | Nur für sehr komplexe Apps       |
| **NanoStore**                       | ✅ Gut               | Nur per Window                          | Sehr niedrig | Für sehr einfache Apps           |
| **Custom IPC-basiertes State-Sync** | ✅ Sehr gut          | ✅ Vollständige Kontrolle               | Mittel       | ✅ Empfohlen für Multi-Window    |
| **electron-store**                  | ✅ Sehr gut          | ✅ Via File-Watch                       | Sehr niedrig | ✅ Für persistenten Config-State |

### Empfohlene Architektur für WhisperFlow

**Prinzip: Main-Prozess ist die "Single Source of Truth" für alle fensterbahnrelevanten Daten.**

```
┌─────────────────────────────────────┐
│          Main Process               │
│  ┌────────────────────────────────┐ │
│  │      Global App State          │ │
│  │  - recordingStatus             │ │
│  │  - currentTranscription        │ │
│  │  - settings (via electron-store)│ │
│  └────────────────────────────────┘ │
│           ↕ IPC (invoke/send)       │
└─────────────────────────────────────┘
       ↕ IPC                ↕ IPC
┌──────────────┐     ┌──────────────┐
│  Main Window │     │  HUD Overlay │
│  (Zustand)   │     │  (Zustand)   │
│  - UIState   │     │  - displayText│
│  - formState │     │  - opacity   │
└──────────────┘     └──────────────┘
```

### Implementation: Zustand für UI-State + IPC-Sync

```typescript
// src/renderer/stores/recording-store.ts
import { create } from "zustand";

interface RecordingState {
  status: "idle" | "recording" | "processing";
  currentTranscription: string;
  sessionId: string | null;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  status: "idle",
  currentTranscription: "",
  sessionId: null,

  startRecording: async () => {
    set({ status: "recording" });
    try {
      const { sessionId } = await window.electronAPI.startRecording();
      set({ sessionId });
    } catch {
      set({ status: "idle" });
    }
  },

  stopRecording: async () => {
    set({ status: "processing" });
    const result = await window.electronAPI.stopRecording();
    set({ status: "idle", currentTranscription: result.text });
  },
}));
```

```typescript
// src/renderer/hooks/useIPCSync.ts
// IPC-Events in Zustand-Store spiegeln
import { useEffect } from "react";
import { useRecordingStore } from "../stores/recording-store";

export function useIPCSync() {
  const setStatus = useRecordingStore((s) => s.setStatus);
  const setTranscription = useRecordingStore((s) => s.setTranscription);

  useEffect(() => {
    // Vom Main-Prozess gepushter State
    const removeStatusListener = window.electronAPI.onRecordingStatus(
      (status) => {
        setStatus(status);
      },
    );
    const removeTranscriptionListener =
      window.electronAPI.onTranscriptionUpdate((text) => {
        setTranscription(text);
      });

    return () => {
      removeStatusListener();
      removeTranscriptionListener();
    };
  }, []);
}
```

### electron-store für persistenten Einstellungs-State

`electron-store` ist die Standardlösung für persistente Konfiguration in Electron (5k Stars, aktiv gepflegt, ESM, v11.0.2 – Oktober 2025):

```typescript
// main/store.ts
import Store from "electron-store";

interface AppSettings {
  language: string;
  hotkey: string;
  outputFormat: "clipboard" | "file" | "both";
  modelSize: "tiny" | "base" | "small" | "medium";
  theme: "light" | "dark" | "auto";
}

const store = new Store<AppSettings>({
  defaults: {
    language: "de",
    hotkey: "CmdOrCtrl+Shift+Space",
    outputFormat: "clipboard",
    modelSize: "base",
    theme: "auto",
  },
  schema: {
    language: { type: "string" },
    hotkey: { type: "string" },
    outputFormat: { type: "string", enum: ["clipboard", "file", "both"] },
    modelSize: { type: "string", enum: ["tiny", "base", "small", "medium"] },
    theme: { type: "string", enum: ["light", "dark", "auto"] },
  },
  // ⚠️ Erfordert Electron 30+, benötigt ESM
});

// IPC-Handler für Einstellungen
ipcMain.handle("settings:get", () => store.store);
ipcMain.handle("settings:set", (_event, data: Partial<AppSettings>) => {
  store.set(data);
  // Alle Fenster über Änderungen informieren
  BrowserWindow.getAllWindows().forEach((win) =>
    win.webContents.send("settings:changed", store.store),
  );
});
```

### electron-redux: Nur für Redux-heavy Apps

`electron-redux` (klarna, 758 Stars) ermöglicht Store-Synchronisation zwischen Main und Renderer über Redux, aber:

- Letzter Commit: vor 2 Jahren (nicht mehr aktiv gepflegt)
- Hohe Komplexität
- ❌ **Nicht empfohlen** für WhisperFlow

### Quellen

- https://github.com/sindresorhus/electron-store (v11.0.2, Oktober 2025)
- https://github.com/klarna/electron-redux (inaktiv, nur für Redux-Apps)
- https://zustand.docs.pmnd.rs/

---

## Thema 6: Native Integrationen via IPC

### Empfehlung: Alle nativen APIs ausschließlich im Main-Prozess, sicher via IPC exponiert 🟢

### Wichtige native APIs für WhisperFlow

#### 1. Globale Shortcuts (`globalShortcut`)

```typescript
// main/shortcuts.ts
import { globalShortcut, ipcMain } from "electron";

export function setupShortcuts(onRecord: () => void) {
  // Shortcuts direkt im Main registrieren – KEIN IPC nötig
  globalShortcut.register("CmdOrCtrl+Shift+Space", onRecord);
}

// Falls Renderer Shortcuts ändern können soll:
ipcMain.handle("shortcuts:register", async (_event, accelerator: string) => {
  globalShortcut.unregisterAll();
  return globalShortcut.register(accelerator, onRecord);
});
```

#### 2. `systemPreferences` für macOS-Mikrofon-Permission

```typescript
// main/permissions.ts
import { systemPreferences, ipcMain } from "electron";

ipcMain.handle("permissions:check-microphone", async () => {
  const status = systemPreferences.getMediaAccessStatus("microphone");
  return status; // 'not-determined' | 'granted' | 'denied' | 'restricted'
});

ipcMain.handle("permissions:request-microphone", async () => {
  const granted = await systemPreferences.askForMediaAccess("microphone");
  return granted;
});
```

#### 3. `child_process` / `ffmpeg` Integration

```typescript
// main/ffmpeg-service.ts
import { spawn } from "node:child_process";
import { ipcMain } from "electron";
import path from "node:path";

// ffmpeg-Binary aus dem App-Bundle (via ffmpeg-static oder BYOF)
const ffmpegPath = app.isPackaged
  ? path.join(process.resourcesPath, "ffmpeg")
  : (require("ffmpeg-static") as string);

ipcMain.handle(
  "ffmpeg:convert",
  async (_event, inputPath: string, outputPath: string) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        "-i",
        inputPath,
        "-ar",
        "16000", // Für Whisper: 16kHz
        "-ac",
        "1", // Mono
        "-f",
        "wav",
        outputPath,
      ]);
      proc.on("close", (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
    });
  },
);
```

#### 4. Dateisystem-Operationen

```typescript
// main/file-service.ts
import { ipcMain, dialog } from "electron";
import { readFile, writeFile } from "node:fs/promises";

ipcMain.handle("file:open-dialog", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: ["wav", "mp3", "webm", "m4a"] }],
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle(
  "file:save-transcription",
  async (_event, text: string, filePath: string) => {
    await writeFile(filePath, text, "utf8");
  },
);

ipcMain.handle("clipboard:write", async (_event, text: string) => {
  clipboard.writeText(text);
});
```

#### 5. Sicherheitsregel: Immer `event.senderFrame` validieren

```typescript
// Wiederverwendbare Validierungsfunktion
function validateSender(frame: Electron.WebFrameMain): boolean {
  const origin = new URL(frame.url);
  // In Production: Nur allowlisted Origins erlauben
  if (app.isPackaged) {
    return origin.protocol === "app:"; // Custom-Protokoll (empfohlen)
  }
  // In Development: localhost erlauben
  return origin.hostname === "localhost";
}

// In jedem handle()-Aufruf anwenden
ipcMain.handle("sensitive:operation", (event, data) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Unauthorized origin");
  }
  // ...
});
```

### Quellen

- https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages
- https://www.electronjs.org/docs/latest/api/ipc-main

---

## Thema 7: electron-vite IPC-Typing-Patterns

### Empfehlung: Manuelles Shared-Types-Modul; electron-vite bietet keine eigenen IPC-Utilities 🟡

### Was electron-vite bietet (und nicht bietet)

electron-vite bietet:

- ✅ TypeScript-Unterstützung via `electron-vite/node` Type-Definitionen
- ✅ Separate tsconfig.json für main, preload und renderer
- ✅ `swcPlugin` für Decorator-Unterstützung
- ❌ **Keine** typsicheren IPC-Channel-Utilities
- ❌ **Keine** automatische Code-Generierung für IPC-Typen

### Community-Patterns für typsicheres IPC (2025/2026)

#### Pattern 1: Shared Type-Map (einfachste Lösung, empfohlen)

```typescript
// src/shared/ipc.ts – von main/ UND preload/ importierbar

// Alle bidirektionalen Channels (invoke/handle)
export interface InvokeMap {
  "recording:start": [params: void, response: { sessionId: string }];
  "recording:stop": [
    params: { sessionId: string },
    response: { text: string; duration: number },
  ];
  "transcription:run": [
    params: { audioPath: string; language?: string },
    response: string,
  ];
  "settings:get": [params: void, response: AppSettings];
  "settings:set": [params: Partial<AppSettings>, response: void];
  "permissions:check-microphone": [
    params: void,
    response: "granted" | "denied" | "not-determined",
  ];
}

// Alle unidirektionalen Push-Channels (main → renderer)
export interface EventMap {
  "recording:status": "idle" | "recording" | "processing";
  "transcription:update": { text: string; isFinal: boolean };
  "transcription:complete": {
    text: string;
    duration: number;
    wordCount: number;
  };
  "app:error": { code: string; message: string };
}

// Typsicherer ipcMain-Wrapper (optional, für den Main-Prozess)
export type TypedIpcMain = {
  handle<K extends keyof InvokeMap>(
    channel: K,
    listener: (
      event: Electron.IpcMainInvokeEvent,
      params: InvokeMap[K][0],
    ) => Promise<InvokeMap[K][1]> | InvokeMap[K][1],
  ): void;
};
```

#### Pattern 2: Typsicheres Preload-API-Objekt

```typescript
// src/preload/index.ts – vollständig typisiertes API
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type { InvokeMap, EventMap } from "../shared/ipc";

// Typsicherer invoke-Wrapper
function invoke<K extends keyof InvokeMap>(
  channel: K,
  params?: InvokeMap[K][0],
): Promise<InvokeMap[K][1]> {
  return ipcRenderer.invoke(channel, params);
}

// Typsicherer on-Wrapper mit Cleanup
function on<K extends keyof EventMap>(
  channel: K,
  callback: (data: EventMap[K]) => void,
): () => void {
  const handler = (_: IpcRendererEvent, data: EventMap[K]) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  // Aufnahme
  startRecording: () => invoke("recording:start"),
  stopRecording: (params: InvokeMap["recording:stop"][0]) =>
    invoke("recording:stop", params),

  // Einstellungen
  getSettings: () => invoke("settings:get"),
  saveSettings: (settings: Partial<AppSettings>) =>
    invoke("settings:set", settings),

  // Permissions
  checkMicrophonePermission: () => invoke("permissions:check-microphone"),

  // Event-Listener (mit Cleanup-Funktion als Return-Wert)
  onRecordingStatus: (cb: (status: EventMap["recording:status"]) => void) =>
    on("recording:status", cb),
  onTranscriptionUpdate: (
    cb: (data: EventMap["transcription:update"]) => void,
  ) => on("transcription:update", cb),
  onTranscriptionComplete: (
    cb: (data: EventMap["transcription:complete"]) => void,
  ) => on("transcription:complete", cb),
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
```

```typescript
// src/renderer/env.d.ts – globale Typen für den Renderer
import type { ElectronAPI } from "../preload";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

### tsconfig-Struktur für electron-vite + TypeScript

electron-vite empfiehlt getrennte tsconfig-Dateien:

```json
// tsconfig.json (Root – für Editor-Intellisense)
{
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}

// tsconfig.node.json (Main + Preload)
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "target": "ES2022",
    "types": ["electron-vite/node"],
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*"]
}

// tsconfig.web.json (Renderer)
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

**Wichtig:** Das `@shared/*`-Alias ermöglicht es, IPC-Types aus `src/shared/ipc.ts` sowohl in main, preload als auch renderer zu importieren, ohne Zirkularitätsprobleme.

### Quellen

- https://electron-vite.org/guide/typescript
- https://www.electronjs.org/docs/latest/tutorial/context-isolation#usage-with-typescript

---

## Zusammenfassung: Empfehlungen für WhisperFlow

### Architektur-Entscheidungen

| Bereich                 | Entscheidung                                                                | Begründung                                                           |
| ----------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **contextIsolation**    | `true` (immer)                                                              | Standard seit Electron 12, Sicherheitspflicht                        |
| **sandbox**             | `true` (Standard seit Electron 20)                                          | Beibehalten; Preload via electron-vite gebündelt                     |
| **IPC-Pattern**         | `invoke`/`handle` für Request-Response; `send`/`on` nur für Fire-and-Forget | Offiziell empfohlen seit Electron 7                                  |
| **Preload-Architektur** | Ein Preload pro Fenstertyp (3 Preloads: main-window, hud-overlay, snackbar) | Least-Privilege-Prinzip                                              |
| **Multi-Window IPC**    | Main-Prozess als zentraler Broker                                           | Einfachste und sicherste Lösung für 3 Fenster                        |
| **State Management**    | Zustand für lokalen UI-State + IPC-Push-Sync + electron-store für Config    | Bewährt, leichtgewichtig, TypeScript-freundlich                      |
| **Native APIs**         | Ausschließlich im Main-Prozess, nur explizit via IPC exponiert              | Sicherheit, Testbarkeit                                              |
| **IPC-Typisierung**     | Shared Type-Map (`src/shared/ipc.ts`) mit typsicheren Wrappern              | Kein etabliertes Drittanbieter-Tool; manuelle Lösung ist ausreichend |

### Empfohlene Verzeichnisstruktur

```
src/
├── main/
│   ├── index.ts              # App-Entry, Window-Erstellung
│   ├── ipc-controller.ts     # Alle ipcMain.handle() und ipcMain.on() Handler
│   ├── window-manager.ts     # BrowserWindow-Verwaltung und Broadcasts
│   ├── recording-service.ts  # Aufnahme-Logik (child_process, ffmpeg)
│   ├── transcription-service.ts  # Whisper-Integration
│   ├── shortcuts.ts          # globalShortcut-Registrierung
│   ├── permissions.ts        # systemPreferences Mikrofon-Zugriff
│   └── store.ts              # electron-store (App-Settings)
├── preload/
│   ├── main-window.ts        # Vollständige API für Hauptfenster
│   ├── hud-overlay.ts        # Minimale API für HUD
│   └── snackbar.ts           # Minimale API für Snackbar
├── renderer/
│   ├── src/
│   │   ├── stores/           # Zustand-Stores
│   │   │   ├── recording-store.ts
│   │   │   └── settings-store.ts
│   │   ├── hooks/
│   │   │   └── useIPCSync.ts # IPC-Events → Zustand-Sync
│   │   └── ...
│   └── env.d.ts              # Window-Typ-Erweiterungen
└── shared/
    ├── ipc.ts                # InvokeMap + EventMap (geteilte IPC-Typen)
    └── types.ts              # Geteilte App-Typen (AppSettings, etc.)
```

---

_Recherche erstellt am 21. Februar 2026 | Quellen: Electron Docs v33+, electron-vite Docs (Dez 2025), electron-store v11, @electron-toolkit/preload v3.0.2, electron-redux (Klarna)_
