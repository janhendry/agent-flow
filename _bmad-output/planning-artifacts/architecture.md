---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-21'
inputDocuments:
  - "docs/MVP.md"
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/planning-artifacts/research/technical-electron-architecture-patterns-whisperflow-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-electron-react-vite-toolchain-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-electron-react-vite-initial-setup-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-electron-ipc-integration-patterns-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-electron-state-management-multi-window-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-electron-dev-workflow-testing-tooling-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-ffmpeg-electron-npm-vs-byof-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-ffmpeg-webm-opus-pipeline-best-practices-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-ffmpeg-macos-audio-capture-system-mic-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/nanostore-ipc-bridge — Ausführlicher Usage Guide.md"
workflowType: 'architecture'
project_name: 'agent-flow'
user_name: 'Yoda'
date: '2026-02-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

39 Functional Requirements (FR1–FR39) verteilt auf 8 Kategorien:

| Kategorie                 | FRs       | Tier                                |
| ------------------------- | --------- | ----------------------------------- |
| Audio Recording           | FR1–FR7   | T1: FR1, FR4–FR6; T2: FR2, FR3, FR7 |
| Transkription             | FR8–FR11  | T1: FR8; T2: FR9–FR11               |
| Output & Clipboard        | FR12–FR14 | T1: FR12; T2: FR13–FR14             |
| System Tray & Shortcuts   | FR15–FR19 | T1: FR15–FR18; T2: FR19             |
| HUD & Feedback            | FR20–FR24 | T1 komplett                         |
| Settings & Konfiguration  | FR25–FR29 | T1: FR25–FR27; T2: FR28–FR29        |
| Onboarding & Erster Start | FR30–FR34 | T1 komplett                         |
| Storage, Auto-Update      | FR35–FR39 | T2: FR35–FR37; T1: FR38–FR39        |

Architektonische Implikation: Tier-1-Scope ist klar abgrenzbar. Die Architektur muss Tier-2-Features (BlackHole, History, LLM) ermöglichen, ohne Tier-1-Implementierung zu belasten.

**Non-Functional Requirements:**

| NFR  | Anforderung                                | Architektonische Konsequenz                                         |
| ---- | ------------------------------------------ | ------------------------------------------------------------------- |
| NFR1 | Shortcut-Reaktion <200ms                   | Shortcut-Handling im Main Process, kein Renderer-Roundtrip          |
| NFR2 | App startet ohne merkliche Verzögerung     | Lazy Loading, minimaler Startup-Overhead                            |
| NFR3 | FFmpeg-Encoding schneller als Echtzeit     | Asynchroner Subprozess, kein Blocking im Main Thread                |
| NFR4 | <50MB RAM, <1% CPU im Idle                 | Kein unnötiges Polling, effiziente IPC-Kommunikation                |
| NFR5 | Keine Memory Leaks bei Dauerbetrieb        | Sauberes Ressourcen-Management, explizite Cleanup-Routinen          |
| NFR6 | Shortcuts nach Sleep/Wake neu registrieren | Event-Listener auf macOS Power-Events                               |
| NFR7 | API-Fehler: klare Meldung, kein Absturz    | Try/Catch in gesamter Transcription-Pipeline, IPC-Error-Propagation |
| NFR8 | Respektiert macOS Accessibility-Settings   | Reduced Motion Flag auslesen, bedingte Animationen                  |

**Scale & Complexity:**

WhisperFlow ist eine fokussierte Medium-Complexity Desktop App. Keine Backend-Infrastruktur, kein Multi-User, keine Datenbank — aber signifikante native OS-Integration (Permissions, Shortcuts, Tray, Audio) und eine externe Binary (FFmpeg) als kritische Abhängigkeit.

- Primary domain: Desktop App / Developer Tooling (macOS-first, cross-platform Tier 3)
- Complexity level: **Medium** (native OS-Integration, Multi-Process Electron, externe API, externe Binary)
- Estimated architectural components: ~8 (Main Process Services, Renderer Windows, IPC Layer, Audio Pipeline, Transcription Service, Settings/Storage, Tray Manager, Platform Adapters)

### Technical Constraints & Dependencies

| Constraint                        | Details                                               | Implikation                                                                                                          |
| --------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Electron Multi-Process            | Main Process (Node) + Renderer (Chromium)             | Strikte IPC-Grenze, kein direktes DOM-aus-Main                                                                       |
| FFmpeg gebündelt                  | `ffmpeg-static` npm-Package, automatisch mitgeliefert | kein User-Install; `asarUnpack` Pflicht für `child_process.spawn()`; `dependency-check` prüft nur BlackHole (Tier 2) |
| Whisper API (Online-Only)         | OpenAI API, kein lokales Modell                       | Netzwerk-Fehlerbehandlung zwingend, API-Key-Management                                                               |
| macOS Permissions                 | Mikrofon + Accessibility (globale Shortcuts)          | Permission-State muss zur Laufzeit überwacht werden                                                                  |
| BlackHole (Tier 2, macOS)         | Virtuelles Audio-Device für System-Audio (macOS)      | Check + Setup-Guidance im Onboarding, optional; User muss BlackHole installieren                                     |
| WASAPI Loopback (Tier 2, Windows) | Nativ in Windows via `-f wasapi -loopback 1`          | Kein User-Install nötig — direkt via FFmpeg; einfacher als BlackHole auf macOS                                       |
| Kein permanentes Fenster          | App lebt im System Tray                               | BrowserWindow-Lifecycle für HUD, Settings, Onboarding                                                                |
| Cross-Platform Tier 3             | Windows-Port ohne Core-Refactoring                    | Platform-Abstraction-Layer von Anfang an                                                                             |

