# Story 2.2: Geführten Record→Transcribe→Success/Error-Flow implementieren

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Nutzer,
I want einen schrittweisen interaktiven Ablauf,
so that ich Aufnahme und Transkription mit laufendem Status sicher ausführen kann.

## Acceptance Criteria

1. Given ein Nutzer startet den Record-Flow im Interactive CLI, when die Aufnahme gestoppt wird, then wechselt der Ablauf in einen Transcribing-Status mit verständlichem Feedback, and endet deterministisch in einem Success- oder Error-Screen.

## Tasks / Subtasks

- [x] Geführten Interactive-Flow für Record→Transcribe orchestrieren (AC: 1)
  - [x] Start aus dem Main Menu führt in einen klaren Record-State mit Statusanzeige
  - [x] Stop der Aufnahme triggert deterministischen Übergang in einen Transcribing-State
  - [x] Transcribe-Aufruf nutzt vorhandene Core-/Command-Pfade ohne Business-Logik-Duplikation
- [x] Success/Error-Screens mit deterministischem Abschlussverhalten umsetzen (AC: 1)
  - [x] Success-Screen zeigt verständliches Ergebnis-Feedback und führt konsistent zurück ins Menü
  - [x] Error-Screen zeigt handlungsorientierte Meldung und bleibt mit Error-Contract konsistent
  - [x] Rückkehr-/Neustartpfade sind keyboard-first nutzbar (ohne Maus)
- [x] Status-, Output- und Fehlersemantik absichern (AC: 1)
  - [x] Verständliche Laufzeit-Statusmeldungen für Record und Transcribe bereitstellen
  - [x] Keine Secret-Leaks in UI-/stderr-Ausgaben
  - [x] Bestehende Exit-Code- und stderr-Semantik aus Epic 1 nicht brechen
- [x] Tests und Qualitätsgates ergänzen (AC: 1)
  - [x] Unit-/Integrationstests für Transitionen Record→Transcribe→Success/Error
  - [x] Regressionstests für bestehende CLI-Contracts weiter grün halten
  - [x] `npm run verify` erfolgreich

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Interactive-Start lieferte bei fehlendem `ffmpeg` keinen spezifischen Fehlercode; Preflight jetzt contract-konform auf `ffmpeg-missing`.
- [x] [AI-Review][HIGH] Interactive-Transcribe zeigte Success trotz Schreibfehler beim `.txt`-Persistieren; Fehlerpfad jetzt explizit als Error-State.
- [x] [AI-Review][MEDIUM] Interactive-Transcribe nutzte unsicheren Config-`apiKey`-Fallback; API-Key-Auflösung jetzt nur Secret-Store/Env.

## Dev Notes

### Developer Context Section

- Story 2.2 baut direkt auf 2.1 (Main Menu + keyboard-first Navigation) auf.
- Fokus ist der geführte End-to-End-Lauf vom Start der Aufnahme bis zur deterministischen Success-/Error-Auflösung.
- Keine funktionale Ausweitung auf Recovery-Aktionen aus 2.3; hier nur der Kernflow.

### Technical Requirements

- Record- und Transcribe-Schritte müssen im Interactive-Flow als klare Zustände sichtbar sein.
- Übergänge müssen deterministisch und reproduzierbar sein.
- Error-Meldungen bleiben kurz, handlungsorientiert und contract-konform.
- Bestehende non-interactive Commands bleiben unverändert kompatibel.

### Architecture Compliance

- Adapter-/Port-Disziplin einhalten: Orchestrierung in Interactive-Schicht, keine neue Fachlogik in UI-Komponenten.
- Vorhandene Commands/Utilities wiederverwenden statt Parallelimplementierungen.
- stdout/stderr- und Exit-Code-Contract aus Epic 1 respektieren.
- Security-Regel: keine Secret-Daten in Logs/Ausgaben.

### Library / Framework Requirements

- Bestehender Stack unverändert: TypeScript + Node.js (ESM), `commander`, `inquirer`, `chalk`, `ora`, `openai`, `ink`.
- Keine neuen Dependencies ohne explizite Freigabe.
- Test-Pattern: Node Test Runner (`node --test`) mit `assert`.

### File Structure Requirements

- Erwartete Kernpfade:
  - `whisper-poc/src/app.tsx`
  - `whisper-poc/src/commands/interactive.ts`
  - `whisper-poc/src/commands/*interactive*.test.ts`
  - ggf. betroffene bestehende Commands für Integrationskanten
- Story-Datei nur in erlaubten Bereichen aktualisieren (Tasks, Dev Agent Record, File List, Change Log, Status).

### Testing Requirements

- Tests für State-Übergänge und deterministische Abschlusszustände.
- Tests für Error-Pfade inkl. contract-konformer Fehlerausgabe.
- Regression: bestehende Contract-/Integrationstests aus Epic 1/2.1 bleiben grün.
- Gate: `npm run verify` + relevante Tests erfolgreich.

### Previous Story Intelligence (Story 2.1)

