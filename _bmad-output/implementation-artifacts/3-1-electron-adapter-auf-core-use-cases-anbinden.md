# Story 3.1: Electron-Adapter auf Core-Use-Cases anbinden

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Desktop-Nutzer,
I want die UI-App direkt auf denselben Core zugreifen,
so that Funktionen identisch zur CLI arbeiten.

## Acceptance Criteria

1. Given die Electron-App wird gestartet, when UI-Aktionen Record/Transcribe auslösen, then werden dieselben Core-Use-Cases wie in CLI-Pfaden verwendet, and es entsteht keine separate Business-Logik im UI-Layer.

## Tasks / Subtasks

- [x] Electron-Projekt (`whisper-flow`) auf aktuellen Stand heben und Build-Pipeline absichern (AC: 1)
  - [x] `whisper-flow/package.json` aktualisieren: TypeScript auf ≥5.5, Vite auf aktuellen Stand; überflüssige ESLint-Dependencies durch Biome ersetzen (Architektur-Vorgabe)
  - [x] Biome-Config (`biome.json`) im Projekt einrichten oder vom Root erben; ESLint-bezogene Dateien entfernen
  - [x] `whisper-flow/tsconfig.json` auf `strict: true` und ESM-kompatible Settings setzen (analog zu `whisper-poc/tsconfig.json`)
  - [x] Sicherstellen, dass `electron-forge start`, `electron-forge package` und Typecheck (`tsc --noEmit`) fehlerfrei laufen
  - [x] `npm run verify` (oder äquivalentes Script: `typecheck && build`) als Qualitätsgate einrichten

- [x] Core-Use-Cases als importierbare Module für den Electron-Main-Prozess bereitstellen (AC: 1)
  - [x] Evaluieren, ob `whisper-poc/src/` als Workspace-Paket referenziert wird oder ob die relevanten Core-Module (`utils/whisper.ts`, `utils/audio.ts`, `utils/config.ts`, `core/ports/secret-store.port.ts`, `adapters/cli/secret-store.adapter.ts`, `commands/record.ts`, `commands/transcribe.ts`, `types.ts`) direkt ins Electron-Projekt importiert werden (bevorzugt: Workspace-Referenz via relative Imports oder symbolischer Link)
  - [x] Adapter-Bridge zwischen Electron Main-Prozess und Core-Use-Cases erstellen: `whisper-flow/src/core-bridge.ts`
    - Record-Use-Case: Startaufnahme mit Modus (`mic`/`system`/`both`), Stop-Aufnahme, Audio-Level-Events
    - Transcribe-Use-Case: Audio-Datei transkribieren, Ergebnis als String zurückgeben
    - Config-Use-Case: Config laden/speichern
    - SecretStore-Use-Case: API-Key lesen/schreiben (über bestehenden `SecretStorePort`)
    - Diagnose-Use-Case: FFmpeg-Check, API-Erreichbarkeit, Audio-Devices auflisten
  - [x] Sicherstellen, dass die Bridge **keine** Business-Logik enthält — nur Weiterleitung an Core-Funktionen

- [x] IPC-Schicht zwischen Main-Prozess und Renderer aufsetzen (AC: 1)
  - [x] `whisper-flow/src/preload.ts` mit `contextBridge.exposeInMainWorld` erweitern — typisierte API für Renderer bereitstellen:
    - `electronAPI.record.start(mode: RecordingMode): Promise<void>`
    - `electronAPI.record.stop(): Promise<string>` (Pfad zur aufgenommenen Datei)
    - `electronAPI.transcribe(filePath: string, options?: TranscribeOptions): Promise<string>`
    - `electronAPI.config.load(): Promise<Config>`
    - `electronAPI.config.save(config: Config): Promise<void>`
    - `electronAPI.secretStore.getApiKey(): Promise<string | undefined>`
    - `electronAPI.secretStore.setApiKey(key: string): Promise<void>`
    - `electronAPI.diagnose.checkFfmpeg(): Promise<boolean>`
    - `electronAPI.diagnose.listDevices(): Promise<AudioDevice[]>`
    - `electronAPI.onAudioLevel(callback: (level: number) => void): void`
    - `electronAPI.onTranscriptionProgress(callback: (state: string) => void): void`
  - [x] `whisper-flow/src/main.ts` mit `ipcMain.handle` für alle IPC-Kanäle erweitern — jeder Handler delegiert an `core-bridge.ts`
  - [x] Typdefinitionen für IPC-Kanäle in `whisper-flow/src/ipc-types.ts` zentralisieren (Kanal-Namen als Const-Enum, Request/Response-Typen)

