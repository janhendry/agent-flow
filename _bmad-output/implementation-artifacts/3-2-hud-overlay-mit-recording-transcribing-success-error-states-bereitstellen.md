# Story 3.2: HUD-Overlay mit Recording/Transcribing/Success/Error-States bereitstellen

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Desktop-Nutzer,
I want ein passives HUD-Overlay mit klaren Zustaenden,
so that ich den Voice-Flow ohne Kontextwechsel sicher steuern kann.

## Acceptance Criteria

1. Given ein globaler Shortcut startet den Flow, when die Zustaende Recording, Transcribing, Success oder Error eintreten, then zeigt das HUD den aktuellen State eindeutig und non-blocking.
2. Given eine erfolgreiche Transkription, when der Success-State angezeigt wird, then blendet sich das HUD nach kurzer Dauer automatisch aus.
3. Given der Dual-Modus (Mic + System) ist aktiv, when Recording laeuft, then zeigt das HUD zwei getrennte Echtzeit-Pegelbalken (Mic oben, System unten) mit farblicher Differenzierung, konsistent zum bewaehrten Dual-Pegel-Pattern der CLI.
4. Given ein Single-Modus (Mic Only oder System Only) ist aktiv, when Recording laeuft, then zeigt das HUD einen einzelnen Pegelbalken.

## Tasks / Subtasks

- [x] HUD-State-Rendering in `whisper-flow/src/components/App.tsx` auf UX-Spezifikation angleichen (AC: 1, 2)
  - [x] Textlastige Placeholder-Darstellung durch state-spezifische, visuelle HUD-Pill ersetzen (Recording, Transcribing, Success, Error)
  - [x] `recording` klar als aktiven Zustand visualisieren; `transcribing` als neutralen Prozesszustand; `success` als positiven Abschluss; `error` als handlungsorientierten Fehlerzustand
  - [x] HUD weiterhin non-blocking halten: kein Klickzwang, keine Interaktion, keine Modal-Logik

- [x] Audio-Level-Visualisierung fuer Single- und Dual-Modi implementieren (AC: 3, 4)
  - [x] Auf Basis von `AudioLevelPayload` (`mic`, `sys`) Modus ableiten: Dual wenn beide Kanaele aktiv, sonst Single
  - [x] Dual-Darstellung mit zwei Reihen umsetzen (Mic oben, System unten) und klarer Farbtrennung
  - [x] Single-Darstellung mit genau einer Pegelreihe umsetzen (Mic oder System)
  - [x] Reaktionsverhalten der Pegelbalken so gestalten, dass sie als Echtzeit-Feedback waehrend Recording nutzbar sind

- [x] HUD-Zeitverhalten und State-Uebergaenge finalisieren (AC: 1, 2)
  - [x] Success-Auto-Dismiss auf UX-konforme kurze Dauer einstellen (ca. 1.5s)
  - [x] Error-State non-blocking halten; Neustart ueber globalen Shortcut bleibt jederzeit moeglich
  - [x] Sicherstellen, dass der Renderer die vom Main-Prozess gepushten State-Wechsel konsistent darstellt

- [x] Styling und Layout gem. UX-Design-System konsolidieren (AC: 1, 3, 4)
  - [x] HUD-Pill auf definierte Groesse/Breite ausrichten (Story-3.1-Basis: 280px Breite)
  - [x] Farben/Abstaende/Typografie in `index.css` zentralisieren statt Inline-Styling zu verteilen
  - [x] `prefers-reduced-motion` respektieren fuer Animationen/Transitions

- [x] Qualitaetsgates ohne Testausfuehrung in der Electron-App durchlaufen (AC: 1, 2, 3, 4)
  - [x] In Story 3.2 werden in `whisper-flow` keine neuen Tests erstellt (weder Renderer noch Main/IPC)
  - [x] In Story 3.2 wird in `whisper-flow` kein Testlauf ausgefuehrt (`npm run test` entfaellt)
  - [x] Stattdessen nur `npm run typecheck`, `npm run lint`, `npm run verify`, `npm run package` in `whisper-flow/` erfolgreich ausfuehren

## Dev Notes