### Cross-Cutting Concerns Identified

1. **IPC-Protokoll (Main ↔ Renderer):** Alle Recording-State-Änderungen, Shortcut-Events und API-Ergebnisse laufen über IPC. Das Protokoll muss klar strukturiert und typsicher sein — Grundlage für Konsistenz aller AI-Agent-Implementierungen.

2. **Error Handling & User Feedback:** Fehlerzustände entstehen im Main Process (FFmpeg, API, Permissions), müssen aber im HUD (Renderer) sichtbar werden. Konsistente Error-Propagation ist architekturweit relevant.

3. **Platform Abstraction:** Shortcut-Handling, Audio-Capture und Tray-Verhalten brauchen Adapter-Pattern. macOS-Implementierungen dürfen nicht direkt in Business-Logik eingebettet sein.

4. **Permission Lifecycle:** macOS-Permissions (Mikrofon, Accessibility) können jederzeit widerrufen werden. Die Architektur muss das laufend prüfen, nicht nur beim Start.

5. **FFmpeg Process Management:** FFmpeg läuft als Kindprozess — Lifecycle, Cleanup und Error-Handling dieses Subprozesses muss robust sein, inkl. Cleanup bei App-Crash.

6. **Window Lifecycle Management:** HUD, Settings und Onboarding sind kurzlebige BrowserWindow-Instanzen. Ihre Erstellung, Positionierung und Zerstörung muss zentral verwaltet werden.

## Starter Template Evaluation

### Primary Technology Domain

Desktop App (Electron, macOS-first, cross-platform Tier 3) — basierend auf PRD/MVP-Analyse.

### Starter Options Considered

| Option                             | Status                                           | Bewertung                                    |
| ---------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| **electron-vite CLI (`react-ts`)** | ✅ Aktiv (v5.0.0, Dez 2025, 66k Downloads/Woche) | **Empfohlen**                                |
| Electron Forge + Vite Template     | ✅ Offiziell gepflegt                            | Schwergewichtig, forge-eigene Build-Pipeline |
| electron-react-boilerplate         | ❌ Veraltet (letztes Release Mai 2022, Webpack)  | Nicht verwenden                              |

### Selected Starter: Electron Forge — vite-typescript Template

**Rationale:** Electron Forge bietet nativ integrierte Build-Pipeline, Code Signing, Auto-Update und Publishing. Distribution ist first-class, kein separates electron-builder Setup nötig. Entscheidung in Schritt 4 — ursprünglich electron-vite CLI evaluiert, dann zugunsten Forge revidiert.

**Initialization Command:**

```bash
npx create-electron-app@latest whisper-flow --template=vite-typescript
cd whisper-flow && npm install && npm run dev
```

**Architectural Decisions Provided by Starter:**

| Bereich              | Entscheidung                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime**          | Electron (aktuell: Electron 34, Chromium 132)                                                                                                                                     |
| **Framework**        | React 19 + TypeScript 5.x                                                                                                                                                         |
| **Build-Tool**       | Vite via Forge Vite Plugin                                                                                                                                                        |
| **Projektstruktur**  | `src/main/` · `src/preload/` · `src/renderer/`                                                                                                                                    |
| **IPC / State Sync** | `@janhendry/nanostore-ipc-bridge` — `initNanoStoreIPC()` in main.ts, `exposeNanoStoreIPC()` in preload.ts (ersetzt manuellen contextBridge-Boilerplate), `useStore()` in Renderer |
| **Distribution**     | Electron Forge — Build, Code Signing, Auto-Update, Publishing nativ integriert                                                                                                    |

**Zusätzliche Dependencies (manuell hinzufügen):**

| Kategorie            | Library                                                                | Begründung                                                                                                    |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **State Management** | `nanostores` + `@nanostores/react` + `@janhendry/nanostore-ipc-bridge` | Single Source of Truth im Main Process, reaktive Multi-Window-Sync, Race-Condition-frei via Revision Tracking |
| **Persistenz**       | `electron-store`                                                       | Settings, API Key, Shortcuts — getrennt vom Live-State                                                        |
| **FFmpeg**           | `ffmpeg-static` ^5.3.0                                                 | Gebündelte Binary (macOS ARM64/x64, Windows x64), kein User-Setup nötig                                       |
| **OpenAI Client**    | `openai` ^4.20.0                                                       | Whisper API + GPT Post-Processing                                                                             |
| **Validation**       | `zod` ^3.x                                                             | Settings-Validation, API-Response-Schemas                                                                     |
| **Logging**          | `electron-log`                                                         | Strukturiertes Logging in Main + Renderer (~/Library/Logs/WhisperFlow/)                                       |
| **Styling**          | Tailwind CSS + Radix UI                                                | Aus MVP Sektion 5.5                                                                                           |
| **Animation**        | Framer Motion                                                          | HUD-State-Transitions (Recording → Transcribing → Done)                                                       |
| **Testing**          | Vitest                                                                 | Kritische Unit Tests — kein Playwright                                                                        |

**Note:** Projekt-Initialisierung mit diesem Befehl ist die erste Implementation Story.

## Core Architectural Decisions

### Decision Priority Analysis

**Kritische Entscheidungen (blockieren Implementation):**

- Starter / Build-System: Electron Forge
- State Management / IPC: NanoStores + nanostore-ipc-bridge
- API Key Security: electron.safeStorage
- Window Management: Window Manager Service
- IPC Channel Prefix: `'whisperflow'`

**Wichtige Entscheidungen (prägen Architektur):**

