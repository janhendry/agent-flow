---
stepsCompleted:
  - "step-01-validate-prerequisites"
  - "step-02-design-epics"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
workflowType: "epics-and-stories"
project_name: "agent-flow"
---

# agent-flow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for WhisperFlow (agent-flow), decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Nutzer kann eine Mic-Only-Aufnahme über einen globalen Shortcut starten und stoppen
FR2: Nutzer kann eine System-Audio-Only-Aufnahme über einen globalen Shortcut starten und stoppen _(Tier 2)_
FR3: Nutzer kann eine Dual-Recording-Aufnahme (Mic + System-Audio gleichzeitig) über einen globalen Shortcut starten und stoppen _(Tier 2)_
FR4: Nutzer kann den aktiven Recording-Modus in den Settings festlegen
FR5: Das System erkennt verfügbare Audiogeräte automatisch und unterstützt Hot-Plug
FR7: Das System prüft beim Start, ob BlackHole verfügbar ist (wenn Mac), und zeigt Setup-Anleitung _(Tier 2)_
FR8: Das System sendet die aufgenommene Audiodatei nach Ende der Aufnahme an die Whisper API zur Transkription
FR9: Nutzer kann einen Transcription-Prompt (Stil/Glossar) für die Whisper API konfigurieren _(Tier 2)_
FR10: Das System kann den transkribierten Text nach der Whisper-Verarbeitung durch ein LLM (GPT) nachbearbeiten lassen _(Tier 2)_]
]]]]].
FR11: Nutzer kann LLM Post-Processing in den Settings aktivieren oder deaktivieren _(Tier 2)_
FR12: Das System kopiert das Transkriptionsergebnis automatisch in die System-Zwischenablage
FR13: Nutzer kann vergangene Transkriptionen in einem Quick History Overlay einsehen (letzte 20) _(Tier 2)_
FR14: Nutzer kann einen Eintrag aus der History erneut in die Zwischenablage kopieren _(Tier 2)_
FR15: Die App läuft als System-Tray-Applikation ohne permanentes Hauptfenster
FR16: Nutzer kann über das Tray-Icon auf Settings und weitere Funktionen zugreifen
FR17: Nutzer kann globale Tastaturkürzel für Recording-Aktionen konfigurieren
FR18: Globale Shortcuts funktionieren unabhängig davon, welche App im Vordergrund ist
FR19: Nutzer kann den Shortcut-Recorder nutzen, um Shortcuts per UI neu zu belegen _(Tier 2)_
FR20: Das System zeigt ein HUD mit dem Status "Recording" während einer aktiven Aufnahme
FR21: Das System zeigt ein HUD mit dem Status "Transcribing" während der API-Verarbeitung
FR22: Das System zeigt eine Erfolgsbestätigung ("✓") wenn das Transkript in der Zwischenablage ist
FR23: Das System zeigt eine Fehlermeldung wenn Aufnahme oder Transkription fehlschlägt
FR24: Das System zeigt Snackbar-Benachrichtigungen für relevante Ereignisse
FR25: Nutzer kann seinen OpenAI API Key eingeben und speichern
FR26: Nutzer kann den Standard-Recording-Modus (Mic/System/Dual) konfigurieren
FR27: Nutzer kann globale Shortcuts für alle Recording-Aktionen konfigurieren
FR28: Nutzer kann Sprache/Stil-Präferenz für die Whisper-Transkription konfigurieren _(Tier 2)_
FR29: Nutzer kann Auto-Cleanup-Regeln für gespeicherte Aufnahmen konfigurieren _(Tier 2)_
FR30: Die App erkennt beim ersten Start, dass noch kein API Key konfiguriert ist, und führt den Nutzer durch einen First-Run-Flow
FR31: Das System fordert beim First-Run aktiv die benötigten macOS-Permissions an (Mikrofon, Accessibility) mit erklärender UI
FR32: Das System führt nach API-Key-Eingabe automatisch ein Test-Recording durch, um die Konfiguration zu validieren
FR33: Das System prüft beim Onboarding automatisch, ob BlackHole verfügbar ist (für System-Audio-Modus), und zeigt Setup-Anleitung bei Fehlen _(Tier 2)_
FR34: Nach erfolgreichem Onboarding zieht sich die App in den System Tray zurück
FR35: Das System speichert Transkriptionen lokal mit Metadaten (Timestamp, Dauer, Modus) _(Tier 2)_
FR36: Das System bereinigt gespeicherte Aufnahmen automatisch nach konfigurierbaren Regeln _(Tier 2)_
FR37: Nutzer kann den Speicherort für Aufnahmen konfigurieren _(Tier 2)_
FR38: Das System prüft auf Updates und benachrichtigt den Nutzer, wenn eine neue Version verfügbar ist
FR39: Nutzer kann den Update-Modus konfigurieren: automatisch im Hintergrund installieren oder nur benachrichtigen (manuell installieren)

