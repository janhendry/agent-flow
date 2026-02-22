---
stepsCompleted:
  - "step-01-validate-prerequisites"
  - "step-02-design-epics"
  - "step-03-create-stories"
  - "step-04-final-validation"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
---

# agent-flow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for agent-flow (WhisperFlow), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Audio Recording (FR1–FR7)**

- FR1: Nutzer kann eine Mic-Only-Aufnahme über einen globalen Shortcut starten und stoppen
- FR2: Nutzer kann eine System-Audio-Only-Aufnahme über einen globalen Shortcut starten und stoppen _(Tier 2)_
- FR3: Nutzer kann eine Dual-Recording-Aufnahme (Mic + System-Audio gleichzeitig) über einen globalen Shortcut starten und stoppen _(Tier 2)_
- FR4: Nutzer kann den Recording-Modus pro Profil konfigurieren — das aktive Profil bestimmt den Recording-Modus
- FR5: Das System erkennt verfügbare Audiogeräte automatisch und unterstützt Hot-plug
- FR6: Das System verifiziert beim Start, dass die gebündelte FFmpeg-Binary ausführbar ist — bei Fehler wird eine Fehlermeldung mit Hinweis auf Neuinstallation angezeigt
- FR7: Das System prüft beim Start, ob BlackHole verfügbar ist (wenn Dual-/System-Audio-Modus gewählt), und zeigt Setup-Anleitung _(Tier 2)_

**Transkription (FR8–FR11)**

- FR8: Das System sendet die aufgenommene Audiodatei nach Ende der Aufnahme an die Whisper API zur Transkription
- FR9: Nutzer kann ein Glossar (Whisper-Kontext-Prompt) pro Profil konfigurieren _(Tier 2)_
- FR10: Das System kann den transkribierten Text durch ein LLM (GPT) nachbearbeiten lassen _(Tier 2)_
- FR11: Nutzer kann LLM Post-Processing pro Profil aktivieren oder deaktivieren _(Tier 2)_

**Output & Clipboard (FR12–FR14)**

- FR12: Das System kopiert das Transkriptionsergebnis automatisch in die System-Zwischenablage
- FR13: Nutzer kann vergangene Transkriptionen in einem Quick History Overlay einsehen und per Fuzzy-Search filtern _(Tier 2)_
- FR14: Nutzer kann einen Eintrag aus der History erneut in die Zwischenablage kopieren _(Tier 2)_

**System Tray & Globale Shortcuts (FR15–FR19)**

- FR15: Die App läuft als System-Tray-Applikation ohne permanentes Hauptfenster
- FR16: Nutzer kann über das Tray-Icon auf Settings, History-Overlay, Profil-Wechsel und Quit zugreifen
- FR17: Nutzer kann globale Tastaturkürzel für Recording-Aktionen konfigurieren
- FR18: Globale Shortcuts funktionieren unabhängig davon, welche App im Vordergrund ist
- FR19: Nutzer kann den Shortcut-Recorder nutzen, um Shortcuts per UI neu zu belegen _(Tier 2)_

**HUD & Feedback (FR20–FR24)**

- FR20: Das System zeigt ein HUD mit dem Status "Recording" während einer aktiven Aufnahme — inklusive Live-Audiopegel-Visualisierung
- FR20a: Das HUD zeigt einen animierten Audiopegel-Indikator (Level Meter) in Echtzeit während der Aufnahme — via MessagePort + Canvas
- FR20b: Das HUD zeigt Clipping-Feedback wenn der Eingangspegel den Maximalwert überschreitet
- FR21: Das System zeigt ein HUD mit dem Status "Transcribing" während der API-Verarbeitung
- FR22: Das System zeigt eine Erfolgsbestätigung ("✓") wenn das Transkript in der Zwischenablage ist
- FR22a: Das System kann optional ein TranscriptOverlay anzeigen _(Tier 2)_
- FR23: Das System zeigt eine Fehlermeldung wenn Aufnahme oder Transkription fehlschlägt
- FR24: Das System zeigt Snackbar-Benachrichtigungen für Aufnahme-/Transkriptions-Events

**Settings & Konfiguration (FR25–FR29)**

- FR25: Nutzer kann seinen OpenAI API Key eingeben und speichern
- FR26: Nutzer kann den Recording-Modus pro Profil konfigurieren
- FR26a: Nutzer kann Toggle oder Push-to-Talk konfigurieren _(Tier 2)_
- FR27: Nutzer kann globale Shortcuts für alle Recording-Aktionen konfigurieren
- FR27a: Nutzer kann Profile erstellen, bearbeiten, duplizieren und löschen _(Tier 2)_
- FR27b: Nutzer kann das aktive Profil über ein Spotlight-style Overlay wechseln _(Tier 2)_
- FR27c: Nutzer kann System Prompts und Glossare in einer Bibliothek verwalten _(Tier 2)_
- FR28: Nutzer kann die Transkriptions-Sprache global konfigurieren
- FR29: Nutzer kann die Aufbewahrungszeit für gespeicherte Aufnahmen konfigurieren _(Tier 2)_

**Onboarding & Erster Start (FR30–FR34)**

- FR30: Die App erkennt beim ersten Start, dass noch kein API Key konfiguriert ist, und führt den Nutzer durch einen First-Run-Flow
- FR31: Das System fordert beim First-Run aktiv die benötigten macOS-Permissions an (Mikrofon, Accessibility)
- FR32: Das System führt nach API-Key-Eingabe automatisch ein Test-Recording durch
- FR33: Das System prüft beim Onboarding automatisch, ob BlackHole verfügbar ist _(Tier 2)_
- FR34: Nach erfolgreichem Onboarding zieht sich die App in den System Tray zurück

**Storage & Datenverwaltung (FR35–FR39)**

- FR35: Das System speichert Transkriptionen lokal mit Metadaten _(Tier 2)_
- FR36: Das System bereinigt Temp-Audiodateien automatisch nach konfigurierbarer Aufbewahrungszeit
- FR37: Nutzer kann den Speicherort für Aufnahmen konfigurieren _(Tier 2)_
- FR38: Das System prüft auf Updates und benachrichtigt den Nutzer
- FR39: Nutzer kann den Update-Modus konfigurieren (automatisch oder manuell)

### NonFunctional Requirements

**Performance**

- NFR1: Der globale Shortcut reagiert innerhalb von 200ms
- NFR2: Die App startet und ist im System Tray verfügbar ohne merkliche Verzögerung
- NFR3: FFmpeg-Encoding (WAV → WebM/Opus) läuft schneller als Echtzeit
- NFR4: Die App verursacht im Idle weniger als 50MB RAM und unter 1% CPU

**Reliability**

- NFR5: Stabil im Hintergrund ohne Memory Leaks bei Dauerbetrieb
- NFR6: Globale Shortcuts werden nach App-Neustart und System-Sleep/Wake neu registriert
- NFR7: Fehlgeschlagener API-Call führt zu klarer Fehlermeldung, kein stiller Fehler, kein Absturz

**Accessibility**

- NFR8: Respektiert macOS Accessibility-Einstellungen (z.B. Reduced Motion)

**Audio Level Stream Performance**

- NFR9: Audiopegel-Latenz unter 50ms vom Main Process an HUD-Renderer
- NFR10: Audiopegel-Visualisierung mit mindestens 30fps ohne CPU-Overhead
- NFR11: MessagePort-Channel wird beim Schließen des HUD sauber terminiert

**Security & Datenschutz**

- NFR12: API Keys verschlüsselt via OS-Keychain/safeStorage — nie Plaintext
- NFR13: Lokale Daten nur im User-Kontext — keine Übertragung an Dritte außer konfigurierter API