### Developer Context Section

- Story 3.2 baut direkt auf Story 3.1 auf, in der Electron-Bridge, IPC, globaler Shortcut und State-Machine bereits umgesetzt wurden.
- Diese Story liefert die visuelle und UX-semantische Vervollstaendigung des HUD-Overlays, ohne neue Business-Logik im UI-Layer einzufuehren.
- Kritischer Fokus: verlassliches Vertrauen durch klares State-Feedback und Echtzeit-Pegel im Recording.

### Technical Requirements

- Renderer bleibt passiver Darstellungs-Adapter. Fachlogik (Record/Stop/Transcribe) verbleibt im Main/Core-Bridge.
- State-Quelle ist der bestehende Event-Stream ueber `IpcChannel.STATE_CHANGE`.
- Pegel-Quelle ist der bestehende Event-Stream ueber `IpcChannel.AUDIO_LEVEL` mit `AudioLevelPayload`.
- Keine neue fachliche Zustandsmaschine im Renderer bauen; bestehende Main-State-Machine bleibt autoritativ.

### Architecture Compliance

- Port/Adapter-Disziplin weiter einhalten: keine Business-Regeln in React-Komponenten.
- Keine Adapter-zu-Adapter-Kopplung einbauen; nur Nutzung der vorhandenen Preload-API.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` unveraendert lassen.

### Library / Framework Requirements

- Bestehender Stack bleibt ausreichend: Electron Forge + Vite + TypeScript + React.
- Keine neuen UI-Frameworks zwingend erforderlich fuer Story 3.2.
- Falls Animationen erweitert werden, nur minimal und zweckorientiert; keine heavy UI-Abhaengigkeiten ohne klaren Mehrwert.

### File Structure Requirements

- Primaer zu aendern:
  - `whisper-flow/src/components/App.tsx`
  - `whisper-flow/src/index.css`
- Bei Bedarf zu erweitern:
  - `whisper-flow/src/ipc-types.ts` (nur falls zusaetzliche typsichere Payload-Felder noetig sind)
- Voraussichtlich keine Aenderung an `whisper-flow/src/core-bridge.ts` notwendig.

### Testing Requirements

- Fuer Story 3.2 gilt explizit: keine Testimplementierung in der Electron-App (`whisper-flow`).
- Fuer Story 3.2 gilt explizit: kein Testlauf in der Electron-App (`npm run test` wird nicht ausgefuehrt).
- Qualitaet wird in Story 3.2 ueber Typecheck, Lint und Package-Validierung abgesichert.

### Previous Story Intelligence (Story 3.1)

- `App.tsx` zeigt aktuell einen funktionalen, aber vorlaeufigen HUD-Stand (Text + Emoji + Inline-Styles).
- Main-Prozess setzt bereits click-through im Idle-State (`setIgnoreMouseEvents(state === "idle")`) und pusht State-Wechsel.
- Success-Dauer ist aktuell auf 3 Sekunden gesetzt; UX-Ziel fuer 3.2 ist kurze Dauer (~1.5s).
- Audio-Level kommen bereits als `{ mic, sys }`; das ermoeglicht die geforderte Dual-/Single-Visualisierung ohne Core-Eingriffe.

### Git Intelligence Summary

- Letzte Commits zeigen Muster: kleine, inkrementelle Iterationen mit Fokus auf IPC-Vertraege und Fehlerfeedback.
- Fuer Story 3.2 wird dieses Muster auf HUD-Implementierung und Qualitaetsgates ohne Testlauf angewendet.

### Latest Tech Information

- Electron 40.x + Forge 7.x + Vite sind stabil fuer den HUD-Anwendungsfall.
- React 19.x ist im Projektkontext bereits genutzt; fuer Story 3.2 wird jedoch explizit ohne Testimplementierung/-ausfuehrung gearbeitet.
- `prefers-reduced-motion` sollte auf CSS-Ebene eingebunden werden, um Accessibility-konforme HUD-Animationen sicherzustellen.

### Project Structure Notes

- Story wird innerhalb der bestehenden Struktur umgesetzt (`whisper-flow/src/components`, `whisper-flow/src/index.css`).
- Kein Konflikt mit den Architekturvorgaben aus `packages/core`/`apps/desktop`-Trennung, da nur UI-Adapter-Schicht betroffen ist.
- Klarstellung fuer Umsetzung und Review: In Story 3.2 werden keine Electron-App-Tests erstellt oder ausgefuehrt.

### References

- [Source: \_bmad-output/planning-artifacts/epics.md - Epic 3, Story 3.2](_bmad-output/planning-artifacts/epics.md)
- [Source: \_bmad-output/planning-artifacts/ux-design-specification.md - Core User Experience, Design Direction, User Journey Flows](_bmad-output/planning-artifacts/ux-design-specification.md)
- [Source: \_bmad-output/planning-artifacts/architecture.md - Port/Adapter-Disziplin, Desktop-Adapter-Grenzen](_bmad-output/planning-artifacts/architecture.md)
- [Source: \_bmad-output/planning-artifacts/prd.md - FR23, FR24](_bmad-output/planning-artifacts/prd.md)
- [Source: \_bmad-output/implementation-artifacts/3-1-electron-adapter-auf-core-use-cases-anbinden.md - Previous Story Intelligence](_bmad-output/implementation-artifacts/3-1-electron-adapter-auf-core-use-cases-anbinden.md)
- [Source: whisper-flow/src/components/App.tsx - aktueller HUD-Stand](whisper-flow/src/components/App.tsx)
- [Source: whisper-flow/src/main.ts - State-Push, Shortcut-Flow, Auto-Reset](whisper-flow/src/main.ts)
- [Source: whisper-flow/src/state-machine.ts - gueltige State-Uebergaenge](whisper-flow/src/state-machine.ts)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex (GitHub Copilot)

### Debug Log References

- Story 3.2 automatisch aus `sprint-status.yaml` als erste Backlog-Story in Reihenfolge erkannt.
- Kontextquellen geladen: Epics, PRD, Architektur, UX-Spezifikation, Story 3.1, aktuelle `whisper-flow`-Dateien.
- HUD-Renderer in `App.tsx` auf visuelle State-Pill umgestellt (Recording/Transcribing/Success/Error), inkl. Single- und Dual-Pegelanzeige.
- Main-Flow angepasst: Success-Auto-Dismiss auf `1_500ms`; Error bleibt non-blocking stehen und wird per Shortcut durch neuen Run ersetzt.
- Quality-Gates ausgefuehrt: `npm run typecheck`, `npm run lint`, `npm run verify`, `npm run package` in `whisper-flow/` erfolgreich.

### Completion Notes List

- HUD-UI von textbasiertem Placeholder auf UX-konformes Pill-Overlay mit state-spezifischen Visuals umgestellt.
- Audio-Level-Darstellung fuer Single/Dual-Modus implementiert (Mic oben, System unten im Dual-Modus).
- Timing- und Fehlerverhalten finalisiert: Success nach ~1.5s weg, Error non-blocking mit sofortigem Neustart via Shortcut.
- Alle Story-Tasks abgeschlossen und Status auf `review` gesetzt.

### File List

- \_bmad-output/implementation-artifacts/3-2-hud-overlay-mit-recording-transcribing-success-error-states-bereitstellen.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- whisper-flow/src/components/App.tsx
- whisper-flow/src/core-bridge.ts
- whisper-flow/src/index.css
- whisper-flow/src/main.ts

### Change Log

- 2026-03-09: Story 3.2 aus Backlog erstellt und mit umfassendem Developer-Kontext auf `ready-for-dev` gesetzt.
- 2026-03-09: Teststrategie fuer Story 3.2 praezisiert: Keine Tests in der Electron-App; Qualitaetsgates nur ueber Typecheck/Lint/Package.
- 2026-03-09: HUD-Overlay umgesetzt (State-Pill, Single/Dual-Pegel, CSS-Design-System), Main-Timing auf 1.5s Success-Dismiss angepasst und Error-Shortcut-Recovery verbessert.
- 2026-03-09: Qualitaetsgates in `whisper-flow` erfolgreich abgeschlossen (`typecheck`, `lint`, `verify`, `package`).
