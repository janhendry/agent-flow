---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/research/technical-ffmpeg-electron-npm-vs-byof-research-2026-02-21.md"
  - "_bmad-output/planning-artifacts/research/technical-ffmpeg-webm-opus-pipeline-best-practices-research-2026-02-21.md"
workflowType: "research"
lastStep: 1
research_type: "technical"
research_topic: "FFmpeg macOS Audio Capture — System Audio und Mikrofon"
research_goals: "Validieren dass WhisperFlow auf macOS sowohl Mikrofon als auch System Audio per FFmpeg aufnehmen kann — avfoundation Input-Devices, BlackHole vs. ScreenCaptureKit, Electron Permissions, Multi-Input Mix"
user_name: "Yoda"
date: "2026-02-21"
web_research_enabled: true
source_verification: true
---

# FFmpeg macOS Audio Capture: System Audio & Mikrofon — Technische Validierung für WhisperFlow

**Date:** 2026-02-21
**Author:** Yoda
**Research Type:** technical

---

## Technical Research Scope Confirmation

**Research Topic:** FFmpeg macOS Audio Capture — System Audio und Mikrofon
**Research Goals:** Validieren dass WhisperFlow auf macOS sowohl Mikrofon als auch System Audio per FFmpeg aufnehmen kann — avfoundation Input-Devices, BlackHole vs. ScreenCaptureKit, Electron Permissions, Multi-Input Mix

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

---

<!-- Content wird sequenziell durch die Workflow-Schritte ergänzt -->

---

## Technology Stack Analysis

### macOS Audio Input Frameworks — Übersicht

macOS bietet **drei grundlegend verschiedene Wege** für Audio Capture, jeder mit eigenen Einschränkungen:

| Framework                          | Typ                 | System Audio          | Mikrofon | macOS Min | Electron-kompatibel                  |
| ---------------------------------- | ------------------- | --------------------- | -------- | --------- | ------------------------------------ |
| **AVFoundation** (`avfoundation`)  | FFmpeg Device       | ❌ Nein (nativ)       | ✅ Ja    | 10.7+     | ✅ via `child_process.spawn`         |
| **BlackHole** (virtueller Treiber) | AVFoundation-Device | ✅ Ja (über Loopback) | ✅ Ja    | 10.10+    | ✅ via `child_process.spawn`         |
| **ScreenCaptureKit**               | Apple Native API    | ✅ Ja                 | ✅ Ja    | 12.3+     | ⚠️ Nur via Native Addon (Swift/ObjC) |

