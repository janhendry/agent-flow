---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ["MVP.md"]
workflowType: "research"
lastStep: 2
research_type: "technical"
research_topic: "Electron State Management: Multi-Window & Main Process Synchronization"
research_goals: "NanoStores + nanostore-ipc-bridge Konzept aus MVP bewerten, Alternativen und Best Practices für WhisperFlow Electron App finden"
user_name: "Yoda"
date: "2026-02-21"
web_research_enabled: true
source_verification: true
---

# Research Report: Electron State Management – Multi-Window & Main Process Synchronization

**Date:** 2026-02-21
**Author:** Yoda
**Research Type:** Technical

---

## Research Overview

Diese Recherche untersucht State-Management-Strategien für Electron-Apps mit mehreren Fenstern und einem Main Process.
Ausgangspunkt ist das im MVP beschriebene Konzept für **WhisperFlow**: eine Electron-Desktop-App (macOS/Windows) mit
React 19 Frontend, mehreren BrowserWindows (HUD, Settings, History, Snackbar) und NanoStores + `@janhendry/nanostore-ipc-bridge`
als State-Management-Lösung.

**Untersuchte Ansätze (verifiziert gegen öffentliche Quellen, Stand Feb 2026):**

1. NanoStores + `@janhendry/nanostore-ipc-bridge` (MVP-Konzept)
2. Manuelles IPC-Pattern (Electron-Boarding)
3. `electron-store` (Persistenz)
4. `electron-redux` (Redux mit State Sync)
5. Zustand + manuelles IPC
6. Eigene IPC-Bridge (Custom)

---

## Technical Research Scope Confirmation

**Research Topic:** Electron State Management: Multi-Window & Main Process Synchronization  
**Research Goals:** NanoStores + nanostore-ipc-bridge Konzept aus MVP bewerten, Alternativen und Best Practices für WhisperFlow Electron App finden

**Technical Research Scope:**

- Architecture Analysis – design patterns, frameworks, system architecture
- Implementation Approaches – development methodologies, coding patterns
- Technology Stack – languages, frameworks, tools, platforms
- Integration Patterns – APIs, protocols, interoperability
- Performance Considerations – scalability, optimization, patterns

---

## Technology Stack Analysis

### 1. Das Electron Prozess-Modell – Grundlage des Problems

Electron teilt die App in strikt isolierte Prozesse:

| Prozess              | Rolle                                              | Zugriff                                   |
| -------------------- | -------------------------------------------------- | ----------------------------------------- |
| **Main Process**     | Node.js, OS APIs, Fenster-Management               | Vollzugriff auf Node/Electron APIs        |
| **Renderer Process** | Chromium, React UI (je Window ein eigener Prozess) | Kein direkter Node-Zugriff (Sandbox)      |
| **Preload Script**   | Brücke zwischen Main und Renderer                  | Eingeschränkter Kontext (`contextBridge`) |

**Das Problem für Multi-Window State Management:**  
Da jedes BrowserWindow in einem eigenen Renderer-Prozess läuft, ist State **nicht automatisch geteilt**.
HUD-Window, Settings-Window, History-Window und Snackbar-Window sehen „ihre eigene Welt".
Kommunikation läuft ausschließlich über IPC-Kanäle (`ipcMain` / `ipcRenderer`).