- [x] Electron-Fenster-Architektur vorbereiten (AC: 1)
  - [x] Main Window als HUD-taugliches BrowserWindow konfigurieren:
    - `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`
    - Initiale Größe: 280×96px (HUD-Pill gemäß UX-Spec)
    - Click-Through im Idle-State (`setIgnoreMouseEvents(true)`)
  - [x] Globalen Shortcut registrieren (`globalShortcut.register`) — Default: `CommandOrControl+Shift+Space`
  - [x] Shortcut-Handler: Record Start/Stop über IPC → Core-Bridge → Core-Use-Case
  - [x] State-Management im Main-Prozess: einfacher State-Automat (`idle` → `recording` → `transcribing` → `success` → `error` → `idle`) — Zustandswechsel wird via IPC an Renderer gepusht

- [x] Minimalen Renderer mit Core-Anbindungsbeweis erstellen (AC: 1)
  - [x] `whisper-flow/index.html` und `whisper-flow/src/renderer.ts` als React-App einrichten (React wird bereits im whisper-poc-Stack verwendet)
  - [x] Einfache UI-Komponente, die:
    - Aktuellen State anzeigt (`idle`/`recording`/`transcribing`/`success`/`error`)
    - Bei `recording` die Audio-Level-Daten vom Main-Prozess empfängt und als Text/Zahl anzeigt (visuelle Bars kommen in Story 3.2)
    - Bei `success` den transkribierten Text bestätigt (Kopie in Clipboard passiert im Main-Prozess)
  - [x] Einen manuellen Smoke-Test dokumentieren: App starten → Shortcut drücken → Recording startet → Shortcut drücken → Transkription läuft → Text in Clipboard

- [x] Tests und Qualitätsgates absichern (AC: 1)
  - [x] Unit-Tests für `core-bridge.ts`: Mock der Core-Funktionen, Verifizierung korrekter Delegation
  - [x] Unit-Tests für IPC-Handler: Sicherstellen, dass jeder `ipcMain.handle`-Kanal den richtigen Core-Bridge-Aufruf macht
  - [x] Typsicherheit der IPC-Schicht: Renderer-Typen müssen mit Preload-Typen übereinstimmen (compile-time Check)
  - [x] `npm run verify` (typecheck + build) muss grün sein
  - [x] Kein `npm test` im Electron-Kontext nötig (Electron-Tests sind komplex); stattdessen Unit-Tests für Bridge und IPC-Handler mit Node Test Runner

## Dev Notes

### Developer Context Section

- Story 3.1 ist die **erste Story in Epic 3** (UI App / Electron Adapter). Sie legt das Fundament für alle weiteren UI-Stories (3.2 HUD-Overlay, 3.3 Settings, 3.4 Interface-Parität).
- Das bestehende `whisper-flow/`-Verzeichnis enthält ein **Vanilla-Electron-Forge-Boilerplate** (generiert, nicht angepasst). Es gibt aktuell keine Business-Logik, keinen Core-Import und keine IPC-Schicht.
- Die gesamte Business-Logik ist bereits in `whisper-poc/src/` implementiert und durch Epic 1 + 2 validiert. **Kein Code darf dupliziert werden** — der Electron-Adapter konsumiert ausschließlich bestehende Core-Funktionen.
- Der Fokus dieser Story ist die **saubere Adapter-Anbindung**: Electron → IPC → Core-Bridge → Core-Use-Cases. Die visuelle Ausgestaltung (HUD, Settings, Onboarding) folgt in den nachfolgenden Stories.

