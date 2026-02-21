# Technische Forschung: Electron + React + TypeScript Architektur-Patterns für WhisperFlow

**Datum:** 21. Februar 2026  
**Projekt:** WhisperFlow (macOS Voice-to-Text Desktop App)  
**Scope:** 8 architektonische Themenbereiche

---

## Übersicht

Dieses Dokument enthält strukturierte Forschungsergebnisse zu Best Practices für eine Electron + React + TypeScript Desktop-Applikation mit System Tray, HUD Overlay, mehreren Fenstern, FFmpeg Audio-Pipeline und Whisper API Transkription.

---

## 1. Electron Main Process Architektur

### Kernbefund

Die offizielle Electron-Dokumentation definiert den Main Process als alleinige Steuerinstanz für:

- Fenster-Lebenszyklen via `BrowserWindow`
- App-Lebenszyklen via `app`-Module
- Native OS-APIs (Menüs, Dialoge, Tray-Icons)
- IPC-Handler via `ipcMain`

**Empfohlenes Pattern: Service-Container / Channel-Handler Architektur** (Confidence: Hoch)

Das bewährteste Muster für nicht-triviale Electron-Apps ist eine **One-Class-Per-Channel**-Struktur, kombiniert mit Service-Klassen für domänenspezifische Logik:

```typescript
// src/main/services/AudioRecordingService.ts
export class AudioRecordingService {
  private ffmpegProcess: ChildProcess | null = null;

  async startRecording(outputPath: string): Promise<void> {
    /* ... */
  }
  async stopRecording(): Promise<Buffer> {
    /* ... */
  }
}

// src/main/ipc/RecordingChannel.ts
export class RecordingChannel implements IpcChannelInterface {
  constructor(private audioService: AudioRecordingService) {}

  getName() {
    return "recording:start";
  }

  handle(event: IpcMainEvent, request: IpcRequest): void {
    // Delegate an Service
  }
}

// src/main/main.ts
const audioService = new AudioRecordingService();
const transcriptionService = new TranscriptionService();

new Main().init([
  new RecordingChannel(audioService),
  new TranscriptionChannel(transcriptionService),
  new SettingsChannel(settingsManager),
]);
```

### Empfohlene Ordnerstruktur für Main Process

```
src/
  main/
    index.ts                  # Entry point
    ipc/                      # IPC-Channel-Handler (1 Klasse pro Channel)
      RecordingChannel.ts
      TranscriptionChannel.ts
      SettingsChannel.ts
    services/                 # Domänen-Services
      AudioRecordingService.ts
      TranscriptionService.ts
    managers/                 # Lifecycle-Manager (Singletons)
      WindowManager.ts
      TrayManager.ts
      ShortcutManager.ts
      SettingsManager.ts
    shared/
      IpcChannelInterface.ts
      IpcRequest.ts
```

### Quellen

- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron IPC Response/Request architecture with TypeScript – LogRocket](https://blog.logrocket.com/electron-ipc-response-request-architecture-with-typescript/)

---

## 2. Clean Architecture / Layered Architecture in Electron

### Kernbefund

Es gibt **kein offizielles Electron-native Architektur-Pattern**, aber die Community hat sich auf eine **3-Schichten-Architektur** konsolidiert, inspiriert von Clean Architecture / Hexagonal Architecture:

**Empfohlenes Schichtenmodell** (Confidence: Mittel-Hoch)

```
┌─────────────────────────────────────────────────┐
│  Presentation Layer (Renderer / React)           │
│  - React Components, Custom Hooks, Context      │
├─────────────────────────────────────────────────┤
│  Application Layer (Main Process Orchestration) │
│  - IPC Channels, Use Cases, Event Coordination  │
├─────────────────────────────────────────────────┤
│  Infrastructure Layer (OS + External APIs)       │
│  - AudioRecordingService (FFmpeg)               │
│  - TranscriptionService (Whisper API)           │
│  - SettingsManager (electron-store)             │
│  - WindowManager, TrayManager                   │
└─────────────────────────────────────────────────┘
```

### Konkrete Umsetzung für WhisperFlow

```
src/
  main/
    application/              # Application Layer: Use Cases
      StartRecordingUseCase.ts
      TranscribeAudioUseCase.ts
    domain/                   # Domain Layer: Interfaces + Entities
      interfaces/
        IAudioRecorder.ts
        ITranscriptionProvider.ts
        ISettingsRepository.ts
      entities/
        Recording.ts
        TranscriptionResult.ts
    infrastructure/           # Infrastructure Layer: Implementierungen
      audio/
        FFmpegRecorder.ts     # implements IAudioRecorder
      transcription/
        WhisperApiProvider.ts # implements ITranscriptionProvider
      settings/
        ElectronStoreSettings.ts
      windows/
        WindowManager.ts
        TrayManager.ts
  renderer/
    features/                 # Feature-basierte React-Struktur
      settings/
      overlay/
      history/
    shared/
      hooks/
      components/
```

### Quellen

- [LogRocket: Electron IPC Architecture with TypeScript](https://blog.logrocket.com/electron-ipc-response-request-architecture-with-typescript/)
- [Electron Process Model Official Docs](https://www.electronjs.org/docs/latest/tutorial/process-model)

---

## 3. Window Management Patterns

### Kernbefund

Electron's `BrowserWindow` unterstützt alle benötigten Window-Typen out-of-the-box. (Confidence: Hoch, offizielle Doku)

### Singleton Window Pattern (empfohlen für WhisperFlow)

```typescript
// src/main/managers/WindowManager.ts
export class WindowManager {
  private windows = new Map<string, BrowserWindow>();

  getOrCreate(name: string, factory: () => BrowserWindow): BrowserWindow {
    if (!this.windows.has(name) || this.windows.get(name)!.isDestroyed()) {
      const win = factory();
      win.on("closed", () => this.windows.delete(name));
      this.windows.set(name, win);
    }
    return this.windows.get(name)!;
  }

  get(name: string): BrowserWindow | undefined {
    return this.windows.get(name);
  }
}
```

### Fenster-Konfigurationen für WhisperFlow

**HUD Overlay (immer sichtbar, frameless, transparent):**

```typescript
const hudWindow = new BrowserWindow({
  width: 300,
  height: 80,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  hasShadow: false,
  focusable: false, // Kein Fokus-Stehlen vom aktiven Fenster
  show: false, // Pre-created, hidden
  resizable: false,
  level: "status", // macOS: über normalen Fenstern, unter Menu Bar
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,
    sandbox: true,
  },
});
// Pre-warm: Fenster laden aber nicht zeigen
hudWindow.loadFile("dist/renderer/hud.html");
hudWindow.once("ready-to-show", () => {
  // Bereit, aber nicht gezeigt – wartet auf globalShortcut
});
```

**Settings Fenster (normales Fenster, Singleton):**

```typescript
const settingsWindow = new BrowserWindow({
  width: 700,
  height: 550,
  show: false,
  titleBarStyle: "hiddenInset", // macOS native feel
  webPreferences: {
    /* ... */
  },
});
```

**Snackbar Overlay:**

```typescript
const snackbarWindow = new BrowserWindow({
  width: 400,
  height: 60,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  focusable: false,
  // Position: unten rechts des primären Displays
});
```

### Wichtige BrowserWindow-Flags für macOS Overlays

| Flag                        | Wert                       | Zweck                                     |
| --------------------------- | -------------------------- | ----------------------------------------- |
| `alwaysOnTop`               | `true` + `level: 'status'` | Über normalen Fenstern auf macOS          |
| `focusable`                 | `false`                    | HUD stiehlt keinen Tastatur-Fokus         |
| `setIgnoreMouseEvents`      | `true`                     | Overlay ist click-through (wenn benötigt) |
| `setVisibleOnAllWorkspaces` | `true`                     | Sichtbar in allen Spaces/Desktops         |
| `setHiddenInMissionControl` | `true`                     | Nicht in Mission Control sichtbar         |

### Quellen

- [BrowserWindow API – Electron Docs](https://www.electronjs.org/docs/latest/api/browser-window)
- [Window Customization Guide – Electron Docs](https://www.electronjs.org/docs/latest/tutorial/window-customization)

---

## 4. System Tray Architektur

### Kernbefund

Für macOS-Tray-Apps gelten spezifische Regeln. (Confidence: Hoch, offizielle Doku)

### Grundprinzipien für WhisperFlow Tray

**App-Lifecycle: Tray-only ohne Dock-Icon:**

```typescript
// src/main/index.ts
app.dock.hide(); // macOS: kein Dock-Icon

app.on("window-all-closed", () => {
  // Leer lassen – App läuft im Tray weiter
  // KEIN app.quit() hier!
});
```

**TrayManager mit reaktiven Zustandswechseln:**

```typescript
// src/main/managers/TrayManager.ts
export class TrayManager {
  private tray: Tray | null = null;
  private idleIcon: NativeImage;
  private recordingIcon: NativeImage;
  private processingIcon: NativeImage;

  initialize() {
    // macOS: Bilder müssen Template Images sein (suffix "Template")
    // z.B. "iconTemplate.png" + "iconTemplate@2x.png"
    this.idleIcon = nativeImage.createFromPath(
      path.join(__dirname, "../assets/trayIdleTemplate.png"),
    );
    this.recordingIcon = nativeImage.createFromPath(
      path.join(__dirname, "../assets/trayRecordingTemplate.png"),
    );

    this.tray = new Tray(this.idleIcon);
    this.tray.setToolTip("WhisperFlow");
    this.updateMenu("idle");
  }

  setRecordingState(state: "idle" | "recording" | "processing") {
    if (!this.tray) return;

    // Icon wechseln
    this.tray.setImage(
      state === "recording" ? this.recordingIcon : this.idleIcon,
    );

    // Menü neu aufbauen und setzen
    // IMPORTANT: Auf macOS MUSS setContextMenu neu aufgerufen werden
    // wenn sich einzelne MenuItems ändern
    this.updateMenu(state);
  }

  private updateMenu(state: "idle" | "recording" | "processing") {
    const menu = Menu.buildFromTemplate([
      {
        label: state === "recording" ? "Aufnahme stoppen" : "Aufnahme starten",
        click: () => {
          /* IPC oder direkt Service aufrufen */
        },
      },
      { type: "separator" },
      {
        label: "Einstellungen...",
        click: () => {
          /* SettingsWindow zeigen */
        },
      },
      { type: "separator" },
      { label: "Beenden", role: "quit" },
    ]);
    this.tray!.setContextMenu(menu);
  }
}
```

### macOS Template Image Anforderungen

- Icons müssen als **Template Images** übergeben werden (Dateiname endet auf `Template`)
- Größen: `16x16` (72dpi) und `32x32@2x` (144dpi)
- Template Images werden von macOS automatisch für Dark/Light Mode invertiert
- Bei Webpack/Build-Tools: Sicherstellen, dass Dateinamen **nicht** gehasht werden

### Quellen

- [Tray API – Electron Docs](https://www.electronjs.org/docs/latest/api/tray)
- [Tray Menu Tutorial – Electron Docs](https://www.electronjs.org/docs/latest/tutorial/tray)

---

## 5. globalShortcut Patterns

### Kernbefund

`globalShortcut` registriert systemweite Keyboard-Shortcuts über das OS. (Confidence: Hoch, offizielle Doku)

### Best Practices

**Registrierung:**

```typescript
// src/main/managers/ShortcutManager.ts
export class ShortcutManager {
  private registeredShortcuts: Map<string, string> = new Map();

  registerShortcut(
    id: string,
    accelerator: string,
    callback: () => void,
  ): boolean {
    // Alten Shortcut für diese ID zuerst aufheben
    this.unregisterShortcut(id);

    const success = globalShortcut.register(accelerator, callback);
    if (success) {
      this.registeredShortcuts.set(id, accelerator);
    } else {
      console.warn(
        `Shortcut ${accelerator} konnte nicht registriert werden (bereits belegt)`,
      );
    }
    return success;
  }

  unregisterShortcut(id: string): void {
    const accelerator = this.registeredShortcuts.get(id);
    if (accelerator) {
      globalShortcut.unregister(accelerator);
      this.registeredShortcuts.delete(id);
    }
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.registeredShortcuts.clear();
  }
}
```

**Lifecycle-Integration:**

```typescript
app.whenReady().then(() => {
  shortcutManager.registerShortcut(
    "toggle-recording",
    settingsManager.get("recordingShortcut") ?? "CommandOrControl+Shift+Space",
    () => windowManager.toggleHud(),
  );
});

app.on("will-quit", () => {
  shortcutManager.unregisterAll();
});
```

### Wichtige Hinweise

1. **Konfliktbehandlung**: `globalShortcut.register()` gibt `false` zurück wenn der Shortcut bereits von einer anderen App belegt ist – **kein Error-Throw**. Immer den Rückgabewert prüfen.
2. **macOS Accessibility**: Für Shortcuts die Media Keys nutzen, muss die App als "Trusted Accessibility Client" autorisiert sein (macOS 10.14+).
3. **App-Focus**: `globalShortcut` arbeitet auch wenn die App keinen Fokus hat – das ist das Kernfeature.
4. **Persistenz**: Shortcuts aus `electron-store` laden, beim Start registrieren, beim Ändern in Settings sofort neu registrieren.
5. **Unregistrierung**: Immer in `will-quit` aufrufen – `unregisterAll()` ist der sicherste Weg.

### Quellen

- [globalShortcut API – Electron Docs](https://www.electronjs.org/docs/latest/api/global-shortcut)
- [Keyboard Shortcuts Tutorial – Electron Docs](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)

---

## 6. electron-builder Konfiguration für macOS

### Kernbefund

electron-builder@26.x (aktuell) integriert `@electron/notarize` direkt. (Confidence: Hoch, offizielle Doku)

### Vollständige electron-builder Konfiguration (package.json)

```json
{
  "build": {
    "appId": "com.yourcompany.whisperflow",
    "productName": "WhisperFlow",
    "directories": {
      "buildResources": "build"
    },
    "files": ["dist/**/*", "node_modules/**/*"],
    "extraResources": [
      {
        "from": "node_modules/ffmpeg-static/ffmpeg",
        "to": "ffmpeg/ffmpeg",
        "filter": ["**/*"]
      }
    ],
    "asarUnpack": ["**/node_modules/ffmpeg-static/**"],
    "mac": {
      "target": [
        { "target": "dmg", "arch": ["arm64", "x64"] },
        { "target": "zip", "arch": ["arm64", "x64"] }
      ],
      "category": "public.app-category.productivity",
      "darkModeSupport": true,
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.inherit.plist",
      "notarize": true,
      "minimumSystemVersion": "13.0"
    },
    "dmg": {
      "sign": false,
      "contents": [
        { "x": 130, "y": 220 },
        { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
      ],
      "window": { "width": 540, "height": 380 }
    },
    "publish": [
      {
        "provider": "github",
        "owner": "your-org",
        "repo": "whisperflow",
        "releaseType": "release"
      }
    ]
  }
}
```

### Notarisierung: Umgebungsvariablen

**Empfohlen (Apple API Key – sicherer als Apple ID/Passwort):**

```bash
# In CI/CD (z.B. GitHub Actions Secrets)
APPLE_API_KEY_ID=XXXXXXXXXX
APPLE_API_KEY=/path/to/AuthKey_XXXXXXXXXX.p8
APPLE_API_ISSUER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Code Signing
CSC_LINK=base64_encoded_p12_certificate
CSC_KEY_PASSWORD=certificate_password
```

### Entitlements (build/entitlements.mac.plist)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.device.audio-input</key>
  <true/>
  <!-- Erforderlich für Audioaufnahme! -->
</dict>
</plist>
```

### FFmpeg-Static Integration

```typescript
// src/main/infrastructure/audio/FFmpegRecorder.ts
import { app } from "electron";
import path from "path";

function getFfmpegPath(): string {
  if (app.isPackaged) {
    // Im gebündelten App: aus extraResources
    return path.join(process.resourcesPath, "ffmpeg", "ffmpeg");
  }
  // Im Development: aus node_modules
  return require("ffmpeg-static");
}
```

### Auto-Update mit electron-updater

```typescript
// src/main/services/UpdateService.ts
import electronUpdater, { type AppUpdater } from "electron-updater";
import log from "electron-log";

export class UpdateService {
  private updater: AppUpdater;

  constructor() {
    const { autoUpdater } = electronUpdater;
    this.updater = autoUpdater;

    log.transports.file.level = "info";
    this.updater.logger = log;
    this.updater.autoDownload = true;
  }

  checkForUpdates(): void {
    // Nur in Production prüfen
    if (app.isPackaged) {
      this.updater.checkForUpdatesAndNotify();
    }
  }
}
```

### Quellen

- [electron-builder macOS Configuration](https://www.electron.build/mac)
- [electron-builder Auto Update](https://www.electron.build/auto-update)
- [electron-builder macOS Code Signing](https://www.electron.build/code-signing-mac)

---

## 7. Renderer-Architektur (React + TypeScript)

### Kernbefund

Für Electron-Settings-Fenster empfiehlt sich eine **feature-basierte Ordnerstruktur** mit **Custom Hooks für IPC** und optional **TanStack Query für Server-State-ähnliche IPC-Calls**. (Confidence: Mittel-Hoch)

### Empfohlene Renderer-Struktur

```
src/renderer/
  index.tsx                  # React Root Entry
  features/
    settings/
      SettingsPage.tsx
      components/
        ShortcutPicker.tsx
        AudioDeviceSelector.tsx
      hooks/
        useSettings.ts       # Custom Hook für Settings IPC
      types.ts
    history/
      HistoryPage.tsx
      components/
      hooks/
        useTranscriptions.ts
    overlay/                 # HUD-Renderer (separater Entry Point)
      HudOverlay.tsx
  shared/
    hooks/
      useIpc.ts              # Generischer IPC-Hook
      useAutoUpdate.ts
    components/
      ui/                    # Shadcn/ui oder eigene Basiskomponenten
    ipc/
      ipcService.ts          # IPC-Wrapper-Service (wie in LogRocket-Artikel)
    types/
      ipc.ts                 # Shared IPC-Typen
```

### Custom Hook Pattern für IPC

```typescript
// src/renderer/shared/hooks/useIpc.ts
export function useIpc<TResult, TParams = void>(
  channel: string,
  params?: TParams,
) {
  const [data, setData] = useState<TResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (executeParams?: TParams) => {
      setLoading(true);
      setError(null);
      try {
        const result = await window.electronAPI.invoke<TResult>(
          channel,
          executeParams ?? params,
        );
        setData(result);
        return result;
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [channel, params],
  );

  return { data, loading, error, execute };
}

// src/renderer/features/settings/hooks/useSettings.ts
export function useSettings() {
  const { data: settings, execute: loadSettings } =
    useIpc<AppSettings>("settings:get");
  const { execute: saveSettings } = useIpc<void, Partial<AppSettings>>(
    "settings:set",
  );

  useEffect(() => {
    loadSettings();
  }, []);

  return { settings, saveSettings };
}
```

### TanStack Query (React Query) für IPC-Calls

TanStack Query kann für IPC-Calls genutzt werden, wenn man die IPC-Aufrufe als "Query Functions" wrappt:

```typescript
// src/renderer/features/history/hooks/useTranscriptions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useTranscriptions() {
  return useQuery({
    queryKey: ["transcriptions"],
    queryFn: () =>
      window.electronAPI.invoke<Transcription[]>("transcriptions:list"),
    staleTime: 30_000,
  });
}

export function useDeleteTranscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      window.electronAPI.invoke("transcriptions:delete", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
    },
  });
}
```

**Empfehlung**: TanStack Query ist sinnvoll für History/Liste-Daten, aber für Echtzeit-Status (recording state, progress) sind native `ipcRenderer.on` Event-Listener und Zustand über Zustand-Manager (Zustand, Jotai) effizienter.

### Preload Script (contextBridge)

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  invoke: <T>(channel: string, params?: unknown): Promise<T> =>
    ipcRenderer.invoke(channel, params),

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
    return () => ipcRenderer.removeAllListeners(channel);
  },

  send: (channel: string, data?: unknown) => ipcRenderer.send(channel, data),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// Typen für TypeScript
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
```

### Quellen

- [Electron React with TypeScript – Electron Forge](https://www.electronforge.io/guides/framework-integration/react-with-typescript)
- [LogRocket: Electron IPC mit TypeScript](https://blog.logrocket.com/electron-ipc-response-request-architecture-with-typescript/)
- [Electron Preload Scripts](https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts)

---

## 8. Performance: HUD Overlay (Near-Zero-Latency)

### Kernbefund

**Pre-created Hidden Window** ist die einzig zuverlässige Methode für Near-Zero-Latency Show/Hide. Das Erstellen eines neuen `BrowserWindow` dauert typischerweise 500ms–2s wegen Prozess-Spawn + HTML-Laden. (Confidence: Hoch)

### Empfohlene Strategie: Pre-created Hidden Window

```typescript
// src/main/managers/WindowManager.ts
export class WindowManager {
  private hudWindow: BrowserWindow | null = null;

  // Beim App-Start aufrufen, bevor erster Shortcut möglich ist
  async preCreateHudWindow(): Promise<void> {
    this.hudWindow = new BrowserWindow({
      width: 320,
      height: 80,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      show: false, // <-- Schlüssel: NICHT zeigen
      paintWhenInitiallyHidden: true, // <-- Renderer warmlaufen lassen
      vibrancy: "hud", // macOS native HUD-Effekt
      webPreferences: {
        preload: hudPreloadPath,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false, // <-- Nicht drosseln wenn versteckt
      },
    });

    // Auf allen macOS Spaces sichtbar machen
    this.hudWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    this.hudWindow.setHiddenInMissionControl(true);

    // Seite laden – Renderer ist bereit bevor erstes show()
    await this.hudWindow.loadFile(path.join(__dirname, "../renderer/hud.html"));
  }

  // Aufruf aus globalShortcut-Handler: <1ms Latenz
  showHud(): void {
    if (!this.hudWindow || this.hudWindow.isDestroyed()) return;
    this.hudWindow.showInactive(); // Kein Fokus-Stehlen
  }

  hideHud(): void {
    this.hudWindow?.hide();
  }

  toggleHud(): void {
    if (this.hudWindow?.isVisible()) {
      this.hideHud();
    } else {
      this.showHud();
    }
  }
}
```

### Latenz-Analyse

| Methode                                   | Erwartete Latenz | Anmerkung                              |
| ----------------------------------------- | ---------------- | -------------------------------------- |
| `win.show()` / `win.hide()` (pre-created) | **< 5ms**        | Empfohlen                              |
| `win.showInactive()` (pre-created)        | **< 5ms**        | Kein Fokus-Verlust                     |
| `new BrowserWindow()` on demand           | **500–2000ms**   | Inakzeptabel für Hotkey                |
| `win.setOpacity(0/1)`                     | **< 10ms**       | Alternative, Fenster bleibt registered |

### Animation für sanftes Erscheinen

````typescript
// Im HUD Renderer (CSS)
```css
#hud {
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 120ms ease, transform 120ms ease;
}

#hud.visible {
  opacity: 1;
  transform: translateY(0);
}
````

```typescript
// Im HUD Renderer (React)
useEffect(() => {
  const cleanup = window.electronAPI.on("hud:show", () => {
    setVisible(true);
  });
  return cleanup;
}, []);
```

### macOS Besonderheit: `setAlwaysOnTop` Level

```typescript
// Für HUD über normalen Apps ABER unter macOS Menu Bar:
hudWindow.setAlwaysOnTop(true, "status");

// Für HUD auch über Fullscreen-Apps:
hudWindow.setAlwaysOnTop(true, "screen-saver");
// ACHTUNG: 'screen-saver' erscheint auch über anderem Vollbild-Content
```

### Quellen

- [BrowserWindow show/hide – Electron API](https://www.electronjs.org/docs/latest/api/browser-window#winshow)
- [BrowserWindow setAlwaysOnTop – Electron API](https://www.electronjs.org/docs/latest/api/browser-window#winsetalwaysontopflag-level-relativelevel)
- [ready-to-show Event – Electron API](https://www.electronjs.org/docs/latest/api/browser-window#event-ready-to-show)

---

## Zusammenfassung: Empfohlene Entscheidungen für WhisperFlow

| Bereich                    | Empfehlung                                                   | Confidence  |
| -------------------------- | ------------------------------------------------------------ | ----------- |
| Main Process Struktur      | Service-Container + IPC-Channel-Klassen                      | Hoch        |
| Architektur-Muster         | Layered Architecture (Domain / Application / Infrastructure) | Mittel-Hoch |
| Window Lifecycle           | Singleton Map + Pre-created hidden windows                   | Hoch        |
| HUD Latenz                 | Pre-created `show: false` + `backgroundThrottling: false`    | Hoch        |
| Tray Icons (macOS)         | Template Images, `setContextMenu()` bei jedem Update         | Hoch        |
| System Tray App            | `app.dock.hide()` + leerer `window-all-closed` Handler       | Hoch        |
| Global Shortcuts           | `ShortcutManager` mit ID-basierter Re-registrierung          | Hoch        |
| electron-builder           | DMG+ZIP Target, `notarize: true`, API Key Env Vars           | Hoch        |
| Notarisierung              | Apple API Key (`APPLE_API_KEY_ID`), nicht Apple ID/PW        | Hoch        |
| FFmpeg-Static              | `extraResources` + `asarUnpack` + pfad-basiertes Laden       | Hoch        |
| Renderer-Struktur          | Feature-based Ordner + Custom IPC Hooks                      | Mittel-Hoch |
| Server-State (History)     | TanStack Query über IPC Calls                                | Mittel      |
| Echtzeit-State (Recording) | Native `ipcRenderer.on` + Zustand/Jotai                      | Hoch        |

---

## Anhang: Kritische macOS-spezifische Fallstricke

1. **Tray-Objekt-Referenz**: Den `Tray` immer in einer Variable halten, die nicht garbage-collected wird. Eine lokale Variable in einer Funktion führt zu einem verschwundenen Tray-Icon.

2. **`app.dock.hide()` Timing**: Muss **vor** `app.whenReady()` aufgerufen werden, sonst flackert das Dock-Icon kurz.

3. **`window-all-closed`**: Auf macOS ist es Convention, die App am Leben zu halten bis `Cmd+Q`. Für Tray-Apps: Handler leer lassen.

4. **contextIsolation**: Seit Electron 20 ist `sandbox: true` der Standard. Preload-Skripte sind die einzige sichere Brücke zum Renderer.

5. **Notarisierung + Hardened Runtime**: Ohne `com.apple.security.cs.allow-jit` crasht Electron auf ARM64 bei der Notarisierung.

6. **Template Images**: Dateinamen dürfen beim Build **nicht gehasht** werden (z.B. Webpack `[contenthash]` deaktivieren für Assets-Ordner).

---

_Forschung erstellt am 21. Februar 2026 | Quellen: Electron Docs v40, electron-builder Docs v26, LogRocket Blog_
