# Story 2.3: Recovery- und Diagnose-Aktionen im Fehlerkontext anbieten

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Nutzer,
I want Retry- und Diagnoseoptionen direkt im Fehlerbildschirm,
so that ich Probleme ohne Kontextverlust beheben kann.

## Acceptance Criteria

1. Given eine Transkription schlägt im Interactive CLI fehl, when der Error-Screen angezeigt wird, then sind mindestens Retry, Details und Setup/Diagnose-Aktionen verfügbar, and der Nutzer kann ohne Neustart des Programms weiterarbeiten.

## Tasks / Subtasks

- [ ] Interactive CLI UX-Redesign Foundation (Slice A) aufbauen (AC: 1)
  - [x] Zentrale State-Machine für Interactive-Screens und Events einführen
  - [x] Keyboard-Keymap als deklarative Basis für Screen-Aktionen modellieren
  - [ ] Integration der State-Machine als Router-Basis im App-Flow beginnen
- [ ] Error-Recovery-Screen nach UX-Spezifikation umsetzen (AC: 1)
  - [x] Error-Screen-Aktionen `r` Retry, `d` Details, `k` Setup/Diagnose, `q` Back implementieren
  - [x] Recovery-Aktionen ohne Neustart an laufenden Interactive-Flow anbinden
  - [x] Fehlermeldungen in kurze, handlungsorientierte Hinweise überführen (kein Raw-Dump)
- [ ] Setup/Diagnose-Aktionen im Fehlerkontext verdrahten (AC: 1)
  - [x] Setup-Key-Flow aus Error-Screen direkt aufrufbar machen
  - [x] Diagnose-Trigger im Interactive-Kontext integrieren
  - [x] Rückkehrpfad von Setup/Diagnose zurück zum Recovery-Kontext sicherstellen
- [ ] Tests und Qualitätsgates ergänzen (AC: 1)
  - [x] Unit-Tests für State-Machine-Transitions und Recovery-Events
  - [ ] Integrationstests für Error-Screen-Keymap und Flow-Fortsetzung
  - [x] `npm run verify` erfolgreich

## Dev Notes

### Developer Context Section

- Story 2.3 ist der Startpunkt für die UX-Annäherung der Interactive CLI an das UX-Zielbild (Error-Recovery im Kontext).
- Fokus dieser Story: Recovery und Diagnose ohne Flow-Neustart, keyboard-first und deterministisch.
- 2.3 baut auf 2.2 auf, erweitert aber bewusst um UX-Keymap und Recovery-Aktionen.

### Technical Requirements

- Error-Screen muss Retry, Details, Setup/Diagnose als direkte Tastaturaktionen anbieten.
- Nutzer darf nach Fehler ohne Prozessneustart im Interactive-Flow bleiben.
- Laufzeitstatus/Fehlerhinweise bleiben klar und handlungsorientiert.
- Bestehender Error-/Exit-Code-Contract aus Epic 1 bleibt unverändert.

### Architecture Compliance

- UI-State und Screen-Transitions zentralisieren (State-Machine), keine verteilte Ad-hoc-Navigation.
- Business-Logik weiterhin in bestehenden Commands/Utilities, Interactive-Schicht orchestriert nur.
- Keine Secret-Leaks in Error-Details oder Diagnoseausgaben.

### Library / Framework Requirements

- Stack unverändert: TypeScript + Node.js (ESM), `ink`, `commander`, `inquirer`, `chalk`, `ora`, `openai`.
- Keine neuen Dependencies ohne explizite Freigabe.
- Tests: Node Test Runner (`node --test`) mit `assert`.

### File Structure Requirements

- Erwartete Kernpfade:
  - `whisper-poc/src/app.tsx`
  - `whisper-poc/src/commands/interactive*.ts`
  - `whisper-poc/src/commands/*interactive*.test.ts`
- Story-Datei nur in erlaubten Bereichen aktualisieren (Tasks, Dev Agent Record, File List, Change Log, Status).

### Testing Requirements

- Tests für Recovery-Keymap (`r`, `d`, `k`, `q`) und deren Transitions.
- Tests für Setup/Diagnose-Roundtrip im Interactive-Kontext.
- Regression: bestehende Contract-/Interactive-Tests bleiben grün.
- Gate: `npm run verify` + relevante Tests erfolgreich.

### Previous Story Intelligence (Story 2.2)