### NonFunctional Requirements

NFR1: Der globale Shortcut reagiert innerhalb von 200ms (Recording startet ohne wahrnehmbare Verzögerung)
NFR2: Die App startet und ist im System Tray verfügbar ohne merkliche Verzögerung beim Login
NFR3: FFmpeg-Encoding (WAV → WebM/Opus) läuft schneller als Echtzeit (kein Bottleneck vor API-Call)
NFR4: Die App verursacht im Idle-Zustand (kein Recording) weniger als 50MB RAM und unter 1% CPU
NFR5: Die App läuft stabil im Hintergrund ohne Memory Leaks bei kontinuierlicher Nutzung über mehrere Stunden
NFR6: Globale Shortcuts werden nach App-Neustart sowie nach System-Sleep/Wake zuverlässig neu registriert
NFR7: Ein fehlgeschlagener API-Call (Timeout, Netzwerkfehler) führt zu einer klaren Fehlermeldung — kein stiller Fehler, kein Absturz
NFR8: Die App respektiert macOS System-Accessibility-Einstellungen (z.B. Reduced Motion für HUD-Animationen)

### Additional Requirements

**Architecture — Technische Setup-Anforderungen:**

- STARTER TEMPLATE (Epic 1, Story 1): `npx create-electron-app@latest whisper-flow --template=vite-typescript` — Electron Forge vite-typescript Template als Projektbasis
- IPC/State-Framework: `@janhendry/nanostore-ipc-bridge` mit Channel-Prefix `'whisperflow'` — `initNanoStoreIPC()` in main.ts, `exposeNanoStoreIPC()` in preload.ts
- `ffmpeg-static` npm-Package einbinden — `asarUnpack` / `extraResource` Pflicht in `forge.config.ts` für `child_process.spawn()`
- Platform-Abstraction-Layer: `AudioCaptureAdapter` Interface — Tier-1: `MicCaptureAdapter` implementieren, `BlackHoleCaptureAdapter` + `WasapiCaptureAdapter` als Stubs (NOT_IMPLEMENTED) anlegen
- `RecordingStateMachine` als eigene TypeScript-Klasse (`src/main/lib/recording-state-machine.ts`) mit Zuständen: `idle → recording → encoding → uploading → transcribed → error`
- API Key Storage via `electron.safeStorage` (macOS Keychain / Windows Credential Store) — nie im Klartext auf Disk
- Audio Files in `app.getPath('userData')/recordings/temp/` — **nicht sofort gelöscht**, sondern nach einer konfigurierbaren Aufbewahrungszeit via Auto-Cleanup bereinigt (Standard-TTL konfigurierbar, z.B. 24h); Cleanup-Job läuft beim App-Start
- `WindowManagerService` (Main Process Singleton-Registry `Map<WindowName, BrowserWindow>`) — Lazy Init, Fenster-Typen: hud, settings, onboarding, snackbar
- `shared/types/` mit `@shared` Alias (Barrel Export `index.ts`) — alle Types in dedizierten Dateien, nie inline
- `IPC`, `SERVICE_IDS`, `STORE_IDS` Constants in `shared/types/ipc.types.ts` — nie als Magic Strings
- NanoStores mit `$`-Prefix, via `syncedAtom()` in `shared/stores/`, Mutations ausschließlich über Actions in `shared/stores/actions/`
- `defineService()` Wrapper in `shared/services/` — Node/Electron-Implementierungen in `src/main/lib/`
- Vitest Unit Tests Pflicht für: `recording-state-machine.test.ts`, `ffmpeg.lib.test.ts`, `transcription.service.test.ts`, `safe-storage.lib.test.ts`
- GitHub Actions Release-Pipeline (`.github/workflows/release.yml`) — Build + Sign + Release on Tag-Push
- macOS Entitlements (`entitlements.mac.plist`) — Hardened Runtime + Notarization-Konfiguration
- `electron-log` für strukturiertes Logging in Main + Renderer
- `zod` für Settings-Schema-Validation und API-Response-Schemas
- `async/await` überall — kein `.then()`, keine Callbacks im gesamten Codebase