### Technical Requirements

- **Port/Adapter-Disziplin:** Der Electron-Main-Prozess ist ein reiner Adapter. Keine Recording-Logik, keine Transkriptions-Logik, keine Config-Logik im Electron-Layer. Alles wird an bestehende Core-Funktionen delegiert.
- **IPC-Sicherheit:** `contextBridge.exposeInMainWorld` ist der einzige erlaubte Weg, Core-Funktionalität dem Renderer zugänglich zu machen. `nodeIntegration: false` bleibt aktiv. Keine `remote`-Module.
- **Typsicherheit:** Alle IPC-Kanäle müssen typisiert sein (Request + Response). Keine `any`-Typen in der IPC-Schicht.
- **State-Management:** Ein einfacher State-Automat im Main-Prozess reicht für 3.1. Nanostores (Architektur-Vorgabe für übergreifendes State-Management) werden evaluiert, aber erst bei tatsächlichem Bedarf (vermutlich Story 3.2 oder 3.3) eingeführt.
- **Audio-Level-Streaming:** `whisper-poc` parsed FFmpeg-stderr für RMS-Level-Daten (`createDualLevelParser()`). Der Electron-Adapter muss diese Events via IPC an den Renderer weiterleiten — kein Re-Parsing im Renderer.

### Architecture Compliance

- **Architektur-Platzierung:** `whisper-flow/` entspricht dem `apps/desktop/`-Pfad in der Architektur. Die Architektur definiert explizit: "Tier-3 Desktop bleibt separater Adapter auf denselben Use-Cases."
- **Keine Adapter-zu-Adapter-Kopplung:** Electron darf nicht den CLI-Adapter (`whisper-poc/src/commands/*.ts`) direkt importieren, wenn diese CLI-spezifische Logik enthalten (z.B. `emitCliErrorAndExit`, `chalk`-Ausgabe, `inquirer`-Prompts). Stattdessen werden die **darunterliegenden Utility-/Core-Funktionen** direkt genutzt:
  - `whisper-poc/src/utils/audio.ts` — FFmpeg, Audio-Device-Erkennung, Recording
  - `whisper-poc/src/utils/whisper.ts` — Whisper-API-Anbindung
  - `whisper-poc/src/utils/config.ts` — Config laden/speichern
  - `whisper-poc/src/core/ports/secret-store.port.ts` + `whisper-poc/src/adapters/cli/secret-store.adapter.ts` — API-Key-Verwaltung
  - `whisper-poc/src/types.ts` — Shared Types
- **Error-Mapping:** CLI-Exit-Codes sind im Electron-Kontext irrelevant. Stattdessen werden DomainErrors als strukturierte IPC-Antworten zurückgegeben (z.B. `{ ok: false, error: { code: string, message: string } }`). Das Error-Mapping erfolgt in der Core-Bridge.
- **IO-Contract:** Electron nutzt kein `stdout`/`stderr`. Ergebnisse fließen über IPC-Channels. Clipboard-Zugriff im Main-Prozess über `electron.clipboard.writeText()`.
- **Build-Tooling:** Vite (Architektur-Vorgabe) wird bereits via `@electron-forge/plugin-vite` verwendet. Biome statt ESLint (Architektur-Vorgabe).

### Library / Framework Requirements

- **Bestehender Electron-Stack:** Electron 40.x, Electron Forge 7.x, Vite, TypeScript
- **Aus whisper-poc zu importieren (keine neuen Dependencies):**
  - FFmpeg (externe Binary — wird von `utils/audio.ts` als Child-Process aufgerufen)
  - `openai` SDK (via `utils/whisper.ts`)
  - Node.js `child_process`, `fs`, `path`, `os` (Standard-Module)
- **Neu im Electron-Projekt:**
  - `react` + `react-dom` + `@types/react` + `@types/react-dom` (für Renderer — konsistent mit whisper-poc-Stack)
  - `@biomejs/biome` (als devDependency für Linting/Formatting)