- Audio File Strategy: app.getPath('userData')
- Audio Platform Adapter: Abstraktion für Tier-2 System-Audio
- Testing: Vitest (kritische Unit Tests only)

**Aufgeschobene Entscheidungen (Post-MVP):**

- History Storage Schema (Tier 2)
- LLM Post-Processing Provider (Tier 2)
- Windows WASAPI-Adapter (Tier 2 — Adapter-Schnittstelle ist vorbereitet, Implementierung deferred bis Windows-Port)

---

### IPC Framework Configuration

**`channelPrefix: 'whisperflow'`** — muss in Main, Preload und allen `syncedAtom()`-Optionen identisch gesetzt sein

```typescript
// src/main/index.ts
initNanoStoreIPC({
  channelPrefix: "whisperflow",
  enableLogging: isDev,
  autoRegisterWindows: true,
});

// src/preload/index.ts
exposeNanoStoreIPC({ channelPrefix: "whisperflow" });
```

---

### Audio Platform Adapter

**Pattern:** Abstraktion über `AudioCaptureAdapter` Interface — Tier-1 nur Mic, Tier-2 erweiterbar ohne Core-Refactoring

```typescript
// shared/types/audio.types.ts
export interface AudioCaptureAdapter {
  startCapture(mode: RecordingMode): Promise<void>;
  stopCapture(): Promise<string>; // returns file path
  isAvailable(): Promise<boolean>;
  checkDependencies(): Promise<DependencyStatus>;
}

// Tier 1: src/main/lib/adapters/mic-capture.adapter.ts
// Implements AudioCaptureAdapter using FFmpeg mic input

// Tier 2 (macOS): src/main/lib/adapters/blackhole-capture.adapter.ts
// Implements AudioCaptureAdapter using BlackHole virtual device

// Tier 2 (Windows): src/main/lib/adapters/wasapi-capture.adapter.ts
// Implements AudioCaptureAdapter using Windows WASAPI loopback (nativ, kein Drittanbieter-Treiber)
```

**Adapter-Selektion in `audio-device.lib.ts`:**

```typescript
export function getAudioAdapter(mode: RecordingMode): AudioCaptureAdapter {
  if (mode === 'mic') return new MicCaptureAdapter();
  if (mode === 'system' || mode === 'dual') {
    if (process.platform === 'darwin') return new BlackHoleCaptureAdapter(); // Tier 2 — BlackHole virtual device
    if (process.platform === 'win32') return new WasapiCaptureAdapter(); // Tier 2 — WASAPI Loopback nativ
    throw new AppError({ code: 'PLATFORM_NOT_SUPPORTED', ... });
  }
}
```

**Tier-1-Impl:** Nur `MicCaptureAdapter` implementiert. `BlackHoleCaptureAdapter` und `WasapiCaptureAdapter` als Stub-Dateien anlegen mit `throw new AppError({ code: 'NOT_IMPLEMENTED' })` — verhindert, dass Tier-2-Agents von Grund auf neu strukturieren.

- Affects: `audio-device.lib.ts`, `recording.service.ts`, `dependency-check.lib.ts`
- Tier-2-Aufwand macOS: `blackhole-capture.adapter.ts` implementieren + `dependency-check` erweitern (BlackHole muss installiert sein)
- Tier-2-Aufwand Windows: `wasapi-capture.adapter.ts` implementieren — WASAPI Loopback ist nativ (`-f wasapi -loopback 1`), kein User-Install nötig

---

### Security

**API Key Storage: `electron.safeStorage`**

- OS-Keychain-Integration (macOS Keychain, Windows Credential Store) — API Key wird nie im Klartext auf Disk gespeichert
- Implementierung: `electron.safeStorage.encryptString(apiKey)` → verschlüsselter Buffer in `electron-store`; Entschlüsselung nur zur Laufzeit im Main Process
- Affects: Settings Service (Main Process), Onboarding Flow, Whisper API Service

---

### Data / File Management

**Audio File Strategy: `app.getPath('userData')`**

- Tier 1: WAV-Rohdateien + WebM/Opus-Encoded werden in `userData/recordings/temp/` abgelegt, nach erfolgreichem API-Call sofort gelöscht
- Tier 2: Persistente Aufnahmen in `userData/recordings/history/` mit Metadaten (Timestamp, Dauer, Modus)
- Rationale: Mehr Kontrolle als `os.tmpdir()`, bildet natürliche Basis für Tier-2-History ohne Refactoring
- Affects: FFmpeg Service, Transcription Service, History Service (Tier 2)

---

### Window Management

**Window Manager Service — Main Process Singleton-Registry**

- Zentrales `Map<WindowName, BrowserWindow>` im Main Process
- Verantwortlich für: Erstellung, Caching, Positionierung, Show/Hide, Destroy
- Fenster-Typen: `hud`, `settings`, `onboarding`, `snackbar`, `history` (Tier 2)
- Verhindert: Mehrfach-Instanzen, verwaiste Fenster, inkonsistente Positionen
- Pattern: Lazy Init — Fenster wird beim ersten Aufruf erstellt, danach gecacht und nur show/hide
- Affects: Alle BrowserWindow-Interaktionen, Tray-Menu-Aktionen, Shortcut-Handler

---

### Distribution & Build

**Electron Forge — vite-typescript Template**

- Build: Forge Vite Plugin (Vite als Build-Tool, Forge als Orchestrator)
- Code Signing: macOS Developer ID via Forge `@electron-forge/maker-dmg` + `@electron-forge/maker-zip`
- Auto-Update: Electron Forge integrierter Update-Mechanismus (kein `electron-updater`, kein `update-electron-app`)
- CI/CD: GitHub Actions — Build + Sign + Release auf Tag-Push
- Distribution: Direct Download (DMG für macOS, ZIP als Fallback) — kein Mac App Store (inkompatibel mit FFmpeg + BlackHole)
- Affects: gesamter Release-Prozess, FR38/FR39 (Auto-Update)