**UX Design — Anforderungen:**

- HUDOverlay als separates Electron `BrowserWindow` (`always-on-top`, `click-through` im Idle-State, feste Größe)
- HUD-Position konfigurierbar: top-right / top-left / bottom-right / bottom-left
- CSS-Animationen für HUD-State-Transitions (Recording → Transcribing → Done) — kein Framer Motion
- `AudioLevelBars`: 10 vertikale Bars via Web Audio API, Fallback CSS-Animation wenn kein Signal
- Settings-Fenster: Mindestgröße 700×500px, Sidebar 220px fix, Content-Bereich skalierbar
- Alle Icons als SVG (Retina/HiDPI scharf auf @2x Displays)
- `prefers-reduced-motion` respektieren: Alle CSS-Animationen deaktiviert wenn aktiv (NFR8)
- WCAG AA Kontrast für alle Text/Hintergrund-Kombinationen
- OnboardingFlow: 4-Step Wizard (Welcome → API Key → System Check → Test Recording), wiederholbar aus Settings
- Vollständige Keyboard-Navigation (Tab, Enter, Escape, Pfeiltasten) — kein Klick im Core-Flow erforderlich
- Sichtbarer Focus-Ring auf allen interaktiven Elementen (Indigo `#6366F1`, 2px)
- Tailwind CSS + Radix UI als Styling-Basis
- `KeyboardBadge`-Komponente für Tastenkombinationen (macOS-Symbol-Konventionen: ⌘, ⇧, ⌃, ⌥)
- `SnackbarNotification`-Komponente (nicht-blockierend, passiv)

### FR Coverage Map

