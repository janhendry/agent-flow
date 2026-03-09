# Story 3.3: Settings- und Overlay-Konfiguration fuer produktive UI-Nutzung implementieren

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Nutzer,
I want zentrale Settings fuer Shortcuts, Profile, Audio, Display und API,
so that ich die UI-App auf meinen Workflow anpassen kann.

## Acceptance Criteria

1. Given die Settings-Ansicht ist geoeffnet, when ein Nutzer Konfigurationen aendert und speichert, then werden die Werte validiert und persistent uebernommen.
2. Given Overlay-Positionen sowie zentrale UI-Flows werden konfiguriert, when die Einstellungen gespeichert sind, then folgen HUD-, History- und Transcript-Overlay den definierten UX-Vorgaben.

## Tasks / Subtasks

- [ ] Settings-Informationsarchitektur und Tab-Navigation gemaess UX-Spezifikation finalisieren (AC: 1, 2)
  - [ ] Tabs in definierter Reihenfolge umsetzen: `General`, `Shortcuts`, `Profile`, `System Prompts`, `Glossare`, `API Key`, `Audio`, `Display`, `About`
  - [ ] Keyboard-first Navigation fuer gesamte Settings-Ansicht sicherstellen (Tab/Shift+Tab, Enter, Escape)
  - [ ] Layout- und Mindestgroessen-Regeln aus UX-Spezifikation umsetzen (Sidebar + Content, skalierbares Fenster)

- [ ] Persistente Konfigurationsschicht fuer Settings anbinden und validieren (AC: 1)
  - [ ] Typisierte Settings-Modelle fuer General/Display/Shortcut/Profile erstellen oder erweitern
  - [ ] Laden/Speichern ueber bestehende Main-Bridge und IPC-Contract robust verbinden (kein Renderer-only Shadow-State)
  - [ ] Eingabevalidierung bei Save erzwingen (z. B. Zahlenbereiche, Pflichtfelder, Enumerationen)
  - [ ] Fehlerzustand und Erfolg rueckmelden (inline, nicht blockierend)

- [ ] Shortcuts und Overlay-bezogene Konfiguration implementieren (AC: 1, 2)
  - [ ] Shortcut-Capture fuer Recording, Profile-Overlay und History-Overlay umsetzen
  - [ ] Konfliktpruefung fuer Shortcut-Belegungen implementieren (mindestens app-interne Kollisionen, optionale Systemhinweise)
  - [ ] Display-Settings fuer HUD-, History- und Transcript-Overlay-Position integrieren
  - [ ] Appearance/Theme-Auswahl gem. UX-Spezifikation persistieren (`system`, `light`, `dark`)

- [ ] Profile-, System-Prompt- und Glossar-Verwaltung als produktive Workflows bereitstellen (AC: 1)
  - [ ] Profile CRUD inkl. Aktivieren, Duplizieren, Loeschschutz fuer letztes Profil
  - [ ] Profilfelder umsetzen: Name, Recording Mode, Whisper-Modell, Glossar, optional LLM + Modell + System Prompt
  - [ ] System-Prompt CRUD implementieren (Name + Prompt-Text)
  - [ ] Glossar CRUD implementieren (Name + Glossar-Text)

- [ ] Audio- und API-Settings mit verifizierbaren Flows vervollstaendigen (AC: 1)
  - [ ] API-Key-Eingabe mit Validierung und Testaktion verbinden
  - [ ] Audio-Device-Auswahl fuer Mic/System abbilden und persistieren
  - [ ] Audio-Test-Flow mit Live-Pegelanzeige integrieren (inkl. Auto-Stop nach max. 60s)
  - [ ] Kanalbezogene Hinweise fuer fehlendes Signal bereitstellen (Single/Dual)

- [ ] About- und Setup-Escape-Hatches umsetzen (AC: 1)
  - [ ] About-Tab mit Version, Update-Check-Trigger und Lizenz-Link vervollstaendigen
  - [ ] Aktion `Setup neu starten` aus About in vorhandenen Setup-Flow verdrahten

- [ ] Qualitaetsgates und Abnahmekriterien fuer Story 3.3 absichern (AC: 1, 2)
  - [ ] In Story 3.3 werden in `whisper-flow` keine neuen Tests erstellt (weder Renderer noch Main/IPC)
  - [ ] In Story 3.3 wird in `whisper-flow` kein Testlauf ausgefuehrt (`npm run test` entfaellt)
  - [ ] In `whisper-flow/` mindestens `npm run typecheck`, `npm run lint`, `npm run verify`, `npm run package` erfolgreich ausfuehren

## Dev Notes

### Developer Context Section

- Story 3.3 baut auf Story 3.1 (Electron-Adapter + IPC + State-Machine) und Story 3.2 (HUD-Overlay mit finalen States) auf.
- Der Fokus liegt auf produktiver Konfigurierbarkeit und persistenter Bedienbarkeit der UI, nicht auf neuer Business-Logik.
- Kritisch ist, dass Settings das Verhalten der bestehenden Flows steuern, ohne Core-Regeln im Renderer zu duplizieren.

### Technical Requirements

- Renderer bleibt praesentationsorientiert; Persistenz, API-Key-Operationen und systemnahe Aktionen laufen ueber Main/Bridge.
- Alle neuen Settings-Felder muessen typisiert und versionsstabil in bestehende Config-Strukturen integrierbar sein.
- Form-Validierung muss klar und handlungsorientiert sein (inline, kein modaler Blocker).
- Overlay-Positionen muessen konsistent auf HUD, History und optionales Transcript-Overlay angewandt werden.

### Architecture Compliance