**macOS Hardened Runtime + Notarization:**

```xml
<!-- entitlements.mac.plist — Pflicht für Notarization >
<key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
<!-- Electron benötigt dies -->

<key>com.apple.security.cs.disable-library-validation</key><true/>
<!-- KRITISCH: Erlaubt ffmpeg-static Binary unter Hardened Runtime -->
<!-- Ohne dies: macOS verweigert child_process.spawn(ffmpegPath) -->

<key>com.apple.security.device.audio-input</key><true/>
<!-- Mikrofon-Zugriff -->

<key>com.apple.security.device.audio-output</key><true/>
<!-- System-Audio Capture (BlackHole, Tier 2) -->
```

**`asarUnpack` Pflicht im `forge.config.ts`:**

```typescript
// forge.config.ts
extraResource: ['node_modules/ffmpeg-static/ffmpeg'],
// ODER asarUnpack: ['**/node_modules/ffmpeg-static/**']
// → FFmpeg-Binary muss außerhalb des ASAR-Archivs liegen
// → child_process.spawn() benötigt echten Dateisystem-Pfad
```

---

### Recording Pipeline State Machine (FSM)

**Pattern:** Eigene TypeScript-Klasse `RecordingStateMachine` — kein XState (zu viel Overhead für diesen Use-Case)

**Datei:** `src/main/lib/recording-state-machine.ts`

**Zustände und Bedeutung:**

| Zustand       | Bedeutung                                                   | HUD-Anzeige                 | Erlaubte Übergänge     |
| ------------- | ----------------------------------------------------------- | --------------------------- | ---------------------- |
| `IDLE`        | Ruhezustand, Shortcuts aktiv                                | — (HUD versteckt)           | `START`                |
| `RECORDING`   | FFmpeg-Prozess läuft, Audio wird aufgenommen                | 🔴 Roter Punkt + Audiometer | `STOP`, `ERROR`        |
| `ENCODING`    | FFmpeg-Prozess beendet, WAV → WebM/Opus Konvertierung läuft | ⏳ "Verarbeite..."          | `ENCODED`, `ERROR`     |
| `UPLOADING`   | HTTP-Request an Whisper API läuft                           | ⏳ "Transkribiere..."       | `TRANSCRIBED`, `ERROR` |
| `TRANSCRIBED` | Text im Clipboard, Erfolg                                   | ✅ Grünes Häkchen (~3s)     | `RESET`                |
| `ERROR`       | Fehler aufgetreten, trägt `AppError` als Payload            | ❌ Fehlermeldung            | `RESET`                |

**Warum `ENCODING` als eigener Zustand:**

- Bei langen Aufnahmen (5+ Minuten) dauert die Konvertierung 3–5 Sekunden — ohne eigenen Zustand hängt der HUD scheinbar
- Fehler in `ENCODING` (FFmpeg-Crash) sind nicht retryable — Fehler in `UPLOADING` (API-Timeout) sind retryable → unterschiedliches Error-Handling
- `STOP` in `ENCODING` ignorieren (kein doppelter Stop-Aufruf möglich)

**Verbotene Übergänge (werden silent ignoriert):**

- `START` in `RECORDING` → verhindert doppelten FFmpeg-Prozess bei schnellem Doppel-Shortcut
- `START` in `ENCODING` / `UPLOADING` → Pipeline läuft, neues Recording erst nach `RESET` möglich
- `STOP` ohne aktives Recording

```typescript
// src/main/lib/recording-state-machine.ts
export type RecordingStatus =
  | "idle"
  | "recording"
  | "encoding"
  | "uploading"
  | "transcribed"
  | "error";

type FSMEvent =
  | "START"
  | "STOP"
  | "ENCODED"
  | "TRANSCRIBED"
  | "ERROR"
  | "RESET";

const ALLOWED_TRANSITIONS: Record<RecordingStatus, FSMEvent[]> = {
  idle: ["START"],
  recording: ["STOP", "ERROR"],
  encoding: ["ENCODED", "ERROR"],
  uploading: ["TRANSCRIBED", "ERROR"],
  transcribed: ["RESET"],
  error: ["RESET"],
};

export class RecordingStateMachine {
  private _state: RecordingStatus = "idle";

  get state(): RecordingStatus {
    return this._state;
  }

  transition(event: FSMEvent): boolean {
    if (!ALLOWED_TRANSITIONS[this._state].includes(event)) {
      console.warn(`[FSM] Ignored: ${event} in state ${this._state}`);
      return false;
    }
    this._state = this.nextState(event);
    return true;
  }

  private nextState(event: FSMEvent): RecordingStatus {
    switch (event) {
      case "START":
        return "recording";
      case "STOP":
        return "encoding";
      case "ENCODED":
        return "uploading";
      case "TRANSCRIBED":
        return "transcribed";
      case "ERROR":
        return "error";
      case "RESET":
        return "idle";
    }
  }
}
```

**Integration mit `$recordingState` Store:**

- `RecordingStateMachine` lebt als Singleton in `recording.service.ts` (Main Process)
- Nach jedem erfolgreichen `transition()` → `recordingActions.setState(fsm.state)` → NanoStore broadcast an alle Renderer
- `RecordingStatus` ist der `state`-Wert im `$recordingState` Store — identische Type

**Testbarkeit:** `recording-state-machine.test.ts` in `src/__tests__/` — alle Übergänge + alle verbotenen Übergänge als Vitest-Unit-Tests