FR1: Epic 3 — Mic-Only-Aufnahme via globalem Shortcut
FR2: Tier 2 — System-Audio-Only-Aufnahme (Architektonisch vorbereitet)
FR3: Tier 2 — Dual-Recording (Architektonisch vorbereitet)
FR4: Epic 3 — Recording-Modus in Settings festlegen (default: mic)
FR5: Epic 3 — Audiogeräte-Erkennung + Hot-Plug
FR6: Epic 3 — Integrität der gebündelten FFmpeg-Binary beim Start verifizieren
FR7: Tier 2 — BlackHole-Check (Architektonisch vorbereitet)
FR8: Epic 3 — Audio an Whisper API senden
FR9: Tier 2 — Transcription-Prompt konfigurieren
FR10: Tier 2 — LLM Post-Processing
FR11: Tier 2 — LLM Post-Processing aktivieren/deaktivieren
FR12: Epic 3 — Transkript automatisch in Zwischenablage
FR13: Tier 2 — Quick History Overlay
FR14: Tier 2 — History-Eintrag in Zwischenablage kopieren
FR15: Epic 1 — App läuft als System-Tray-Applikation
FR16: Epic 1 — Tray-Icon-Menü (Settings, Beenden)
FR17: Epic 3 — Globale Shortcuts für Recording (default-Belegung)
FR18: Epic 3 — Shortcuts unabhängig von Vordergrund-App
FR19: Tier 2 — Shortcut-Recorder via UI
FR20: Epic 3 — HUD "Recording"-Status
FR21: Epic 3 — HUD "Transcribing"-Status
FR22: Epic 3 — HUD "Erfolg" (✓)
FR23: Epic 3 — HUD Fehlermeldung
FR24: Epic 1 — Snackbar-Benachrichtigungen
FR25: Epic 2 — API Key eingeben + speichern (Onboarding)
FR26: Epic 4 — Standard-Recording-Modus in Settings
FR27: Epic 4 — Shortcuts in Settings konfigurieren
FR28: Tier 2 — Sprache/Stil-Präferenz für Whisper
FR29: Tier 2 — Auto-Cleanup-Regeln
FR30: Epic 2 — First-Run-Flow erkennen + starten
FR31: Epic 2 — macOS-Permissions im Onboarding anfordern
FR32: Epic 2 — Test-Recording nach API-Key-Eingabe
FR33: Epic 2 — BlackHole-Check im Onboarding _(Tier 2)_
FR34: Epic 2 — Nach Onboarding in System Tray zurückziehen
FR35: Tier 2 — Transkriptionen lokal speichern
FR36: Tier 2 — Automatische Bereinigung
FR37: Tier 2 — Speicherort konfigurierbar
FR38: Epic 4 — Update-Prüfung + Benachrichtigung
FR39: Epic 4 — Update-Modus konfigurieren

## Epic List

### Epic 1: Foundation & App Shell

Das technische Fundament ist gelegt: App startet, erscheint zuverlässig im System Tray, das gesamte IPC/State-Framework ist korrekt verdrahtet, Snackbar-Benachrichtigungen funktionieren. Entwickler können bauen, testen und debuggen.
**FRs abgedeckt:** FR15, FR16, FR24
**NFRs adressiert:** NFR2 (App-Start ohne merkliche Verzögerung), NFR4 (Idle <50MB RAM, <1% CPU)

### Epic 2: Onboarding & Erstkonfiguration

Ein neuer Nutzer kann WhisperFlow in unter 3 Minuten vollständig einrichten — API Key sicher speichern, macOS-Permissions erteilen (Mikrofon + Accessibility) und ein Test-Recording erfolgreich abschließen. Danach zieht sich die App in den System Tray zurück.
**FRs abgedeckt:** FR25, FR30, FR31, FR32, FR33, FR34
**NFRs adressiert:** NFR7 (API-Key-Validierungsfehler klar kommuniziert)

### Epic 3: Core Recording & Transkriptions-Loop

Nutzer kann täglich Voice-to-Text nutzen — globalen Shortcut halten → sprechen → loslassen → Text ist in der Zwischenablage. Der HUD gibt in jedem Schritt klares visuelles Feedback (Recording → Transcribing → Done → Error). Das Kernprodukt ist vollständig nutzbar.
**FRs abgedeckt:** FR1, FR4, FR5, FR6, FR8, FR12, FR17, FR18, FR20, FR21, FR22, FR23
**NFRs adressiert:** NFR1 (Shortcut <200ms), NFR3 (Encoding schneller als Echtzeit), NFR5 (keine Memory Leaks), NFR6 (Shortcuts nach Sleep/Wake), NFR7 (API-Fehler klar), NFR8 (Reduced Motion)

### Epic 4: Settings, Konfiguration & Distribution

Nutzer kann alle Einstellungen (API Key ändern, Recording-Modus, Shortcuts, HUD-Position, Update-Verhalten) über eine vollständige Settings-UI konfigurieren. Die App verteilt sich als signiertes, notarisiertes macOS-Release über eine automatisierte GitHub-Actions-Pipeline.
**FRs abgedeckt:** FR26, FR27, FR38, FR39
**NFRs adressiert:** NFR6 (Shortcut-Konfiguration zuverlässig persistiert)