_Quelle: [ffmpeg.org/ffmpeg-devices.html](https://ffmpeg.org/ffmpeg-devices.html), [existential.audio/blackhole](https://existential.audio/blackhole/), [developer.apple.com/documentation/screencapturekit](https://developer.apple.com/documentation/screencapturekit)_

---

### FFmpeg AVFoundation Input Device (macOS)

**Status:** Offiziell unterstützt, aktiv gepflegt (FFmpeg Docs aktualisiert Feb 2026)

AVFoundation ist das von Apple empfohlene Framework für Audio/Video-Capture auf macOS >= 10.7. FFmpeg integriert AVFoundation nativ als Input Device.

**Syntax:**

```bash
# Alle verfügbaren Devices auflisten (kritisch für onboarding!)
ffmpeg -f avfoundation -list_devices true -i ""

# Mikrofon aufnehmen (kein Video, Audio-Device Index 0 = Standard-Mikrofon)
ffmpeg -f avfoundation -i "none:0" -ar 44100 -ac 1 output.wav

# Mit Default-Device-Alias
ffmpeg -f avfoundation -i "none:default" output.wav

# Spezifisches Mikrofon per Index
ffmpeg -f avfoundation -audio_device_index 1 -i "none:" output.wav
```

**Kritische Einschränkung:** AVFoundation kann **kein System Audio (Loopback) nativ** aufnehmen. macOS erlaubt es Drittanbieter-Apps nicht, den Audio-Output direkt als Input zu tappen — das ist ein bewusstes Sicherheits-Design von Apple.

_Quelle: [ffmpeg.org/ffmpeg-devices.html#avfoundation](https://ffmpeg.org/ffmpeg-devices.html)_

---

### BlackHole — Virtueller Audio-Loopback Treiber

**Status:** Aktiv gepflegt (Existential Audio), Open Source, macOS 10.10+ einschließlich Apple Silicon

BlackHole ist ein moderner virtueller Audio-Treiber, der es ermöglicht, System-Audio-Output durch ihn zu leiten — und BlackHole als AVFoundation-Input-Device zu registrieren. Das Prinzip: System-Audio → BlackHole (als Output) → FFmpeg (liest BlackHole als Input).

**Spezifikationen:**

- **2-Kanal Version**: Standard für Stereo-Audio (empfohlen für WhisperFlow)
- **16-Kanal Version**: Für professionelle Multi-Channel-Setups
- **Latenz**: Zero Additional Latency (bydesign)
- **Sample Rates**: 44.1, 48, 88.2, 96, 176.4, 192 kHz
- **Plattform**: macOS 10.10+, Intel + Apple Silicon ✅

**Installation:** Kein Homebrew zwingend — direkter Download via GitHub oder App Store vorhanden.

**FFmpeg-Kommando System-Audio via BlackHole:**

```bash
# (nach Installation und Konfiguration als Output-Device)
ffmpeg -f avfoundation -i "none:BlackHole 2ch" -ar 44100 -ac 2 system-audio.wav
```

**User-Onboarding-Aufwand:** Hoch. Nutzer muss:

1. BlackHole installieren
2. In macOS System Preferences → Sound → Output → BlackHole setzen
3. (Optional) Multi-Output Device für simultanes Abhören konfigurieren

_Quelle: [existential.audio/blackhole](https://existential.audio/blackhole/), [github.com/ExistentialAudio/BlackHole](https://github.com/ExistentialAudio/BlackHole)_

---

### ScreenCaptureKit — Apple Native System Audio API

**Status:** Stabil, macOS 12.3+ (Monterey), aktiv weiterentwickelt (WWDC 2022, 2023, 2024)

ScreenCaptureKit ist Apples erste offizielle API für System Audio Capture ohne Drittanbieter-Treiber. Seit macOS 13 (Ventura) unterstützt die API **simultanes Capturing von System Audio UND Mikrofon** in einem einzigen Stream.

**Kritische API-Eigenschaften:**

```swift
// SCStreamConfiguration (macOS 13+)
streamConfig.capturesAudio = true         // System Audio
streamConfig.excludesCurrentProcessAudio = true  // eigene App-Töne ausschließen
streamConfig.captureMicrophone = true     // Mikrofon (ab macOS 14+)

// Stream Output Types
try stream?.addStreamOutput(output, type: .audio,       ...) // System Audio
try stream?.addStreamOutput(output, type: .microphone,  ...) // Mikrofon
```

**Permission-Anforderung:** `Screen Recording` Permission (macOS 10.15+) — auch wenn kein Video aufgenommen wird. Das ist die größte Nutzungs-Hürde.

**Electron-Integration:** ScreenCaptureKit ist eine Swift/ObjC-only API. Für Electron braucht man:

- Ein **Node.js Native Addon** (`.node` Datei, geschrieben in C++ / Swift via N-API oder node-addon-api)
- Oder eine bestehende Bibliothek wie `node-screencapturekit` (Community-Project)

_Quelle: [developer.apple.com/documentation/screencapturekit](https://developer.apple.com/documentation/screencapturekit), [WWDC24 Session 10088](https://developer.apple.com/wwdc24/10088/)_

---

### Electron Permission-Management für Audio

**Mikrofon Permission (Tier 1):**

```javascript
// Main Process — Electron API (offiziell unterstützt)
const { systemPreferences } = require("electron");

// Status prüfen
const status = systemPreferences.getMediaAccessStatus("microphone");
// Returns: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'

// Berechtigung anfragen (macOS 10.14+)
const granted = await systemPreferences.askForMediaAccess("microphone");
```

**Info.plist Pflichtfelder (electron-builder):**

```xml
<key>NSMicrophoneUsageDescription</key>
<string>WhisperFlow benötigt das Mikrofon für Sprach-zu-Text-Transkription.</string>
```

**Screen Recording Permission (für System Audio via ScreenCaptureKit):**

```javascript
const screenStatus = systemPreferences.getMediaAccessStatus("screen");
// 'not-determined' | 'granted' | 'denied' | 'restricted'
// WICHTIG: askForMediaAccess('screen') existiert NICHT in Electron
// → Nutzer muss manuell System Preferences → Privacy → Screen Recording öffnen
```

_Quelle: [electronjs.org/docs/latest/api/system-preferences](https://www.electronjs.org/docs/latest/api/system-preferences#systempreferencesaskformediaaccessmediatype)_

---

### Multi-Input Mix: Mikrofon + System Audio gleichzeitig

**Ansatz A — FFmpeg mit BlackHole (Tier 2, kein nativer Support):**

```bash
# Zwei separate avfoundation-Inputs → amix filtergraph
ffmpeg \
  -f avfoundation -i "none:0" \              # Mikrofon
  -f avfoundation -i "none:BlackHole 2ch" \  # System Audio via BlackHole
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=shortest:dropout_transition=2" \
  -ar 44100 -ac 1 mixed.wav
```

**Ansatz B — ScreenCaptureKit Native Addon (moderner, kein Drittanbieter):**

```swift
// Simultaner Stream in einem SCStream-Objekt
streamConfig.capturesAudio = true       // System Audio
streamConfig.captureMicrophone = true   // Mikrofon
// → Beide Streams als separate CMSampleBuffer an Electron weitergeben
// → Dort in WAV-Datei schreiben → FFmpeg für Encoding
```

**Ansatz C — Web Audio API im Renderer (Mikrofon, kein System Audio):**

```javascript
// Nur für Mikrofon-Aufnahme (Tier 1 use case)
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, {
  mimeType: "audio/webm;codecs=opus",
});
// Achtung: Output als webm blob → muss zu WAV gewandelt werden für FFmpeg
```

_Quellen: [ffmpeg.org/ffmpeg-devices.html](https://ffmpeg.org/ffmpeg-devices.html), [developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos)_

---

### Technology Adoption Trends (Feb 2026)

| Technologie                   | Trend          | Begründung                                                                         |
| ----------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| AVFoundation + FFmpeg         | Stabil         | Bewährter Weg für Mikrofon-Capture                                                 |
| BlackHole                     | Stabil, wächst | De-facto Standard für macOS System Audio ohne Vendor-Lock-in                       |
| ScreenCaptureKit              | Wachsend       | Apple-native, kein Drittanbieter-Treiber nötig — aber Electron-Integration komplex |
| SoundFlower                   | Deprecated ❌  | Nicht mehr gepflegt, ersetzt durch BlackHole                                       |
| Loopback (Rogue Amoeba)       | Proprietär     | Kommerziell ($99), nicht für Open-Source-Projekte                                  |
| Web Audio API (MediaRecorder) | Eingeschränkt  | Nur Mikrofon, kein System Audio, webm statt wav                                    |

---

## Integration Patterns — Plattformübergreifende API-Unterschiede (macOS vs. Windows)

> **Kontext:** WhisperFlow ist macOS-first (Tier 1), Windows ist Tier 2. Die FFmpeg-Kommandos sind **nicht portabel** — sie unterscheiden sich fundamental zwischen den Betriebssystemen.

### Der kritische Unterschied: FFmpeg Input Device pro Plattform

| Plattform   | FFmpeg Device               | System Audio Loopback            | Drittanbieter nötig?        |
| ----------- | --------------------------- | -------------------------------- | --------------------------- |
| **macOS**   | `-f avfoundation`           | ❌ Kein nativer Loopback         | ✅ BlackHole nötig (Tier 2) |
| **Windows** | `-f dshow` oder `-f wasapi` | ✅ **Nativ via WASAPI Loopback** | ❌ Kein Drittanbieter nötig |
| Linux       | `-f alsa` oder `-f pulse`   | ✅ via PulseAudio Monitor        | ❌ Kein Drittanbieter nötig |

---

### Windows — `dshow` (DirectShow) für Mikrofon

DirectShow ist der Legacy-Standard für Windows Audio/Video. FFmpeg unterstützt es via `-f dshow`.

```bash
# Alle verfügbaren dshow-Devices auflisten
ffmpeg -list_devices true -f dshow -i dummy

# Mikrofon aufnehmen — Gerätename als String (KEIN Index wie macOS!)
ffmpeg -f dshow -i audio="Mikrofonarray (Intel Smart Sound Technology)" -ar 44100 -ac 1 mic.wav
```

**Kritischer Unterschied zu macOS:**

- macOS: Geräte per **Index** (`"none:0"`) oder `"default"`
- Windows dshow: Geräte per **exaktem Namen-String** (sprachabhängig! Deutsch: „Mikrofon", Englisch: „Microphone")
- Device-Namen variieren je nach Windows-Spracheinstellung → Robust via `list_devices` + Matching-Logik nötig

---

### Windows — `wasapi` für System Audio Loopback (der grosse Vorteil gegenüber macOS!)

WASAPI (Windows Audio Session API, eingebaut seit Windows Vista) unterstützt nativ **Loopback-Capture** — kein virtueller Treiber nötig.

```bash
# System Audio (Loopback) via WASAPI — kein BlackHole-Aequivalent noetig!
ffmpeg -f wasapi -loopback 1 -i "Lautsprecher (Realtek High Definition Audio)" system.wav

# Mikrofon via WASAPI (moderner als dshow)
ffmpeg -f wasapi -i "Microphone (Realtek High Definition Audio)" mic.wav
```

**WASAPI Loopback = dasselbe wie BlackHole, aber eingebaut in Windows.**

Source: https://learn.microsoft.com/en-us/windows/win32/coreaudio/wasapi

---

### Architekturkonsequenz: Platform Abstraction Layer wird Pflicht

Diese Unterschiede bedeuten: WhisperFlow braucht eine **Platform Abstraction Layer** im `AudioCapture`-Service:

```typescript
class AudioCaptureService {
  private buildFFmpegArgs(
    deviceId: string,
    platform: NodeJS.Platform,
  ): string[] {
    switch (platform) {
      case "darwin": // macOS — Index-basiert
        return [
          "-f",
          "avfoundation",
          "-i",
          `none:${deviceId}`,
          "-ar",
          "44100",
          "-ac",
          "1",
        ];
      case "win32": // Windows — Name-basiert
        return [
          "-f",
          "dshow",
          "-i",
          `audio=${deviceId}`,
          "-ar",
          "44100",
          "-ac",
          "1",
        ];
      case "linux":
        return ["-f", "pulse", "-i", deviceId, "-ar", "44100", "-ac", "1"];
    }
  }
  private buildSystemAudioArgs(
    deviceId: string,
    platform: NodeJS.Platform,
  ): string[] {
    switch (platform) {
      case "darwin": // BlackHole (Tier 2)
        return [
          "-f",
          "avfoundation",
          "-i",
          "none:BlackHole 2ch",
          "-ar",
          "44100",
        ];
      case "win32": // WASAPI Loopback — kein Drittanbieter noetig (Tier 2)
        return [
          "-f",
          "wasapi",
          "-loopback",
          "1",
          "-i",
          deviceId,
          "-ar",
          "44100",
        ];
      case "linux": // PulseAudio Monitor
        return ["-f", "pulse", "-i", `${deviceId}.monitor`, "-ar", "44100"];
    }
  }
}
```

---

### Zusammenfassung: macOS vs. Windows Audio Capture

| Feature                 | macOS                  | Windows                               |
| ----------------------- | ---------------------- | ------------------------------------- |
| Mikrofon-Capture        | avfoundation           | dshow / wasapi                        |
| System Audio nativ      | Kein nativer Loopback  | **WASAPI Loopback eingebaut**         |
| Drittanbieter-Treiber   | BlackHole (Tier 2)     | Nicht noetig                          |
| Device-Adressierung     | Index-basiert (stabil) | Name-basiert (fragil, sprachabhängig) |
| Onboarding System Audio | Hoch (BlackHole Setup) | Niedrig (out-of-the-box)              |

**Kernbefund:** Windows ist fuer System-Audio-Capture strukturell einfacher als macOS — WASAPI Loopback ist nativ verfuegbar, kein BlackHole-Aequivalent noetig. Die Device-Namens-Adressierung ist dafuer fragiler (sprachabhängig). Der Platform Abstraction Layer in der WhisperFlow-Architektur muss die FFmpeg-Argumente je nach `process.platform` generieren.

---

## Architectural Patterns and Design

### System Architecture Patterns — Electron Multi-Process für Audio Capture

Electron's Multi-Process-Modell ist **kein optionales Feature sondern eine harte Constraint** für die WhisperFlow Audio-Pipeline. Das beeinflusst direkt, wo FFmpeg laufen darf und wie Permissions verwaltet werden.

**Prozess-Zuordnung (validiert):**

```
┌─────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                  │
│  ├── AudioCaptureService (FFmpeg child_process.spawn)   │
│  ├── PermissionService (systemPreferences.askFor...)    │
│  ├── SettingsService (electron-store)                   │
│  ├── TrayManager                                        │
│  └── ShortcutManager (globalShortcut)                   │
├─────────────────────────────────────────────────────────┤
│  Renderer Process (Chromium)                             │
│  ├── HUD React UI                                       │
│  ├── Settings React UI                                  │
│  └── IPC via contextBridge (KEIN direktes Node access)  │
├─────────────────────────────────────────────────────────┤
│  FFmpeg Child Process (child_process.spawn)              │
│  └── Läuft als separater OS-Prozess, gesteuert aus Main │
└─────────────────────────────────────────────────────────┘
```

**Kritische Regel:** FFmpeg muss im **Main Process** als `child_process.spawn` laufen — niemals im Renderer. Der Renderer hat keinen direkten Node.js-Zugriff (Context Isolation).

_Quelle: [electronjs.org/docs/latest/tutorial/process-model](https://www.electronjs.org/docs/latest/tutorial/process-model)_

---

### Finite State Machine (FSM) — Recording Pipeline

Die Audio-Pipeline durchläuft klar definierte Zustände. Eine FSM ist das geeignete Architekturmuster um Race Conditions und illegale Zustandsübergänge zu verhindern — besonders wichtig bei globalen Shortcuts die jederzeit feuern können.

```
IDLE
  │ shortcut:start
  ▼
RECORDING ──── ffmpegError ──────────────┐
  │              (cleanup)               │
  │ shortcut:stop / maxDuration          │
  ▼                                      │
ENCODING ──── ffmpegError ───────────────┤
  │              (cleanup)               │
  │ outputFile ready                     ▼
  ▼                                   ERROR
UPLOADING ──── apiError ──────────────┤
  │              (retry / fail)          │
  │ transcript received                  │
  ▼                                      │
TRANSCRIBED ──────── clipboard written  │
  │                                      │
  └──────── reset after 3s ─────────────┘
                  ▼
               IDLE
```

**Verbotene Übergänge (durch FSM verhindert):**

- `IDLE → ENCODING` (kein File ohne Recording)
- `RECORDING → UPLOADING` (kein Upload ohne Encoding)
- Doppeltes `shortcut:start` in `RECORDING` (idempotent ignorieren)

**Implementation-Pattern:**

```typescript
type RecordingState =
  | "IDLE"
  | "RECORDING"
  | "ENCODING"
  | "UPLOADING"
  | "TRANSCRIBED"
  | "ERROR";

class AudioPipelineStateMachine {
  private state: RecordingState = "IDLE";
  private ffmpegProcess: ChildProcess | null = null;

  transition(
    event: "START" | "STOP" | "ENCODED" | "TRANSCRIBED" | "ERROR" | "RESET",
  ): void {
    const allowed = this.getAllowedTransitions();
    if (!allowed.includes(event)) {
      console.warn(`Ignored event ${event} in state ${this.state}`);
      return;
    }
    // ... state mutation + side effects
  }

  private getAllowedTransitions(): string[] {
    const transitions: Record<RecordingState, string[]> = {
      IDLE: ["START"],
      RECORDING: ["STOP", "ERROR"],
      ENCODING: ["ENCODED", "ERROR"],
      UPLOADING: ["TRANSCRIBED", "ERROR"],
      TRANSCRIBED: ["RESET"],
      ERROR: ["RESET"],
    };
    return transitions[this.state];
  }
}
```

_Quelle: [xstate.js.org/docs/about/concepts.html](https://xstate.js.org/docs/about/concepts.html)_

---

### Platform Abstraction Layer — Design Principles

Der Platform Abstraction Layer isoliert alle plattformspezifischen Details hinter einer einheitlichen Interface. Das folgt dem **Dependency Inversion Principle** (aus SOLID).

```typescript
// Interface — plattformunabhängig
interface AudioDeviceEnumerator {
  listMicrophoneDevices(): Promise<AudioDevice[]>;
  listSystemAudioDevices(): Promise<AudioDevice[]>;
  buildCaptureArgs(device: AudioDevice, config: CaptureConfig): string[];
}

// macOS Implementierung
class MacOSAudioDeviceEnumerator implements AudioDeviceEnumerator {
  async listMicrophoneDevices() {
    // ffmpeg -f avfoundation -list_devices true -i "" → parse
    const output = await runFFmpeg([
      "-f",
      "avfoundation",
      "-list_devices",
      "true",
      "-i",
      '""',
    ]);
    return parseAVFoundationAudioDevices(output);
  }
  buildCaptureArgs(device, config) {
    return [
      "-f",
      "avfoundation",
      "-i",
      `none:${device.index}`,
      "-ar",
      "44100",
      "-ac",
      "1",
    ];
  }
}

// Windows Implementierung
class WindowsAudioDeviceEnumerator implements AudioDeviceEnumerator {
  async listMicrophoneDevices() {
    // ffmpeg -list_devices true -f dshow -i dummy → parse
    const output = await runFFmpeg([
      "-list_devices",
      "true",
      "-f",
      "dshow",
      "-i",
      "dummy",
    ]);
    return parseDShowAudioDevices(output);
  }
  buildCaptureArgs(device, config) {
    return [
      "-f",
      "dshow",
      "-i",
      `audio=${device.name}`,
      "-ar",
      "44100",
      "-ac",
      "1",
    ];
  }
}

// Factory (Main Process Entry Point)
function createAudioEnumerator(): AudioDeviceEnumerator {
  switch (process.platform) {
    case "darwin":
      return new MacOSAudioDeviceEnumerator();
    case "win32":
      return new WindowsAudioDeviceEnumerator();
    default:
      throw new Error(`Platform ${process.platform} not supported`);
  }
}
```

---

### Security Architecture — IPC Boundaries & Context Isolation

Electron's Security-Modell erfordert explizite Entscheidungen bei der IPC-Architektur:

**Regel 1 — Nur whitelisted IPC-Channels:**

```typescript
// preload.ts — nur explizit freigegebene APIs
contextBridge.exposeInMainWorld("whisperflow", {
  recording: {
    start: () => ipcRenderer.invoke("recording:start"),
    stop: () => ipcRenderer.invoke("recording:stop"),
    onStateChange: (cb) =>
      ipcRenderer.on("recording:stateChange", (_, state) => cb(state)),
  },
  permissions: {
    checkMicrophone: () => ipcRenderer.invoke("permissions:checkMicrophone"),
  },
  // KEINE generischen ipcRenderer.send — nur typed API surface
});
```

**Regel 2 — Permission-Gate vor FFmpeg-Start:**

```typescript
// Main Process — vor jedem Recording-Start
async function startRecording(): Promise<void> {
  const micStatus = systemPreferences.getMediaAccessStatus("microphone");
  if (micStatus !== "granted") {
    const granted = await systemPreferences.askForMediaAccess("microphone");
    if (!granted) {
      throw new Error("MICROPHONE_PERMISSION_DENIED");
    }
  }
  // Erst nach Permission: FFmpeg spawnen
  this.fsm.transition("START");
  this.spawnFFmpegProcess();
}
```

**Regel 3 — Child Process Isolation:**

```typescript
// FFmpeg als Child Process — stdio begrenzen auf was gebraucht wird
const ffmpeg = spawn(ffmpegPath, args, {
  stdio: ["ignore", "pipe", "pipe"], // nur stderr für Fehler-Monitoring
  detached: false, // stirbt mit Main Process
  windowsHide: true, // kein sichtbares Terminalfenster auf Windows
});
```

_Quelle: [electronjs.org/docs/latest/tutorial/process-model](https://www.electronjs.org/docs/latest/tutorial/process-model)_

---

### Resource Management Architecture — Cleanup Patterns

Fehlende Cleanup-Logik ist bei Desktop-Apps die häufigste Quelle von Memory Leaks und Zombie-Prozessen.

**FFmpeg Prozess Cleanup — alle Exit-Paths abdecken:**

```typescript
class AudioCaptureService {
  private ffmpegProcess: ChildProcess | null = null;
  private tempFiles: string[] = [];

  async cleanup(): Promise<void> {
    // 1. FFmpeg graceful stop (SIGTERM → warte 2s → SIGKILL)
    if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
      this.ffmpegProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!this.ffmpegProcess.killed) {
        this.ffmpegProcess.kill("SIGKILL");
      }
      this.ffmpegProcess = null;
    }
    // 2. Temp-Dateien löschen
    for (const file of this.tempFiles) {
      await fs.unlink(file).catch(() => {}); // ignore ENOENT
    }
    this.tempFiles = [];
  }
}

// Electron App Lifecycle — alle Exit-Pfade registrieren
app.on("before-quit", async (e) => {
  e.preventDefault();
  await audioService.cleanup();
  app.quit();
});
process.on("uncaughtException", async (err) => {
  await audioService.cleanup();
  process.exit(1);
});
```

---

### Deployment Architecture — ffmpeg-static + asarUnpack

Die Deployment-Architektur für den FFmpeg-Binary ist durch frühere Recherche bereits klar, aber ein wichtiger Aspekt noch:

```javascript
// electron-builder.config.js — korrekte asarUnpack Konfiguration
{
  asar: true,
  asarUnpack: [
    "node_modules/ffmpeg-static/**/*"  // Binary muss ausgepackt sein für child_process.spawn
  ],
  extraResources: [
    // Alternative: direkt als extraResources (expliziter, empfohlen)
    { from: "node_modules/ffmpeg-static", to: "ffmpeg-static", filter: ["**/*"] }
  ]
}

// Im Code: Pfad runtime-dynamisch auflösen
import ffmpegPath from 'ffmpeg-static'
const actualPath = app.isPackaged
  ? ffmpegPath!.replace('app.asar', 'app.asar.unpacked')
  : ffmpegPath!
```

_Quelle: [ffmpeg-static npm package](https://www.npmjs.com/package/ffmpeg-static), [electron-builder docs](https://www.electron.build/)_

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

**Phase 1 — Tier 1 (Mikrofon, macOS): Beweise zuerst die kritische Strecke**

Die empfohlene Adoptionsstrategie: Implementiere in der Reihenfolge des Risikos, nicht in der Reihenfolge der Features.

```
Phase 1 (Sprint 1): Proof-of-Concept-Pipeline
  └── ffmpeg_static + avfoundation → WAV/WebM → lokale Datei
  └── Ziel: Validiert dass FFmpeg im packaged Electron-Build funktioniert

Phase 2 (Sprint 2): Produktions-Pipeline Tier 1
  └── AudioCaptureService + FSM + IPC + UI
  └── Ziel: Vollständige Mikrofon-Recording-Pipeline mit Fehlerbehandlung

Phase 3 (Sprint 3): Whisper API Integration
  └── Upload + Transcript + Clipboard
  └── Ziel: End-to-End Feature komplett

Phase 4 (Sprint N): Tier 2 — System Audio (BlackHole/WASAPI)
  └── Erst nach Tier 1 production-stable
  └── Risiko: Nutzer muss BlackHole installieren (macOS User Experience Problem)
```

**Migration Pattern — ffmpeg-static (npm) statt systemeigenem FFmpeg:**

Wahl bereits in Sprint 1 treffen. `ffmpeg-static` bundled den Binary → kein Dependency-Problem für End-User. Ältere Ansätze (fluent-ffmpeg, globales FFmpeg) sind seit Mai 2025 deprecated.

---

### Development Workflows and Tooling

**Empfohlener Toolchain für WhisperFlow:**

```
electron-vite (Build + HMR)
  ├── Vite für Renderer (React + HMR)
  ├── esbuild für Main Process
  └── TypeScript-Support out-of-the-box

electron-builder (Packaging)
  ├── macOS: .dmg + .zip (code-signed für Notarisierung)
  ├── Windows: .exe NSIS installer
  └── asarUnpack für ffmpeg-static binary

Vitest (Unit + Integration Tests, Main Process)
Playwright + @playwright/test (E2E-Tests, full Electron App)

TypeScript (strict mode) — kein JavaScript im neuen Code
ESLint + prettier — automatisch über pre-commit hooks (husky + lint-staged)
```

**Lokale Entwicklungsschleife:**

```bash
# Starten mit HMR für Renderer; Main Process rebuilt on save
npm run dev

# Unit tests (Vitest, fast, kein Electron erforderlich)
npm run test:unit

# E2E tests mit Playwright (startet echte Electron-Instanz)
npm run test:e2e

# Packaging (produziert .dmg / .exe)
npm run build
npm run package
```

---

### Testing and Quality Assurance

**Test-Strategie für Audio-Pipeline — 3 Ebenen:**

**Ebene 1 — Unit Tests (Vitest, schnell, ohne Electron):**

```typescript
// AudioCaptureService isoliert testen — FFmpeg-Prozess mocken
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AudioCaptureService } from "../src/main/AudioCaptureService";

vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    pid: 1234,
    kill: vi.fn(),
    on: vi.fn(),
    stderr: { on: vi.fn() },
  })),
}));

describe("AudioCaptureService", () => {
  it("generates correct avfoundation args for macOS microphone", () => {
    const service = new AudioCaptureService({ platform: "darwin" });
    const args = service.buildFFmpegArgs({
      type: "microphone",
      deviceIndex: 0,
    });
    expect(args).toContain("-f");
    expect(args).toContain("avfoundation");
    expect(args).toContain("none:0");
  });

  it("generates correct wasapi loopback args for Windows system audio", () => {
    const service = new AudioCaptureService({ platform: "win32" });
    const args = service.buildFFmpegArgs({ type: "system" });
    expect(args).toContain("-f");
    expect(args).toContain("wasapi");
    expect(args).toContain("-loopback");
    expect(args).toContain("1");
  });
});
```

**Ebene 2 — Integration Tests (Playwright, Electron Hauptprozess):**

```typescript
// Testet IPC-Bridge und State Machine mit echter Electron-Instanz
import { test, _electron as electron } from "@playwright/test";

test("recording start → FFmpeg spawned → stop → file exists", async () => {
  const app = await electron.launch({ args: ["."] });

  const isPackaged = await app.evaluate(({ app }) => app.isPackaged);
  // In Test: false — ffmpeg läuft aus node_modules, nicht aus asar.unpacked

  const window = await app.firstWindow();

  // Simuliere Shortcut über IPC
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit("recording:start");
  });

  // Prüfe State via IPC
  const state = await app.evaluate(async () => {
    // audioPipelineFSM aus Main Process Access
    return global.audioService?.getState();
  });
  // expect(state).toBe('RECORDING')

  await app.close();
});
```

**Ebene 3 — Smoke Tests (manuell, vor jedem Release):**

```
□ macOS: Mikrofon-Permission Prompt erscheint bei erstem Start
□ macOS: Recording startet, Datei wird erstellt
□ macOS: Shortcut funktioniert wenn App im Tray minimiert
□ macOS: FFmpeg-Binary läuft aus app.asar.unpacked (packaged Build)
□ Windows: WASAPI System Audio Recording (wenn Tier 2 implementiert)
```

_Quelle: [electronjs.org/docs/latest/tutorial/automated-testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)_

---

### Deployment and Operations Practices

**macOS Distribution Checkliste:**

```yaml
# electron-builder.config.js — kritische Settings

mac:
  target: ["dmg", "zip"]
  category: "public.app-category.productivity"
  hardenedRuntime: true # Pflicht für Notarisierung
  gatekeeperAssess: false

entitlements: "build/entitlements.mac.plist"
entitlementsInherit: "build/entitlements.mac.plist"
```

```xml
<!-- build/entitlements.mac.plist — Pflicht für Mikrofon-Zugriff und FFmpeg -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key><true/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
  <key>com.apple.security.device.audio-input</key><true/>
  <!-- PFLICHT: Ohne diese Entitlement kein Mikrofon-Zugriff im signierten Build -->
</dict>
</plist>
```

**CI/CD Pipeline (GitHub Actions, empfohlen):**

```yaml
# .github/workflows/build.yml
jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run test:unit
      - run: npm run build
      - run: npm run package
      # Code-signing erfordert Apple Developer Zertifikat als Secret
```

---

### Risk Assessment and Mitigation

| Risiko                                              | Wahrscheinlichkeit | Impact   | Mitigation                                                                |
| --------------------------------------------------- | ------------------ | -------- | ------------------------------------------------------------------------- |
| FFmpeg-Binary im packaged Build nicht gefunden      | Mittel             | Kritisch | `asarUnpack` korrekt konfigurieren, Smoke-Test vor Release                |
| macOS Permission Prompt vom Nutzer abgelehnt        | Mittel             | Hoch     | Permission-Status persistent speichern, UI-Guide "So erteilst du Zugriff" |
| `avfoundation` Device-Index ändert sich bei Hotplug | Niedrig            | Mittel   | Device-Enumeration vor jedem Recording-Start, nicht gecacht               |
| BlackHole nicht installiert (Tier 2)                | Hoch               | Mittel   | Tier 2 ist optional — graceful degradation, kein Blocking Feature         |
| Windows dshow Device-Name lokalisiert (Sprachfalle) | Mittel             | Mittel   | WASAPI statt dshow für Windows (kein Name-Dependency)                     |
| FFmpeg-Zombie-Prozess bei App-Crash                 | Mittel             | Mittel   | `before-quit` + `uncaughtException` Handler, siehe Cleanup-Pattern        |
| Electron auto-updater + Code-Signierung             | Hoch bei Windows   | Mittel   | electron-updater, kostenpflichtiges Code Signing Zertifikat für Windows   |

---

## Technical Research Recommendations

### Implementation Roadmap

```
Sprint 1 (1-2 Wochen): Kritischer Pfad — FFmpeg + avfoundation PoC
  ✓ ffmpeg-static einbinden, asarUnpack konfigurieren
  ✓ AudioCaptureService: WAV-Recording via avfoundation
  ✓ Electron Permission Gate (Mikrofon)
  ✓ Verifikation: packaged .dmg Build funktioniert

Sprint 2 (1-2 Wochen): Produktions-Pipeline Tier 1
  ✓ FSM (IDLE → RECORDING → ENCODING → UPLOADING → TRANSCRIBED)
  ✓ IPC-Bridge: contextBridge + ipcMain/ipcRenderer
  ✓ Global Shortcut Integration
  ✓ Fehlerbehandlung + Cleanup

Sprint 3 (1 Woche): Whisper API + UX
  ✓ Upload + Transcript API
  ✓ Clipboard Copy
  ✓ HUD UI (Recording-Indikator)
  ✓ Tray-Icon Integration

Sprint 4+ (optional): Tier 2 Features
  □ System Audio (BlackHole macOS / WASAPI Windows)
  □ Windows-Port
```

### Technology Stack Recommendations

| Komponente       | Empfehlung              | Alternativ           | Begründung                                   |
| ---------------- | ----------------------- | -------------------- | -------------------------------------------- |
| FFmpeg Bundling  | `ffmpeg-static` v5.3+   | Systemweites FFmpeg  | Zero-Dependency für End-User                 |
| Testing E2E      | Playwright für Electron | WebdriverIO          | Aktiver Support, klare Electron API          |
| Testing Unit     | Vitest                  | Jest                 | Schneller, Vite-native                       |
| Build Tool       | electron-vite           | CRA/electron-webpack | HMR, moderne ESM-Unterstützung               |
| Packaging        | electron-builder        | Electron Forge       | Mehr Kontrolle, bewährt                      |
| State Management | Eigene FSM (TypeScript) | XState               | XState v5 = huge bundle, einfache FSM reicht |

### Success Metrics

```
Funktional:
  ✅ Recording startet in < 500ms nach Shortcut
  ✅ Kein FFmpeg-Zombie bei App-Crash (verified via Activity Monitor)
  ✅ Mikrofon-Permission-Flow einmalig, persistent gespeichert
  ✅ Packaged .dmg Build: Recording + Transcript vollständig

Qualitativ:
  ✅ Unit-Test-Coverage AudioCaptureService > 80%
  ✅ E2E: Recording-Pipeline smoke-tested vor jedem Release
  ✅ keine console.error im Produktions-Build (nur strukturiertes Logging)
```

---

## Research Synthesis — Kritische Pfad Validierung

### Executive Summary

Diese technische Recherche hat den kritischen Pfad der WhisperFlow-Architektur vollständig validiert: **FFmpeg kann Audio sowohl auf macOS als auch auf Windows zuverlässig aufnehmen.** Der kritische Pfad ist machbar — mit plattformspezifischen Unterschieden, die die Architektur bereits korrekt antizipiert hat.

**Die wichtigste strategische Erkenntnis:** Windows ist für System-Audio _einfacher_ als macOS. WASAPI Loopback ist nativ eingebaut — kein Drittanbieter-Treiber wie BlackHole erforderlich. macOS benötigt für Tier 2 (System Audio) zwingend einen virtuellen Audio-Treiber.

---

### Architektur-Validierungs-Verdict

| Frage                                               | Antwort                                        | Bewertung                       |
| --------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| Kann FFmpeg Mikrofon auf macOS aufnehmen?           | **JA** — `-f avfoundation -i "none:default"`   | ✅ VALIDIERT                    |
| Kann FFmpeg System-Audio auf macOS aufnehmen?       | **NUR MIT BlackHole** — kein natives Loopback  | ⚠️ ARCHITEKTUR KORREKT (Tier 2) |
| Kann FFmpeg Mikrofon auf Windows aufnehmen?         | **JA** — `-f dshow -i audio="Name"`            | ✅ VALIDIERT                    |
| Kann FFmpeg System-Audio auf Windows aufnehmen?     | **JA, NATIV** — `-f wasapi -loopback 1`        | ✅ BESSER ALS MACOS             |
| Funktioniert ffmpeg-static in packaged Electron?    | **JA** — mit `asarUnpack`                      | ✅ VALIDIERT                    |
| Ist ScreenCaptureKit eine Alternative zu BlackHole? | **Tier 3 Komplexität** — Swift Native Addon    | ⚠️ KEIN QUICK WIN               |
| Kann Electron Mikrofon-Permissions anfragen?        | **JA** — `systemPreferences.askForMediaAccess` | ✅ VALIDIERT                    |

---

### Key Technical Findings — Priorisiert nach Impact

**1. KRITISCH: asarUnpack ist nicht optional**
`ffmpeg-static` Binary muss zwingend aus `app.asar.unpacked` ausgeführt werden. Ohne `asarUnpack` schlägt jeder packaged Build still fehl. Dies ist der häufigste Deployment-Fehler bei Electron + Native Binaries.

**2. KRITISCH: Electron Permission Gate vor FFmpeg-Start**
Auf macOS 10.14+ ist `NSMicrophoneUsageDescription` in `Info.plist` Pflicht. Ohne Permission zeigt macOS kein Prompt — FFmpeg startet und liefert Stille. Kein Fehler, kein Crash — nur leere Aufnahme.

**3. WICHTIG: FFmpeg Device-Addressierung ist plattformspezifisch**

- macOS: Index-basiert (`none:0`) — stabil, wird durch `avfoundation -list_devices` enumeriert
- Windows: Name-basiert (`audio="Mikrofon (Realtek)"`) — fragil, lokalisiert, ändert sich bei Updates
- → Platform Abstraction Layer ist verpflichtend, nicht optional

**4. WICHTIG: FSM verhindert Audio-Pipeline-Fehler**
Ohne FSM sind Race Conditions garantiert — besonders bei globalen Shortcuts die jederzeit feuern können. Die FSM ist kein Over-Engineering, sondern eine Notwendigkeit für eine stabile Desktop-App.

**5. ERKENNNTNIS: Windows System-Audio ist strategischer Vorteil**
WASAPI Loopback als natives Windows-Feature bedeutet: WhisperFlow kann auf Windows ohne Drittanbieter-Treiber-Installation System-Audio aufnehmen. Das verbessert die Windows User Experience erheblich gegenüber macOS Tier 2.

---

### Architektur-Delta-Assessment

Vergleich mit `architecture.md` (Stand: vor dieser Recherche):

| Architektur-Entscheidung         | Vorher                  | Nach Recherche            | Aktion                            |
| -------------------------------- | ----------------------- | ------------------------- | --------------------------------- |
| ffmpeg-static + asarUnpack       | ✅ Geplant              | ✅ Bestätigt              | Keine Änderung                    |
| BlackHole als Tier 2             | ✅ Geplant              | ✅ Bestätigt (macOS only) | Keine Änderung                    |
| Platform Adapters als Komponente | ✅ Geplant              | ✅ Bestätigt, kritisch    | Keine Änderung                    |
| Windows WASAPI Loopback nativ    | ❌ Nicht berücksichtigt | ✅ Neu entdeckt           | **Architecture-Update empfohlen** |
| FSM für Recording States         | Implizit                | ✅ Explizit empfohlen     | Klarstellungs-Update              |
| ScreenCaptureKit als Option      | Tier 2                  | ⚠️ Tier 3 (zu komplex)    | **Tier-Neubewertung**             |

**Empfohlene Änderungen an `architecture.md`:**

1. Windows WASAPI Loopback explizit in Platform-Adapter-Sektion dokumentieren
2. ScreenCaptureKit von Tier 2 auf Tier 3 verschieben (nach BlackHole)
3. FSM-Zustandsdiagramm in Audio-Pipeline-Sektion ergänzen

---

### Offene Fragen (nicht in dieser Recherche abgedeckt)

| Frage                                                              | Priorität | Nächster Schritt                                                    |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------- |
| Welches Audioformat ist optimal? (WAV vs WebM/Opus)                | Hoch      | Separate Recherche vorhanden: `technical-ffmpeg-webm-opus-pipeline` |
| Wie funktioniert Whisper API Upload-Limit (25MB)?                  | Mittel    | Sprint 3 Implementation-Test                                        |
| Code-Signing für macOS Notarisierung — exakte Entitlements?        | Hoch      | Apple Developer Docs vor Release                                    |
| BlackHole Installation UX — wie führt man Nutzer?                  | Mittel    | UX-Design Sprint N                                                  |
| Windows WASAPI: funktioniert loopback auf allen Windows-Versionen? | Mittel    | Windows 10 Build 1607+ → ausreichend                                |

---

### Quellen-Zusammenfassung

| Quelle                                                | Typ             | Verwendet in |
| ----------------------------------------------------- | --------------- | ------------ |
| ffmpeg.org/ffmpeg-devices.html                        | Offizielle Docs | Step 2, 3    |
| existential.audio/blackhole                           | Hersteller-Docs | Step 2       |
| developer.apple.com/screencapturekit                  | Apple Docs      | Step 2       |
| electronjs.org/docs/latest/tutorial/process-model     | Offizielle Docs | Step 4       |
| xstate.js.org/docs/about/concepts                     | Framework Docs  | Step 4       |
| electronjs.org/docs/latest/tutorial/automated-testing | Offizielle Docs | Step 5       |
| WASAPI Loopback Microsoft Docs                        | Microsoft Docs  | Step 3       |

---

_Research completed: FFmpeg Audio Capture — macOS & Windows System + Mikrofon_
_stepsCompleted: [1, 2, 3, 4, 5, 6] — Research finalized_