---

### Testing Strategy

**Vitest — kritische Unit Tests only, primär manuelles Testing**

- Rationale: Solo/Small-Team Open-Source-Projekt — Test-Overhead nur wo echter Mehrwert
- Unit Tests (Vitest): Kritische Business-Logik — Audio-Pipeline State Machine, FFmpeg Error Handling, IPC-Protokoll-Validierung, safeStorage Encrypt/Decrypt
- Kein Playwright, kein E2E-Framework
- Primäre Qualitätssicherung: Manuelles Testen der User Journeys
- Affects: CI-Pipeline (nur Vitest-Run), kein Playwright-Setup nötig

## Implementation Patterns & Consistency Rules

### Identifizierte Konfliktpunkte

7 Bereiche, in denen AI Agents ohne explizite Regeln inkonsistente Entscheidungen treffen würden.

---

### IPC Channel Naming

**Pattern:** `namespace:action` — gilt als Namenskonvention für Service-Methoden, broadcast-Event-Namen und direkte Electron-IPC-Handler außerhalb des Frameworks.

Alle Kanal-Namen als **TypeScript `const`** in `shared/types/ipc.types.ts` definiert — nie als Magic Strings im Code.

```typescript
// shared/types/ipc.types.ts

// Direkte Electron-IPC Channels (außerhalb des nanostore-ipc-bridge Frameworks)
export const IPC = {
  WINDOW: {
    SHOW_HUD: "window:show-hud",
    HIDE_HUD: "window:hide-hud",
    SHOW_SETTINGS: "window:show-settings",
  },
  SHORTCUT: {
    TRIGGERED: "shortcut:triggered",
  },
  TRAY: {
    UPDATE_ICON: "tray:update-icon",
  },
} as const;

// Service-IDs für defineService() — werden vom Framework intern verwendet
export const SERVICE_IDS = {
  RECORDING: "recording",
  TRANSCRIPTION: "transcription",
  SETTINGS: "settings",
  CLIPBOARD: "clipboard",
  WINDOW: "window",
} as const;

// Store-IDs für syncedAtom() — global eindeutig
export const STORE_IDS = {
  RECORDING_STATE: "recordingState",
  HUD_VISIBLE: "hudVisible",
  HUD_STATE: "hudState",
  SETTINGS: "settings",
  SNACKBAR_QUEUE: "snackbarQueue",
} as const;
```

- Das `@janhendry/nanostore-ipc-bridge` Framework übernimmt IPC-Routing für alle Stores und Services automatisch
- Direkte `ipcMain.handle()` / `ipcMain.on()` nur für Channels in `IPC.*` — nie für Store- oder Service-Kommunikation
- Verwendung: `ipcMain.on(IPC.WINDOW.SHOW_HUD, ...)` — nie `ipcMain.on('window:show-hud', ...)`

---

### NanoStore Naming

**Pattern:** `$camelCase` Prefix

```typescript
$recordingState; // syncedAtom<RecordingState>
$hudVisible; // syncedAtom<boolean>
$hudState; // syncedAtom<HudState>
$settings; // syncedAtom<AppSettings>
$transcriptionQueue; // syncedAtom<TranscriptionJob[]>
$snackbarQueue; // syncedAtom<SnackbarMessage[]>
```

- Alle Stores mit `$` Prefix — sofort als Store erkennbar
- Stores via `syncedAtom()` aus `@janhendry/nanostore-ipc-bridge/universal` — kein manuelles IPC-Mapping
- Stores in `shared/stores/` (Root-Ebene, nicht `src/`) — damit Main UND Renderer via `@shared` Alias importieren können
- Store-Dateien: `recording.store.ts`, `hud.store.ts`, `settings.store.ts`

**Actions-Pattern:** Stores werden **ausschließlich über Actions mutiert** — nie direkt via `store.set()` im Service-Code.

```typescript
// shared/stores/actions/recording.actions.ts
import { $recordingState } from "../recording.store";

export const recordingActions = {
  setState(state: RecordingStatus) {
    $recordingState.set({ ...$recordingState.get(), state });
  },
  setMode(mode: RecordingMode) {
    $recordingState.set({ ...$recordingState.get(), mode });
  },
  setError(error: AppError | null) {
    $recordingState.set({ ...$recordingState.get(), error });
  },
  reset() {
    $recordingState.set({
      state: "idle",
      mode: null,
      error: null,
      recordingId: null,
    });
  },
};
```

Ordnerstruktur:

```
shared/stores/
  recording.store.ts
  hud.store.ts
  settings.store.ts
  snackbar.store.ts
  actions/
    recording.actions.ts
    hud.actions.ts
    settings.actions.ts
    snackbar.actions.ts
```

- Services und Orchestratoren importieren Actions: `import { recordingActions } from '@shared/stores/actions/recording.actions'`
- Renderer liest Stores via `useStore($recordingState)` — schreibt nie direkt

---

### Shared TypeScript Types

**Pattern:** `src/shared/types/` Ordner

```
shared/types/          # Root-Ebene — via @shared Alias erreichbar
  index.ts             # Barrel Export
  ipc.types.ts         # IPC, SERVICE_IDS, STORE_IDS Consts + Payload Types
  recording.types.ts   # RecordingStatus ('idle'|'recording'|'encoding'|'uploading'|'transcribed'|'error'), RecordingState (Store-Shape), RecordingMode, AudioDevice
  transcription.types.ts # TranscriptionJob, TranscriptionResult
  settings.types.ts    # AppSettings, ShortcutConfig
  hud.types.ts         # HudState, HudConfig
  error.types.ts       # AppError, ErrorCode
  window.types.ts      # WindowName, WindowConfig
```