### Additional Requirements

**Architecture — Starter Template & Build**

- Electron Forge (vite-typescript Template) als Basis — erste Story muss Projekt-Scaffolding sein
- React 19 + TypeScript 5.x + Vite als Build-Tool
- Dependencies: nanostores + @nanostores/react + @janhendry/nanostore-ipc-bridge, electron-store, ffmpeg-static, openai, zod, electron-log, Tailwind CSS + Radix UI, Framer Motion, Vitest
- macOS Hardened Runtime + Notarization (entitlements.mac.plist)
- asarUnpack für ffmpeg-static Binary

**Architecture — State Management & IPC**

- NanoStores + nanostore-ipc-bridge für allen App-State (channelPrefix: 'whisperflow')
- MessagePort ausschließlich für Audio-Level-Stream (Hochfrequenz-Daten)
- Store-Naming: $camelCase Prefix, syncedAtom() in shared/stores/
- Actions-Pattern: Mutations nur über Actions — nie direkt store.set()
- IPC Channel Naming: namespace:action, alle als TypeScript const in shared/types/ipc.types.ts

**Architecture — Recording Pipeline**

- RecordingStateMachine als eigene TypeScript-Klasse (kein XState): IDLE → RECORDING → ENCODING → UPLOADING → TRANSCRIBED → ERROR
- AudioCaptureAdapter Interface für Platform-Abstraktion (Tier 1: nur MicCaptureAdapter)
- FFmpeg gebündelt via ffmpeg-static, WAV → WebM/Opus Pipeline
- Audio File Strategy: app.getPath('userData')/recordings/temp/

**Architecture — Security**

- API Key Storage via electron.safeStorage (OS Keychain)
- Verschlüsselter Buffer in electron-store, Entschlüsselung nur zur Laufzeit

**Architecture — Window Management**

- Window Manager Service als Main-Process Singleton-Registry (Map<WindowName, BrowserWindow>)
- Fenster-Typen: hud, settings, onboarding, snackbar, profile-switcher, history (Tier 2)
- Lazy Init Pattern: Fenster beim ersten Aufruf erstellt, danach gecacht

**Architecture — Project Structure**

- shared/ auf Root-Ebene (nicht in src/) — via @shared Vite/TS-Alias
- shared/types/, shared/stores/, shared/services/ (defineService Wrapper)
- src/main/lib/ für Node/Electron-only Implementierungen
- src/renderer/ für React-Komponenten, Hooks, Utils
- Typed Error Objects (AppError) via IPC — nie rohe Error
- async/await überall — kein .then(), keine Callbacks

**Architecture — Testing**

- Vitest für kritische Unit Tests only — kein Playwright, kein E2E
- Tests: Recording State Machine, FFmpeg Error Handling, IPC-Validierung, safeStorage
- Primäre Qualitätssicherung: Manuelles Testen

**Architecture — Distribution**

- Electron Forge integrierter Auto-Update-Mechanismus
- GitHub Actions CI/CD: Build + Sign + Release auf Tag-Push
- Distribution: Direct Download (DMG für macOS)

**UX — HUD Design (Floating Pill)**