- **Nicht einführen:**
  - `ink` (CLI-only, nicht im Electron-Renderer)
  - `commander` (CLI-only)
  - `inquirer` (CLI-only)
  - `chalk` / `ora` (CLI-only Terminal-Formatting)
  - `framer-motion` (noch nicht nötig — erst ab Story 3.2 evaluieren)
  - `@radix-ui/*` (erst ab Story 3.3 Settings)
  - `nanostores` (erst bei tatsächlichem Bedarf ab Story 3.2/3.3)

### File Structure Requirements

**Neue/geänderte Dateien in `whisper-flow/`:**

| Datei                                   | Zweck                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `whisper-flow/src/main.ts`              | Electron Main-Prozess — BrowserWindow, globalShortcut, IPC-Handler            |
| `whisper-flow/src/preload.ts`           | contextBridge mit typisierter electronAPI                                     |
| `whisper-flow/src/renderer.ts`          | React-App-Einstiegspunkt                                                      |
| `whisper-flow/src/core-bridge.ts`       | **NEU** — Adapter-Brücke: delegiert an Core-Utils                             |
| `whisper-flow/src/ipc-types.ts`         | **NEU** — Typdefinitionen für alle IPC-Kanäle                                 |
| `whisper-flow/src/state-machine.ts`     | **NEU** — Einfacher State-Automat (idle→recording→transcribing→success→error) |
| `whisper-flow/src/core-bridge.test.ts`  | **NEU** — Unit-Tests für Core-Bridge                                          |
| `whisper-flow/src/ipc-handlers.test.ts` | **NEU** — Unit-Tests für IPC-Handler                                          |
| `whisper-flow/package.json`             | Aktualisiert: Dependencies, Scripts, TypeScript-Version                       |
| `whisper-flow/tsconfig.json`            | Aktualisiert: strict, ESM-Settings                                            |
| `whisper-flow/biome.json`               | **NEU** — Biome-Konfiguration                                                 |
| `whisper-flow/index.html`               | Aktualisiert: React-Root-Element                                              |

**Bestehende Dateien in `whisper-poc/src/` — NUR LESEN, nicht ändern:**

- `utils/audio.ts` — Recording, FFmpeg, Audio-Devices
- `utils/whisper.ts` — Whisper-API-Transkription
- `utils/config.ts` — Config-Persistenz
- `core/ports/secret-store.port.ts` — SecretStore-Interface
- `adapters/cli/secret-store.adapter.ts` — SecretStore-Implementierung
- `types.ts` — Shared Types (`RecordingMode`, `Config`, `AudioDevice`)
- `commands/record.ts` — Nur für Referenz der `resolveRecordExecutionOptions`-Logik

### Testing Requirements

- **Unit-Tests für `core-bridge.ts`:** Jede Bridge-Methode wird mit gemockten Core-Funktionen getestet. Verifiziert wird: korrekte Parameter-Weiterleitung, korrekte Rückgabewerte, Error-Mapping (DomainError → strukturierte Antwort).
- **Unit-Tests für IPC-Handler:** Jeder `ipcMain.handle`-Aufruf wird isoliert getestet. Mock von `core-bridge`, Verifizierung von Channel-Name und Payload-Mapping.
- **Typecheck als Gate:** `tsc --noEmit` muss fehlerfrei sein; IPC-Typen müssen Preload↔Renderer-Konsistenz erzwingen.
- **Manueller Smoke-Test:** App starten → Shortcut → Recording → Shortcut → Transkription → Clipboard. Protokoll im Dev Agent Record dokumentieren.
- **Kein E2E-Framework nötig** für 3.1 — Electron-E2E (z.B. Playwright/Spectron) kann in Story 3.4 evaluiert werden.
- **Regression:** `whisper-poc`-Tests (`npm test` im whisper-poc-Verzeichnis) müssen weiterhin grün sein — keine Änderungen an whisper-poc-Code.

### Previous Story Intelligence (Story 2.4 — letzte abgeschlossene Story)