- `shared/` liegt auf Root-Ebene (parallel zu `src/`) — nicht innerhalb von `src/`
- Zugriff via `@shared` Vite/TypeScript-Alias: `import type { RecordingState } from '@shared/types'`
- Alle shared Types nur aus `@shared/types` importieren — nie inline definieren
- Barrel-Export via `shared/types/index.ts`

**`AppSettings` Interface (vollständig, Basis für `settings.types.ts`):**

```typescript
export interface AppSettings {
  // Whisper API
  whisper: {
    apiKey: string;
    baseURL?: string; // Custom Endpoint/Proxy
    model: "gpt-4o-mini-transcribe" | "whisper-1"; // Default: gpt-4o-mini-transcribe
    transcriptionPrompt?: string; // Glossar/Stil-Text (50-200 Wörter)
    temperature?: number;
  };

  // LLM Post-Processing (Tier 2)
  llm: {
    apiKey: string;
    baseURL?: string; // Custom Endpoint/Proxy
    model: "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo" | "gpt-3.5-turbo"; // Default: gpt-4o-mini
    enabled: boolean;
    postProcessingPrompt: string;
  };

  // Recording
  recordingQuality: "low" | "medium" | "high";
  maxRecordingDuration: number; // Sekunden, Warnung bei >40 Min
  defaultRecordingMode: "mic" | "output" | "dual";
  audioDevices: {
    micDevice?: string;
    outputDevice?: string;
    fallbackToDefault: boolean;
  };

  // UI
  theme: "light" | "dark" | "system";
  hudEnabled: boolean;
  hudPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  hudOpacity: number;

  // Shortcuts
  shortcuts: {
    micRecording: string; // Default: Cmd+Shift+M
    outputRecording: string; // Default: Cmd+Shift+O
    dualRecording: string; // Default: Cmd+Shift+D
    codeReviewRecording: string; // Default: Cmd+Option+C (Tier 2)
  };

  // Storage
  deleteAudioAfterDays: number | null; // null = nie löschen
  deleteTranscriptionAfterDays: number | null;
  keepFavorites: boolean;

  // Dependencies (readonly, von DependencyCheck gesetzt)
  dependencyStatus: {
    blackhole?: "installed" | "missing"; // nur macOS; FFmpeg immer 'installed' (gebündelt)
  };
}
```

- `whisper.model` Default: `'gpt-4o-mini-transcribe'` — günstiger als `whisper-1`, ausreichend für Sprache
- `llm.*` Properties sind Tier-2 — in Tier-1-Implementation mit Defaults initialisieren, UI-Tab ausblenden
- `dependencyStatus.ffmpeg` existiert nicht mehr — FFmpeg immer verfügbar via `ffmpeg-static`

---

### Service-Struktur

**Pattern:** `*.service.ts` Suffix — gesplittet in zwei Ebenen

**`shared/services/`** — `defineService()` Wrapper (Main + Renderer):

```
shared/services/
  index.ts
  recording.service.ts     # defineService({ id: 'recording', handlers: {...} })
  transcription.service.ts # defineService({ id: 'transcription', handlers: {...} })
  settings.service.ts      # defineService({ id: 'settings', handlers: {...} })
  clipboard.service.ts     # defineService({ id: 'clipboard', handlers: {...} })
  window.service.ts        # defineService({ id: 'window', handlers: {...} })
```

**`src/main/lib/`** — Node/Electron-only Implementierungen (kein Renderer-Import):

```
src/main/lib/
  ffmpeg.lib.ts            # child_process, fs — nur vom recording.service aufgerufen
  audio-device.lib.ts      # Electron mediaDevices APIs
  safe-storage.lib.ts      # electron.safeStorage Encrypt/Decrypt
  electron-store.lib.ts    # electron-store Instanz
  shortcut.lib.ts          # globalShortcut Registration/Deregistration
  tray.lib.ts              # Tray Icon + Menu
  window-manager.lib.ts    # BrowserWindow Singleton-Registry
  dependency-check.lib.ts  # BlackHole check (macOS Tier 2) — FFmpeg ist gebündelt via ffmpeg-static
```

**Warum die Trennung:**

- `shared/services/` = `defineService()` Wrapper — muss von Renderer importierbar sein (bekommt RPC-Proxy)
- `src/main/lib/` = echte Node.js/Electron Implementierungen mit `child_process`, `fs`, `app` etc. — dürfen nie im Renderer-Kontext importiert werden
- Service-Handler in `shared/services/` rufen intern `lib/`-Module auf: Handler laufen nur in Main, daher sicher
- Services kommunizieren untereinander via direkte Imports (kein IPC zwischen Services)

---

### React Component Files (Renderer)

**Pattern:** `PascalCase.tsx`

```
src/renderer/
  components/
    HudWindow.tsx
    SettingsPanel.tsx
    OnboardingFlow.tsx
    SnackbarNotification.tsx
    AudioLevelMeter.tsx
  screens/
    SettingsScreen.tsx
    OnboardingScreen.tsx
  hooks/
    useRecordingState.ts
    useSettings.ts
  utils/
    format.ts
    platform.ts
```

- Hooks: `use` Prefix, `camelCase`, `.ts` (kein JSX)
- Utils: `camelCase`, `.ts`
- Kein Default-Export für Komponenten — nur Named Exports

---

### Error Handling

**Pattern:** Typed Error Objects via IPC

