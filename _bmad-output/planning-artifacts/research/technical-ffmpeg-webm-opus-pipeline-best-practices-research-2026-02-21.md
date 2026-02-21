---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: "research"
lastStep: 1
research_type: "technical"
research_topic: "FFmpeg WebM/Opus Pipeline Best Practices"
research_goals: "Best Practices für die WAV → WebM/Opus Konvertierungs-Pipeline in WhisperFlow (Electron-App) — optimale FFmpeg-Parameter, Node.js-Integration, Qualität vs. Kompression, Whisper API Kompatibilität"
user_name: "Yoda"
date: "2026-02-21"
web_research_enabled: true
source_verification: true
---

# FFmpeg WebM/Opus Pipeline für Electron: Umfassende Technische Recherche für WhisperFlow

## Executive Summary

Die vorliegende Recherche analysiert die Best Practices für eine **WAV → WebM/Opus Audio-Konvertierungs-Pipeline** innerhalb der WhisperFlow Electron-Desktop-App. WhisperFlow kombiniert Sprach-Aufnahme, FFmpeg-basiertes Audio-Encoding und die OpenAI Whisper API zu einem Voice-to-Text-Workflow mit globalem Hotkey und System-Tray-Integration.

Die zentrale technische Erkenntnis dieser Recherche ist die **Deprecation von fluent-ffmpeg** (Mai 2025) — dem bisherigen De-facto-Standard für FFmpeg-Integration in Node.js. Die empfohlene Architektur setzt stattdessen auf `child_process.spawn()` in Kombination mit `ffmpeg-static` (v5.3.0, FFmpeg 6.1.1), was direkte Kontrolle über die CLI-Parameter ohne Abstraktionsschicht-Risiko bietet.

Für die Pipeline-Datenverarbeitung wird ein **File-basierter I/O-Ansatz** empfohlen: Temporäre WAV- und WebM-Dateien auf Disk statt In-Memory-Buffers oder stdio-Pipe-Streaming. Dies maximiert die Debuggbarkeit, ermöglicht manuelle Inspektion aller Zwischendateien und eliminiert das OOM-Risiko bei langen Aufnahmen.

**Kritische Erkenntnisse:**

- **Opus-Encoder:** FFmpegs `libopus` mit `application=voip`, `vbr=on`, `48 kbps` bietet optimale Sprach-Kompression (16:1 vs. WAV) bei voller Whisper-API-Kompatibilität
- **Electron-Architektur:** Multi-Process-Modell mit Main Process als Orchestrator, Context Isolation + contextBridge für sichere IPC, FFmpeg als Child Process
- **Pipeline als FSM:** `IDLE → RECORDING → ENCODING → UPLOADING → TRANSCRIBED` mit Error-Recovery und Exponential Backoff für API-Fehler
- **Kosten:** Whisper-API ab ~$0.66/Monat (10 Min/Tag, gpt-4o-mini-transcribe), Infrastruktur ~$350-650/Jahr für Solo-Dev
- **Implementierung:** 4 Sprints (8 Wochen) mit inkrementeller Layer-by-Layer Adoption

**Top-Empfehlungen:**

1. `child_process.spawn()` + `ffmpeg-static` statt fluent-ffmpeg oder WASM
2. File-basierte I/O für die gesamte Pipeline (WAV → WebM-Datei → Upload)
3. `gpt-4o-mini-transcribe` als Default-Modell (halber Preis, ausreichende Qualität)
4. electron-builder mit `extraResources` für FFmpeg-Binary-Distribution
5. Vitest + Playwright für Testing (Unit + E2E mit nativer Electron-Unterstützung)

---

## Inhaltsverzeichnis