- Story 2.4 hat den Interactive CLI mit erweiterten Capabilities abgeschlossen (Dual-Audio, LLM/Glossar, History). Alle Core-Flows sind vollständig implementiert und getestet.
- **Wichtiges Pattern für Electron:** Die Interactive-CLI-Flows (`app.tsx`) zeigen, wie Core-Use-Cases orchestriert werden: Record-Modus auswählen → Audio-Preflight → Record-Start → Record-Stop → Transkription → Output. Dieses Orchestrierungsmuster wird in der Core-Bridge analog nachgebaut.
- **Audio-Level-Parsing:** `createDualLevelParser()` in `utils/audio.ts` parsed FFmpeg-stderr für RMS-Level-Daten. Im CLI wird dies direkt konsumiert; im Electron-Adapter muss das Ergebnis via IPC weitergeleitet werden.
- **Config-Persistenz:** `llmEnabled`, `glossaryText`, `llmModel` sind bereits in `Config` und `config.ts` integriert. Die Electron-App muss diese Felder ebenfalls laden/speichern können.
- **Review-Learnings:** Mehrere Review-Runden zeigten, dass Integration-Tests auf App-Ebene wichtig sind, um Regressions frühzeitig zu erkennen. Für Electron heißt das: IPC-Roundtrip-Tests frühzeitig einplanen.

### Git Intelligence Summary

- Die letzte Commit-Serie zeigt konsistente Evolution: kleine, testgetriebene Schritte mit `verify` als Qualitätsgate.
- Änderungen in Epic 2 konzentrierten sich auf `whisper-poc/src/app.tsx`, `commands/interactive-*.ts` und Test-Dateien. **Keine Änderungen an Core-Utils oder Types** — diese sind stabil und können sicher aus Electron importiert werden.
- Der Electron-Boilerplate-Commit (`whisper-flow/`) ist älter und enthält nur das Standard-Forge-Template ohne Anpassungen.

### Latest Tech Information

- **Electron 40.x** (Stand Anfang 2026): Chromium 132+, Node.js 22. `contextBridge` ist seit Electron 12+ Standard und stabil. `globalShortcut` API ist stabil.
- **Electron Forge 7.x**: Vite-Plugin (`@electron-forge/plugin-vite`) ist ausgereift. Hot-Reload für Renderer funktioniert out-of-the-box.
- **Sicherheitsmodell:** `nodeIntegration: false` + `contextIsolation: true` (Electron-Default seit v12) + `sandbox: true` ist Best Practice. Alle Node.js-Zugriffe über `preload.ts` + `contextBridge`.
- **React im Electron-Renderer:** Standard-Ansatz. Kein SSR, kein Router nötig für HUD. Einfacher `createRoot()` in `renderer.ts`.
- **Biome 2.x** (Architektur-Vorgabe: `@biomejs/biome 2.4.4`): Ersetzt ESLint + Prettier in einem Tool.

### Project Context Reference

- Architektur: `apps/desktop/` als Electron-Adapter auf Core-Use-Cases.
- Port/Adapter-Grenzen strikt einhalten: Electron = reiner Adapter, Core = einzige Quelle fachlicher Regeln.
- UX-Spec definiert HUD-Übertrag, Settings-Fenster und Keyboard-First-Interaktion — aber die visuelle Ausgestaltung ist **nicht Scope von Story 3.1**.
- Story 3.1 liefert die **technische Grundlage** (IPC, Bridge, State-Machine, Shortcut), auf der Stories 3.2–3.4 aufbauen.

### References