```typescript
// src/shared/types/error.types.ts
export type ErrorCode =
  | "FFMPEG_NOT_FOUND"
  | "FFMPEG_ENCODE_FAILED"
  | "API_KEY_INVALID"
  | "API_TIMEOUT"
  | "API_QUOTA_EXCEEDED"
  | "MICROPHONE_PERMISSION_DENIED"
  | "SHORTCUT_REGISTRATION_FAILED"
  | "RECORDING_ALREADY_ACTIVE";

export interface AppError {
  code: ErrorCode;
  message: string; // User-facing (deutsch oder englisch je nach config)
  recoverable: boolean; // true = Nutzer kann Aktion wiederholen
  details?: unknown; // Technische Details für Logging, nie dem Nutzer zeigen
}
```

- Main Process wirft nie rohe `Error` über IPC — immer `AppError`
- Renderer zeigt `message` im HUD/Snackbar — nie `code` oder `details`
- `recoverable: true` → HUD zeigt Retry-Option; `false` → nur Dismiss

---

### Async Patterns

**Pattern:** `async/await` überall — keine Ausnahmen

```typescript
// ✅ Korrekt
const result = await transcriptionService.transcribe(filePath);

// ❌ Verboten
transcriptionService.transcribe(filePath).then(result => { ... });

// ❌ Verboten
transcriptionService.transcribe(filePath, (err, result) => { ... });
```

- Alle `ipcMain.handle()` Handler sind `async`
- Alle Service-Methoden die I/O machen sind `async`
- `try/catch` in jedem async IPC-Handler — nie unhandled Rejections

---

### Enforcement: Was AI Agents IMMER müssen

1. IPC Channel Namen aus `shared/types/ipc.types.ts` (`IPC.*`, `SERVICE_IDS.*`, `STORE_IDS.*`) importieren — nie als String-Literal
2. Store-Mutations nur über Actions in `shared/stores/actions/` — nie direkt `store.set()` im Service-Code
3. Fehler als `AppError` über IPC senden — nie rohe `Error` oder String
4. Stores mit `$` Prefix benennen, via `syncedAtom()` in `shared/stores/` definieren
5. Types aus `@shared/types` importieren — nie inline definieren
6. `async/await` verwenden — kein `.then()`, keine Callbacks
7. `defineService()` Wrapper in `shared/services/` — Node/Electron Implementierungen in `src/main/lib/`
8. React-Komponenten als Named Exports mit `PascalCase.tsx`
9. Den `@shared` Alias für alle Imports aus `shared/` verwenden

## Project Structure & Boundaries

### Requirements → Structure Mapping

| FR-Kategorie                  | Hauptdateien                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audio Recording (FR1–FR7)     | `shared/services/recording.service.ts`, `src/main/lib/ffmpeg.lib.ts`, `src/main/lib/audio-device.lib.ts`, `shared/stores/recording.store.ts`               |
| Transkription (FR8–FR11)      | `shared/services/transcription.service.ts`, `src/main/lib/whisper-api.lib.ts`                                                                              |
| Output/Clipboard (FR12–FR14)  | `shared/services/clipboard.service.ts`                                                                                                                     |
| System Tray (FR15–FR16)       | `src/main/lib/tray.lib.ts`                                                                                                                                 |
| Globale Shortcuts (FR17–FR18) | `src/main/lib/shortcut.lib.ts`                                                                                                                             |
| HUD (FR20–FR24)               | `src/renderer/screens/HudWindow.tsx`, `src/renderer/components/AudioLevelMeter.tsx`, `shared/stores/hud.store.ts`                                          |
| Settings (FR25–FR27)          | `shared/services/settings.service.ts`, `src/main/lib/safe-storage.lib.ts`, `src/main/lib/electron-store.lib.ts`, `src/renderer/screens/SettingsScreen.tsx` |
| Onboarding (FR30–FR34)        | `src/renderer/screens/OnboardingScreen.tsx`, `src/main/lib/dependency-check.lib.ts`                                                                        |
| FFmpeg Pipeline               | `src/main/lib/ffmpeg.lib.ts` — `ffmpeg-static` Pfad via `import ffmpegPath from 'ffmpeg-static'`, Binary aus `process.resourcesPath` in Production         |
| Window Management             | `src/main/lib/window-manager.lib.ts`                                                                                                                       |

---

### Complete Project Directory Structure