- Interactive-Entry ist vorhanden (`whisper-poc interactive`) und keyboard-first.
- Main-Menu ist zentralisiert und validiert.
- Interactive-Fehlerpfad ist contract-konform abgesichert.

### Git Intelligence Summary

- Letzte Änderungen stabilisieren Interactive-Orchestrierung und Menüintegrität.
- Story 2.2 sollte darauf aufsetzen und nur den geführten Record→Transcribe-Flow ergänzen.

### Latest Tech Information

- Externe Web-Recherche wurde in diesem Lauf nicht ausgeführt; maßgeblich sind die Projektversionen im Repository.
- Für Story 2.2 sind keine Library-Upgrades erforderlich.

### Project Structure Notes

- Umsetzung bleibt in der bestehenden `whisper-poc`-Struktur.
- Ziel ist ein robustes Flow-Fundament für Story 2.3 (Recovery/Diagnose).

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Story 2.2)
- Source: \_bmad-output/planning-artifacts/prd.md (FR10, FR11, FR12, NFR8, NFR9, NFR10)
- Source: \_bmad-output/planning-artifacts/architecture.md (Core/Adapter-Trennung, Error-Contract)
- Source: \_bmad-output/implementation-artifacts/2-1-main-menu-und-keyboard-navigation-fuer-interactive-cli-umsetzen.md (Previous Story Intelligence)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Story 2.2 aus Sprint-Backlog übernommen und mit Dev-Kontext erstellt.
- Status direkt auf `in-progress` gesetzt für unmittelbaren Start.
- Guided Flow implementiert: erfolgreicher Record wechselt direkt in Transcribing-Screen und endet deterministisch in Success/Error.
- Transition-Logik in testbare Hilfsfunktion extrahiert (`interactive-flow.ts`).
- Testläufe erfolgreich: fokussierte Interactive-Tests, Gesamttestlauf und `npm run verify`.
- Senior-Code-Review durchgeführt, 3 Findings identifiziert und vollständig behoben.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Record-Flow geht nach Stop direkt in den Transcribing-Status über (ohne manuelle Zwischenmenüs).
- Transcript-Screens zeigen nun explizite Success-/Error-States mit deterministischer Rückkehr ins Menü (Countdown + Tastatur-Override).
- Filepick-Transkription bleibt weiterhin unterstützt; Flow-Herkunft wird im Success-State kenntlich gemacht.
- Neue Unit-Tests sichern die Zustandsübergänge (Record→Transcribe bzw. Record→Error).
- Review-Hardening: Interactive-Preflight liefert `ffmpeg-missing`, Schreibfehler beim Transkript-Speichern werden als Error-State behandelt, Config-Klartext-API-Key-Fallback entfernt.

### File List

- \_bmad-output/implementation-artifacts/2-2-gefuehrten-record-transcribe-success-error-flow-implementieren.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- whisper-poc/src/app.tsx
- whisper-poc/src/cli.ts
- whisper-poc/src/commands/interactive-flow.ts
- whisper-poc/src/commands/interactive-flow.test.ts
- whisper-poc/src/commands/interactive.ts
- whisper-poc/src/commands/interactive.test.ts
- whisper-poc/src/commands/interactive-cli.integration.test.ts

### Change Log

- 2026-03-01: Story 2.2 aus Backlog erzeugt, mit umfassendem Dev-Kontext angereichert und auf `in-progress` gesetzt.
- 2026-03-01: Story 2.2 implementiert (geführter Record→Transcribe-Flow, deterministische Success/Error-Screens, neue Transition-Tests) und auf `review` gesetzt.
- 2026-03-01: Senior-Code-Review abgeschlossen; 3 Findings behoben (interactive-ffmpeg-preflight, persistenter Write-Error-Path, API-Key-Fallback-Härtung), Tests/Verify erneut grün und Story auf `done` gesetzt.

## Senior Developer Review (AI)

### Review Outcome

Approve

### Review Date

2026-03-01

### Summary

- Scope geprüft: `whisper-poc/src/app.tsx`, `whisper-poc/src/cli.ts`, `whisper-poc/src/commands/interactive*.ts`.
- AC-Abdeckung bestätigt: geführter Record→Transcribe-Übergang, verständlicher Transcribing-Status und deterministische Success/Error-Abschlüsse vorhanden.
- Git-vs-Story geprüft: relevante Source-Dateien und Testdateien dokumentiert.

### Findings

- [x] [HIGH] Fehlender spezifischer `ffmpeg`-Fehlercode im Interactive-Preflight.
- [x] [HIGH] Schreibfehler bei Transkript-Persistenz wurde als stiller Success behandelt.
- [x] [MEDIUM] Unsicherer API-Key-Fallback auf Klartext-Config im Interactive-Transcribe.

### Action Items

- [x] Interactive-Preflight mit `InteractiveCommandError("ffmpeg-missing", ...)` ergänzt.
- [x] Transkript-Schreibfehler in `TranscriptScreen` auf Error-State gemappt.
- [x] API-Key-Auflösung im Interactive-Transcribe auf Secret-Store/Env begrenzt.