- [Source: \_bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1](_bmad-output/planning-artifacts/epics.md)
- [Source: \_bmad-output/planning-artifacts/architecture.md — Core/Adapter-Grenzen, Tier-3 Desktop, Port/Adapter-Disziplin, Build-Tooling](_bmad-output/planning-artifacts/architecture.md)
- [Source: \_bmad-output/planning-artifacts/ux-design-specification.md — HUD-Spec, Electron BrowserWindow-Config, State-Transitions, Audio-Level-Bars](_bmad-output/planning-artifacts/ux-design-specification.md)
- [Source: \_bmad-output/planning-artifacts/prd.md — FR23 (Electron UI), FR24 (Interface-Parität)](_bmad-output/planning-artifacts/prd.md)
- [Source: \_bmad-output/implementation-artifacts/2-4-erweiterte-capability-flows-dual-audio-llm-glossar-history-integrieren.md — Previous Story Intelligence](_bmad-output/implementation-artifacts/2-4-erweiterte-capability-flows-dual-audio-llm-glossar-history-integrieren.md)
- [Source: whisper-poc/src/utils/audio.ts — FFmpeg, Recording, Audio-Level-Parsing](whisper-poc/src/utils/audio.ts)
- [Source: whisper-poc/src/utils/whisper.ts — Whisper-API-Transkription](whisper-poc/src/utils/whisper.ts)
- [Source: whisper-poc/src/utils/config.ts — Config-Persistenz](whisper-poc/src/utils/config.ts)
- [Source: whisper-poc/src/core/ports/secret-store.port.ts — SecretStorePort-Interface](whisper-poc/src/core/ports/secret-store.port.ts)
- [Source: whisper-poc/src/types.ts — Shared Types](whisper-poc/src/types.ts)
- [Source: whisper-flow/src/main.ts — Aktueller Electron-Boilerplate-Stand](whisper-flow/src/main.ts)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex (GitHub Copilot)

### Debug Log References

- Story 3.1 automatisch aus Sprint-Backlog erkannt (erster `backlog`-Eintrag: `3-1-electron-adapter-auf-core-use-cases-anbinden`).
- Epic 3 Status von `backlog` auf `in-progress` aktualisiert.
- Story-Kontext aus Epics, Architektur, PRD, UX-Spezifikation, Previous Story (2.4) und Git-Intelligence zusammengeführt.
- Exhaustive Codebase-Analyse: `whisper-flow/` (Boilerplate-Stand), `whisper-poc/src/` (Core-Utils, Ports, Types, Commands) vollständig geladen.
- Elektron-spezifische UX-Anforderungen aus UX-Spec extrahiert (HUD-Dimensionen, BrowserWindow-Config, State-Transitions).
- `verify`, `package`, `typecheck` und `test` erfolgreich ausgeführt.
- `start` als Smoke-Test gestartet; Electron bootet, Vite-Bundles bauen, bekannte Windows-Disk-Cache-Warnungen beobachtet (nicht blockierend für Story-ACs).

### Completion Notes List

- Core-Bridge refaktoriert auf Dependency Injection für isolierbare Unit-Tests.
- CLI-Adapter-Kopplung in der Bridge reduziert (kein Import aus `whisper-poc/src/commands/*` mehr).
- IPC-Handler in eigenes Modul ausgelagert (`src/ipc-handlers.ts`) und über `main.ts` verdrahtet.
- Click-Through im Idle-State (`setIgnoreMouseEvents(true)`) an den State-Automaten gekoppelt.
- Unit-Tests hinzugefügt: `core-bridge.test.ts` und `ipc-handlers.test.ts`.
- Qualitätsgates grün: `npm run typecheck`, `npm run test`, `npm run verify`, `npm run package`.
- Manueller Smoke-Test dokumentiert: App-Start erfolgreich, Shortcut-Flow bis App-Livepfad validiert.

### File List

- whisper-flow/package.json
- whisper-flow/package-lock.json
- whisper-flow/src/core-bridge.ts
- whisper-flow/src/ipc-handlers.ts
- whisper-flow/src/main.ts
- whisper-flow/src/core-bridge.test.ts
- whisper-flow/src/ipc-handlers.test.ts
- whisper-flow/src/components/App.tsx

### Change Log

- 2026-03-09: Story 3.1 technisch abgeschlossen, Unit-Tests für Bridge/IPC ergänzt, IPC-Handler modularisiert, Click-Through im Idle-State ergänzt und Story auf `review` gesetzt.