- Port/Adapter-Disziplin beibehalten: keine Business-Logik in React-Views, keine direkte Core- oder Dateisystemzugriffe aus Renderer.
- IPC als einzige Bruecke zwischen UI und Main (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` unveraendert).
- Keine Adapter-zu-Adapter-Kopplung: Settings duerfen CLI nicht direkt aufrufen, sondern nur gemeinsame Core/Bridge-Vertraege nutzen.

### Library / Framework Requirements

- Bestehender Stack bleibt leitend: Electron Forge + Vite + TypeScript + React.
- Fuer Settings-UI Radix/Tailwind nur nutzen, falls bereits vorhanden; ansonsten keine unnoetigen neuen Abhaengigkeiten einfuehren.
- Accessibility-Regeln aus UX-Spezifikation respektieren (`prefers-reduced-motion`, sichtbarer Fokus, WCAG-AA-Kontraste).

### File Structure Requirements

- Primaere Arbeitsdateien im `whisper-flow` Adapter:
  - `whisper-flow/src/components/*` (Settings/Overlay UI)
  - `whisper-flow/src/index.css` (Design-Tokens, Fokus-/Motion-Regeln)
  - `whisper-flow/src/preload.ts` (exponierte Settings-APIs)
  - `whisper-flow/src/main.ts` und/oder `whisper-flow/src/ipc-handlers.ts` (IPC-Handler fuer Settings)
  - `whisper-flow/src/ipc-types.ts` (typisierte Contracts)
  - `whisper-flow/src/core-bridge.ts` (falls Persistenz-/Diagnosezugriffe erweitert werden)
- Story 3.3 soll keine strukturelle Aufweichung der Adapter-Grenzen verursachen.

### Testing Requirements

- Fuer Story 3.3 gilt explizit: keine Testimplementierung in der Electron-App (`whisper-flow`).
- Fuer Story 3.3 gilt explizit: kein Testlauf in der Electron-App (`npm run test` wird nicht ausgefuehrt).
- Qualitaet wird in Story 3.3 ueber Typecheck, Lint, Verify und Package abgesichert.

### Previous Story Intelligence (Story 3.2)

- HUD-State-Darstellung und Single/Dual-Level-Feedback sind abgeschlossen und auf `review`.
- Main-State-Machine inkl. Shortcut-Flow ist stabil und sollte fuer Settings-getriebene Verhaltensanpassungen wiederverwendet werden.
- In 3.2 wurden CSS-Zentralisierung und Accessibility-Basics gestartet; 3.3 soll dies fuer Settings konsistent fortfuehren.

### Git Intelligence Summary

- Die letzten Storys in Epic 3 folgen inkrementellen, testbaren Schritten mit klarer IPC-Typisierung.
- Erfolgreiches Muster: erst Contracts/Bridge stabilisieren, dann UI verdrahten; dieses Muster fuer Settings beibehalten.

### Latest Tech Information

- Electron 40.x, Forge 7.x und React 19.x sind fuer diesen Scope stabil.
- Fuer Shortcut- und Fensterverhalten sollen bestehende Electron-APIs weiterverwendet werden, statt neue Windowing-Abstraktionen einzufuehren.
- Konfigurationsaenderungen sollen ohne App-Neustart wirksam werden, wo technisch moeglich.

### Project Context Reference

- FR23/FR24 verlangen UI-Adapter-Paritaet auf dem gemeinsamen Core.
- UX-Spezifikation definiert die Settings-Tabs, Overlay-Positionierung, Shortcut-Flows und Accessibility-Baselines im Detail.
- Architektur fordert strikte Core/Adapter-Trennung und stabile Contracts.

### References

- [Source: \_bmad-output/planning-artifacts/epics.md - Epic 3, Story 3.3](_bmad-output/planning-artifacts/epics.md)
- [Source: \_bmad-output/planning-artifacts/ux-design-specification.md - Settings IA, Overlay-Positionierung, Shortcuts, Accessibility](_bmad-output/planning-artifacts/ux-design-specification.md)
- [Source: \_bmad-output/planning-artifacts/architecture.md - Port/Adapter-Disziplin, IPC-Sicherheitsmodell, Projektgrenzen](_bmad-output/planning-artifacts/architecture.md)
- [Source: \_bmad-output/planning-artifacts/prd.md - FR23, FR24 und NFRs fuer Stabilitaet/Usability](_bmad-output/planning-artifacts/prd.md)
- [Source: \_bmad-output/implementation-artifacts/3-2-hud-overlay-mit-recording-transcribing-success-error-states-bereitstellen.md - Previous Story Intelligence](_bmad-output/implementation-artifacts/3-2-hud-overlay-mit-recording-transcribing-success-error-states-bereitstellen.md)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex (GitHub Copilot)

### Debug Log References

- Story 3.3 automatisch aus `sprint-status.yaml` als erste `backlog`-Story in Reihenfolge erkannt.
- Kontextquellen geladen: Epics, Architektur, UX-Spezifikation, PRD, vorherige Story 3.2.
- Story mit umfassendem Dev-Kontext, konkreten Tasks/Subtasks und Implementierungs-Guardrails erstellt.

### Completion Notes List

- Story-Datei fuer 3.3 mit AC-gebundenen Tasks erstellt.
- Persistenz-, Validierungs- und Overlay-Konfigurationsanforderungen aus UX/Architektur in Dev Notes konsolidiert.
- Story-Status auf `ready-for-dev` gesetzt.

### File List

- \_bmad-output/implementation-artifacts/3-3-settings-und-overlay-konfiguration-fuer-produktive-ui-nutzung-implementieren.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-03-09: Story 3.3 aus Sprint-Backlog erstellt und mit umfassendem Developer-Kontext auf `ready-for-dev` gesetzt.