- Record→Transcribe→Success/Error ist bereits deterministisch umgesetzt.
- Interactive-Preflight und Error-Contract-Härtung wurden ergänzt.
- Nächster Schritt ist Recovery-Aktionslogik statt Auto-Back-only Verhalten.

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Story 2.3)
- Source: \_bmad-output/planning-artifacts/ux-design-specification.md (Interactive CLI Design B, Keymap, Error Recovery)
- Source: \_bmad-output/implementation-artifacts/2-2-gefuehrten-record-transcribe-success-error-flow-implementieren.md (Previous Story Intelligence)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Story 2.3 aus Sprint-Backlog übernommen und für UX-Redesign-Fokus erweitert.
- Slice-A-Start vorbereitet: State-Machine + Keymap-Foundation als Basis für Recovery-Implementierung.
- Zentrale Interactive-State-Machine (`interactive-state-machine.ts`) mit deklarativer Keymap eingeführt.
- Unit-Tests für Initial-State, Menu-Rotation, Error-Details-Toggle und Recovery-Keymap ergänzt.
- Testläufe erfolgreich: fokussierte Tests, Gesamttestlauf und `npm run verify` grün.
- Slice B gestartet: Recording-Screen auf UX-Keymap umgestellt (`Enter` Stop, `Esc` Cancel) und Live-Pegel-Bars integriert.
- Pegel-Hilfsmodul inkl. Unit-Tests ergänzt (`interactive-audio-level.ts`).
- Slice C begonnen: Transcribe-/Error-Keymap als dedizierten Resolver ausgelagert (`interactive-transcribe-ui.ts`) und in `TranscriptScreen` verdrahtet.
- Transcript-UX ergänzt: Progress-Phasenanzeige, Success-Aktionen (`c/s/q`) und Error-Recovery-Aktionen (`r/d/k/q`) inklusive Details-Toggle.
- Setup-Roundtrip aus dem Error-Kontext ergänzt: `k` öffnet `ConfigScreen`, danach Rückkehr in den ursprünglichen Transcript-/Recovery-Kontext.
- Diagnose-Trigger im Interactive-Kontext ergänzt: bei `k` wird vor Setup ein Diagnose-Report erzeugt und auf `stderr` ausgegeben.
- Error-UX präzisiert: Standardanzeige zeigt kurze, handlungsorientierte Hinweise; technische Rohdetails bleiben hinter `d` (Details-Toggle).
- Qualitätsgates erneut grün: fokussierte Tests, Gesamttestlauf und `npm run verify` erfolgreich.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story initialisiert und zur Bearbeitung gestartet.
- Slice A umgesetzt: technische UX-Foundation (State-Machine + Keymap) steht als Integrationsbasis für den neuen Interactive-Router.
- Slice B in Arbeit: Recording UX entspricht jetzt der gewünschten Bedienlogik und zeigt fortlaufenden Pegel an.
- Slice C teilweise geliefert: Keymap und Recovery-Aktionen in der UI integriert, offene Restarbeiten liegen bei Diagnose-Rückkehrpfad und ergänzenden Integrationstests.
- Story ist bereit für Review; verbleibender Fokus im Review: explizite Integrationstests für Error-Screen-Keymap und Flow-Fortsetzung.

### File List

- \_bmad-output/implementation-artifacts/2-3-recovery-und-diagnose-aktionen-im-fehlerkontext-anbieten.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- whisper-poc/src/commands/interactive-state-machine.ts
- whisper-poc/src/commands/interactive-state-machine.test.ts
- whisper-poc/src/app.tsx
- whisper-poc/src/commands/interactive-audio-level.ts
- whisper-poc/src/commands/interactive-audio-level.test.ts
- whisper-poc/src/commands/interactive-transcribe-ui.ts
- whisper-poc/src/commands/interactive-transcribe-ui.test.ts
- whisper-poc/src/commands/interactive-transcribe-error-hints.ts
- whisper-poc/src/commands/interactive-transcribe-error-hints.test.ts

### Change Log

- 2026-03-01: Story 2.3 aus Backlog erzeugt, als UX-Redesign-Story gestartet und auf `in-progress` gesetzt.
- 2026-03-01: Slice A geliefert (Interactive-State-Machine + Keymap-Basis + Unit-Tests), Tests/Verify grün.
- 2026-03-01: Slice B gestartet (Recording-Keymap Enter/Esc + Live-Pegelanzeige), Tests/Verify weiterhin grün.
- 2026-03-01: Slice C begonnen (Transcribe-/Error-Keymap-Resolver, Progress-UX, Success- und Recovery-Aktionen), Tests/Verify grün.
- 2026-03-01: Setup-Roundtrip verdrahtet (Error `k` → ConfigScreen → Rückkehr in Transcript-Kontext), Verify weiterhin grün.
- 2026-03-01: Diagnose-Trigger im Interactive-Kontext verdrahtet (`k` erzeugt Diagnose-Report vor Setup), Verify weiterhin grün.
- 2026-03-01: Handlungsorientierte Error-Hinweise ergänzt (Default kurz, Raw-Details nur via `d`), Verify weiterhin grün.
- 2026-03-01: Story auf `review` gesetzt und Review-Lauf gestartet.

## Senior Developer Review (AI)

### Review Outcome

Changes Requested

### Review Date

2026-03-01

### Summary

- Scope geprüft: `whisper-poc/src/app.tsx`, `whisper-poc/src/commands/interactive-*.ts`, relevante Tests.
- AC-Kern erfüllt: Error-Screen bietet `r/d/k/q`, Retry bleibt im Interactive-Flow, Setup/Diagnose-Roundtrip ist verdrahtet.
- Qualitätsstand stabil: Gesamttestlauf und `npm run verify` grün.

### Findings

- [ ] [MEDIUM] Es fehlt ein expliziter Integrationstest, der den End-to-End-Pfad im Error-Kontext (`k` → Setup → Rückkehr in Recovery-Kontext) inkl. Keymap-Fortsetzung absichert.

### Action Items

- [ ] Integrationstest ergänzen, der Error-Keymap und Flow-Fortsetzung nach Setup/Diagnose im Interactive-Kontext validiert.