- Direction A gewählt: schmale Pill-Form, 280px breit, ~80–96px hoch, border-radius 12px
- Recording: Graue Bars (#5A5A62) animiert nach Audio-Amplitude — kein Icon, kein Text
- Transcribing: Drei pulsierende Indigo-Dots
- Success: Grüner Check-Icon, Pop-Animation, auto-dismiss nach 1,5s
- Error: Warn-Icon + Text „Error"
- HUD-Position konfigurierbar (Default: Bottom Center)

**UX — Design System**

- Dark-first Professional Palette: background #0A0A0B, surface #141415, accent #6366F1, recording #EF4444, success #22C55E
- Inter als Hauptfont, JetBrains Mono für technische Werte
- 4px Base-Unit Spacing
- WCAG AA Kontrast für alle Kombinationen

**UX — Settings (9 Tabs)**

- General, Shortcuts, Profile, System Prompts, Glossare, API Key, Audio, Display, About
- Settings-Fenster: min 700×500px, Sidebar 220px fix, Content flex-grow
- Profile: Master-Detail Layout (Liste + Edit-Bereich)

**UX — History Overlay (Tier 2)**

- Spotlight-Paradigma: 720px breit, Fuzzy-Search, Keyboard-Navigation
- Match-Highlighting mit Accent-Farbe

**UX — Profil-Wechsel-Overlay (Tier 2)**

- Spotlight-style, Shortcut ⌘⇧P, always-on-top

### FR Coverage Map

| FR    | Epic   | Beschreibung                              |
| ----- | ------ | ----------------------------------------- |
| FR1   | Epic 2 | Mic-Only Recording via Shortcut           |
| FR2   | Epic 7 | System-Audio Recording (Tier 2)           |
| FR3   | Epic 7 | Dual-Recording Mic+System (Tier 2)        |
| FR4   | Epic 5 | Recording-Modus pro Profil konfigurieren  |
| FR5   | Epic 2 | Audiogeräte-Erkennung + Hot-plug          |
| FR6   | Epic 1 | FFmpeg-Binary-Verification beim Start     |
| FR7   | Epic 7 | BlackHole-Verfügbarkeit prüfen (Tier 2)   |
| FR8   | Epic 2 | Whisper API Transkription                 |
| FR9   | Epic 6 | Glossar pro Profil (Tier 2)               |
| FR10  | Epic 6 | LLM Post-Processing (Tier 2)              |
| FR11  | Epic 6 | LLM ON/OFF pro Profil (Tier 2)            |
| FR12  | Epic 2 | Clipboard-Output                          |
| FR13  | Epic 8 | History Overlay mit Fuzzy-Search (Tier 2) |
| FR14  | Epic 8 | History-Eintrag erneut kopieren (Tier 2)  |
| FR15  | Epic 1 | System-Tray-App ohne Hauptfenster         |
| FR16  | Epic 1 | Tray-Icon Kontextmenü                     |
| FR17  | Epic 2 | Globale Shortcuts konfigurieren           |
| FR18  | Epic 2 | Shortcuts unabhängig von Vordergrund-App  |
| FR19  | Epic 6 | Shortcut-Recorder UI (Tier 2)             |
| FR20  | Epic 3 | HUD Recording-State mit Audio-Pegel       |
| FR20a | Epic 3 | Audio Level Meter via MessagePort+Canvas  |
| FR20b | Epic 3 | Clipping-Feedback                         |
| FR21  | Epic 3 | HUD Transcribing-State                    |
| FR22  | Epic 3 | HUD Success-State                         |
| FR22a | Epic 8 | Transcript Overlay optional (Tier 2)      |
| FR23  | Epic 3 | HUD Error-State                           |
| FR24  | Epic 3 | Snackbar-Notifications                    |
| FR25  | Epic 2 | API Key eingeben und speichern            |
| FR26  | Epic 5 | Recording-Modus konfigurieren             |
| FR26a | Epic 6 | Toggle/Push-to-Talk (Tier 2)              |
| FR27  | Epic 5 | Shortcuts in Settings konfigurieren       |
| FR27a | Epic 6 | Profile CRUD (Tier 2)                     |
| FR27b | Epic 6 | Profil-Wechsel-Overlay (Tier 2)           |
| FR27c | Epic 6 | System-Prompt/Glossar-Bibliothek (Tier 2) |
| FR28  | Epic 5 | Transkriptions-Sprache konfigurieren      |
| FR29  | Epic 8 | Aufbewahrungszeit konfigurieren (Tier 2)  |
| FR30  | Epic 4 | First-Run-Detection                       |
| FR31  | Epic 4 | macOS Permissions anfordern               |
| FR32  | Epic 4 | Test-Recording im Onboarding              |
| FR33  | Epic 7 | BlackHole-Check im Onboarding (Tier 2)    |
| FR34  | Epic 4 | Transition zum System Tray                |
| FR35  | Epic 8 | Transkriptionen lokal speichern (Tier 2)  |
| FR36  | Epic 5 | Temp-Audiodateien Auto-Cleanup            |
| FR37  | Epic 8 | Speicherort konfigurieren (Tier 2)        |
| FR38  | Epic 5 | Update-Check + Benachrichtigung           |
| FR39  | Epic 5 | Update-Modus konfigurieren                |

## Epic List

### Epic 1: App Foundation & System Tray

Der Nutzer kann WhisperFlow installieren und starten — die App erscheint im System Tray mit Kontextmenü und ist bereit für weitere Features.
**FRs:** FR6, FR15, FR16
**Umfasst:** Electron Forge Scaffolding, shared Types/Stores/Services-Struktur, Window Manager, IPC-Foundation (NanoStores + nanostore-ipc-bridge), Tray + Menü, FFmpeg-Binary-Verification, Design System Foundation (Tailwind + Radix UI), electron-log Setup

### Epic 2: Core Recording & Transcription Pipeline

Der Nutzer drückt einen globalen Shortcut, spricht, und die Transkription landet in der Zwischenablage — das Kernprodukt funktioniert Ende-zu-Ende.
**FRs:** FR1, FR5, FR8, FR12, FR17, FR18, FR25
**Umfasst:** Recording State Machine (IDLE→RECORDING→ENCODING→UPLOADING→TRANSCRIBED→ERROR), FFmpeg WAV→WebM/Opus Pipeline, MicCaptureAdapter, Whisper API Integration, Clipboard-Output, Global Shortcuts, API-Key-Storage (safeStorage), Audio-Device-Erkennung

### Epic 3: HUD Feedback System

Der Nutzer sieht Echtzeit-Feedback während des gesamten Recording→Transcribing→Success-Flows — das Floating-Pill-HUD mit Audio-Level-Bars gibt Vertrauen und Orientierung.
**FRs:** FR20, FR20a, FR20b, FR21, FR22, FR23, FR24
**Umfasst:** Floating Pill HUD (alle 4 States), Audio Level Bars via MessagePort+Canvas, Clipping-Feedback, Success/Error-Anzeige, Snackbar-Notifications, prefers-reduced-motion Support

### Epic 4: Onboarding & First-Run Experience

Ein neuer Nutzer wird durch Setup geführt — API-Key, macOS-Permissions, Test-Recording — und erlebt den Aha-Moment in unter 3 Minuten.
**FRs:** FR30, FR31, FR32, FR34
**Umfasst:** First-Run-Detection, API-Key-Gate mit Live-Validation, Permission-Anforderung (Mikrofon, Accessibility), Test-Recording mit HUD-Feedback, Transition zum System Tray

### Epic 5: Settings & Customization

Der Nutzer kann WhisperFlow personalisieren — Shortcuts, Audio-Geräte, Sprache, HUD-Position, Auto-Update — über ein professionelles Settings-Fenster.
**FRs:** FR4, FR26, FR27, FR28, FR36, FR38, FR39
**Umfasst:** Settings-Window (Sidebar 220px, 6 Tabs: General, Shortcuts, API Key, Audio, Display, About), Temp-File-Cleanup, Auto-Update-Integration, Recording-Mode-Konfiguration

### Epic 6: Profile System & Advanced Transcription _(Tier 2)_

Der Nutzer kann spezialisierte Profile für verschiedene Use Cases erstellen — mit Glossaren, LLM-Post-Processing und Shortcut-Recorder.
**FRs:** FR9, FR10, FR11, FR19, FR26a, FR27a, FR27b, FR27c
**Umfasst:** Profile CRUD + Default-Profil, Profil-Wechsel-Overlay (⌘⇧P, Spotlight-style), System-Prompt-Bibliothek, Glossar-Bibliothek, LLM-Integration (GPT), Push-to-Talk/Toggle, Shortcut-Recorder, Settings-Tabs: Profile, System Prompts, Glossare

### Epic 7: System Audio & Dual Recording _(Tier 2)_

Der Nutzer kann System-Audio und Dual-Recordings erfassen — ideal für Meeting-Transkription.
**FRs:** FR2, FR3, FR7, FR33
**Umfasst:** BlackHoleCaptureAdapter (macOS), Dual-Recording (Mic+System gleichzeitig), BlackHole-Detection + Setup-Guidance im Onboarding, Audio-Tab Erweiterung (System-Audio-Device-Select)

### Epic 8: History & Transcript Management _(Tier 2)_

Der Nutzer kann vergangene Transkriptionen durchsuchen, wiederfinden und erneut nutzen.
**FRs:** FR13, FR14, FR22a, FR29, FR35, FR37
**Umfasst:** History Overlay (720px, Spotlight-style, Fuzzy-Search, Keyboard-Navigation), persistente Transcript-Speicherung mit Metadaten, Transcript-Overlay (optional), TTL-Konfiguration, Storage-Location-Konfiguration

---

## Epic 1: App Foundation & System Tray

Der Nutzer kann WhisperFlow installieren und starten — die App erscheint im System Tray mit Kontextmenü und ist bereit für weitere Features.

### Story 1.1: Electron Forge Projekt-Scaffolding & Basis-Dependencies

As a Entwickler,
I want ein vollständig konfiguriertes Electron-Forge-Projekt mit allen Basis-Dependencies und der vorgegebenen Verzeichnisstruktur,
So that ich sofort mit der Feature-Entwicklung beginnen kann ohne Build- oder Struktur-Entscheidungen treffen zu müssen.

**Acceptance Criteria:**

**Given** ein leeres Projektverzeichnis
**When** das Projekt mit `npx create-electron-app@latest whisper-flow --template=vite-typescript` initialisiert wird und alle Dependencies installiert werden
**Then** startet `npm run dev` eine Electron-App ohne Fehler
**And** folgende Dependencies sind in package.json: nanostores, @nanostores/react, @janhendry/nanostore-ipc-bridge, electron-store, ffmpeg-static, openai, zod, electron-log, tailwindcss, @radix-ui/react-\*, framer-motion, vitest
**And** React 19 + TypeScript 5.x sind konfiguriert
**And** die Verzeichnisstruktur existiert: `shared/types/`, `shared/stores/`, `shared/stores/actions/`, `shared/services/`, `src/main/lib/`, `src/main/lib/adapters/`, `src/preload/`, `src/renderer/components/`, `src/renderer/screens/`, `src/renderer/hooks/`, `src/renderer/utils/`, `src/__tests__/`
**And** der `@shared` Alias ist in `vite.main.config.ts`, `vite.renderer.config.ts` und `tsconfig.json` konfiguriert (`shared/ → @shared`)
**And** `asarUnpack` für `ffmpeg-static` ist in `forge.config.ts` konfiguriert
**And** `entitlements.mac.plist` existiert mit den erforderlichen Entitlements (unsigned-executable-memory, disable-library-validation, audio-input, audio-output)

### Story 1.2: Shared Types, IPC Foundation & NanoStore Setup

As a Entwickler,
I want typsichere Shared Types und ein funktionierendes NanoStore-IPC-Framework,
So that alle zukünftigen Features auf einer konsistenten, typsicheren State-Management-Grundlage aufbauen können.

**Acceptance Criteria:**

**Given** das Projekt aus Story 1.1
**When** die Shared Types und NanoStores konfiguriert werden
**Then** existiert `shared/types/index.ts` als Barrel-Export mit: `ipc.types.ts` (IPC Consts, SERVICE_IDS, STORE_IDS), `recording.types.ts` (RecordingStatus, RecordingState, RecordingMode, AudioDevice), `error.types.ts` (AppError, ErrorCode), `settings.types.ts` (AppSettings), `hud.types.ts` (HudState), `window.types.ts` (WindowName, WindowConfig)
**And** alle IPC Channel-Namen sind als TypeScript `const` in `ipc.types.ts` definiert (IPC.WINDOW._, IPC.PROFILE._, IPC.SHORTCUT._, IPC.TRAY._) — keine Magic Strings
**And** `initNanoStoreIPC({ channelPrefix: 'whisperflow', enableLogging: isDev, autoRegisterWindows: true })` ist in `src/main/index.ts` aufgerufen
**And** `exposeNanoStoreIPC({ channelPrefix: 'whisperflow' })` ist in `src/preload/index.ts` aufgerufen
**And** Basis-Stores existieren: `$recordingState` (syncedAtom), `$hudVisible`, `$hudState`, `$settings`, `$snackbarQueue` — alle mit `$` Prefix in `shared/stores/`
**And** Actions existieren in `shared/stores/actions/` für jeden Store — Stores werden nie direkt via `store.set()` mutiert
**And** ein Vitest-Test in `src/__tests__/` verifiziert, dass die Types korrekt exportiert werden

### Story 1.3: Window Manager & Design System Foundation

As a Entwickler,
I want einen Window Manager Service und das Design System (Tailwind + Radix UI) konfiguriert,
So that alle App-Fenster (HUD, Settings, Onboarding) konsistent erstellt und gestylt werden können.

**Acceptance Criteria:**

**Given** das Projekt mit IPC Foundation aus Story 1.2
**When** der Window Manager und das Design System eingerichtet werden
**Then** existiert `src/main/lib/window-manager.lib.ts` als Singleton-Registry (`Map<WindowName, BrowserWindow>`) mit Methoden: `getOrCreate(name, config)`, `show(name)`, `hide(name)`, `destroy(name)`
**And** Fenster werden per Lazy Init erstellt (beim ersten Aufruf) und danach gecacht
**And** unterstützte WindowNames sind: 'hud', 'settings', 'onboarding', 'snackbar', 'profile-switcher', 'history'
**And** `shared/services/window.service.ts` existiert mit `defineService()` Wrapper der `window-manager.lib.ts` aufruft
**And** Tailwind CSS ist konfiguriert mit Dark-mode-first Design Tokens: background (#0A0A0B), surface (#141415), border (#2A2A2D), text-primary (#FAFAFA), text-muted (#8A8A8E), accent (#6366F1), recording (#EF4444), success (#22C55E), warning (#F59E0B), error (#EF4444)
**And** Schriftarten Inter und JetBrains Mono sind eingebunden
**And** Spacing basiert auf 4px Base-Unit (space-1 bis space-8)
**And** alle Text/Hintergrund-Kombinationen erfüllen WCAG AA Kontrast (≥ 4.5:1)

### Story 1.4: System Tray, Kontextmenü & FFmpeg-Verification

As a WhisperFlow-Nutzer,
I want dass die App beim Start im System Tray erscheint und über ein Kontextmenü steuerbar ist,
So that ich WhisperFlow jederzeit verfügbar habe ohne dass ein Fenster meinen Workspace belegt.

**Acceptance Criteria:**

**Given** die App wird gestartet
**When** der Startvorgang abgeschlossen ist
**Then** erscheint ein WhisperFlow-Icon im macOS System Tray (FR15)
**And** kein Hauptfenster ist sichtbar — die App lebt ausschließlich im Tray (FR15)
**And** Klick auf das Tray-Icon öffnet ein Kontextmenü mit: "Settings...", Separator, "Quit WhisperFlow" (FR16)
**And** "Quit WhisperFlow" beendet die App sauber
**And** "Settings..." ist vorhanden aber zeigt noch ein Placeholder-Fenster (wird in Epic 5 implementiert)
**And** electron-log ist konfiguriert — Logs werden nach `~/Library/Logs/WhisperFlow/` geschrieben
**And** beim Start wird `ffmpeg-static` Binary auf Ausführbarkeit geprüft (FR6)
**And** bei erfolgreicher FFmpeg-Prüfung wird im Log `FFmpeg binary verified` geschrieben
**And** bei fehlgeschlagener FFmpeg-Prüfung erscheint ein Fehler-Dialog mit Hinweis auf Neuinstallation (FR6)
**And** die App verursacht im Idle weniger als 50MB RAM (NFR4)

---

## Epic 2: Core Recording & Transcription Pipeline

Der Nutzer drückt einen globalen Shortcut, spricht, und die Transkription landet in der Zwischenablage — das Kernprodukt funktioniert Ende-zu-Ende.

### Story 2.1: Recording State Machine & Audio Device Detection

As a Entwickler,
I want eine robuste Recording State Machine und automatische Audio-Device-Erkennung,
So that der Recording-Flow korrekt gesteuert wird und immer ein funktionierendes Mikrofon verfügbar ist.

**Acceptance Criteria:**

**Given** das Projekt aus Epic 1
**When** die Recording State Machine implementiert wird
**Then** existiert `src/main/lib/recording-state-machine.ts` mit den Zuständen: idle, recording, encoding, uploading, transcribed, error
**And** erlaubte Übergänge sind exakt: idle→START→recording, recording→STOP→encoding, recording→ERROR→error, encoding→ENCODED→uploading, encoding→ERROR→error, uploading→TRANSCRIBED→transcribed, uploading→ERROR→error, transcribed→RESET→idle, error→RESET→idle
**And** verbotene Übergänge (z.B. START in recording, STOP in idle) werden silent ignoriert und geloggt
**And** `src/main/lib/audio-device.lib.ts` erkennt verfügbare Audiogeräte automatisch (FR5)
**And** Hot-plug wird unterstützt — neue/entfernte Geräte werden erkannt (FR5)
**And** `src/main/lib/adapters/mic-capture.adapter.ts` implementiert das `AudioCaptureAdapter` Interface für Mic-Only
**And** Stub-Dateien für `blackhole-capture.adapter.ts` und `wasapi-capture.adapter.ts` existieren mit `throw new AppError({ code: 'NOT_IMPLEMENTED' })`
**And** Vitest-Tests verifizieren alle erlaubten und verbotenen Zustandsübergänge

### Story 2.2: FFmpeg Audio Recording & Encoding Pipeline

As a WhisperFlow-Nutzer,
I want dass meine Sprachaufnahme zuverlässig aufgenommen und für die API vorbereitet wird,
So that meine gesprochenen Worte verlustfrei erfasst und effizient an die Whisper API gesendet werden können.

**Acceptance Criteria:**

**Given** ein funktionierendes Mikrofon ist verfügbar
**When** eine Aufnahme gestartet und gestoppt wird
**Then** startet `src/main/lib/ffmpeg.lib.ts` einen FFmpeg-Kindprozess für WAV-Aufnahme vom ausgewählten Mic-Device
**And** nach Stopp wird die WAV-Datei in WebM/Opus konvertiert (schneller als Echtzeit, NFR3)
**And** Audiodateien werden in `app.getPath('userData')/recordings/temp/` gespeichert
**And** der FFmpeg-Prozess wird bei App-Close oder Fehler sauber terminiert (kill + cleanup)
**And** FFmpeg-Fehler (Prozess-Crash, korrupte Datei) werden als `AppError` mit Code `FFMPEG_ENCODE_FAILED` propagiert
**And** die State Machine wechselt korrekt: recording → encoding → (wartet auf nächsten Schritt)
**And** die Recording-State-Änderungen werden via `recordingActions` an den `$recordingState` Store broadcast

### Story 2.3: API Key Storage & Whisper API Integration

As a WhisperFlow-Nutzer,
I want meinen OpenAI API Key sicher speichern und meine Aufnahmen automatisch transkribieren lassen,
So that ich nach dem Sprechen sofort den transkribierten Text erhalte ohne mich um API-Details kümmern zu müssen.

**Acceptance Criteria:**

**Given** ein API Key ist gespeichert und eine WebM/Opus-Audiodatei liegt bereit
**When** die Transkription ausgelöst wird
**Then** wird der API Key via `electron.safeStorage.encryptString()` verschlüsselt in `electron-store` gespeichert (NFR12)
**And** zur Laufzeit wird der Key via `safeStorage.decryptString()` entschlüsselt — nie als Plaintext auf Disk
**And** `src/main/lib/safe-storage.lib.ts` bietet `encrypt(value)` und `decrypt(buffer)` Methoden
**And** `src/main/lib/electron-store.lib.ts` initialisiert die electron-store Instanz mit Zod-Schema-Validierung
**And** `src/main/lib/whisper-api.lib.ts` sendet die Audiodatei an `POST /v1/audio/transcriptions` mit dem konfigurierten Modell (Default: gpt-4o-mini-transcribe)
**And** API-Fehler werden als `AppError` propagiert: `API_KEY_INVALID` (401), `API_TIMEOUT`, `API_QUOTA_EXCEEDED` (429)
**And** `shared/services/transcription.service.ts` existiert als `defineService()` Wrapper
**And** `shared/services/settings.service.ts` bietet Handler zum Speichern/Laden des API Keys
**And** die State Machine wechselt: uploading → transcribed (Erfolg) oder uploading → error (Fehler)

### Story 2.4: Global Shortcuts, Clipboard Output & End-to-End Flow

As a WhisperFlow-Nutzer,
I want per globalem Shortcut eine Aufnahme starten/stoppen und das Ergebnis automatisch in der Zwischenablage haben,
So that ich in jeder App per Tastendruck diktieren kann und das Transkript sofort einfügbar ist.

**Acceptance Criteria:**

**Given** die App läuft im System Tray und ein API Key ist konfiguriert
**When** der Nutzer den globalen Shortcut drückt (Default: Cmd+Shift+Space)
**Then** startet die Mic-Recording sofort (FR1)
**And** der Shortcut funktioniert unabhängig davon welche App im Vordergrund ist (FR18)
**And** `src/main/lib/shortcut.lib.ts` registriert globale Shortcuts via Electron `globalShortcut` API (FR17)
**And** Shortcuts werden nach System-Sleep/Wake neu registriert (NFR6)
**And** ein zweiter Shortcut-Press stoppt die Aufnahme und löst die Pipeline aus: Encoding → Whisper API → Clipboard
**And** `shared/services/clipboard.service.ts` kopiert das Transkriptionsergebnis automatisch in die System-Zwischenablage (FR12)
**And** der Shortcut reagiert innerhalb von 200ms (NFR1)
**And** der komplette Ende-zu-Ende-Flow funktioniert: Shortcut → Recording → Encoding → API → Clipboard
**And** bei fehlendem API Key wird ein `AppError` mit Code `API_KEY_INVALID` ausgelöst statt stiller Fehlschlag
**And** der `$recordingState` Store broadcast jeden State-Wechsel an alle Renderer

---

## Epic 3: HUD Feedback System

Der Nutzer sieht Echtzeit-Feedback während des gesamten Recording→Transcribing→Success-Flows — das Floating-Pill-HUD mit Audio-Level-Bars gibt Vertrauen und Orientierung.

### Story 3.1: HUD BrowserWindow & Floating Pill Layout

As a WhisperFlow-Nutzer,
I want ein dezentes Floating-Pill-Overlay das automatisch erscheint wenn ich aufnehme,
So that ich Feedback über den aktuellen Status bekomme ohne meine Arbeit zu unterbrechen.

**Acceptance Criteria:**

**Given** eine Aufnahme wird gestartet
**When** der `$recordingState` auf 'recording' wechselt
**Then** erscheint das HUD als Floating-Pill BrowserWindow (always-on-top, frameless, transparent)
**And** das HUD ist 280px breit, ~80–96px hoch, border-radius 12px
**And** Hintergrund ist `surface` (#141415) mit Shadow `0 8px 32px rgba(0,0,0,0.4)`
**And** das HUD ist click-through — keine Interaktion möglich
**And** die Position ist konfigurierbar (Default: Bottom Center des Bildschirms)
**And** der Window Manager verwaltet das HUD-Fenster (Lazy Init, gecacht)
**And** `src/renderer/screens/HudWindow.tsx` rendert den aktuellen State reaktiv via `useStore($hudState)`
**And** das HUD unterstützt 4 visuelle States: recording, transcribing, success, error

### Story 3.2: Audio Level Bars & Echtzeit-Pegel-Visualisierung

As a WhisperFlow-Nutzer,
I want animierte Audio-Pegel-Bars während der Aufnahme sehen,
So that ich Vertrauen habe dass mein Mikrofon aktives Signal empfängt.

**Acceptance Criteria:**

**Given** das HUD zeigt den Recording-State
**When** Audio aufgenommen wird
**Then** zeigt das HUD 10 vertikale Bars in neutralem Grau (#5A5A62), animiert nach Audio-Amplitude (FR20, FR20a)
**And** `src/main/lib/audio-level.lib.ts` erstellt einen dedizierten MessagePort pro HUD-Renderer-Instanz
**And** RMS-Pegel wird im Main Process aus PCM-Buffer-Chunks berechnet und als Float32Array über den MessagePort gestreamt
**And** `src/renderer/hooks/useAudioLevel.ts` empfängt den Port und liefert den aktuellen Pegel-Wert
**And** `src/renderer/components/AudioLevelMeter.tsx` rendert die Bars via Canvas + `requestAnimationFrame` (60fps-synchron)
**And** die Latenz vom Main Process zum HUD-Renderer ist unter 50ms (NFR9)
**And** die Visualisierung läuft mit mindestens 30fps ohne spürbaren CPU-Overhead (NFR10)
**And** bei Clipping (Pegel > Maximum) zeigt das HUD visuelles Feedback (FR20b)
**And** bei `prefers-reduced-motion` werden Animationen vereinfacht (NFR8)

### Story 3.3: Transcribing, Success & Error HUD States

As a WhisperFlow-Nutzer,
I want klares visuelles Feedback über Transcribing, Erfolg und Fehler,
So that ich jederzeit weiß was gerade passiert und ob mein Text bereit ist.

**Acceptance Criteria:**

**Given** das HUD ist sichtbar
**When** der State auf 'encoding' oder 'uploading' wechselt
**Then** zeigt das HUD drei pulsierende Indigo-Dots (#6366F1) als Transcribing-Indikator (FR21)
**And** beim Wechsel auf 'transcribed' zeigt das HUD einen grünen Check-Icon (#22C55E) mit Pop-Animation (FR22)
**And** das HUD dismisst automatisch nach ~1,5 Sekunden nach Success
**And** beim Wechsel auf 'error' zeigt das HUD ein Warn-Icon + Text "Error" (FR23)
**And** der Error-State bleibt bis zur nächsten Aktion (neuer Shortcut-Press oder Reset)
**And** State-Transitions sind smooth (150–200ms ease-out)
**And** der MessagePort-Channel wird beim Schließen des HUD sauber terminiert (NFR11)
**And** alle Transitions respektieren `prefers-reduced-motion` (NFR8)

### Story 3.4: Snackbar-Benachrichtigungen

As a WhisperFlow-Nutzer,
I want kurze Benachrichtigungen für wichtige System-Events,
So that ich über Aufnahme-Start, Transkriptions-Ergebnis und Fehler informiert werde auch wenn das HUD deaktiviert ist.

**Acceptance Criteria:**

**Given** ein System-Event tritt auf
**When** eine Aufnahme gestartet wird
**Then** wird eine Snackbar-Benachrichtigung gezeigt (FR24)
**And** Snackbar-Events umfassen: Aufnahme gestartet, Transkription abgeschlossen, Fehler bei Aufnahme/Transkription, Update verfügbar
**And** Snackbar-Messages werden über den `$snackbarQueue` Store verwaltet und via NanoStore an den Renderer broadcast
**And** `src/renderer/components/SnackbarNotification.tsx` rendert die Queue
**And** Snackbars dismissen automatisch nach ~3 Sekunden
**And** Fehler-Snackbars verwenden `error`-Farbe (#EF4444), Erfolg-Snackbars `success` (#22C55E)
**And** die Snackbar-Farb-Semantik ist konsistent mit dem Design System

---

## Epic 4: Onboarding & First-Run Experience

Ein neuer Nutzer wird durch Setup geführt — API-Key, macOS-Permissions, Test-Recording — und erlebt den Aha-Moment in unter 3 Minuten.

### Story 4.1: First-Run-Detection & Welcome Screen

As a neuer WhisperFlow-Nutzer,
I want beim ersten Start automatisch durch das Setup geführt werden,
So that ich sofort weiß was zu tun ist und nicht vor einem leeren Interface stehe.

**Acceptance Criteria:**

**Given** die App wird zum ersten Mal gestartet (kein API Key in electron-store)
**When** die App hochfährt
**Then** erkennt das System automatisch den First-Run-Zustand (FR30)
**And** statt nur im Tray zu erscheinen, öffnet sich das Onboarding-Fenster
**And** `src/renderer/screens/OnboardingScreen.tsx` zeigt einen Welcome-Screen mit klarer Botschaft: "WhisperFlow einrichten"
**And** ein linearer Step-Indicator zeigt 4 Steps: Welcome → API Key → System Check → Test Recording
**And** der aktive Step ist Indigo, abgeschlossene Steps sind grün
**And** ein "Weiter"-Button (Primary) führt zum nächsten Schritt
**And** das Onboarding-Fenster wird über den Window Manager erstellt und verwaltet

### Story 4.2: API Key Gate & Validation

As a neuer WhisperFlow-Nutzer,
I want meinen OpenAI API Key eingeben und sofort validieren lassen,
So that ich weiß ob mein Key funktioniert bevor ich weitermache.

**Acceptance Criteria:**

**Given** der Nutzer ist im API-Key-Step des Onboardings
**When** ein API Key eingegeben wird
**Then** wird ein Eingabefeld (type=password) mit Toggle-Icon zum Anzeigen/Verbergen gezeigt
**And** ein Link zu den OpenAI-Docs ist direkt unter dem Feld sichtbar
**And** nach Eingabe erscheint ein "Verbindung testen" Button (Secondary)
**And** Klick auf den Button zeigt einen Inline-Spinner neben dem Feld
**And** bei gültigem Key: grüner Check (✓ Verbunden), "Weiter" Button wird aktiv
**And** bei ungültigem Key: roter Inline-Fehlertext ("Key ungültig — bitte prüfe dein OpenAI-Dashboard")
**And** der Key wird via safeStorage verschlüsselt gespeichert (FR25, NFR12)
**And** ohne gültigen Key ist "Weiter" nicht klickbar — kein Überspringen möglich

### Story 4.3: macOS Permissions & Test-Recording

As a neuer WhisperFlow-Nutzer,
I want dass die App mich aktiv durch Mikrofon- und Accessibility-Permissions führt und ein Test-Recording durchführt,
So that ich sicher bin dass alles funktioniert bevor ich WhisperFlow im Alltag nutze.

**Acceptance Criteria:**

**Given** der API Key ist validiert und gespeichert
**When** der System-Check-Step beginnt
**Then** fordert das System aktiv die Mikrofon-Permission an (macOS System-Dialog + erklärende UI) (FR31)
**And** zeigt eine explizite Anleitung für die Accessibility-Permission (System Preferences → Accessibility) (FR31)
**And** prüft den Permission-Status laufend und aktualisiert die UI in Echtzeit
**And** bei fehlender Permission wird eine klare Handlungsanweisung gezeigt
**When** der Test-Recording-Step beginnt
**Then** führt das System automatisch ein kurzes Test-Recording durch (3–5 Sekunden) (FR32)
**And** das HUD erscheint während des Tests (Audio-Pegel sichtbar — Aha-Moment)
**And** nach erfolgreicher Transkription wird das Ergebnis im Onboarding angezeigt
**And** ein "Setup abgeschlossen"-Screen zeigt den konfigurierten Hotkey als KeyboardBadge
**And** ein "Fertig"-Button schließt das Onboarding, die App zieht sich in den System Tray zurück (FR34)

---

## Epic 5: Settings & Customization

Der Nutzer kann WhisperFlow personalisieren — Shortcuts, Audio-Geräte, Sprache, HUD-Position, Auto-Update — über ein professionelles Settings-Fenster.

### Story 5.1: Settings Window Shell & Tab-Navigation

As a WhisperFlow-Nutzer,
I want ein Settings-Fenster mit Sidebar-Navigation öffnen können,
So that ich die App nach meinen Bedürfnissen anpassen kann.

**Acceptance Criteria:**

**Given** die App läuft im System Tray
**When** der Nutzer "Settings..." im Tray-Menü klickt
**Then** öffnet sich das Settings-Fenster (min 700×500px, skalierbar)
**And** links ist eine Sidebar (220px fix) mit vertikaler Tab-Navigation: General · Shortcuts · ─── · API Key · Audio · ─── · Display · About
**And** der aktive Tab hat Indigo-Akzentfarbe + leichten Hintergrund
**And** der Content-Bereich rechts wächst mit dem Fenster (flex-grow)
**And** kein horizontales Scrolling im Content-Bereich
**And** Escape schließt das Settings-Fenster
**And** vollständige Keyboard-Navigation (Tab, Enter, Escape, Pfeiltasten)
**And** sichtbarer Focus-Ring (Indigo, 2px) auf allen interaktiven Elementen
**And** das Settings-Fenster wird über den Window Manager verwaltet (Lazy Init, gecacht)

### Story 5.2: General & Shortcuts Tabs

As a WhisperFlow-Nutzer,
I want grundlegende Einstellungen und Shortcuts konfigurieren können,
So that WhisperFlow sich meinem Workflow anpasst.

**Acceptance Criteria:**

**Given** das Settings-Fenster ist offen
**When** der General-Tab aktiv ist
**Then** zeigt er: Launch at Login (Switch, Default: OFF), Show HUD (Switch, Default: ON), Language (Select: Auto-detect + 9 Sprachen) (FR28), Transcript Overlay (Switch, Default: OFF) + Anzeigedauer (disabled wenn OFF)
**And** alle Änderungen werden in electron-store persistiert
**And** Speichern-Button nur aktiv wenn sich etwas geändert hat
**When** der Shortcuts-Tab aktiv ist
**Then** zeigt er den Haupt-Recording-Shortcut als KeyboardBadge (Default: ⌘⇧Space) (FR27)
**And** optionale Mode-Override-Shortcuts (Mic Only, System Audio, Dual) als leere Felder
**And** weitere Shortcuts: History Overlay (⌘⇧H), Letztes Ergebnis kopieren (leer)
**And** Shortcut-Konflikte zeigen eine Inline-Warnung unter dem Feld
**And** registrierte globale Shortcuts werden sofort aktualisiert wenn gespeichert

### Story 5.3: API Key, Audio & Display Tabs

As a WhisperFlow-Nutzer,
I want meinen API Key verwalten, Audio-Geräte konfigurieren und die Darstellung anpassen,
So that ich die technische Konfiguration jederzeit ändern kann.

**Acceptance Criteria:**

**Given** das Settings-Fenster ist offen
**When** der API Key Tab aktiv ist
**Then** zeigt er: API Key Feld (password, Toggle, FR25), "Verbindung testen" Button, Inline-Ergebnis (Spinner → ✓/✗)
**When** der Audio Tab aktiv ist
**Then** zeigt er: Mikrofon-Gerät (Select mit allen verfügbaren Inputs, FR5), System-Audio-Gerät (Select, disabled wenn Mic-Only-Profil)
**And** "Audio testen" Button (toggle: Start/Stop) mit Live-Pegel-Meter (10 Bars, max 60s, auto-stop)
**And** nach Test-Ende: Aufnahme einmal abspielen, dann verwerfen
**And** bei flachem Meter: Inline-Hinweis "Kein Signal erkannt"
**When** der Display Tab aktiv ist
**Then** zeigt er: HUD-Position (Select: Bottom Center / Top Center / 4 Ecken), Appearance (Select: System Auto / Light / Dark)

### Story 5.4: About Tab, Auto-Update & Temp-File-Cleanup

As a WhisperFlow-Nutzer,
I want über Updates informiert werden und wissen dass Temp-Dateien automatisch bereinigt werden,
So that die App immer aktuell und der Speicher sauber bleibt.

**Acceptance Criteria:**

**Given** das Settings-Fenster ist offen
**When** der About Tab aktiv ist
**Then** zeigt er: App-Name + Version (groß, zentriert), "Nach Updates suchen" Button (FR38), "Setup neu starten" Button (startet Onboarding neu), Open-Source-Lizenzen Link
**And** der Update-Check zeigt Inline-Ergebnis: "Aktuell" oder "Update verfügbar: v1.x.x"
**And** der Auto-Update-Mechanismus via Electron Forge ist integriert (FR38, FR39)
**And** beim App-Start werden Temp-Audiodateien in `recordings/temp/` bereinigt die älter als Standard-TTL sind (FR36)
**And** der Cleanup-Job loggt die Anzahl gelöschter Dateien

---

## Epic 6: Profile System & Advanced Transcription _(Tier 2)_

Der Nutzer kann spezialisierte Profile für verschiedene Use Cases erstellen — mit Glossaren, LLM-Post-Processing und Shortcut-Recorder.

### Story 6.1: Profile CRUD & Default-Profil

As a WhisperFlow-Nutzer,
I want Profile erstellen und verwalten können,
So that ich verschiedene Konfigurationen für verschiedene Use Cases habe (z.B. Commits, Meetings, Emails).

**Acceptance Criteria:**

**Given** das Settings-Fenster ist offen
**When** der Profile-Tab aktiv ist (neuer Tab in Sidebar)
**Then** zeigt er ein Master-Detail-Layout: linke Spalte (~200px) mit Profil-Liste, rechte Spalte mit Edit-Bereich
**And** ein Default-Profil "Standard" existiert (Name: Standard, Recording Mode: Mic Only, Whisper Modell: gpt-4o-mini-transcribe, Glossar: —, LLM: OFF)
**And** Nutzer kann Profile erstellen, bearbeiten, duplizieren und löschen (FR27a)
**And** das letzte Profil kann nicht gelöscht werden (Löschen-Button deaktiviert)
**And** Profil-Detail zeigt: Name (TextField), Recording Mode (Select: Mic/System/Dual) (FR4), Whisper Modell (Select)
**And** aktives Profil hat einen Haken-Icon in der Liste
**And** "Als aktiv setzen" Button (Secondary) setzt das Profil als aktuell aktives
**And** alle Profil-Daten werden in electron-store persistiert
**And** der aktive Profil-Name wird im Tray-Menü angezeigt

### Story 6.2: System Prompts, Glossare & LLM-Integration

As a WhisperFlow-Nutzer,
I want Glossare für Fachbegriffe und LLM-Nachbearbeitung pro Profil konfigurieren,
So that meine Transkriptionen für technischen Wortschatz optimiert und automatisch nachbearbeitet werden.

**Acceptance Criteria:**

**Given** das Settings-Fenster ist offen mit Profile, System Prompts und Glossare Tabs
**When** der Glossare-Tab aktiv ist
**Then** zeigt er Master-Detail (identisch zum Profile-Tab Pattern) mit Glossar-Bibliothek (FR27c)
**And** jedes Glossar hat: Name (TextField), Glossar-Text (Textarea ~8 Zeilen, Placeholder mit Beispielen)
**And** Glossar kann erstellt, bearbeitet, dupliziert, gelöscht werden
**When** der System-Prompts-Tab aktiv ist
**Then** zeigt er Master-Detail mit System-Prompt-Bibliothek (FR27c)
**And** jeder Prompt hat: Name (z.B. "Bullet Points"), Prompt-Text (Textarea ~8 Zeilen)
**When** in einem Profil Glossar oder System Prompt gewählt wird
**Then** kann der Nutzer aus der jeweiligen Bibliothek wählen oder "Neu erstellen" klicken
**And** LLM Post-Processing Switch (ON/OFF) pro Profil (FR11)
**And** bei LLM ON: LLM-Modell Select (gpt-4o-mini / gpt-4o / gpt-4-turbo) + System Prompt (Select) werden sichtbar (FR10)
**And** Glossar wird als Whisper-Kontext-Prompt (transcription prompt) an die API gesendet (FR9)
**And** bei LLM ON: Transkript wird nach Whisper an das LLM mit dem System Prompt gesendet (FR10)

### Story 6.3: Profil-Wechsel-Overlay & Push-to-Talk

As a WhisperFlow-Nutzer,
I want schnell zwischen Profilen wechseln und zwischen Toggle- und Push-to-Talk-Modus wählen können,
So that ich meinen Recording-Modus per Shortcut anpassen kann ohne Settings öffnen zu müssen.

**Acceptance Criteria:**

**Given** die App läuft mit mehreren Profilen
**When** der Nutzer ⌘⇧P drückt
**Then** erscheint ein Spotlight-style Profil-Wechsel-Overlay (always-on-top, frame: false, Bildschirmmitte) (FR27b)
**And** zeigt alle Profile: Profil-Name links + Recording Mode + LLM-Modell rechts
**And** aktives Profil hat ✓ Icon in Indigo
**And** Highlight-State: #25253A Hintergrund, 2px Indigo-Border links
**And** Keyboard-Navigation: ↑↓ zum Navigieren, Enter zum Aktivieren, Escape zum Schließen
**And** nochmaliges ⌘⇧P schließt das Overlay (Toggle)
**And** Animationen: Fade-in + Scale 0.96→1.0 (150ms), Fade-out (100ms)
**And** Push-to-Talk-Modus ist in Settings → General konfigurierbar (Switch, Default: ON) (FR26a)
**And** bei Push-to-Talk: Shortcut halten startet Recording, loslassen stoppt — bei Toggle: einmal drücken startet, nochmal stopp

### Story 6.4: Shortcut-Recorder UI

As a WhisperFlow-Nutzer,
I want Shortcuts direkt in der UI per Tastendruck neu belegen können,
So that ich nicht manuell Tastenkombinationen eintippen muss.

**Acceptance Criteria:**

**Given** der Shortcuts-Tab in Settings ist offen
**When** der Nutzer auf "Ändern" neben einem Shortcut klickt
**Then** wechselt das Feld in Capture-Mode: Placeholder "Drücke neue Tastenkombination..." (FR19)
**And** der nächste Tastendruck wird als neuer Shortcut erfasst und als KeyboardBadge angezeigt
**And** Escape bricht den Capture-Mode ab ohne Änderung
**And** ein Shortcut-Konflikt-Check prüft ob die Kombination bereits systemweit belegt ist
**And** bei Konflikt: Inline-Warnung (nicht blockierend) — Speichern trotzdem möglich
**And** leere Felder zeigen "—" mit Button "Festlegen"
**And** macOS-Symbol-Konventionen werden verwendet (⌘, ⇧, ⌃, ⌥)

---

## Epic 7: System Audio & Dual Recording _(Tier 2)_

Der Nutzer kann System-Audio und Dual-Recordings erfassen — ideal für Meeting-Transkription.

### Story 7.1: BlackHole Detection & Setup Guidance

As a WhisperFlow-Nutzer,
I want wissen ob BlackHole auf meinem System installiert ist und Anleitung zur Einrichtung bekommen,
So that ich System-Audio-Recording nutzen kann.

**Acceptance Criteria:**

**Given** der Nutzer wählt ein Profil mit System-Audio oder Dual-Recording-Modus
**When** die App den Dependency-Check durchführt
**Then** prüft `src/main/lib/dependency-check.lib.ts` ob BlackHole als Audio-Device verfügbar ist (FR7)
**And** der Status wird in `$settings.dependencyStatus.blackhole` gespeichert ('installed' | 'missing')
**And** bei fehlendem BlackHole zeigt die App eine Setup-Anleitung mit Link zur BlackHole-Downloadseite
**And** im Onboarding (Schritt System-Check) wird BlackHole geprüft und bei Fehlen eine Anleitung angezeigt (FR33)
**And** im Audio-Tab der Settings wird der BlackHole-Status angezeigt
**And** bei fehlendem BlackHole und gewähltem System/Dual-Modus wird eine Warnung gezeigt

### Story 7.2: System Audio & Dual Recording Implementation

As a WhisperFlow-Nutzer,
I want System-Audio allein oder zusammen mit meinem Mikrofon aufnehmen können,
So that ich Meetings, Calls und Videos transkribieren kann.

**Acceptance Criteria:**

**Given** BlackHole ist installiert und ein Profil mit System-Audio oder Dual-Modus ist aktiv
**When** der Nutzer den Recording-Shortcut drückt
**Then** startet bei System-Audio-Modus `blackhole-capture.adapter.ts` eine Aufnahme nur vom BlackHole Virtual Device (FR2)
**And** startet bei Dual-Modus eine gleichzeitige Aufnahme von Mic + BlackHole (FR3)
**And** der `AudioCaptureAdapter` wird basierend auf dem aktiven Profil-Modus selektiert
**And** die FFmpeg-Konfiguration nutzt BlackHole als Input-Device (`-f avfoundation -i ":BlackHole"`)
**And** bei Dual-Recording werden zwei FFmpeg-Streams parallel gestartet oder ein Multi-Input-FFmpeg-Command verwendet
**And** die resultierende Audiodatei wird identisch zur Mic-Only-Pipeline verarbeitet (Encoding → Whisper → Clipboard)
**And** das HUD zeigt während System/Dual-Recording den gleichen Flow wie bei Mic-Only
**And** Audio-Tab in Settings zeigt System-Audio-Gerät Select (nicht mehr disabled)

---

## Epic 8: History & Transcript Management _(Tier 2)_

Der Nutzer kann vergangene Transkriptionen durchsuchen, wiederfinden und erneut nutzen.

### Story 8.1: Persistente Transcript-Speicherung

As a WhisperFlow-Nutzer,
I want dass meine Transkriptionen automatisch lokal gespeichert werden,
So that ich jederzeit auf vergangene Ergebnisse zugreifen kann.

**Acceptance Criteria:**

**Given** eine Transkription wurde erfolgreich abgeschlossen
**When** der Text in die Zwischenablage kopiert wird
**Then** wird die Transkription zusätzlich lokal gespeichert mit Metadaten: Timestamp, Dauer, Recording-Modus, Profil-Name, Transkriptionstext (FR35)
**And** gespeichert in `app.getPath('userData')/recordings/history/`
**And** ein konfigurierbarer TTL legt die Aufbewahrungszeit fest (Default z.B. 30 Tage) (FR29)
**And** der Auto-Cleanup-Job bereinigt abgelaufene History-Einträge beim App-Start
**And** der Speicherort ist in Settings konfigurierbar (FR37)
**And** NFR13 eingehalten: Daten nur im User-Kontext, keine Übertragung an Dritte

### Story 8.2: History Overlay mit Fuzzy-Search

As a WhisperFlow-Nutzer,
I want meine vergangenen Transkriptionen schnell durchsuchen und erneut kopieren,
So that ich auf wichtige Ergebnisse zugreifen kann ohne sie nochmal aufnehmen zu müssen.

**Acceptance Criteria:**

**Given** Transkriptionen sind gespeichert
**When** der Nutzer ⌘⇧H drückt
**Then** erscheint das History Overlay (Spotlight-style, 720px breit, max 560px hoch, always-on-top) (FR13)
**And** oben ein Search-Input (52px, autofokussiert, Placeholder "Transkriptionen durchsuchen...")
**And** darunter eine scrollbare Liste aller Transkriptionen (neueste zuerst)
**And** jeder Eintrag ist 48px hoch mit: Mode-Badge (20×20px Icon), Preview-Text (100 Zeichen + …), Timestamp + Modus rechts
**And** der erste Eintrag ist sofort highlighted
**And** Fuzzy-Search filtert die Liste in Echtzeit — gematchte Zeichen in Accent (#6366F1) markiert
**And** Keyboard-Navigation: ↑↓ Navigieren, Enter kopiert aktiven Eintrag in Clipboard und schließt (FR14)
**And** Escape schließt ohne Aktion, nochmaliges ⌘⇧H togglet
**And** Animationen: Fade-in + Scale 0.96→1.0 (150ms), Fade-out (100ms)
**And** `prefers-reduced-motion`: nur Fade, kein Scale

### Story 8.3: Transcript Overlay (Optional)

As a WhisperFlow-Nutzer,
I want optional eine kurze Text-Vorschau nach der Transkription sehen,
So that ich das Ergebnis sofort lesen kann bevor ich es einfüge.

**Acceptance Criteria:**

**Given** Transcript Overlay ist in Settings → General aktiviert
**When** eine Transkription erfolgreich abgeschlossen wird
**Then** erscheint ein Text-Overlay nahe dem HUD mit dem transkribierten Text (FR22a)
**And** das Overlay dismisst automatisch nach der konfigurierten Anzeigedauer (Default: 3 Sekunden)
**And** die Position ist konfigurierbar in Settings → Display
**And** bei deaktiviertem Transcript Overlay (Default: OFF) erscheint kein Overlay
**And** das Overlay ist passiv — kein Klick, keine Interaktion möglich