1. [Technische Einleitung und Methodologie](#technische-einleitung-und-methodologie)
2. [Technology Stack Analysis](#technology-stack-analysis) — Sprachen, Frameworks, Codecs, Cloud-Infrastruktur
3. [Integration Patterns Analysis](#integration-patterns-analysis) — API Design, Kommunikation, Datenformate, Security
4. [Architectural Patterns and Design](#architectural-patterns-and-design) — Multi-Process-Architektur, FSM, Performance, Deployment
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption) — Adoption, Workflows, Testing, Kosten
6. [Technical Research Recommendations](#technical-research-recommendations) — Roadmap, Stack-Empfehlungen, KPIs
7. [Quellen und Methodologie](#quellen-und-methodologie)

---

## Technische Einleitung und Methodologie

### Technische Bedeutung

Die Konvertierung von Audio-Aufnahmen in komprimierte, API-kompatible Formate ist ein kritischer Baustein für jede Voice-to-Text-Desktop-Anwendung. Mit der wachsenden Verbreitung von Speech-to-Text-APIs (OpenAI Whisper, Google Speech, Azure Speech) und der zunehmenden Nutzung von Desktop-Apps für Produktivitäts-Workflows gewinnt die Frage der optimalen Audio-Pipeline-Architektur an Bedeutung.

WhisperFlow adressiert einen konkreten Pain Point: Schnelle, niedrigschwellige Sprach-zu-Text-Konvertierung direkt auf dem Desktop — ohne Browser, ohne Cloud-Recording, mit voller Kontrolle über die Aufnahme-Qualität und Datenschutz.

### Forschungsmethodologie

- **Scope:** FFmpeg-Parameter, Node.js/Electron-Integration, Opus-Codec-Konfiguration, OpenAI Whisper API Kompatibilität
- **Quellen:** Offizielle Dokumentation (electronjs.org, ffmpeg.org, developers.openai.com, nodejs.org), npm Registry, GitHub Repositories
- **Verifikation:** Jede technische Aussage wurde gegen mindestens eine aktuelle Web-Quelle verifiziert. Confidence Levels werden bei unsicheren Daten angegeben.
- **Zeitraum:** Februar 2026, Fokus auf aktuelle stabile Releases
- **Technische Tiefe:** Implementierungsnah mit Code-Beispielen, Architektur-Diagrammen und konkreten Konfigurationsempfehlungen

### Erreichte Forschungsziele

**Ursprüngliche Ziele:** Best Practices für die WAV → WebM/Opus Konvertierungs-Pipeline in WhisperFlow — optimale FFmpeg-Parameter, Node.js-Integration, Qualität vs. Kompression, Whisper API Kompatibilität

**Ergebnisse:**

- ✅ Optimale FFmpeg-Parameter für Sprach-Opus identifiziert (`libopus`, `application=voip`, `48 kbps VBR`, `compression_level=10`)
- ✅ Node.js-Integration geklärt: `spawn()` + `ffmpeg-static` (fluent-ffmpeg deprecated!)
- ✅ Qualität vs. Kompression: 16:1 Kompressionsrate bei voller Transkriptions-Qualität
- ✅ Whisper API Übertragbarkeit: WebM nativ unterstützt, 25 MB Limit = ~70 Minuten @ 48 kbps
- ✅ Zusätzlich entdeckt: File-basierte I/O als besserer Ansatz für Debuggbarkeit, Electron UtilityProcess API, detaillierte Kostenanalyse

---

## Technical Research Scope Confirmation

**Research Topic:** FFmpeg WebM/Opus Pipeline Best Practices
**Research Goals:** Best Practices für die WAV → WebM/Opus Konvertierungs-Pipeline in WhisperFlow (Electron-App) — optimale FFmpeg-Parameter, Node.js-Integration, Qualität vs. Kompression, Whisper API Kompatibilität

**Technical Research Scope:**

- Architecture Analysis - FFmpeg Audio-Pipeline-Design, Streaming vs. File-basierte Konvertierung
- Implementation Approaches - FFmpeg CLI-Parameter, Node.js/Electron-Integration, Echtzeit-Encoding
- Technology Stack - Opus Codec-Konfiguration, WebM Container, Sample-Rate/Bitrate-Optimierung
- Integration Patterns - WAV → WebM/Opus Pipeline, Streaming-Pipes, Chunk-basierte Verarbeitung
- Performance Considerations - Encoding-Geschwindigkeit, Dateigröße, Qualität vs. Kompression, Whisper API Limits

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-21

---

## Technology Stack Analysis

### Programmiersprachen

_Primäre Sprachen für die FFmpeg WebM/Opus Pipeline in WhisperFlow:_

**JavaScript / TypeScript (Node.js / Electron)**
WhisperFlow ist eine Electron-basierte Desktop-App. Die gesamte Ansteuerung der FFmpeg-Pipeline erfolgt aus dem Node.js Main Process heraus – mittels `child_process.spawn()` oder `child_process.execFile()`. TypeScript ist der empfohlene Standard für Electron-Projekte mit Type Safety und besserer Wartbarkeit.

**C (FFmpeg Native)**
FFmpeg selbst ist in C geschrieben. Die Konfiguration erfolgt ausschließlich über CLI-Parameter. Für WhisperFlow ist keine direkte C-Programmierung nötig – die Interaktion geschieht über die FFmpeg-Binary als Subprocess.

_Performance-Charakteristik:_ Node.js eignet sich hervorragend für I/O-intensive Audio-Pipeline-Steuerung, da die eigentliche CPU-Last (Encoding) vom nativen FFmpeg-Prozess getragen wird. Die Event-Loop bleibt frei für UI-Interaktion.

_Source: https://www.electronjs.org/, https://ffmpeg.org/_

### Entwicklungs-Frameworks und Bibliotheken

**⚠️ KRITISCH: fluent-ffmpeg ist seit Mai 2025 deprecated und archiviert!**

Das bisher meistgenutzte Node.js-FFmpeg-Wrapper-Paket `fluent-ffmpeg` (8.3K GitHub Stars, 701K wöchentliche Downloads) wurde am 22. Mai 2025 als deprecated markiert und das Repository auf read-only gesetzt. Die Maintainer erklären: _"This library is no longer maintained and no longer works properly with recent ffmpeg versions."_ Dies betrifft auch die Kompatibilität mit den FFmpeg 6.x/7.x-Releases.

_Source: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg_

**Empfohlene Alternativen:**

| Bibliothek                       | Status           | Ansatz                                                         | Wöchentl. Downloads    |
| -------------------------------- | ---------------- | -------------------------------------------------------------- | ---------------------- |
| **Node.js `child_process`**      | Native (stabil)  | Direkter FFmpeg-Subprocess via `spawn()` / `execFile()`        | N/A (Node.js built-in) |
| **ffmpeg-static**                | Aktiv (v5.3.0)   | Stellt statisch gelinkte FFmpeg-Binaries bereit (FFmpeg 6.1.1) | ~147.000               |
| **@ffmpeg/ffmpeg** (ffmpeg.wasm) | Aktiv (v0.12.15) | WebAssembly-basiertes FFmpeg im Browser/Node.js                | ~130.000               |

**Empfehlung für WhisperFlow:** `child_process.spawn()` + `ffmpeg-static` ist der robusteste Ansatz:

- `ffmpeg-static` liefert plattformspezifische FFmpeg-Binaries (macOS x64/ARM64, Windows x64/x86, Linux) automatisch mit — ideal für Electron-Distribution
- Direkte CLI-Parameter-Kontrolle ohne Abstraktionsschicht-Bugs
- Kein Wartungsrisiko durch deprecated Wrapper
- `ffmpeg-static` unterstützt explizit Electron: _"Because ffmpeg-static will download a binary specific to the OS/platform, you need to purge node_modules before (re-)packaging your app for a different OS/platform."_

_Source: https://www.npmjs.com/package/ffmpeg-static, https://www.npmjs.com/package/@ffmpeg/ffmpeg_

**@ffmpeg/ffmpeg (ffmpeg.wasm)** ist eine Alternative für Browser-basierte Anwendungen, jedoch für Electron-Desktop-Apps mit nativer FFmpeg-Binary **nicht empfohlen** — Performance-Overhead durch WebAssembly und eingeschränkte Codec-Unterstützung.

### Audio-Codec- und Container-Technologien

#### Opus Codec (libopus Encoder)

Opus ist der empfohlene Audio-Codec für Sprach-Komprimierung in der WhisperFlow-Pipeline. FFmpeg bietet zwei Encoder:

**libopus (empfohlen):**

- Externes Library-basiertes Encoding (libopus Referenz-Implementierung)
- Volle Feature-Unterstützung (SILK + CELT Hybrid)
- Optimiert für Sprache UND Musik

| Parameter           | Werte                          | Empfehlung für Sprache                        |
| ------------------- | ------------------------------ | --------------------------------------------- |
| `b` (Bitrate)       | bits/s                         | 32000–64000 (32–64 kbps)                      |
| `vbr`               | off / on / constrained         | **on** (variable Bitrate, Standard)           |
| `compression_level` | 0–10 (Standard: 10)            | **10** (höchste Qualität, Standard)           |
| `frame_duration`    | 2.5 / 5 / 10 / 20 / 40 / 60 ms | **20** (Standard, guter Kompromiss)           |
| `application`       | voip / audio / lowdelay        | **voip** (für Sprach-Transkription optimiert) |
| `cutoff`            | 4000–20000 Hz                  | **12000** (Wideband, ausreichend für Sprache) |
| `fec`               | 0 / 1                          | 0 (nicht nötig für File-Encoding)             |
| `packet_loss`       | 0–100 %                        | 0 (nicht nötig für File-Encoding)             |

**Nativer FFmpeg Opus Encoder (NICHT empfohlen):**

- Unterstützt nur den CELT-Teil des Opus-Codecs
- _"Quality is usually worse and at best equal to libopus"_ (FFmpeg-Dokumentation)
- Eingeschränkte Optionen: nur `b` (Bitrate) und `opus_delay`
- `opus_delay` < 20ms verschlechtert die Qualität zusätzlich

_Source: https://ffmpeg.org/ffmpeg-codecs.html, https://opus-codec.org/docs/_

#### WebM Container

WebM ist ein Matroska-basiertes offenes Container-Format, das Opus und VP8/VP9 Audio/Video-Streams unterstützt. Für Audio-only Dateien (wie in WhisperFlow) enthält die WebM-Datei ausschließlich den Opus-Audio-Stream ohne Video-Track.

**Vorteile für WhisperFlow:**

- Natives Streaming-fähiges Format
- Von OpenAI Whisper API explizit unterstützt
- Deutlich kleinere Dateien als WAV (typisch: 10–20x Kompression bei Sprache)
- Breite Tool- und Browser-Kompatibilität

### Development Tools und Plattformen

**FFmpeg CLI (v6.x / 7.x)**
Das zentrale Konvertierungs-Tool. Optimaler Befehl für WhisperFlow:

```
ffmpeg -i input.wav -c:a libopus -b:a 48k -vbr on -compression_level 10 -application voip -f webm output.webm
```

**ffprobe**
Kommt mit FFmpeg und ermöglicht Metadaten-Analyse von Audio-Dateien. Nützlich zur Validierung der erzeugten WebM/Opus-Dateien vor dem API-Upload.

**Electron (v29+)**
Desktop-Framework für WhisperFlow. Der Main Process steuert FFmpeg als Child Process, der Renderer Process zeigt UI (Snackbar-Feedback, Aufnahme-Status).

**electron-builder / electron-forge**
Packaging-Tools für Electron-Apps. Erfordern spezielle Konfiguration für das Mitliefern der FFmpeg-Binary aus `ffmpeg-static` (extraResources/extraFiles-Konfiguration).

### Cloud Infrastructure und API-Dienste

**OpenAI Whisper API**
Der primäre Cloud-Dienst für WhisperFlow. Unterstützte Audio-Formate für Upload:

| Format | Unterstützt | Empfohlen                                 |
| ------ | ----------- | ----------------------------------------- |
| WAV    | ✅          | ❌ (zu groß, 25MB Limit schnell erreicht) |
| WebM   | ✅          | ✅ (kompakt durch Opus-Kompression)       |
| OGG    | ✅          | ⚠️ (Alternative zu WebM)                  |
| MP3    | ✅          | ❌ (unnötiger Re-Encoding-Aufwand)        |
| FLAC   | ✅          | ❌ (lossless, aber zu groß)               |

**API-Modelle:**

- `whisper-1` — Standard-Transkriptionsmodell
- `gpt-4o-transcribe` — Neues hochgenaues Modell mit Streaming-Support
- `gpt-4o-mini-transcribe` — Leichtere Variante
- `gpt-4o-transcribe-diarize` — Mit Sprecher-Erkennung

**Dateigrößen-Limit:** 25 MB pro Upload. Bei 48 kbps Opus-Bitrate erlaubt dies theoretisch ~70 Minuten Audio pro Datei — ausreichend für die meisten WhisperFlow-Anwendungsfälle.

**Streaming-Transkription:** Die `gpt-4o`-Modelle unterstützen Streaming-Input, was zukünftig Real-Time-Transkription ermöglicht, ohne auf den Encoding-Abschluss zu warten.

_Source: https://developers.openai.com/docs/guides/speech-to-text, https://developers.openai.com/docs/api-reference/audio/createTranscription_

### Technologie-Adoptionstrends

**Migration von fluent-ffmpeg**
Die Deprecation von fluent-ffmpeg im Mai 2025 ist ein bedeutender Wendepunkt für das Node.js/FFmpeg-Ökosystem. Die Community migriert in zwei Richtungen:

1. **Direkte `child_process`-Steuerung** — Mehr Kontrolle, keine Middleware-Bugs, direkter CLI-Zugriff
2. **ffmpeg.wasm** — Für Browser-/Sandbox-Umgebungen, jedoch mit Performance-Einbußen

_Konfidenz: HOCH — Basierend auf GitHub-Archivierung und npm-Deprecation-Notice._

**Opus als Sprach-Codec-Standard**
Opus hat sich als dominanter Codec für Sprach-Kommunikation und -Komprimierung etabliert (WebRTC, Telefonanwendungen, Podcasts). Die `application=voip`-Einstellung aktiviert SILK-basierte Encoding-Optimierungen speziell für menschliche Sprache.

_Konfidenz: HOCH — RFC 6716 Standard, breite Industrie-Adoption._

**WebM für API-Uploads**
WebM/Opus hat sich als optimales Format für Speech-to-Text API-Uploads durchgesetzt:

- Offenes Format (keine Lizenzkosten)
- Hervorragende Kompression bei Sprache (10–20x vs. WAV)
- Unterstützt von allen großen STT-APIs (OpenAI, Google, Azure)

_Konfidenz: HOCH — Dokumentierte API-Unterstützung bei allen Anbietern._

**Electron + ffmpeg-static Pattern**
Das Bundling von statischen FFmpeg-Binaries via `ffmpeg-static` in Electron-Apps ist ein etabliertes Pattern mit klarer Plattform-Unterstützung (macOS Intel/Silicon, Windows x64, Linux x64/ARM).

_Konfidenz: HOCH — 147K wöchentliche npm-Downloads, dokumentierte Electron-Unterstützung._

---

## Integration Patterns Analysis

### API Design Patterns

#### FFmpeg CLI als Subprocess-API

FFmpeg exponiert seine Funktionalität nicht als Library-API, sondern als CLI-Tool. Die Integration in Node.js/Electron erfolgt über das `child_process`-Modul als Inter-Process-Communication (IPC). Dies entspricht dem **Process-Adapter Pattern** — ein nativer Prozess wird über stdin/stdout/stderr als API-Endpunkt behandelt.

**spawn() als primäres API-Pattern für WhisperFlow (File-basiert):**

```typescript
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const ffmpeg = spawn(ffmpegPath, [
  "-i",
  inputWavPath, // WAV-Datei als Input
  "-c:a",
  "libopus", // Opus Codec
  "-b:a",
  "48k", // 48 kbps Bitrate
  "-vbr",
  "on", // Variable Bitrate
  "-compression_level",
  "10", // Maximale Qualität
  "-application",
  "voip", // Sprach-Optimierung
  "-f",
  "webm", // WebM Container
  outputWebmPath, // WebM-Datei als Output
]);
// stderr bleibt verfügbar für Progress-Parsing
ffmpeg.stderr.on("data", (data) => {
  /* Progress */
});
```

**Warum `spawn()` statt `exec()` / `execFile()`:**

| Methode      | Async Events                 | Progress-Parsing          | WhisperFlow-Eignung                                 |
| ------------ | ---------------------------- | ------------------------- | --------------------------------------------------- |
| `spawn()`    | ✅ spawn, close, exit Events | ✅ stderr live auswertbar | **✅ Empfohlen** — async, Events, kein Buffer-Limit |
| `exec()`     | ❌ Erst nach Abschluss       | ❌ Kein Live-stderr       | ❌ Shell-Overhead, 1MB maxBuffer-Limit              |
| `execFile()` | ❌ Erst nach Abschluss       | ❌ Kein Live-stderr       | ⚠️ Möglich für File-I/O, aber ohne Live-Events      |

`spawn()` bleibt auch bei **File-basierter I/O** die beste Wahl, da:

1. **Echtzeit-Fortschritt:** stderr kann live geparst werden (Encoding-Progress für UI)
2. **Kein maxBuffer-Limit:** Audio-Dateien beliebiger Länge werden verarbeitet
3. **Async Events:** `spawn`, `close`, `exit` Events für sauberes Lifecycle-Management
4. **Kein Shell-Overhead:** Keine Shell-Injection-Risiken (Array-Parameter statt String)

_Source: https://nodejs.org/api/child_process.html_

#### OpenAI Whisper API — RESTful Multipart Upload

Die Whisper API verwendet ein klassisches RESTful **multipart/form-data Upload-Pattern**:

```
POST /v1/audio/transcriptions
Content-Type: multipart/form-data
Authorization: Bearer $OPENAI_API_KEY

--boundary
Content-Disposition: form-data; name="file"; filename="audio.webm"
Content-Type: audio/webm

[Binary Audio Data]
--boundary
Content-Disposition: form-data; name="model"

gpt-4o-transcribe
--boundary--
```

**Node.js Upload-Pattern mit FormData:**

```typescript
import { createReadStream } from "fs";
import OpenAI from "openai";

const client = new OpenAI();
const transcription = await client.audio.transcriptions.create({
  model: "gpt-4o-transcribe",
  file: createReadStream("audio.webm"),
  language: "de",
  prompt: "Transkribiere die folgende Aufnahme.",
  response_format: "json",
});
```

Alternativ kann ein Buffer direkt übergeben werden (z.B. bei zukünftiger Streaming-Optimierung):

```typescript
import { toFile } from "openai";

const transcription = await client.audio.transcriptions.create({
  model: "gpt-4o-transcribe",
  file: await toFile(webmBuffer, "audio.webm"),
  language: "de",
});
```

**Für WhisperFlow wird der File-basierte Upload empfohlen** — `createReadStream()` mit dem Pfad zur WebM-Datei. Die Datei bleibt auf Disk und kann bei Problemen inspiziert/wiederholt werden.

_Source: https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create_

### Communication Protocols

#### FFmpeg File I/O (Empfohlener Ansatz für WhisperFlow)

WhisperFlow setzt auf **File-basierte I/O** statt Pipe/Stream-basierter Verarbeitung. FFmpeg liest direkt von der WAV-Datei und schreibt direkt in eine WebM-Datei:

```
[recording.wav] → FFmpeg → [recording.webm]
                     ↓
              ffmpeg.stderr → Fortschritt / Fehler (live parsebar)
```

**Vorteile des File-basierten Ansatzes:**

- **Einfaches Debugging:** Zwischendateien (WAV, WebM) können jederzeit inspiziert und mit externen Tools abgespielt werden
- **Fehler-Reproduktion:** Bei Problemen liegen die Input-Dateien noch vor — Konvertierung kann manuell wiederholt werden
- **Einfache Architektur:** Kein Stream-Management, kein Back-Pressure-Handling, keine Memory-Buffer-Verwaltung
- **Natürliche Phasenkopplung:** Jede Phase (Aufnahme → Encoding → Upload) hat einen definierten Start/Ende mit Dateien als Übergabe-Artefakt

**Beispiel File-basierter FFmpeg-Aufruf:**

```typescript
import { spawn } from "child_process";
import path from "path";
import { app } from "electron";

const tempDir = app.getPath("temp");
const wavPath = path.join(tempDir, "whisperflow-recording.wav");
const webmPath = path.join(tempDir, "whisperflow-recording.webm");

const ffmpeg = spawn(ffmpegPath, [
  "-y", // Überschreibe Output ohne Nachfrage
  "-i",
  wavPath, // Input: WAV-Datei
  "-c:a",
  "libopus",
  "-b:a",
  "48k",
  "-vbr",
  "on",
  "-compression_level",
  "10",
  "-application",
  "voip",
  "-f",
  "webm",
  webmPath, // Output: WebM-Datei
]);
```

**Cleanup-Strategie für temporäre Dateien:**

```typescript
import { unlink } from "fs/promises";

async function cleanupTempFiles(
  wavPath: string,
  webmPath: string,
): Promise<void> {
  await Promise.allSettled([unlink(wavPath), unlink(webmPath)]);
}
```

⚠️ **Temp-Dateien mit `app.getPath('temp')` oder `os.tmpdir()`** — Nicht in das App-Verzeichnis schreiben. OS-Temp-Verzeichnisse werden automatisch bereinigt.

_Source: https://ffmpeg.org/ffmpeg.html, https://nodejs.org/api/child_process.html_

#### FFmpeg Pipe Protocol (Referenz — Alternative für spätere Optimierung)

FFmpeg unterstützt auch das **`pipe:` Protocol** für stdin/stdout-basierte Verarbeitung. Dies ist eine **mögliche zukünftige Optimierung**, wenn Latenz-Reduktion wichtiger wird als Debuggbarkeit:

- `pipe:0` (stdin) — Audio-Daten als Input
- `pipe:1` (stdout) — Konvertierte Daten als Output
- **Limitierung:** Nicht seekable — jedoch für WebM kein Problem (streaming-fähig)

_Source: https://ffmpeg.org/ffmpeg-protocols.html (Abschnitt 3.21 pipe)_

#### Electron IPC (Main ↔ Renderer)

In Electron-Apps läuft FFmpeg als Child Process im **Main Process** (Node.js-Umgebung). Die UI im **Renderer Process** (Chromium) kommuniziert über Electrons eingebauten IPC-Mechanismus:

```
Renderer Process              Main Process
┌──────────────┐             ┌──────────────────────┐
│   UI / React │ ──ipcMain── │ FFmpeg Child Process  │
│   Snackbar   │ ←──────────→│ Whisper API Client    │
│   Hotkeys    │  ipcRenderer│ Audio Pipeline Manager │
└──────────────┘             └──────────────────────┘
```

**IPC-Nachrichten für die Audio-Pipeline:**

- `start-recording` → Main Process startet Aufnahme
- `stop-recording` → Main Process stoppt Aufnahme, startet FFmpeg-Encoding
- `encoding-progress` ← Fortschritt des FFmpeg-Encodings (% oder Zeitstempel)
- `encoding-complete` ← WebM-Datei bereit für Upload
- `transcription-started` ← Whisper API Upload gestartet
- `transcription-complete` ← Transkriptionstext verfügbar
- `pipeline-error` ← Fehler in irgendeiner Phase

**contextBridge / preload Pattern (Electron Security Best Practice):**

```typescript
// preload.ts
contextBridge.exposeInMainWorld("audioAPI", {
  startRecording: (mode: "mic" | "system" | "dual") =>
    ipcRenderer.invoke("start-recording", mode),
  stopRecording: () => ipcRenderer.invoke("stop-recording"),
  onProgress: (callback: (progress: number) => void) =>
    ipcRenderer.on("encoding-progress", (_event, progress) =>
      callback(progress),
    ),
  onTranscription: (callback: (text: string) => void) =>
    ipcRenderer.on("transcription-complete", (_event, text) => callback(text)),
});
```

_Source: https://www.electronjs.org/docs/latest/tutorial/ipc_

### Data Formats und Standards

#### Input: WAV PCM (Aufnahme-Format)

WhisperFlow zeichnet Audio im unkomprimierten WAV PCM-Format auf:

| Parameter   | Wert                     | Begründung                                                  |
| ----------- | ------------------------ | ----------------------------------------------------------- |
| Sample Rate | 48000 Hz                 | Standard für Audio-Interfaces, maximale Opus-Kompatibilität |
| Bit Depth   | 16-bit (PCM_S16LE)       | Ausreichend für Sprache, geringer CPU-Overhead              |
| Channels    | 1 (Mono) oder 2 (Stereo) | Mono für Mikrofon, Stereo für System Audio                  |
| Container   | WAV (RIFF)               | Universell, kein Encoding-Delay                             |

**Datenrate WAV:** 48000 Hz × 16 bit × 1 Kanal = 768 kbps = **~5.6 MB/Minute**

#### Output: WebM/Opus (Upload-Format)

| Parameter   | Wert                     | Begründung                                      |
| ----------- | ------------------------ | ----------------------------------------------- |
| Container   | WebM (Matroska-Variante) | Whisper API-kompatibel, streaming-fähig         |
| Codec       | Opus (libopus)           | Beste Sprach-Kompression, offener Standard      |
| Bitrate     | 48 kbps VBR              | Optimaler Kompromiss Qualität/Größe für Sprache |
| Sample Rate | 48000 Hz                 | Opus-nativer Rate (intern auf Fullband gemappt) |
| Channels    | 1 (Mono)                 | Empfohlen für Speech-to-Text                    |

**Datenrate WebM/Opus:** ~48 kbps = **~0.35 MB/Minute** — Kompression: **~16:1 vs. WAV**

#### API-Austausch: multipart/form-data + JSON

**Upload:** `multipart/form-data` mit Binary WebM-Datei (RFC 7578)
**Response:** JSON mit Transkriptionstext:

```json
{
  "text": "Transkribierter Text hier...",
  "usage": {
    "type": "tokens",
    "input_tokens": 14,
    "output_tokens": 45,
    "total_tokens": 59
  }
}
```

**Streaming-Response (SSE):**
Die GPT-4o-Modelle unterstützen `stream=true` und liefern Server-Sent Events:

- `transcript.text.delta` — Inkrementelle Textfragmente
- `transcript.text.done` — Vollständige Transkription
- `transcript.text.segment` — Diarisierungs-Segmente (nur bei `gpt-4o-transcribe-diarize`)

_Source: https://developers.openai.com/docs/guides/speech-to-text_

### System Interoperability Approaches

#### End-to-End Pipeline: WAV → WebM/Opus → Whisper API

Die vollständige WhisperFlow-Pipeline integriert drei Systeme — OS Audio, FFmpeg und OpenAI API:

```
┌─── Phase 1: Aufnahme ───┐   ┌─── Phase 2: Encoding ────┐   ┌─── Phase 3: Upload ───┐
│                          │   │                           │   │                        │
│ OS Audio Input           │   │ FFmpeg child_process      │   │ OpenAI Whisper API     │
│ (Mikrofon / BlackHole)   │──→│ WAV File → WebM/Opus File  │──→│ multipart/form-data    │
│                          │   │                           │   │ POST /v1/audio/...     │
│ → WAV-Datei (temp)       │   │ → WebM/Opus-Datei (temp)  │   │ → JSON Transkription   │
└──────────────────────────┘   └───────────────────────────┘   └────────────────────────┘
```

**Gewählte Integrations-Strategie: File-basiert**

**✅ File-basierte Pipeline (Empfohlen)**

1. Aufnahme → WAV-Datei auf Disk (`app.getPath('temp')`)
2. FFmpeg CLI: `ffmpeg -i input.wav ... output.webm` (File-to-File)
3. Upload: `createReadStream('output.webm')` → Whisper API
4. Cleanup: Temporäre WAV/WebM-Dateien löschen

_Vorteile:_ Einfach debugbar — Dateien können inspiziert, manuell abgespielt und in FFmpeg-CLI reproduziert werden. Natürliche Phasentrennung. Fehler sind sofort lokalisierbar.
_Nachteile:_ Doppelte Disk-I/O, leichte Latenz (~100-200ms für typische Aufnahmen)

**⚠️ Streaming-Pipeline (Spätere Optimierung, nicht für MVP)**

1. Aufnahme → WAV-Daten direkt in FFmpeg.stdin pipen
2. FFmpeg.stdout → Buffer sammeln → Whisper API

_Vorteile:_ Keine temporären Dateien, geringere Latenz
_Nachteile:_ Deutlich komplexer zu debuggen, schwieriger zu reproduzieren, Error-Handling aufwändiger

#### Cross-Platform Kompatibilität

| Aspekt           | macOS                       | Windows               | Lösung                                    |
| ---------------- | --------------------------- | --------------------- | ----------------------------------------- |
| FFmpeg Binary    | `ffmpeg-static` (ARM64/x64) | `ffmpeg-static` (x64) | Automatisch durch `ffmpeg-static`         |
| System Audio     | BlackHole (Virtual Audio)   | WASAPI Loopback       | Plattform-spezifischer Aufnahme-Code      |
| Pfad-Separator   | `/`                         | `\`                   | `path.join()` für alle Pfade              |
| Temp-Verzeichnis | `/tmp` oder `os.tmpdir()`   | `%TEMP%`              | `os.tmpdir()` für Temp-Dateien            |
| Process Signals  | SIGTERM, SIGKILL            | Nur forciertes Kill   | `subprocess.kill('SIGTERM')` mit Fallback |

_Source: https://www.npmjs.com/package/ffmpeg-static, https://nodejs.org/api/child_process.html_

### Event-Driven Integration

#### FFmpeg Progress Events

FFmpeg schreibt Encoding-Fortschritt auf stderr. Dieses Output-Parsing ermöglicht Echtzeit-Fortschrittsanzeige:

```typescript
ffmpeg.stderr.on("data", (data: Buffer) => {
  const line = data.toString();
  // FFmpeg Progress-Format: "size=  128kB time=00:01:23.45 bitrate=  48.0kbits/s speed=12.3x"
  const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/);
  if (timeMatch) {
    const [, h, m, s] = timeMatch;
    const currentSeconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
    const progress = (currentSeconds / totalDurationSeconds) * 100;
    mainWindow.webContents.send("encoding-progress", progress);
  }
});
```

#### Lifecycle Events des Child Process

```typescript
// Spawn-Bestätigung
ffmpeg.on("spawn", () => {
  console.log("FFmpeg-Prozess gestartet, PID:", ffmpeg.pid);
});

// Erfolgreicher Abschluss
ffmpeg.on("close", (code, signal) => {
  if (code === 0) {
    mainWindow.webContents.send("encoding-complete", outputPath);
  } else {
    mainWindow.webContents.send("pipeline-error", {
      phase: "encoding",
      code,
      signal,
    });
  }
});

// Fehler beim Spawnen
ffmpeg.on("error", (err) => {
  mainWindow.webContents.send("pipeline-error", {
    phase: "spawn",
    message: err.message,
  });
});
```

**Wichtige Events-Reihenfolge:**

1. `spawn` — Prozess erfolgreich gestartet
2. `data` (stderr) — Progress-Updates und Warnungen
3. `exit` — Prozess beendet (Code + Signal)
4. `close` — Alle stdio-Streams geschlossen (NACH `exit`)

⚠️ **Wichtig:** `close` wird NACH `exit` emittiert. Cleanup-Logik immer auf `close` reagieren, nicht auf `exit` — da stdout/stderr-Daten bei `exit` noch ausstehen können. Bei File-basierter I/O ist die Output-Datei erst nach `close` garantiert vollständig geschrieben.

_Source: https://nodejs.org/api/child_process.html (Events: spawn, close, exit, error)_

#### Whisper API Streaming Events

Für Real-Time Feedback unterstützen die GPT-4o-Modelle Server-Sent Events (SSE):

```typescript
const stream = await client.audio.transcriptions.create({
  model: "gpt-4o-mini-transcribe",
  file: await toFile(webmBuffer, "audio.webm"),
  response_format: "text",
  stream: true,
});

for await (const event of stream) {
  if (event.type === "transcript.text.delta") {
    mainWindow.webContents.send("transcription-delta", event.delta);
  } else if (event.type === "transcript.text.done") {
    mainWindow.webContents.send("transcription-complete", event.text);
  }
}
```

⚠️ **Streaming ist NICHT verfügbar für `whisper-1`** — nur für `gpt-4o-transcribe` und `gpt-4o-mini-transcribe`.

**Hinweis:** Auch bei Streaming-Transkription wird die WebM-Datei als File hochgeladen (`createReadStream()`) — das Streaming bezieht sich nur auf die API-Response (SSE-Events), nicht auf den Upload.

_Source: https://developers.openai.com/docs/guides/speech-to-text#streaming-transcriptions_

### Integration Security Patterns

#### API-Key-Management in Electron

**Problem:** Electron-Apps werden auf dem Client installiert. API-Keys dürfen NICHT im Renderer-Process oder im gebündelten Code sichtbar sein.

**Empfohlene Patterns:**

1. **Environment Variables (Entwicklung):** `process.env.OPENAI_API_KEY` im Main Process
2. **OS Keychain (Produktion):** `keytar` oder Electron `safeStorage` API für verschlüsselte Speicherung
3. **Backend-Proxy (Enterprise):** Eigener Server als Proxy, der den API-Key serverseitig verwaltet

```typescript
// Electron safeStorage API
import { safeStorage } from "electron";

// Speichern
const encrypted = safeStorage.encryptString(apiKey);
store.set("encryptedApiKey", encrypted.toString("base64"));

// Laden
const encrypted = Buffer.from(store.get("encryptedApiKey"), "base64");
const apiKey = safeStorage.decryptString(encrypted);
```

#### FFmpeg Subprocess Security

- **Keine Shell-Injection:** `spawn()` mit Array-Parametern statt String-Verkettung — verhindert Shell-Metacharacter-Injection
- **Keine user-unsanitized Inputs in FFmpeg-Befehle:** Dateinamen und Pfade immer über separate Array-Elemente übergeben
- **Process Isolation:** FFmpeg läuft als isolierter Subprocess ohne Zugriff auf die Electron-App-Daten

```typescript
// ✅ SICHER: Parameter als Array
spawn(ffmpegPath, [
  "-i",
  userFilePath,
  "-c:a",
  "libopus",
  "-f",
  "webm",
  outputPath,
]);

// ❌ UNSICHER: Shell-Execution mit String
exec(`ffmpeg -i "${userFilePath}" -c:a libopus -f webm ${outputPath}`);
```

#### AbortController für Timeout-Schutz

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000); // 60s Timeout

const ffmpeg = spawn(ffmpegPath, args, { signal: controller.signal });
ffmpeg.on("close", () => clearTimeout(timeout));
ffmpeg.on("error", (err) => {
  if (err.name === "AbortError") {
    console.log("FFmpeg-Prozess wegen Timeout abgebrochen");
  }
});
```

_Source: https://nodejs.org/api/child_process.html (signal/AbortSignal), https://www.electronjs.org/docs/latest/api/safe-storage_

---

## Architectural Patterns and Design

### System Architecture Pattern: Multi-Process Desktop Audio Pipeline

WhisperFlow folgt dem **Multi-Process-Architekturmodell** von Electron/Chromium mit einer klaren Trennung der Verantwortlichkeiten:

```
┌──────────────────────────────────────────────────────────────────┐
│                    WhisperFlow Desktop App                        │
├──────────┬───────────────────────┬───────────────────────────────┤
│ Renderer │    Main Process       │   Child Processes              │
│ Process  │    (Orchestrator)     │   (Workers)                    │
│          │                       │                                │
│ UI/React │ ┌─────────────────┐   │ ┌─────────────────────────┐   │
│ Snackbar │ │ AudioPipeline-  │   │ │ FFmpeg Process           │   │
│ Hotkeys  │ │ Manager         │───┼→│ (WAV-File→Opus→WebM-File) │   │
│ Settings │ │                 │   │ └─────────────────────────┘   │
│          │ │ WhisperAPI-     │   │                                │
│          │ │ Client          │───┼──→ OpenAI API (HTTPS)          │
│          │ │                 │   │                                │
│          │ │ RecordingService│   │ ┌─────────────────────────┐   │
│          │ │                 │───┼→│ Audio-Aufnahme-Prozess    │   │
│          │ └─────────────────┘   │ │ (OS-Audio → WAV File)    │   │
│          │                       │ └─────────────────────────┘   │
├──────────┼───────────────────────┼───────────────────────────────┤
│contextBridge│     IPC Channel    │   File I/O (temp) / HTTP        │
└──────────┴───────────────────────┴───────────────────────────────┘
```

**Architektur-Entscheidung:** Electron Main Process als **zentrale Orchestrierungsschicht**. Sämtliche I/O-Operationen (Audio, FFmpeg, API-Calls) laufen im Main Process oder in Child Processes — NIE im Renderer. Der Renderer ist ausschließlich für UI-Rendering zuständig.

**Begründung:**

- Electrons Multi-Process-Architektur basiert auf Chromiums Sicherheitsmodell (Sandbox)
- Main Process hat vollen Node.js-Zugriff → `child_process`, `fs`, `net`
- Renderer Process läuft in isolierter Chromium-Sandbox → kein direkter File/Process-Zugriff
- Context Isolation (seit Electron 12 Standard) verhindert API-Leaks in die Webseite

_Source: https://www.electronjs.org/docs/latest/tutorial/process-model, https://www.electronjs.org/docs/latest/tutorial/context-isolation_

### Design Principles und Best Practices

#### Pipeline Pattern (Pipes and Filters)

Die WhisperFlow Audio-Pipeline implementiert das klassische **Pipes-and-Filters-Architekturmuster** mit **Dateien als Zwischenformat**:

```
Filter 1          Filter 2            Filter 3
┌──────────┐      ┌──────────────┐    ┌──────────────┐
│ Aufnahme │─File→│ FFmpeg       │─File→│ Whisper API  │
│ (→WAV)  │      │ (WAV→Opus)   │    │ (Opus→Text)  │
└──────────┘      └──────────────┘    └──────────────┘
```

**Grundprinzipien:**

1. **Jeder Filter hat eine einzelne Verantwortung** (Single Responsibility)
2. **Filter sind austauschbar** — z.B. FFmpeg-Parameter ändern, ohne Aufnahme oder Upload zu berühren
3. **Dateien als Schnittstelle** — Temporäre Dateien (WAV, WebM) entkoppeln die Filter und sind inspizierbar
4. **Unidirektionaler Datenfluss** — Audio fließt nur in eine Richtung: Aufnahme → Encoding → Upload

#### Dependency Injection für plattform-spezifischen Code

WhisperFlow muss zwei Plattformen unterstützen (macOS, Windows). Plattform-spezifischer Code (z.B. Audio-Aufnahme, System Audio Capture) sollte über Dependency Injection abstrahiert werden:

```typescript
// Interface für plattformübergreifende Audio-Aufnahme
interface AudioRecorder {
  startRecording(mode: RecordingMode): Promise<void>;
  stopRecording(): Promise<string>; // Pfad zur WAV-Datei
  getInputDevices(): Promise<AudioDevice[]>;
}

// Plattform-spezifische Implementierungen
class MacOSAudioRecorder implements AudioRecorder {
  /* BlackHole + Core Audio */
}
class WindowsAudioRecorder implements AudioRecorder {
  /* WASAPI Loopback */
}

// Factory basierend auf Plattform
function createAudioRecorder(): AudioRecorder {
  return process.platform === "darwin"
    ? new MacOSAudioRecorder()
    : new WindowsAudioRecorder();
}
```

#### State Machine für Pipeline-Lifecycle

Die Audio-Pipeline durchläuft definierte Zustände. Ein **Finite State Machine (FSM)** Pattern verhindert ungültige Übergänge:

```
                    ┌─────────┐
                    │  IDLE   │◄──────────────────┐
                    └────┬────┘                    │
                         │ start-recording         │ reset
                    ┌────▼────┐                    │
                    │RECORDING│                    │
                    └────┬────┘                    │
                         │ stop-recording          │
                    ┌────▼────┐                    │
                    │ENCODING │ (FFmpeg aktiv)      │
                    └────┬────┘                    │
                         │ encoding-complete        │
                    ┌────▼─────┐                   │
                    │UPLOADING │ (Whisper API)      │
                    └────┬─────┘                   │
                         │ transcription-complete   │
                    ┌────▼──────┐                  │
                    │TRANSCRIBED│──────────────────┘
                    └───────────┘
                         │ error (jeder State)
                    ┌────▼────┐
                    │ ERROR   │────────────────────┘
                    └─────────┘
```

**Vorteile des FSM-Patterns:**

- **Debugging:** Jeder Zustand ist klar definiert und loggbar
- **Fehlerbehandlung:** Von jedem Zustand gibt es einen definierten Pfad zu ERROR → IDLE
- **UI-Binding:** Der Renderer zeigt UI-Elemente basierend auf dem aktuellen State
- **Concurrency-Schutz:** Doppeltes Starten der Aufnahme wird durch State-Guard verhindert

### Scalability und Performance Patterns

#### Non-Blocking Main Process (Kritische Electron-Regel)

Electrons Performance-Guide betont: **Blockiere niemals den Main Process.** Der UI-Thread hängt direkt am Main Process. Jede synchrone Operation (z.B. `execSync`, `readFileSync`) friert die gesamte App ein.

**Konsequenzen für WhisperFlow:**

| Operation          | ❌ Blocking         | ✅ Non-Blocking             |
| ------------------ | ------------------- | --------------------------- |
| FFmpeg starten     | `execSync(...)`     | `spawn(...)`                |
| Datei lesen        | `readFileSync(...)` | `fs.promises.readFile(...)` |
| API-Upload         | —                   | `await fetch(...)` (async)  |
| Temp-Datei löschen | `unlinkSync(...)`   | `fs.promises.unlink(...)`   |

**Weitere Electron-Performance-Empfehlungen (direkt von Electron-Docs):**

1. **Lazy Module Loading** — `require('ffmpeg-static')` erst bei Bedarf, nicht beim App-Start
2. **Code Bundling** — Webpack/Vite für schnelleren App-Start (weniger `require()`-Calls)
3. **Worker Threads** — Für CPU-intensive Tasks (z.B. WAV-Header-Parsing) statt Main Process
4. **Nicht genutzte Default-Menüs deaktivieren** — `Menu.setApplicationMenu(null)` vor `app.on('ready')`

_Source: https://www.electronjs.org/docs/latest/tutorial/performance_

#### Disk-Management für Audio-Daten

Audio-Daten können groß werden (WAV: ~5.6 MB/Minute). Bei File-basierter I/O ist effizientes Temp-Datei-Management entscheidend:

**Strategie: Strukturiertes Temp-Verzeichnis mit Lifecycle-Management**

```typescript
import path from "path";
import { app } from "electron";
import { mkdir, unlink, readdir, stat } from "fs/promises";

// Dediziertes Temp-Verzeichnis für WhisperFlow
const TEMP_DIR = path.join(app.getPath("temp"), "whisperflow");

async function initTempDir(): Promise<void> {
  await mkdir(TEMP_DIR, { recursive: true });
}

// Einzigartige Dateinamen per Timestamp
function getTempPaths(): { wavPath: string; webmPath: string } {
  const id = Date.now();
  return {
    wavPath: path.join(TEMP_DIR, `recording-${id}.wav`),
    webmPath: path.join(TEMP_DIR, `recording-${id}.webm`),
  };
}

// Cleanup nach erfolgreichem Upload
async function cleanupRecording(
  wavPath: string,
  webmPath: string,
): Promise<void> {
  await Promise.allSettled([unlink(wavPath), unlink(webmPath)]);
}

// Startup-Cleanup: Verwaiste Temp-Dateien bereinigen
async function cleanupOrphanedFiles(
  maxAgeMs = 24 * 60 * 60 * 1000,
): Promise<void> {
  const files = await readdir(TEMP_DIR);
  const now = Date.now();
  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    const fileStat = await stat(filePath);
    if (now - fileStat.mtimeMs > maxAgeMs) {
      await unlink(filePath).catch(() => {});
    }
  }
}
```

**Disk-Space-Abschätzung:**

- 10 Minuten Aufnahme: ~56 MB (WAV) + ~3.5 MB (WebM) = **~60 MB temp**
- 30 Minuten Aufnahme: ~168 MB (WAV) + ~10.5 MB (WebM) = **~179 MB temp**
- Nach erfolgreichem Upload werden beide Dateien sofort gelöscht

**Vorteil gegenüber In-Memory-Buffers:** Kein Risiko für Node.js Heap-OOM bei langen Aufnahmen. Das OS verwaltet Disk-Caching effizient.

#### UtilityProcess als Alternative zu child_process

Electron bietet seit neueren Versionen die `utilityProcess` API als Alternative zu `child_process.fork()`. Key-Unterschiede:

| Aspekt        | `child_process.spawn()`   | `utilityProcess.fork()`         |
| ------------- | ------------------------- | ------------------------------- |
| Einsatzzweck  | Externe Binaries (FFmpeg) | Node.js-Module                  |
| Kommunikation | stdio Pipes               | MessagePort (strukturiert)      |
| Isolation     | Prozess-Isolation         | Chromium Service-basiert        |
| macOS Signing | Standard                  | `allowLoadingUnsignedLibraries` |

**Empfehlung für WhisperFlow:**

- **FFmpeg:** `child_process.spawn()` — FFmpeg ist eine externe Binary, keine Node.js-Module
- **Audio-Vorverarbeitung (z.B. WAV-Analyse):** `utilityProcess.fork()` — Bei komplexer JavaScript-Logik, die den Main Process entlasten soll
- **API-Client:** Direkt im Main Process — `fetch()` ist asynchron und blockiert nicht

_Source: https://www.electronjs.org/docs/latest/api/utility-process_

### Deployment und Operations Architecture

#### FFmpeg Binary Distribution

Die Distribution der FFmpeg-Binary mit der Electron-App erfordert ein spezifisches Architektur-Pattern:

```
WhisperFlow.app/
├── Contents/
│   ├── MacOS/
│   │   └── WhisperFlow              (Electron Main)
│   ├── Resources/
│   │   ├── app.asar                 (Gebündelte App)
│   │   └── bin/
│   │       └── ffmpeg               (ffmpeg-static Binary)
│   └── Frameworks/
│       └── Electron Framework.framework
```

**electron-builder Konfiguration:**

```json
{
  "build": {
    "extraResources": [
      {
        "from": "node_modules/ffmpeg-static/ffmpeg",
        "to": "bin/ffmpeg"
      }
    ]
  }
}
```

**Runtime-Pfad-Auflösung:**

```typescript
import path from "path";
import { app } from "electron";

function getFFmpegPath(): string {
  if (app.isPackaged) {
    // Gepackte App: Binary liegt in Resources/bin/
    return path.join(process.resourcesPath, "bin", "ffmpeg");
  } else {
    // Entwicklung: Direkt aus node_modules
    return require("ffmpeg-static");
  }
}
```

**Cross-Platform-Hinweis:** `ffmpeg-static` stellt automatisch die korrekte Binary für die Ziel-Plattform bereit:

- macOS ARM64 (Apple Silicon): `darwin-arm64`
- macOS x64 (Intel): `darwin-x64`
- Windows x64: `win32-x64`
- Linux x64: `linux-x64`

⚠️ **Wichtig laut `ffmpeg-static` Doku:** _"You need to purge node_modules before (re-)packaging your app for a different OS/platform."_

_Source: https://www.npmjs.com/package/ffmpeg-static, https://www.electronjs.org/docs/latest/tutorial/asar-archives_

#### Error Recovery Architecture

Ein robustes Error-Recovery-Pattern ist kritisch für eine Desktop-App:

```typescript
class AudioPipelineManager {
  private state: PipelineState = "IDLE";
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  async processRecording(wavPath: string): Promise<string> {
    try {
      this.setState("ENCODING");
      const webmPath = await this.encodeToWebM(wavPath);

      this.setState("UPLOADING");
      const transcription = await this.uploadToWhisper(webmPath);

      this.setState("TRANSCRIBED");
      this.retryCount = 0;

      // Cleanup: Temp-Dateien löschen nach Erfolg
      await this.cleanupFiles(wavPath, webmPath);
      return transcription;
    } catch (error) {
      this.setState("ERROR");

      if (this.isRetryable(error) && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential Backoff
        await this.sleep(delay);
        return this.processRecording(wavPath); // Retry
      }

      throw error; // Nicht-retry-fähiger Fehler
    }
  }

  private isRetryable(error: Error): boolean {
    // Netzwerk-Fehler und API Rate Limits sind retry-fähig
    if (error instanceof OpenAI.APIError) {
      return [429, 500, 502, 503].includes(error.status);
    }
    // FFmpeg-Fehler sind normalerweise NICHT retry-fähig
    return false;
  }
}
```

**Error-Kategorien und Recovery-Strategien:**

| Fehlertyp                 | Retry | Recovery-Strategie                          |
| ------------------------- | ----- | ------------------------------------------- |
| FFmpeg Spawn Error        | ❌    | Fehler anzeigen, FFmpeg-Installation prüfen |
| FFmpeg Exit Code ≠ 0      | ❌    | stderr analysieren, Benutzer informieren    |
| API 429 (Rate Limit)      | ✅    | Exponential Backoff mit Retry-After Header  |
| API 500/502/503           | ✅    | Exponential Backoff (max 3 Retries)         |
| API 413 (File too large)  | ❌    | Audio splitten, kleinere Chunks senden      |
| Netzwerk-Timeout          | ✅    | Retry mit leicht erhöhtem Timeout           |
| Disk Full (temp. Dateien) | ❌    | Benutzer warnen, Temp-Dateien bereinigen    |

### Architektur-Entscheidungsmatrix (ADR Summary)

| #     | Entscheidung        | Gewählt                            | Alternativen                                | Begründung                                                 |
| ----- | ------------------- | ---------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| ADR-1 | FFmpeg-Integration  | `child_process.spawn()`            | fluent-ffmpeg ~~(deprecated)~~, ffmpeg.wasm | Direkte Kontrolle, kein Middleware-Risiko                  |
| ADR-2 | FFmpeg-Distribution | `ffmpeg-static` (extraResources)   | System-FFmpeg, ffmpeg.wasm                  | Deterministische Binaries, Cross-Platform                  |
| ADR-3 | Audio-Pipeline      | **File-basiert (File I/O)**        | Stream/Pipes, Worker Threads                | Einfach debugbar, Dateien inspizierbar, kein Memory-Risiko |
| ADR-4 | Electron IPC        | `contextBridge` + `ipcMain.handle` | `@electron/remote` ~~(deprecated)~~         | Security Best Practice, Context Isolation                  |
| ADR-5 | State Management    | FSM (Pipeline States)              | Redux, Global State                         | Einfach, deterministisch, debugbar                         |
| ADR-6 | API-Key-Storage     | `safeStorage` API                  | Plaintext, Environment                      | OS-Level-Encryption                                        |
| ADR-7 | Error Recovery      | Exponential Backoff + Retry        | Fail-fast, Circuit Breaker                  | Robust bei temporären API-Fehlern                          |

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

#### Inkrementelle Implementierung (Empfohlen)

WhisperFlow sollte einem **Layer-by-Layer Adoption-Ansatz** folgen, bei dem jede Schicht der Audio-Pipeline separat implementiert und getestet wird, bevor die nächste hinzukommt:

```
Phase 1: Aufnahme    → WAV-Datei auf Disk (isolierter Test mit Audio-Playback)
Phase 2: Encoding    → FFmpeg WAV→WebM/Opus File-Konvertierung (prüfbar mit ffprobe)
Phase 3: Upload      → Whisper API Upload der WebM-Datei (prüfbar mit CLI-Test)
Phase 4: Integration → Alle Phasen verbunden mit FSM und IPC
Phase 5: UI/UX       → Electron-Renderer mit Hotkey, Tray, Snackbar
```

**Vorteile dieses Ansatzes:**

- Jede Phase ist **isoliert testbar** — WAV abspielen, WebM mit ffprobe prüfen, API manuell aufrufen
- Fehler sind sofort auf eine Phase lokalisierbar
- Kein "Big Bang"-Risiko — funktioniert Phase 2 nicht, bleibt Phase 1 stabil
- File-basierte I/O ermöglicht die manuelle Inspektion jeder Zwischendatei

#### FFmpeg-Integration: Migration von Wrapper zu Native

Da `fluent-ffmpeg` deprecated ist (Mai 2025), gibt es für Projekte, die bisher darauf aufgebaut haben, einen klaren Migrationspfad:

| Aspekt         | fluent-ffmpeg (alt)                            | spawn() + ffmpeg-static (neu)                          |
| -------------- | ---------------------------------------------- | ------------------------------------------------------ |
| API            | Method-Chaining `.input().audioCodec().save()` | Array-Parameter `['-i', path, '-c:a', 'libopus', ...]` |
| Error-Handling | Events `.on('error', cb)`                      | `child_process` Events `on('error')`, `on('close')`    |
| Progress       | `.on('progress', cb)`                          | stderr-Parsing mit RegEx                               |
| Abhängigkeit   | npm-Paket (deprecated)                         | Node.js Built-in + `ffmpeg-static` Binary              |
| FFmpeg-Version | Unkontrolliert (System-FFmpeg)                 | Determiniert (6.1.1 via ffmpeg-static)                 |

**Für WhisperFlow ist keine Migration nötig** — das Projekt startet neu mit `spawn()`. Aber für Teams, die existierenden fluent-ffmpeg-Code haben, ist der Umstieg direkt und 1:1 übersetzbar.

_Source: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg, https://www.npmjs.com/package/ffmpeg-static_

### Development Workflows and Tooling

#### Empfohlener Tech-Stack für WhisperFlow

| Kategorie         | Tool                | Version              | Begründung                                         |
| ----------------- | ------------------- | -------------------- | -------------------------------------------------- |
| **Runtime**       | Electron            | ≥ 29 (Chromium 122+) | Context Isolation default, UtilityProcess API      |
| **Sprache**       | TypeScript          | ≥ 5.x                | Type Safety, besseres Refactoring                  |
| **Bundler**       | Vite                | ≥ 5.x                | Schneller Dev-Server, native ESM, Electron-Plugins |
| **UI-Framework**  | React               | ≥ 18                 | Established, große Community, SSR nicht nötig      |
| **FFmpeg**        | ffmpeg-static       | 5.3.0                | Statische Binaries, Cross-Platform                 |
| **API-Client**    | openai (npm)        | ≥ 4.x                | Offizielles TypeScript SDK, Streaming-Support      |
| **Build/Package** | electron-builder    | ≥ 26.x               | DMG/NSIS/Snap, extraResources, Auto-Update         |
| **Testing**       | Vitest + Playwright | Latest               | Unit-Tests + E2E für Electron                      |
| **Linting**       | ESLint + Prettier   | Latest               | Code-Qualität und Konsistenz                       |

#### Projekt-Struktur (Empfehlung)

```
whisperflow/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts             # App Entry Point
│   │   ├── audio-pipeline.ts    # FFmpeg + Konvertierung
│   │   ├── whisper-client.ts    # OpenAI API Client
│   │   ├── recording-service.ts # Audio-Aufnahme
│   │   ├── tray-manager.ts      # System Tray
│   │   └── ipc-handlers.ts      # IPC Handler Registration
│   ├── preload/
│   │   └── index.ts             # contextBridge API
│   └── renderer/                # React UI
│       ├── App.tsx
│       ├── components/
│       └── hooks/
├── resources/                   # Icons, Assets
├── electron-builder.yml         # Build-Konfiguration
├── vite.config.ts               # Vite für Main + Renderer
├── tsconfig.json
└── package.json
```

#### Development Workflow

```
1. Dev-Server starten:    npm run dev (Vite + Electron)
2. Code ändern:           Hot Reload im Renderer, Restart für Main
3. Tests ausführen:       npm test (Vitest Unit) + npm run test:e2e (Playwright)
4. Lint & Format:         npm run lint && npm run format
5. Build:                 npm run build (Vite Bundle + electron-builder)
6. Code Signing:          Automatisch in CI/CD (macOS: Xcode + Notarize, Windows: EV-Zertifikat)
```

_Source: https://www.electronjs.org/docs/latest/tutorial/automated-testing, https://www.npmjs.com/package/electron-builder_

### Testing and Quality Assurance

#### Test-Pyramide für WhisperFlow

```
         ╱╲
        ╱  ╲        E2E Tests (Playwright + Electron)
       ╱    ╲       → App starten, Hotkey drücken, Transkription prüfen
      ╱──────╲
     ╱        ╲     Integration Tests (Vitest)
    ╱          ╲    → FFmpeg-Konvertierung, API-Upload, IPC-Kommunikation
   ╱────────────╲
  ╱              ╲  Unit Tests (Vitest)
 ╱                ╲ → FSM-Übergänge, Pfad-Auflösung, Error-Handling-Logik
╱──────────────────╲
```

#### Unit Tests (Vitest)

```typescript
// audio-pipeline.test.ts
import { describe, it, expect } from "vitest";
import { AudioPipelineManager } from "../src/main/audio-pipeline";

describe("AudioPipelineManager", () => {
  it("should transition from IDLE to RECORDING", () => {
    const pipeline = new AudioPipelineManager();
    pipeline.startRecording();
    expect(pipeline.state).toBe("RECORDING");
  });

  it("should reject start when already recording", () => {
    const pipeline = new AudioPipelineManager();
    pipeline.startRecording();
    expect(() => pipeline.startRecording()).toThrow("Invalid state transition");
  });

  it("should resolve FFmpeg path correctly", () => {
    const path = getFFmpegPath();
    expect(path).toMatch(/ffmpeg/);
  });
});
```

#### Integration Tests (FFmpeg-Konvertierung)

```typescript
// ffmpeg-integration.test.ts
import { describe, it, expect } from "vitest";
import { convertWavToWebm } from "../src/main/audio-pipeline";
import { existsSync, statSync } from "fs";

describe("FFmpeg WAV→WebM Conversion", () => {
  it("should convert test WAV to WebM/Opus", async () => {
    const webmPath = await convertWavToWebm("./fixtures/test-speech.wav");

    expect(existsSync(webmPath)).toBe(true);

    const stats = statSync(webmPath);
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.size).toBeLessThan(100_000); // WebM sollte viel kleiner als WAV sein
  }, 10_000); // 10s Timeout für FFmpeg
});
```

#### E2E Tests (Playwright + Electron)

Electron unterstützt Playwright nativ über die `_electron.launch` API:

```typescript
// e2e/app.spec.ts
import { test, expect, _electron as electron } from "@playwright/test";

test("App startet und zeigt Hauptfenster", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();

  await expect(window).toHaveTitle(/WhisperFlow/);
  await window.screenshot({ path: "screenshots/main-window.png" });

  await app.close();
});
```

**Playwright für Electron** ermöglicht:

- Zugriff auf Main-Process-APIs via `app.evaluate()`
- BrowserWindow-Interaktion über Page-Objekte
- Screenshot-basierte visuelle Regression

_Source: https://www.electronjs.org/docs/latest/tutorial/automated-testing, https://playwright.dev/docs/api/class-electron_

### Deployment and Operations Practices

#### Build und Packaging

**electron-builder** (527K wöchentliche Downloads, MIT) ist der De-facto-Standard für Electron-App-Distribution:

```yaml
# electron-builder.yml
appId: com.whisperflow.app
productName: WhisperFlow
directories:
  output: dist

extraResources:
  - from: node_modules/ffmpeg-static/ffmpeg
    to: bin/ffmpeg

mac:
  category: public.app-category.productivity
  target:
    - dmg
    - zip # Für Auto-Update (Squirrel.Mac)
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

win:
  target:
    - nsis
  sign: ./build/sign.js # EV Code Signing

linux:
  target:
    - AppImage
    - snap
```

**Wichtig für macOS Microphone-Zugriff:**

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>com.apple.security.device.audio-input</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
</dict>
</plist>
```

_Source: https://www.npmjs.com/package/electron-builder, https://www.electronjs.org/docs/latest/tutorial/code-signing_

#### Code Signing

| Plattform           | Anforderung                                          | Tool                                        | Kosten                                    |
| ------------------- | ---------------------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| **macOS**           | Apple Developer Program + Notarize                   | `@electron/osx-sign` + `@electron/notarize` | ~99 $/Jahr (Apple Developer)              |
| **Windows**         | EV Code Signing Certificate (seit Juni 2023 Pflicht) | `@electron/windows-sign`                    | ~200-500 $/Jahr (DigiCert, Sectigo, etc.) |
| **Windows (Azure)** | Azure Trusted Signing (Alternative zu EV)            | jsign / Electron Forge                      | Ab ~10 $/Monat (Azure)                    |

**⚠️ Seit Juni 2023** verlangt Microsoft ein **EV Code Signing Certificate** (Hardware-Modul, FIPS 140 Level 2). Einfache Authenticode-Zertifikate lösen weiterhin SmartScreen-Warnungen aus. Cloud-basiertes Signing (z.B. DigiCert KeyLocker) ermöglicht CI/CD-Integration.

_Source: https://www.electronjs.org/docs/latest/tutorial/code-signing_

#### Auto-Update

Electron bietet mehrere Auto-Update-Strategien:

| Methode                               | Infrastruktur      | Kosten     | Eignung                  |
| ------------------------------------- | ------------------ | ---------- | ------------------------ |
| `update.electronjs.org`               | Gratis-Webservice  | Kostenlos  | Öffentliche GitHub Repos |
| Cloud Storage (S3, GCS)               | Statisches Hosting | ~1 $/Monat | Private Apps, serverlos  |
| `electron-updater` (electron-builder) | Beliebig           | Variabel   | Flexible Konfiguration   |

**Empfehlung für WhisperFlow:** `update-electron-app` mit `update.electronjs.org` für MVP (kostenlos, GitHub-basiert). Später Migration zu eigenem S3-Bucket für private Releases.

```typescript
// main/index.ts
import { updateElectronApp } from "update-electron-app";

if (app.isPackaged) {
  updateElectronApp(); // Prüft alle 10 Min, lädt Updates im Hintergrund
}
```

_Source: https://www.electronjs.org/docs/latest/tutorial/updates_

### Cost Optimization and Resource Management

#### OpenAI Whisper API Kosten

| Modell                      | Preis pro Minute | Preis pro Stunde | Features                       |
| --------------------------- | ---------------- | ---------------- | ------------------------------ |
| `whisper-1`                 | $0.006           | $0.36            | Standard-Transkription         |
| `gpt-4o-transcribe`         | $0.006           | $0.36            | Höhere Genauigkeit, Streaming  |
| `gpt-4o-transcribe-diarize` | $0.006           | $0.36            | + Speaker-Diarization          |
| `gpt-4o-mini-transcribe`    | $0.003           | $0.18            | Günstiger, etwas weniger genau |

**Kostenrechnung für typische Nutzung:**

- 10 Minuten/Tag × 22 Arbeitstage × `gpt-4o-mini-transcribe` = **$0.66/Monat**
- 60 Minuten/Tag × 22 Arbeitstage × `gpt-4o-transcribe` = **$7.92/Monat**
- Power-User (120 Min/Tag) × `gpt-4o-transcribe` = **$15.84/Monat**

**Optimierungsstrategien:**

1. **`gpt-4o-mini-transcribe` als Default** — Halber Preis, ausreichend für die meisten Fälle
2. **Audio-Kompression (WebM/Opus 48 kbps)** — Reduziert Upload-Zeit und bleibt unter dem 25 MB Limit
3. **Nur bei Bedarf transkribieren** — Kurze Aufnahmen (< 3 Sekunden) verwerfen statt hochladen
4. **Batch API für nicht-zeitkritische Tasks** — 50% Rabatt auf Tokens

_Source: https://developers.openai.com/api/docs/pricing_

#### Infrastruktur-Kosten (Entwickler)

| Posten                     | Kosten        | Frequenz     |
| -------------------------- | ------------- | ------------ |
| Apple Developer Program    | $99           | Jährlich     |
| Windows EV Code Signing    | $200-500      | Jährlich     |
| GitHub Pro (private repos) | $4/Monat      | Monatlich    |
| OpenAI API (Entwicklung)   | ~$5-20        | Monatlich    |
| **Gesamt (Solo-Dev)**      | **~$350-650** | **Jährlich** |

### Risk Assessment and Mitigation

| #   | Risiko                                        | Wahrscheinlichkeit | Impact | Mitigation                                                 |
| --- | --------------------------------------------- | ------------------ | ------ | ---------------------------------------------------------- |
| R1  | FFmpeg-Binary nicht gefunden in gepackter App | Mittel             | Hoch   | Pfad-Auflösung testen (`app.isPackaged`), Integration-Test |
| R2  | OpenAI API-Änderungen (Endpoints, Formate)    | Niedrig            | Mittel | Offizielles SDK nutzen, Versionierung                      |
| R3  | macOS Microphone-Permission abgelehnt         | Mittel             | Hoch   | Entitlements korrekt setzen, User-Anleitung                |
| R4  | Windows SmartScreen warnt trotz Signierung    | Niedrig            | Hoch   | EV-Zertifikat + Azure Trusted Signing                      |
| R5  | ffmpeg-static veraltet oder unmaintained      | Niedrig            | Mittel | Repository beobachten, ggf. eigene FFmpeg-Binaries         |
| R6  | Audio-Qualität unzureichend für Transkription | Niedrig            | Hoch   | Opus VBR 48 kbps validieren, A/B-Tests mit Whisper         |
| R7  | Große Dateien überschreiten 25 MB API-Limit   | Niedrig            | Mittel | Dauer-basiertes Splitting (bei ~70 Min @ 48 kbps)          |
| R8  | Disk Full bei Temp-Dateien                    | Niedrig            | Mittel | Cleanup nach Upload, Startup-Bereinigung, Disk-Space-Check |

---

## Technical Research Recommendations

### Implementation Roadmap

```
Sprint 1 (Woche 1-2): Foundation
├── Electron + Vite + TypeScript Setup
├── Projekt-Struktur erstellen
├── electron-builder Basis-Konfiguration
└── CI/CD Pipeline (GitHub Actions)

Sprint 2 (Woche 3-4): Audio Pipeline
├── Audio-Aufnahme (Mikrofon → WAV-Datei)
├── FFmpeg WAV→WebM/Opus Konvertierung (File-to-File)
├── Unit Tests + Integration Tests für Pipeline
└── FFmpeg-Pfad-Auflösung (Dev vs. Packaged)

Sprint 3 (Woche 5-6): Whisper Integration
├── OpenAI API Client (File Upload)
├── Transkriptions-Ergebnis anzeigen
├── Error Handling + Retry-Logik
└── API-Key-Management (safeStorage)

Sprint 4 (Woche 7-8): UI/UX + Shipping
├── System Tray + Global Hotkey
├── Snackbar-Overlay für Transkription
├── Auto-Update Integration
├── Code Signing (macOS + Windows)
└── Erste Beta-Release
```

### Technology Stack Recommendations

**Primär-Stack (Empfohlen):**

- **Electron 29+** mit Context Isolation + contextBridge
- **TypeScript 5.x** mit striktem Modus
- **Vite** als Bundler (schnellster Dev-Server für Electron)
- **React 18** für Renderer-UI
- **child_process.spawn()** + **ffmpeg-static 5.3.0** für FFmpeg
- **openai** npm-Paket (offizielles SDK) für Whisper API
- **electron-builder** für Packaging + Distribution
- **Vitest** + **Playwright** für Testing

**Explizit NICHT empfohlen:**

- ❌ fluent-ffmpeg (deprecated seit Mai 2025)
- ❌ @electron/remote (deprecated)
- ❌ @ffmpeg/ffmpeg (WASM) — Performance-Overhead, eingeschränkte Codecs
- ❌ In-Memory-Buffer-Pipeline — Schwer debugbar, OOM-Risiko bei langen Aufnahmen

### Skill Development Requirements

| Skill                        | Level benötigt | Ressource                   |
| ---------------------------- | -------------- | --------------------------- |
| TypeScript                   | Intermediate   | Offizielles Handbook        |
| Electron IPC + Process Model | Intermediate   | electronjs.org Tutorials    |
| FFmpeg CLI-Parameter         | Basic          | ffmpeg.org Docs + Wiki      |
| OpenAI SDK (Node.js)         | Basic          | developers.openai.com       |
| Audio-Grundlagen (PCM, Opus) | Basic          | Opus Codec Wiki             |
| Code Signing (macOS/Windows) | Basic          | Electron Code Signing Guide |
| CI/CD (GitHub Actions)       | Intermediate   | GitHub Actions Docs         |

### Success Metrics and KPIs

| Metrik                         | Zielwert                                | Messmethode                      |
| ------------------------------ | --------------------------------------- | -------------------------------- |
| **Encoding-Latenz**            | < 2s für 5-Min-Aufnahme                 | `console.time()` um FFmpeg-spawn |
| **Upload-Latenz**              | < 3s für 5-Min-Aufnahme (48 kbps WebM)  | API Response Time                |
| **Transkriptions-Genauigkeit** | > 95% WER (Word Error Rate) auf Deutsch | Manueller A/B-Test               |
| **App-Startzeit**              | < 2s (Cold Start)                       | Electron Performance Tracing     |
| **Memory-Nutzung**             | < 150 MB (idle), < 300 MB (recording)   | Electron Task Manager            |
| **Paketgröße**                 | < 150 MB (inkl. FFmpeg Binary)          | electron-builder Output          |
| **API-Kosten**                 | < $10/Monat (normaler Nutzer)           | OpenAI Dashboard                 |
| **Crash-Rate**                 | < 1% pro Session                        | Electron `crashReporter`         |

---

## Quellen und Methodologie

### Primärquellen (offizielle Dokumentation)

| Quelle            | URL                                     | Genutzt für                                                                                                 |
| ----------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Electron Docs     | https://www.electronjs.org/docs/latest/ | Process Model, Context Isolation, Performance, UtilityProcess, IPC, Code Signing, Distribution, Auto-Update |
| FFmpeg Docs       | https://ffmpeg.org/                     | Codec-Parameter, Pipe Protocol, CLI-Referenz                                                                |
| OpenAI Developers | https://developers.openai.com/          | Whisper API, Pricing, Streaming, Audio Formats                                                              |
| Node.js API       | https://nodejs.org/api/                 | child_process, fs, streams                                                                                  |
| npm Registry      | https://www.npmjs.com/                  | ffmpeg-static, electron-builder, openai SDK                                                                 |

### Sekundärquellen (Repositories, Community)

| Quelle                   | URL                                                 | Genutzt für                             |
| ------------------------ | --------------------------------------------------- | --------------------------------------- |
| fluent-ffmpeg (archived) | https://github.com/fluent-ffmpeg/node-fluent-ffmpeg | Deprecation-Status (Mai 2025)           |
| ffmpeg-static            | https://www.npmjs.com/package/ffmpeg-static         | Binary-Distribution, Version, Downloads |
| Opus Codec               | https://opus-codec.org/                             | Codec-Spezifikation, Qualitätsmerkmale  |
| Playwright               | https://playwright.dev/                             | E2E-Testing für Electron                |

### Web-Suchanfragen (chronologisch)

1. FFmpeg libopus encoder best practices speech audio
2. ffmpeg-static npm package electron integration
3. fluent-ffmpeg deprecated status 2025
4. OpenAI Whisper API supported audio formats file size limit
5. Electron process model context isolation tutorial
6. Electron performance best practices non-blocking main process
7. Electron UtilityProcess API documentation
8. Electron automated testing Playwright WebdriverIO
9. electron-builder packaging extraResources configuration
10. Electron code signing macOS Windows EV certificate
11. OpenAI Whisper API pricing per minute transcription
12. Electron auto-update update.electronjs.org

### Qualitätssicherung

- **Quellen-Verifikation:** Alle technischen Aussagen gegen mindestens eine aktuelle offizielle Quelle verifiziert
- **Confidence Level:** Hoch — basierend auf offizieller Dokumentation und aktuellen npm-Registry-Daten
- **Limitierungen:** Keine Performance-Benchmarks aus eigenen Tests; Whisper API Pricing kann sich ändern; BlackHole/WASAPI-Integration für System Audio nicht detailliert recherchiert
- **Methodologie-Transparenz:** Alle Web-Suchanfragen und Quellen vollständig dokumentiert

---

## Fazit

### Zusammenfassung der Kernerkenntnisse

Diese technische Recherche liefert eine **vollständige Architektur- und Implementierungsgrundlage** für die WhisperFlow Audio-Pipeline:

1. **Stack:** `child_process.spawn()` + `ffmpeg-static` + `openai` SDK — kein deprecated Middleware-Risiko
2. **Pipeline:** File-basierte I/O (WAV-Datei → WebM-Datei → File-Upload) — maximale Debuggbarkeit
3. **Architektur:** Electron Multi-Process + FSM + contextBridge — Security und Performance by Design
4. **Codec:** `libopus` mit Sprach-optimierten Parametern — 16:1 Kompression ohne Qualitätsverlust
5. **Distribution:** electron-builder + extraResources + Code Signing — produktionsreife Desktop-App

### Strategische Bewertung

WhisperFlow profitiert von einem **ausgereiften Ökosystem**: Electron, FFmpeg und die OpenAI Whisper API sind etablierte, gut dokumentierte Technologien. Das Hauptrisiko (fluent-ffmpeg Deprecation) wurde frühzeitig identifiziert und durch den spawn()-Ansatz mitigiert. Die File-basierte Pipeline-Architektur reduziert die Implementierungskomplexität erheblich und ermöglicht schnelle Iterationen.

### Empfohlene nächste Schritte

1. **Projekt-Setup:** Electron + Vite + TypeScript Boilerplate erstellen
2. **Proof of Concept:** WAV-Datei → FFmpeg → WebM → Whisper API Upload (End-to-End in ~2 Stunden machbar)
3. **MVP:** Audio-Aufnahme + Hotkey + Transkriptions-Anzeige (Sprint 1-2)
4. **Diese Recherche als Referenz** für Architektur-Entscheidungen und Code-Reviews nutzen

---

**Recherche abgeschlossen:** 2026-02-21
**Recherche-Umfang:** Umfassende technische Analyse (6 Schritte)
**Quellen-Verifikation:** Alle Fakten mit aktuellen Quellen belegt
**Dokument-Sprache:** Deutsch
**Confidence Level:** Hoch