_Quelle: [Electron IPC Dokumentation](https://www.electronjs.org/docs/latest/tutorial/ipc)_

### 2. Electron IPC – Die vier Grundmuster

**Pattern 1: Renderer → Main (One-Way)**

```typescript
// Renderer (über Preload)
window.electronAPI.setTitle("Neuer Titel");

// Main
ipcMain.on("set-title", (event, title) => {
  win.setTitle(title);
});
```

**Pattern 2: Renderer → Main (Two-Way, invoke/handle)**

```typescript
// Renderer
const result = await window.electronAPI.getSettings();

// Main
ipcMain.handle("get-settings", async () => store.get("settings"));
```

**Pattern 3: Main → Renderer (webContents.send)**

```typescript
// Main → spezifisches Window
mainWindow.webContents.send("state-update", newState);

// All Windows
BrowserWindow.getAllWindows().forEach((w) =>
  w.webContents.send("state-update", newState),
);
```

**Pattern 4: Renderer → Renderer**  
Kein direkter Weg. Zwei Optionen:

- Main als Message Broker (alle Renderer → Main → alle anderen Renderer)
- `MessagePort` direkt zwischen zwei Renderern (nach initialer Main-Vermittlung)

**Wichtige Einschränkung:** Objekte über IPC müssen mit dem [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) serialisierbar sein. Klassen-Instanzen, DOM-Elemente, WebContents etc. können **nicht** übergeben werden.

_Quelle: [Electron IPC – Object Serialization](https://www.electronjs.org/docs/latest/tutorial/ipc#object-serialization)_

---

### 3. NanoStores – Das Framework

**NanoStores** (v1.1.0, Nov 2025, 7.1k ⭐) ist ein minimaler reaktiver State Manager (265–797 Bytes, tree-shakable).

**Kernkonzepte:**

| Konzept              | Beschreibung                                                  |
| -------------------- | ------------------------------------------------------------- |
| `atom(value)`        | Primitiver reactive Store (Strings, Numbers, Arrays, Objekte) |
| `map(object)`        | Store für Objekte mit Key-Level-Updates (`setKey()`)          |
| `computed(deps, fn)` | Abgeleiteter Store (automatisches Update)                     |
| `batched(deps, fn)`  | Wie computed, aber sammelt multiple Updates                   |
| `onMount(store, cb)` | Lifecycle: Lazy Init wenn erste Subscriber                    |
| `effect(stores, cb)` | Reagiert auf mehrere Stores gleichzeitig                      |

**React Integration:**

```typescript
import { useStore } from "@nanostores/react";
const counter = useStore($counter); // reaktiv, re-render bei Änderung
```

_Quelle: [NanoStores GitHub](https://github.com/nanostores/nanostores)_

---

### 4. `@janhendry/nanostore-ipc-bridge` – Das MVP-Konzept im Detail

**Status:** Alpha (v0.1.0-alpha.2, Dez 2025), 0 Stars, 0 Forks – **Eigenentwicklung für WhisperFlow**

Der ursprüngliche Package-Name war `@whisperflow/nanostore-ipc-bridge`. Das Repo wurde vor 2 Monaten zu `@janhendry/nanostore-ipc-bridge` refactored. Dies ist eine **custom Bibliothek**, die für dieses Projekt entwickelt wurde, nicht eine etablierte Community-Lösung.

**Features laut README:**

- ✅ Zero-config – einmal importieren, überall nutzen
- ✅ Full TypeScript Support
- ✅ Multi-Window Sync – alle Renderer bleiben automatisch synchron
- ✅ Race-Condition-Free – Monotonic Revision Tracking verhindert Stale Updates
- ✅ Services/RPC – typsichere Services mit Events
- ✅ Kein Boilerplate

**Quick Start:**

```typescript
// shared/stores.ts – eine Datei für Main & Renderer
import { syncedAtom } from "@janhendry/nanostore-ipc-bridge/universal";
export const $recordingState = syncedAtom("recordingState", "idle");
export const $settings = syncedAtom("settings", defaultSettings);

// main.ts
import { initNanoStoreIPC } from "@janhendry/nanostore-ipc-bridge/main";
import "../shared/stores"; // Stores registrieren
initNanoStoreIPC({ autoRegisterWindows: true });

// preload.ts
import { exposeNanoStoreIPC } from "@janhendry/nanostore-ipc-bridge/preload";
exposeNanoStoreIPC();

// renderer/App.tsx – identisch in ALLEN Windows
import { useStore } from "@nanostores/react";
import { $recordingState } from "../shared/stores";
const state = useStore($recordingState); // automatisch synchron
```

**Wie es intern funktioniert:**

1. Main Process: Echte NanoStores als Single Source of Truth
2. Renderer Process: IPC-backed Proxy, der Operationen an Main weiterleitet
3. Revision Tracking: Verhindert Race Conditions (sequentielle Monotonnummer pro Store)
4. Auto-Broadcast: Änderungen werden an alle verbundenen Windows gesendet

**Services / RPC Pattern:**

```typescript
// shared/recordingService.ts
import { defineService } from "@janhendry/nanostore-ipc-bridge/services";

export const recordingService = defineService("recording", {
  startRecording: async (mode: RecordingMode) => {
    // Läuft im Main Process
    await ffmpegService.start(mode);
    $recordingState.set("recording");
    recordingService.broadcast("recordingStarted", { mode });
  },
  stopRecording: async () => {
    await ffmpegService.stop();
    $recordingState.set("processing");
  },
});

// Renderer
await recordingService.startRecording("mic"); // RPC Call
recordingService.on("recordingStarted", ({ mode }) => console.log(mode));
```

_Quelle: [janhendry/nanostore-ipc-bridge GitHub](https://github.com/janhendry/nanostore-ipc-bridge)_

---

### 5. Alternativen im Vergleich

#### 5.1 Manuelles IPC (Vanilla Electron)

**Konzept:** Eigene IPC-Handler für State-Sync implementieren.

```typescript
// main.ts – State im Main Process
let appState = { recordingState: "idle", settings: defaultSettings };

function broadcastState(update: Partial<AppState>) {
  appState = { ...appState, ...update };
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("state-update", appState);
  });
}

ipcMain.handle("get-state", () => appState);
ipcMain.on("set-state", (event, update) => broadcastState(update));
```

**Bewertung:**

- ✅ Kein Dependency
- ✅ Volle Kontrolle
- ❌ Viel Boilerplate
- ❌ Kein reaktives System (kein automatisches Re-render)
- ❌ Race Conditions müssen manuell verhindert werden
- ❌ Skaliert schlecht bei vielen Stores/Windows

#### 5.2 `electron-store` (Persistenz-Layer)

**Version:** 11.0.2 (vor 5 Monaten publiziert), 235.250 wöchentliche Downloads

Ein persistenter JSON-Store für User-Settings. Kein reaktives Multi-Window State Management – **nur für Persistenz**, nicht für Live-State-Sync.

```typescript
import Store from "electron-store";
const store = new Store<AppSettings>({ schema });

store.set("whisper.apiKey", "sk-...");
store.get("theme"); // => 'dark'

// Renderer-Sync via IPC nötig:
ipcMain.handle("getStoreValue", (event, key) => store.get(key));
```

**Empfehlung für WhisperFlow:** `electron-store` für **persistente Settings** (API Keys, Theme, Shortcuts) verwenden – **in Kombination** mit NanoStores für Live-State-Sync.

_Quelle: [electron-store NPM](https://www.npmjs.com/package/electron-store)_

#### 5.3 `electron-redux` (Redux Store Sync)

**Version:** 2.0.0, 1.280 wöchentliche Downloads (vor einem Jahr publiziert)

Redux StoreEnhancer, der Redux Stores zwischen Main und allen Renderer-Prozessen synchronisiert. Jeder Prozess hat seinen eigenen Redux Store; Actions werden über IPC gebr oadcastet.

```typescript
// main.ts & renderer.ts – identisch
import { stateSyncEnhancer } from "electron-redux";
const store = createStore(reducer, stateSyncEnhancer());

// Jetzt: `store.dispatch(action)` wird an alle anderen Prozesse kommuniziert
```

**Bewertung:**

- ✅ Battle-tested Redux-Ökosystem
- ✅ DevTools Support
- ✅ Action-basiertes state management (gut für komplexe Flows)
- ❌ Redux-Overhead (Boilerplate, Reducer, Actions)
- ❌ Alle Actions müssen FSA-kompatibel und serialisierbar sein
- ❌ Eher schwer für eine kleine App
- ❌ Wenig Aktivität (1.280 Downloads/Woche, letztes Release vor 1 Jahr)

_Quelle: [electron-redux NPM](https://www.npmjs.com/package/electron-redux)_

#### 5.4 Zustand + Manuelles IPC

**Zustand** (Vanilla Store, sehr populär im React-Ökosystem) hat keine native Electron-IPC-Integration.

Typischer Community-Ansatz: Zustand im Main Process + manueller IPC-Broadcast an Renderer.

```typescript
// main.ts
import { createStore } from "zustand/vanilla";

const store = createStore<AppState>()(() => ({ recordingState: "idle" }));
store.subscribe((state) => {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("state-sync", state),
  );
});

// Renderer: Eigener Zustand-Store, der IPC-Updates empfängt
import { create } from "zustand";
const useStore = create<AppState>((set) => {
  window.electronAPI.onStateSync((state) => set(state));
  return initialState;
});
```

**Bewertung:**

- ✅ Sehr beliebtes, gut dokumentiertes Framework
- ✅ Minimales API
- ❌ Keine native Multi-Window-Sync → manueller Aufwand
- ❌ Zwei separate Stores (Main + Renderer) mit Sync-Logik
- ❌ Race Conditions ohne zusätzliche Absicherung möglich

#### 5.5 Eigene IPC-Bridge mit NanoStores (Best Practice Alternative)

Wenn `@janhendry/nanostore-ipc-bridge` wegfallen würde, wäre die sauberste Alternative:

```typescript
// lib/syncedAtom.ts – selbst implementiert (~50 LOC)
import { atom, type Atom } from "nanostores";

export function createSyncedAtom<T>(channel: string, initial: T) {
  const $store = atom<T>(initial);

  if (process.type === "browser") {
    // Main
    $store.subscribe((value) => {
      BrowserWindow.getAllWindows().forEach((w) =>
        w.webContents.send(`ns:${channel}:update`, value),
      );
    });
  } else {
    // Renderer
    window.electronAPI.onStoreUpdate(channel, (value: T) => $store.set(value));
    window.electronAPI.getStoreValue(channel).then((v: T) => $store.set(v));
  }

  return $store;
}
```

---

### 6. Bewertungs-Matrix für WhisperFlow

| Kriterium             | nanostore-ipc-bridge     | Manuelles IPC            | electron-store       | electron-redux     | Zustand+IPC             |
| --------------------- | ------------------------ | ------------------------ | -------------------- | ------------------ | ----------------------- |
| **Setup-Aufwand**     | ⭐⭐⭐⭐⭐ Minimal       | ⭐⭐ Viel                | ⭐⭐⭐⭐ Einfach     | ⭐⭐⭐ Mittel      | ⭐⭐⭐ Mittel           |
| **Multi-Window Sync** | ⭐⭐⭐⭐⭐ Auto          | ⭐⭐ Manuell             | ❌ Nicht vorgesehen  | ⭐⭐⭐⭐ Auto      | ⭐⭐ Manuell            |
| **TypeScript**        | ⭐⭐⭐⭐⭐ Vollständig   | ⭐⭐⭐ Selbst definieren | ⭐⭐⭐⭐ Gut         | ⭐⭐⭐⭐ Gut       | ⭐⭐⭐⭐⭐ Exzellent    |
| **Bundle Size**       | Klein (NanoStores ~300B) | Null                     | Mittel               | Groß (Redux)       | Klein (Zustand ~1KB)    |
| **Community/Reife**   | ⭐ Alpha, 0 Stars        | N/A (Electron selbst)    | ⭐⭐⭐⭐⭐ Sehr reif | ⭐⭐⭐ Rückläufig  | ⭐⭐⭐⭐⭐ Sehr populär |
| **Wartungsrisiko**    | ⚠️ Eigenentwicklung      | ✅ Kein Dependency       | ✅ Aktiv             | ⚠️ Wenig Aktivität | ✅ Aktiv                |
| **Race Conditions**   | ✅ Revision Tracking     | ⚠️ Manuell               | N/A                  | ✅ Action-basiert  | ⚠️ Manuell              |
| **Persistenz**        | ❌ Nein                  | ❌ Nein                  | ✅ Ja                | ❌ Nein            | ❌ Nein                 |

---

### 7. Empfohlene Architektur für WhisperFlow

Basierend auf der Recherche empfiehlt sich eine **hybride Strategie**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│  ┌─────────────────┐   ┌───────────────────────────────────┐    │
│  │  electron-store │   │       NanoStores (Live State)      │    │
│  │  (Persistenz)   │   │  $recordingState, $hudVisible,    │    │
│  │  API Keys       │   │  $snackbarQueue, $transcription   │    │
│  │  Settings       │   └──────────────┬────────────────────┘    │
│  │  Shortcuts      │                  │ IPC Bridge               │
│  └────────┬────────┘                  │ (autoRegisterWindows)    │
│           │ beim Start laden          │                          │
└───────────┼───────────────────────────┼──────────────────────────┘
            │                           │ webContents.send (broadcast)
      ┌─────▼──────┐    ┌──────────────▼───────────────────────────┐
      │ HUD Window │    │  Settings / History / Snackbar Windows   │
      │  $hudState │    │  useStore($recordingState) – reaktiv!    │
      └────────────┘    └──────────────────────────────────────────┘
```

**Konkrete Empfehlung:**

1. **`@janhendry/nanostore-ipc-bridge`** für reaktiven Live-State (Recording State Machine, HUD Visibility, Snackbar Queue, Transcriptions)
   - Voraussetzung: Alpha-Status beobachten, ggf. auf stabile Version warten oder Tests schreiben
   - Da es eine Eigenentwicklung ist: Gut testen, Fallback planen

2. **`electron-store`** für persistente Einstellungen (API Keys, Theme, Shortcuts, Audio Device Preferences)
   - Trennung von Live-State und persistiertem State vermeidet unnötige Schreiboperationen auf Disk

3. **State-Trennung nach Typ:**

   ```typescript
   // Persistiert (electron-store) → beim Start laden → in syncedAtom kopieren
   const $settings = syncedAtom("settings", await loadPersistedSettings());

   // Nur Live (syncedAtom) → nie persistiert
   const $recordingState = syncedAtom("recordingState", "idle");
   const $snackbarQueue = syncedAtom("snackbarQueue", []);
   ```

---

### 8. Risiken & Mitigations

| Risiko                                         | Wahrscheinlichkeit          | Impact | Mitigation                                                          |
| ---------------------------------------------- | --------------------------- | ------ | ------------------------------------------------------------------- |
| `nanostore-ipc-bridge` bricht breaking changes | Mittel (Alpha)              | Hoch   | Version pinnen, CHANGELOG beobachten                                |
| Race Conditions bei simultanen Window-Updates  | Gering (Revision Tracking)  | Mittel | Unit Tests für Sync-Szenarios                                       |
| IPC Overhead bei hochfrequenten Updates        | Mittel (Audio Levels ~60Hz) | Mittel | Throttling/Debouncing für Audio-Level-Updates; nicht als syncedAtom |
| electron-store Disk-Write-Latenz               | Gering                      | Gering | Nur bei User-Aktion schreiben, nicht on-the-fly                     |

---

### 9. Fazit

Das MVP-Konzept mit **NanoStores + `@janhendry/nanostore-ipc-bridge`** ist **technisch solide und für WhisperFlow gut geeignet**. Die Zero-Config Multi-Window-Sync, das Revision Tracking gegen Race Conditions und der minimale Bundle-Size-Impact sprechen dafür.

**Kritischer Punkt:** Die Bibliothek ist eine Eigenentwicklung im Alpha-Stadium (0 Community Stars). Das ist kein Ausschlusskriterium – aber es bedeutet: entweder als Autor darauf vertrauen und sie aktiv warten, oder einen Migrationsweg zu einer Custom-Implementierung vorbereiten.

**Die Kombination `nanostore-ipc-bridge` (Live State) + `electron-store` (Persistenz) ist die empfohlene Strategie** und entspricht dem MVP-Konzept.

---

_Quellen: [Electron IPC Docs](https://www.electronjs.org/docs/latest/tutorial/ipc) | [NanoStores GitHub](https://github.com/nanostores/nanostores) | [nanostore-ipc-bridge GitHub](https://github.com/janhendry/nanostore-ipc-bridge) | [electron-store NPM](https://www.npmjs.com/package/electron-store) | [electron-redux NPM](https://www.npmjs.com/package/electron-redux)_

---

## Integration Patterns Analysis

### 1. Das Preload / contextBridge Pattern – Sicherheitsfundament

Context Isolation ist **seit Electron 12 standardmäßig aktiv** und darf nicht deaktiviert werden. Das `contextBridge`-Modul ist der einzige sichere Weg, APIs vom Preload-Skript in den Renderer zu exponieren.

**Schlechtes Muster (❌ unsicher):**

```typescript
// preload.ts – FALSCH: gibt gesamte ipcRenderer-API frei
contextBridge.exposeInMainWorld("electronAPI", {
  send: ipcRenderer.send, // Renderer kann BELIEBIGE IPC-Nachrichten senden!
});
```

**Gutes Muster (✅ sicher):**

```typescript
// preload.ts – RICHTIG: nur spezifische, benannte Funktionen
contextBridge.exposeInMainWorld("electronAPI", {
  startRecording: (mode: RecordingMode) =>
    ipcRenderer.invoke("recording:start", mode),
  onStateUpdate: (cb: (state: AppState) => void) =>
    ipcRenderer.on("ns:state:update", (_event, state) => cb(state)),
});
```

**Für `nanostore-ipc-bridge`** übernimmt `exposeNanoStoreIPC()` diese Aufgabe automatisch und sicher – mit einem einzigen Preload-Aufruf für alle Stores.

_Quelle: [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)_

---

### 2. IPC-Kommunikations-Flows für WhisperFlow

#### Flow A: State Change aus dem Renderer (User-Aktion)

```
Renderer (HUD)          Preload              Main Process
    │                      │                      │
    │ $counter.set(1)       │                      │
    │──────────────────────►│ ns:counter:set        │
    │                       │──────────────────────►│  NanoStore.set(1)
    │                       │                       │  broadcast rev:42
    │◄──────────────────────│◄──────────────────────│  ns:counter:update {val:1, rev:42}
    │                       │                       │
    │                   All other Windows           │
    │◄──────────────────────│◄──────────────────────│  ns:counter:update {val:1, rev:42}
```

#### Flow B: State Change aus dem Main Process (z.B. Recording gestartet)

```
Main Process                      Renderer (HUD)    Renderer (Snackbar)
    │                                  │                    │
    │ ffmpeg.start() → done            │                    │
    │ $recordingState.set("recording") │                    │
    │──────────────────────────────────►│  useStore re-render│
    │──────────────────────────────────────────────────────►│ useStore re-render
```

#### Flow C: Neues Window öffnet sich (Initial State Hydration)

```
Main Process          New Window (Settings)
    │                       │
    │                  window created
    │◄──────────────────────│ ns:init:request für alle Stores
    │                       │
    │──────────────────────►│ ns:init:response {$settings: {...}, rev:42}
    │                       │
    │                  Store hydrated
    │──────────────────────►│ ns:*:update (normale Broadcast-Updates)
```

`autoRegisterWindows: true` in `initNanoStoreIPC()` automatisiert Flow C vollständig – neue Windows bekommen sofort den aktuellen Stand aller Stores.

---

### 3. IPC Channel Naming Conventions (Best Practice)

Electron empfiehlt, IPC-Channels mit einem Namespace-Präfix zu versehen, um Lesbarkeit und Debugging zu verbessern:

```typescript
// Empfohlenes Format: modul:aktion
"recording:start"; // Renderer → Main RPC
"recording:stop";
"settings:save";
"settings:load";

// nanostore-ipc-bridge nutzt intern:
"ns:counter:set"; // Renderer → Main Store-Update
"ns:counter:update"; // Main → alle Renderer (Broadcast)
"ns:init:request"; // neues Window → Main (Initial Hydration)
```

_Quelle: [Electron IPC Docs – On Channel Names](https://www.electronjs.org/docs/latest/tutorial/ipc)_

---

### 4. State-Partitionierung: Global vs. Window-lokal

Nicht alle States müssen global synchronisiert werden. Für WhisperFlow:

| State                   | Typ                                                 | Begründung                             |
| ----------------------- | --------------------------------------------------- | -------------------------------------- |
| `$recordingState`       | **Global** (syncedAtom)                             | HUD, Tray, alle Windows müssen wissen  |
| `$snackbarQueue`        | **Global** (syncedAtom)                             | Main schreibt, Snackbar-Window liest   |
| `$transcriptionHistory` | **Global** (syncedAtom)                             | History-Window + Settings              |
| `$settings`             | **Global** (syncedAtom, aus electron-store geladen) | Alle Windows                           |
| `$hudVisible`           | **Global** (syncedAtom)                             | Main (Shortcut) setzt es, HUD zeigt es |
| `isSettingsWindowOpen`  | **Window-lokal**                                    | Nur Settings-Window selbst             |
| `localInputValue`       | **Window-lokal**                                    | React `useState` im Renderer reicht    |
| `audioLevelMeter`       | **NICHT syncedAtom** (throttled)                    | Zu hochfrequent für IPC                |

**Audio Level Meter – Sonderfall:** Bei ~60Hz Updates würde ein syncedAtom zu viel IPC-Overhead erzeugen. Besser: Im Main Process messen, an HUD-Window via direktem `webContents.send` mit Throttling (z.B. alle 50ms) senden – kein syncedAtom.

```typescript
// main.ts – Audio Level direkt mit Throttle
let lastLevelSent = 0;
ffmpegProcess.on("audioLevel", (level: number) => {
  const now = Date.now();
  if (now - lastLevelSent > 50) {
    // 20 fps max
    lastLevelSent = now;
    hudWindow?.webContents.send("audio:level", level);
  }
});
```

---

### 5. Service / RPC Pattern für Actions

Während syncedAtoms für **Zustandsdaten** sind, ist das Service/RPC-Pattern (`defineService()`) für **Aktionen mit Seiteneffekten** besser geeignet:

```typescript
// shared/recordingService.ts
import { defineService } from "@janhendry/nanostore-ipc-bridge/services";

export const recordingService = defineService("recording", {
  // Läuft im Main Process – hat Zugriff auf Node/FFmpeg
  start: async (mode: "mic" | "output" | "dual") => {
    if (!canStart()) throw new Error("Cannot start: not in idle state");
    await ffmpegService.startRecording(mode);
    $recordingState.set("recording");
    recordingService.broadcast("started", { mode, timestamp: Date.now() });
  },

  stop: async () => {
    if (!canStop()) throw new Error("Cannot stop");
    const audioFile = await ffmpegService.stopRecording();
    $recordingState.set("processing");
    return audioFile; // zurück an Renderer
  },

  cancel: async () => {
    await ffmpegService.cancelRecording();
    $recordingState.set("idle");
  },
});

// In ANY Renderer – identisch in HUD, Settings, etc.
import { recordingService } from "../shared/recordingService";

// RPC-Call an Main
await recordingService.start("mic");

// Event-Subscription
recordingService.on("started", ({ mode }) => {
  console.log(`Recording started in ${mode} mode`);
});
```

**Vorteile gegenüber manuellem IPC:**

- Typsicherheit end-to-end (kein manuelle Channel-Name-Strings)
- Trennung: State (syncedAtom) vs. Actions (defineService)
- Error Handling durch Promise-Rückgabe
- Brodcast-Events für Notifications ohne eigenen State

---

### 6. Window Lifecycle Integration

```typescript
// main.ts – Window-Management mit IPC Bridge
import { initNanoStoreIPC } from "@janhendry/nanostore-ipc-bridge/main";
import "./shared/stores"; // Stores registrieren

app.whenReady().then(async () => {
  // IPC Bridge vor allen Windows initialisieren
  initNanoStoreIPC({ autoRegisterWindows: true });

  // Settings aus electron-store laden → in syncedAtoms kopieren
  const persistedSettings = await settingsStore.get("appSettings");
  $settings.set(persistedSettings);

  // Windows erstellen – alle erhalten automatisch aktuellen State
  createTrayWindow();
  createHUDWindow();
  // Settings/History werden lazy erstellt (on-demand)
});

// Settings-Persistenz: auf syncedAtom-Änderungen reagieren
$settings.subscribe(async (settings) => {
  await settingsStore.set("appSettings", settings);
});
```

---

### 7. TypeScript Integration für contextBridge

Für vollständige Typsicherheit im Renderer, wenn die Bridge manuell ergänzt wird:

```typescript
// src/types/electron.d.ts
export interface INanoStoreIPC {
  getStore: (id: string) => Promise<unknown>;
  setStore: (id: string, value: unknown, rev: number) => void;
  subscribe: (
    id: string,
    cb: (value: unknown, rev: number) => void,
  ) => () => void;
}

declare global {
  interface Window {
    nanostoreIPC: INanoStoreIPC;
    // Weitere Custom APIs
    electronAPI: {
      audioLevel: (cb: (level: number) => void) => void;
    };
  }
}
```

`exposeNanoStoreIPC()` von der Bridge-Library generiert das automatisch korrekt – kein manueller Aufwand.

---

_Quellen: [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) | [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model) | [nanostore-ipc-bridge GitHub](https://github.com/janhendry/nanostore-ipc-bridge)_

---

## Architectural Patterns and Design

### 1. Layered Architecture für WhisperFlow (Electron)

Die empfohlene Architektur folgt einem klaren Schichten-Modell im Main Process:

```
┌──────────────────────────────────────────────────────────────┐
│                    Renderer Processes                         │
│  HUD Window │ Settings Window │ History Window │ Snackbar     │
│  useStore($recordingState) – React 19 + NanoStores           │
└──────────────────────┬───────────────────────────────────────┘
                       │ IPC (nanostore-ipc-bridge)
┌──────────────────────▼───────────────────────────────────────┐
│                    Main Process                               │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  State Layer                           │  │
│  │  syncedAtoms: $recordingState, $settings, $history     │  │
│  │  Recording State Machine (Guards + Transitions)        │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │                 Service Layer                          │  │
│  │  RecordingService │ TranscriptionService │ SettingsSvc │  │
│  │  ShortcutService  │ DependencyService    │ WindowSvc   │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                   │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │              Infrastructure Layer                      │  │
│  │  FFmpegAdapter │ WhisperAPIAdapter │ LLMAPIAdapter      │  │
│  │  electron-store │ SQLite/JSON (History Persistence)     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Designprinzip:** Alle Business-Logik und systemnahen Operationen leben im Main Process. Renderer sind rein reaktive UI-Layer – sie lesen State via `useStore()`, schicken Events über Services, machen sonst nichts.

---

### 2. Recording State Machine – Implementierungsansätze

Das MVP definiert eine klare State Machine:

```
idle ──START──► recording ──PAUSE──► paused
  ▲               │                    │
  │             STOP/CANCEL          RESUME
  │               ▼                    │
  └──────── processing ◄───────────────┘
                 │
          COMPLETE/ERROR
                 │
                 ▼
               idle
```

**Option A: Custom State Machine mit NanoStores (MVP-Ansatz)**

```typescript
// shared/recordingStateMachine.ts
import { syncedAtom } from "@janhendry/nanostore-ipc-bridge/universal";

type RecordingState =
  | "idle"
  | "recording"
  | "paused"
  | "processing"
  | "error"
  | "success";

export const $recordingState = syncedAtom<RecordingState>(
  "recordingState",
  "idle",
);
export const $recordingMode = syncedAtom<"mic" | "output" | "dual" | null>(
  "recordingMode",
  null,
);

// Guards – im Main Process
export const canStart = () => $recordingState.get() === "idle";
export const canStop = () =>
  ["recording", "paused"].includes($recordingState.get());
export const canPause = () => $recordingState.get() === "recording";
export const canResume = () => $recordingState.get() === "paused";
export const canCancel = () =>
  ["recording", "paused"].includes($recordingState.get());

// Transition-Funktionen (nur im Main Process aufrufen)
export const transitions = {
  start: (mode: "mic" | "output" | "dual") => {
    if (!canStart())
      throw new Error(`Cannot START from state: ${$recordingState.get()}`);
    $recordingMode.set(mode);
    $recordingState.set("recording");
  },
  stop: () => {
    if (!canStop())
      throw new Error(`Cannot STOP from state: ${$recordingState.get()}`);
    $recordingState.set("processing");
  },
  // ... weitere Transitions
};
```

**Option B: XState v5 (Alternative für komplexere Flows)**

XState v5 (5.28.0, 1.487.915 Downloads/Woche, vor 8 Tagen publiziert) ist die etablierte FSM-Bibliothek:

```typescript
import { createMachine, createActor } from "xstate";

const recordingMachine = createMachine({
  id: "recording",
  initial: "idle",
  context: { mode: null as "mic" | "output" | "dual" | null },
  states: {
    idle: {
      on: {
        START: {
          target: "recording",
          actions: assign({ mode: ({ event }) => event.mode }),
        },
      },
    },
    recording: {
      on: {
        PAUSE: "paused",
        STOP: "processing",
        CANCEL: { target: "idle", actions: assign({ mode: null }) },
      },
    },
    paused: {
      on: {
        RESUME: "recording",
        STOP: "processing",
        CANCEL: { target: "idle", actions: assign({ mode: null }) },
      },
    },
    processing: {
      on: {
        PROCESSING_COMPLETE: "idle",
        PROCESSING_ERROR: "idle",
      },
    },
  },
});

// Im Main Process als Actor laufen lassen + State in syncedAtom spiegeln
const actor = createActor(recordingMachine);
actor.subscribe((state) => {
  $recordingState.set(state.value as RecordingState); // → alle Windows sehen's
});
actor.start();
```

**Vergleich:**

| Kriterium              | Custom State Machine            | XState v5                    |
| ---------------------- | ------------------------------- | ---------------------------- |
| Bundle Size            | 0 extra                         | ~130KB (unpacked 2.25MB)     |
| Komplexität            | Für diese 6 States: ausreichend | Overkill für simple FSM      |
| Type Safety            | Manuell                         | Exzellent (generierte Types) |
| Visualisierung         | Nein                            | Ja (Stately Studio)          |
| Nested/Parallel States | Nein                            | Ja                           |
| Community              | N/A                             | 1.4M Downloads/Woche         |
| **Empfehlung**         | ✅ Für WhisperFlow              | Wenn States komplexer werden |

**Fazit für WhisperFlow:** Custom State Machine reicht – 6 States, klare Übergänge. XState wäre wenn überhaupt später einfach zu integrieren, da die Übergänge bereits klar definiert sind.

_Quelle: [XState NPM](https://www.npmjs.com/package/xstate) | [Stately AI Docs](https://stately.ai/docs/xstate)_

---

### 3. Window Manager Pattern

Mehrere BrowserWindows zentral im Main Process verwalten:

```typescript
// main/windowManager.ts
class WindowManager {
  private windows = new Map<string, BrowserWindow>();

  create(id: string, options: BrowserWindowConfig): BrowserWindow {
    if (this.windows.has(id)) return this.windows.get(id)!;

    const win = new BrowserWindow({
      ...options,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.on("closed", () => this.windows.delete(id));
    this.windows.set(id, win);
    return win;
  }

  get(id: string): BrowserWindow | undefined {
    return this.windows.get(id);
  }

  // nanostore-ipc-bridge mit autoRegisterWindows handelt Sync automatisch
  getAll(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }
}

export const windowManager = new WindowManager();

// Window-Konfigurationen
export const WINDOWS = {
  HUD: {
    width: 340,
    height: 120,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
  },
  SETTINGS: { width: 680, height: 580, titleBarStyle: "hidden" },
  HISTORY: { width: 800, height: 600, titleBarStyle: "hidden" },
  SNACKBAR: {
    width: 360,
    height: 80,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
  },
};
```

**Lazy Window Creation:** Settings- und History-Window bei Bedarf erstellen, nicht beim App-Start:

```typescript
// Shortcut → Settings öffnen
globalShortcut.register("Cmd+,", () => {
  const win =
    windowManager.get("settings") ??
    windowManager.create("settings", WINDOWS.SETTINGS);
  win.show();
  win.focus();
});
```

---

### 4. Service Layer Design

Jeder Service kapselt einen Business-Aspekt und wird nur im Main Process ausgeführt:

```typescript
// main/services/RecordingService.ts
export class RecordingService {
  constructor(
    private ffmpeg: FFmpegAdapter,
    private stateMachine: RecordingStateMachine,
    private transcription: TranscriptionService,
  ) {}

  async start(mode: RecordingMode): Promise<void> {
    this.stateMachine.transition("START", { mode });
    await this.ffmpeg.startCapture(mode);
    $snackbarQueue.set([
      ...$snackbarQueue.get(),
      { type: "success", message: "Recording started", id: Date.now() },
    ]);
  }

  async stop(): Promise<string> {
    this.stateMachine.transition("STOP");
    const audioFile = await this.ffmpeg.stopCapture();
    const transcription = await this.transcription.transcribe(audioFile);
    clipboard.writeText(transcription.text);
    this.stateMachine.transition("PROCESSING_COMPLETE");
    return transcription.text;
  }
}
```

**Dependency Injection Pattern** – Services werden beim App-Start zusammengesetzt:

```typescript
// main/container.ts (Poor Man's DI)
const ffmpegAdapter = new FFmpegAdapter();
const whisperAdapter = new WhisperAPIAdapter($settings.get().whisper);
const transcriptionService = new TranscriptionService(whisperAdapter);
const recordingService = new RecordingService(
  ffmpegAdapter,
  recordingStateMachine,
  transcriptionService,
);

// Settings-Update propagiert in Adapter
$settings.subscribe((settings) => {
  whisperAdapter.updateConfig(settings.whisper);
});
```

---

### 5. Repository Pattern für Transcription History

```typescript
// main/repositories/TranscriptionRepository.ts
interface TranscriptionEntry {
  id: string;
  text: string;
  audioFile?: string;
  mode: RecordingMode;
  createdAt: number;
  isFavorite: boolean;
}

class TranscriptionRepository {
  constructor(private store: ElectronStore) {}

  async add(
    entry: Omit<TranscriptionEntry, "id">,
  ): Promise<TranscriptionEntry> {
    const newEntry = { ...entry, id: crypto.randomUUID() };
    const history = this.store.get("history", []) as TranscriptionEntry[];
    this.store.set("history", [newEntry, ...history].slice(0, 1000)); // max 1000
    $transcriptionHistory.set([newEntry, ...$transcriptionHistory.get()]);
    return newEntry;
  }

  async delete(id: string): Promise<void> {
    const history = (
      this.store.get("history", []) as TranscriptionEntry[]
    ).filter((e) => e.id !== id);
    this.store.set("history", history);
    $transcriptionHistory.set(history);
  }
}
```

---

### 6. Dependency Check Architecture

Beim App-Start werden externe Dependencies geprüft, bevor die App vollständig startet:

```typescript
// main/startup/DependencyChecker.ts
type DependencyStatus = "installed" | "missing";

async function checkDependencies(): Promise<void> {
  const ffmpegStatus: DependencyStatus = (await checkFFmpeg())
    ? "installed"
    : "missing";
  const blackholeStatus: DependencyStatus =
    process.platform === "darwin"
      ? (await checkBlackhole())
        ? "installed"
        : "missing"
      : undefined;

  // In persistierten Settings + syncedAtom aktualisieren
  $settings.setKey("dependencyStatus", {
    ffmpeg: ffmpegStatus,
    blackhole: blackholeStatus,
  });

  if (ffmpegStatus === "missing") {
    // Settings-Window öffnen mit Dependency-Tab
    windowManager.create("settings", WINDOWS.SETTINGS).show();
  }
}
```

---

### 7. Design-Entscheidungen (Architectural Decision Records)

| Entscheidung                                                         | Begründung                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Main Process als Single Source of Truth**                          | Alle NanoStores leben im Main; Renderer sind reine UI-Proxies. Keine Split-Brain-Probleme. |
| **syncedAtom statt `ipcMain.handle` pro Feld**                       | Eliminiert ~80% IPC-Boilerplate; Typ-Sicherheit mit einer Store-Datei für Main+Renderer    |
| **electron-store nur für Persistenz, NanoStores nur für Live-State** | Klare Trennung: Disk-Writes nur bei User-Aktion, nicht Live-Updates                        |
| **Lazy Window Creation**                                             | Settings/History nur erstellen wenn nötig → schnellerer App-Start                          |
| **Custom FSM statt XState für Recording**                            | 6 States, klar definiert – kein 130KB Bundle-Overhead nötig                                |
| **Audio Level per direktem webContents.send (throttled)**            | 60Hz IPC via syncedAtom würde den IPC-Kanal überlasten                                     |
| **FFmpeg "Bring Your Own"**                                          | Vermeidet Code-Signing-Probleme mit gebündelten Binaries (macOS Notarization)              |

_Quellen: [XState NPM](https://www.npmjs.com/package/xstate) | [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model) | [NanoStores Best Practices](https://github.com/nanostores/nanostores#best-practices)_

---

## Implementation Approaches and Technology Adoption

### 1. Build-Tooling: electron-vite (Empfohlen)

**`electron-vite`** (v5.0.0, 66.569 Downloads/Woche, vor 2 Monaten publiziert) ist der aktuelle Standard für Electron + Vite-basierte Builds.

**Features:**

- Vite-powered: HMR für Renderer, Hot Reloading für Main + Preload
- Isolierter Build für Main / Preload / Renderer (3 separate Vite-Configs)
- Out-of-the-box TypeScript, React, Vue, Svelte
- V8 Bytecode Compilation für Source-Code-Schutz (optional)

**Setup für WhisperFlow:**

```bash
npm create @quick-start/electron@latest whisperflow -- --template react-ts
```

**`electron.vite.config.ts`:**

```typescript
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    // Main Process: NanoStores, Services, FFmpeg
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    // Preload: exposeNanoStoreIPC()
  },
  renderer: {
    plugins: [react()],
    // React 19 + Tailwind + Radix UI
  },
});
```

_Quelle: [electron-vite NPM](https://www.npmjs.com/package/electron-vite) | [electron-vite.org](https://electron-vite.org/)_

---

### 2. Projekt-Struktur (Empfohlen)

```
whisperflow/
├── src/
│   ├── main/                    # Main Process
│   │   ├── index.ts             # App-Einstiegspunkt
│   │   ├── windowManager.ts
│   │   ├── services/
│   │   │   ├── RecordingService.ts
│   │   │   ├── TranscriptionService.ts
│   │   │   ├── ShortcutService.ts
│   │   │   └── DependencyService.ts
│   │   ├── adapters/
│   │   │   ├── FFmpegAdapter.ts
│   │   │   └── WhisperAPIAdapter.ts
│   │   └── repositories/
│   │       └── TranscriptionRepository.ts
│   │
│   ├── preload/
│   │   └── index.ts             # exposeNanoStoreIPC()
│   │
│   ├── shared/                  # Main + Renderer nutzen das
│   │   ├── stores.ts            # syncedAtom Definitionen
│   │   ├── services/
│   │   │   └── recordingService.ts  # defineService()
│   │   └── types.ts             # Gemeinsame TypeScript-Types
│   │
│   └── renderer/                # React 19 UI
│       ├── windows/
│       │   ├── HUD/             # HUD Window
│       │   ├── Settings/        # Settings Window
│       │   ├── History/         # History Window
│       │   └── Snackbar/        # Snackbar Window
│       ├── components/          # Shared UI Components
│       └── hooks/               # Custom React Hooks
│
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

**Kritisch:** `shared/` wird sowohl vom Main Process als auch von Renderer-Prozessen importiert. `electron-vite` handhabt das mit isolierten Build-Entries automatisch. `syncedAtom()` erkennt intern ob es im Main oder Renderer-Kontext läuft (`process.type`).

---

### 3. Testing-Strategie

**Empfohlener Stack:**

- **Unit/Integration Tests:** Vitest (gleiche Vite-Config, kein Overhead)
- **E2E Tests:** Playwright + `@playwright/test` mit Electron-Support
- **IPC Tests:** Mocking via `vi.mock` (Vitest)

**Unit Test: State Machine Guards**

```typescript
// src/main/services/__tests__/RecordingStateMachine.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { $recordingState, canStart, canStop, transitions } from "../../stores";

describe("Recording State Machine", () => {
  beforeEach(() => $recordingState.set("idle"));

  it("canStart() is true when idle", () => {
    expect(canStart()).toBe(true);
  });

  it("canStart() is false when recording", () => {
    $recordingState.set("recording");
    expect(canStart()).toBe(false);
  });

  it("START: idle → recording", () => {
    transitions.start("mic");
    expect($recordingState.get()).toBe("recording");
  });

  it("throws on invalid transition", () => {
    $recordingState.set("processing");
    expect(() => transitions.start("mic")).toThrow();
  });
});
```

**IPC Bridge Test (mit gemocktem Electron):**

```typescript
// src/shared/__tests__/stores.test.ts
import { vi, describe, it, expect } from "vitest";

// nanostore-ipc-bridge im Test-Kontext mocken
vi.mock("@janhendry/nanostore-ipc-bridge/universal", () => ({
  syncedAtom: (id: string, initial: unknown) => {
    const { atom } = require("nanostores");
    return atom(initial); // Im Test: echter NanoStore, kein IPC
  },
}));

import { $recordingState } from "../stores";

describe("Recording State Store", () => {
  it("has correct initial value", () => {
    expect($recordingState.get()).toBe("idle");
  });
});
```

---

### 4. Packaging & Distribution

**Electron Builder** (empfohlen für macOS + Windows):

```json
// package.json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build && electron-builder",
    "build:mac": "electron-vite build && electron-builder --mac",
    "build:win": "electron-vite build && electron-builder --win"
  }
}
```

**electron-builder Konfiguration:**

```yaml
# electron-builder.yml
appId: com.janhendry.whisperflow
productName: WhisperFlow
directories:
  output: dist-app
mac:
  category: public.app-category.productivity
  hardenedRuntime: true # Notarization-Pflicht macOS
  entitlements: build/entitlements.mac.plist
win:
  target: nsis

# Kritisch: FFmpeg wird NICHT gebundelt (Bring Your Own)
# Nur optionale Helfer (keine nativen Binaries)
```

---

### 5. Kritische Implementierungsrisiken

| Risiko                             | Detail                                                | Mitigation                                                            |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| **nanostore-ipc-bridge Alpha**     | 0 Stars, keine stable Version                         | Version pinnen (`0.1.0-alpha.2`); Tests schreiben; eigenes Fork-Recht |
| **shared/ im Dual-Context**        | `process.type` Erkennung muss korrekt sein            | Unit Tests mit gemocktem Environment                                  |
| **macOS Notarization**             | Hardened Runtime = keine beliebigen Scripts           | FFmpeg aus PATH (nicht gebundelt) löst das                            |
| **Windows Shortcut-Konflikte**     | Globale Shortcuts können von anderen Apps belegt sein | Conflict Detection + User-Feedback                                    |
| **Audio Level IPC-Throttling**     | Vergessen → ~60Hz IPC → Performance-Probleme          | Audio Level Meter explizit von syncedAtom ausschließen                |
| **Stale State beim Window-Öffnen** | Race Condition: Window öffnet bevor Hydration         | Revision Tracking der Bridge + Loading-State im Renderer              |

---

### 6. Empfohlene Dependency-Liste

```json
// package.json (wesentliche Dependencies)
{
  "dependencies": {
    "electron": "^34.0.0",
    "nanostores": "^1.1.0",
    "@nanostores/react": "^0.8.0",
    "@janhendry/nanostore-ipc-bridge": "0.1.0-alpha.2",
    "electron-store": "^11.0.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "electron-vite": "^5.0.0",
    "electron-builder": "^25.0.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-dialog": "latest",
    "framer-motion": "^12.0.0"
  }
}
```

_Quelle: [electron-vite NPM](https://www.npmjs.com/package/electron-vite) | [electron-store NPM](https://www.npmjs.com/package/electron-store)_

---

## Forschungs-Synthese und Abschließende Empfehlungen

### Executive Summary

Diese Recherche hat das im MVP beschriebene State-Management-Konzept für WhisperFlow – eine Electron-basierte Voice-to-Text Desktop-App mit mehreren synchronisierten Windows – umfassend bewertet und mit dem Stand der Technik (Feb 2026) verifiziert.

**Kernbefund:** Das MVP-Konzept ist **technisch solide und zukunftsfähig**. Die Kombination NanoStores + `@janhendry/nanostore-ipc-bridge` + `electron-store` löst das Multi-Window State-Synchronisierungsproblem elegant mit minimalem Boilerplate. Die kritischste Beobachtung: `@janhendry/nanostore-ipc-bridge` ist eine **Eigenentwicklung** (ursprünglich `@whisperflow/nanostore-ipc-bridge`) im Alpha-Stadium – dies ist kein Ausschlusskriterium, aber erfordert aktives Maintenance-Commitment.

---

### Top-5 Strategische Empfehlungen

**1. ✅ MVP-Konzept umsetzen – mit bewussten Guards**
NanoStores + nanostore-ipc-bridge ist die richtige Wahl für WhisperFlow. `syncedAtom()` + `defineService()` bietet das beste Kosten-Nutzen-Verhältnis. Einzige Ergänzung: explizit sicherstellen, dass Audio-Level-Meter **nicht** als syncedAtom läuft.

**2. ✅ electron-store als Persistenz-Layer ergänzen**
Klare Trennung: Live-State (NanoStores) vs. persistierte Konfiguration (electron-store). Settings beim Start laden → in syncedAtom kopieren → bei User-Aktion zurückschreiben.

**3. ✅ Custom State Machine für Recording (keine XState-Abhängigkeit)**
6 States mit klaren Transitions ist beherrschbar ohne XState-Overhead (130KB+ Bundle). Guards als pure Functions auf syncedAtom, Transitions nur im Main Process ausführen.

**4. ⚠️ nanostore-ipc-bridge absichern**

- Version pinnen: `"@janhendry/nanostore-ipc-bridge": "0.1.0-alpha.2"`
- Sync-Tests schreiben (gemocktes Electron-Environment via Vitest)
- Fallback dokumentieren: Falls Bridge wegfällt → ~50 LOC eigene Implementierung (Pattern aus Abschnitt 5.5)

**5. ✅ electron-vite als Build-Foundation**
`npm create @quick-start/electron@latest --template react-ts` als Startpunkt. Isolierter Build für Main/Preload/Renderer, Vite HMR beschleunigt Entwicklung signifikant.

---

### Vollständige Technologie-Stack-Empfehlung

| Schicht           | Technologie          | Version       | Begründung                          |
| ----------------- | -------------------- | ------------- | ----------------------------------- |
| **Runtime**       | Electron             | ^34.0         | Aktuell, macOS+Windows              |
| **Build**         | electron-vite        | ^5.0          | Vite-powered, HMR, isolierter Build |
| **Packaging**     | electron-builder     | ^25.0         | macOS Notarization, Windows NSIS    |
| **Live State**    | NanoStores           | ^1.1.0        | Minimal, reaktiv, TypeScript        |
| **IPC Sync**      | nanostore-ipc-bridge | 0.1.0-alpha.2 | Eigenentwicklung, Zero-Config       |
| **Persistenz**    | electron-store       | ^11.0.2       | Reif, 235K Downloads/Woche          |
| **State Machine** | Custom (NanoStores)  | –             | Kein XState-Overhead für 6 States   |
| **UI Framework**  | React                | ^19.0.0       | TypeScript-First, großes Ökosystem  |
| **UI Components** | Radix UI + Tailwind  | latest        | Accessibility, unstyled Basis       |
| **Animations**    | Framer Motion        | ^12.0         | HUD-Animationen                     |
| **Testing**       | Vitest + Playwright  | latest        | Gleiche Vite-Config, Electron E2E   |
| **Sprache**       | TypeScript           | ^5.7          | Durchgängige Typsicherheit          |

---

### Implementierungs-Roadmap (Empfohlen)

**Phase 1 – Foundation (Sprint 1-2)**

- [ ] electron-vite + React 19 + TypeScript Scaffold
- [ ] nanostore-ipc-bridge Setup: `initNanoStoreIPC()`, `exposeNanoStoreIPC()`
- [ ] Core Stores definieren: `$recordingState`, `$settings`
- [ ] Recording State Machine (Guards + Transitions)
- [ ] GlobalShortcut Manager

**Phase 2 – Core Features (Sprint 3-5)**

- [ ] FFmpegAdapter (Mic Recording zuerst)
- [ ] HUD Window mit State-Visualisierung
- [ ] WhisperAPIAdapter + TranscriptionService
- [ ] Clipboard-Integration
- [ ] electron-store Settings-Persistenz

**Phase 3 – Multi-Window (Sprint 6-7)**

- [ ] Settings Window
- [ ] Snackbar Window (dediziertes Window)
- [ ] History Window + TranscriptionRepository
- [ ] System Audio + Dual Recording (BlackHole macOS)

**Phase 4 – Polish (Sprint 8)**

- [ ] Dependency Check (FFmpeg/BlackHole)
- [ ] LLM Post-Processing
- [ ] macOS Notarization + Windows Code Signing
- [ ] E2E Tests (Playwright)

---

### Offene Forschungsfragen

1. **`nanostore-ipc-bridge` Stability:** Wann erscheint v1.0.0 stable? Was sind Breaking Changes zwischen Alpha-Versionen?
2. **Windows WASAPI Integration:** Wie verhält sich DirectShow für System-Audio auf Windows vs. BlackHole auf macOS? (Separate Recherche empfohlen)
3. **Electron 34 Security Updates:** Gibt es neue `contextBridge`-Einschränkungen in Electron 34+?
4. **React 19 Concurrent Features:** Welche Auswirkungen hat React 19's `use()` Hook auf `useStore()` von NanoStores?

---

_Vollständige Recherche abgeschlossen am 2026-02-21._  
_Quellen: [Electron Docs](https://www.electronjs.org/docs/latest/) | [NanoStores](https://github.com/nanostores/nanostores) | [nanostore-ipc-bridge](https://github.com/janhendry/nanostore-ipc-bridge) | [electron-store](https://www.npmjs.com/package/electron-store) | [electron-vite](https://electron-vite.org/) | [XState](https://www.npmjs.com/package/xstate) | [electron-redux](https://www.npmjs.com/package/electron-redux)_