```
whisper-flow/
├── package.json
├── forge.config.ts
├── vite.main.config.ts          # @shared Alias: shared/ → @shared
├── vite.preload.config.ts
├── vite.renderer.config.ts      # @shared Alias konfiguriert
├── tsconfig.json                # paths: { "@shared/*": ["shared/*"] }
├── .github/
│   └── workflows/
│       └── release.yml              # Build + Sign + Release on tag push
│
├── shared/                      # ◄ Main + Renderer — via @shared Alias
│   ├── types/
│   │   ├── index.ts
│   │   ├── ipc.types.ts             # IPC, SERVICE_IDS, STORE_IDS Consts + Payload Types
│   │   ├── recording.types.ts       # RecordingStatus, RecordingState (Store-Shape), RecordingMode, AudioDevice
│   │   ├── transcription.types.ts   # TranscriptionJob, TranscriptionResult
│   │   ├── settings.types.ts        # AppSettings, ShortcutConfig
│   │   ├── hud.types.ts             # HudState, HudConfig
│   │   ├── error.types.ts           # AppError, ErrorCode
│   │   └── window.types.ts          # WindowName, WindowConfig
│   ├── stores/
│   │   ├── index.ts
│   │   ├── recording.store.ts       # syncedAtom $recordingState, $recordingMode
│   │   ├── hud.store.ts             # syncedAtom $hudVisible, $hudState
│   │   ├── settings.store.ts        # syncedAtom $settings
│   │   ├── snackbar.store.ts        # syncedAtom $snackbarQueue
│   │   └── actions/
│   │       ├── recording.actions.ts     # recordingActions.*
│   │       ├── hud.actions.ts
│   │       ├── settings.actions.ts
│   │       └── snackbar.actions.ts
│   └── services/
│       ├── index.ts
│       ├── recording.service.ts     # defineService — ruft ffmpeg.lib + audio-device.lib auf
│       ├── transcription.service.ts # defineService — ruft whisper-api.lib auf
│       ├── settings.service.ts      # defineService — ruft safe-storage.lib + electron-store.lib auf
│       ├── clipboard.service.ts     # defineService — electron clipboard
│       └── window.service.ts        # defineService — ruft window-manager.lib auf
│
└── src/
    ├── main/
    │   ├── index.ts                 # initNanoStoreIPC() → import shared → init libs → createWindows
    │   └── lib/                     # ◄ Node/Electron-only — NIE im Renderer importiert
    │       ├── ffmpeg.lib.ts            # child_process, WAV→WebM/Opus Pipeline
    │       ├── audio-device.lib.ts      # Electron mediaDevices, Hot-plug, Adapter-Selektion
    │       ├── adapters/
    │       │   ├── mic-capture.adapter.ts       # Tier 1 — FFmpeg Mic Input
    │       │   ├── blackhole-capture.adapter.ts # Tier 2 — macOS BlackHole (Stub in Tier 1)
    │       │   └── wasapi-capture.adapter.ts    # Tier 2 — Windows WASAPI Loopback (Stub in Tier 1, nativ via -f wasapi -loopback 1)
    │       ├── whisper-api.lib.ts       # OpenAI Whisper API HTTP-Client
    │       ├── safe-storage.lib.ts      # electron.safeStorage Encrypt/Decrypt
    │       ├── electron-store.lib.ts    # electron-store Instanz + Schema
    │       ├── shortcut.lib.ts          # globalShortcut Registration + Sleep/Wake Handling
    │       ├── tray.lib.ts              # Tray Icon + Context Menu
    │       ├── window-manager.lib.ts    # BrowserWindow Singleton-Registry (Map<WindowName, BrowserWindow>)
    │       └── dependency-check.lib.ts  # FFmpeg binary check + path resolution
    ├── preload/
    │   └── index.ts                 # exposeNanoStoreIPC({ channelPrefix: 'whisperflow' })
    ├── renderer/
    │   ├── index.html
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── AudioLevelMeter.tsx      # Echtzeit-Pegel-Visualisierung
    │   │   ├── HudStateIcon.tsx         # Recording/Transcribing/Done/Error Icons
    │   │   └── SnackbarNotification.tsx
    │   ├── screens/
    │   │   ├── HudWindow.tsx            # Haupt-HUD mit allen States
    │   │   ├── SettingsScreen.tsx       # Settings Tabs
    │   │   └── OnboardingScreen.tsx     # First-Run-Flow
    │   ├── hooks/
    │   │   ├── useRecordingState.ts
    │   │   ├── useSettings.ts
    │   │   └── useHudState.ts
    │   └── utils/
    │       ├── format.ts
    │       └── platform.ts
    └── __tests__/                   # Vitest — nur kritische Unit Tests
        ├── ffmpeg.lib.test.ts
        ├── transcription.service.test.ts
        ├── safe-storage.lib.test.ts
        └── recording-state-machine.test.ts
```

---

### Architectural Boundaries

**`shared/` ↔ `src/main/lib/` Grenze:**

- `shared/services/*.service.ts` = `defineService()` Wrapper — importierbar von Main + Renderer
- Service-Handler rufen `src/main/lib/` auf — sicher, weil Handler nur in Main laufen
- `src/main/lib/` darf nie direkt im Renderer oder in `shared/` importiert werden

**`shared/` ↔ `src/renderer/` Grenze:**

- Renderer importiert Stores und Services via `@shared` Alias
- Renderer darf nie direkt `src/main/` importieren
- Renderer-spezifische Logik (Hooks, UI-Utils) bleibt in `src/renderer/`

**Main Process Init-Reihenfolge (`src/main/index.ts`):**

1. `initNanoStoreIPC({ channelPrefix: 'whisperflow' })` — zuerst
2. Shared Stores importieren (`@shared/stores`)
3. Shared Services importieren (`@shared/services`)
4. Libs initialisieren (electron-store, shortcut, tray)
5. Fenster erstellen via `window-manager.lib.ts`

### Integration Points

**Datenfluss Recording Flow (Tier 1):**

```
Shortcut-Event (shortcut.lib)
  → recordingService.start(mode) [shared/services]
    → ffmpeg.lib.ts startRecording()
    → $recordingState.set('recording') [store broadcast an alle Renderer]
  → HudWindow.tsx zeigt Recording-State
Shortcut-Event (stop)
  → recordingService.stop()
    → ffmpeg.lib.ts stopRecording() → WebM/Opus Datei
    → transcriptionService.transcribe(filePath)
      → whisper-api.lib.ts POST /audio/transcriptions
      → clipboardService.copy(result.text)
      → $hudState.set('success')
```

**External Integrations:**

- OpenAI Whisper API — via `whisper-api.lib.ts`, API Key via `safe-storage.lib.ts`
- FFmpeg binary — via `ffmpeg.lib.ts`, Pfad via `dependency-check.lib.ts`
- macOS Keychain — via `electron.safeStorage` in `safe-storage.lib.ts`
- macOS Accessibility — via Electron `globalShortcut` in `shortcut.lib.ts`
