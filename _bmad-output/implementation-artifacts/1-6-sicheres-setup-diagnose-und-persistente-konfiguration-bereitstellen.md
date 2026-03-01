# Story 1.6: Sicheres Setup, Diagnose und persistente Konfiguration bereitstellen

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Erstnutzer,
I want API-Key-Setup, Diagnose und persistente Konfiguration,
so that ich WhisperFlow sicher einrichten und zuverlässig betreiben kann.

## Acceptance Criteria

1. Given ein neuer Nutzer hat noch keine gültige Konfiguration, when Setup- und Diagnose-Kommandos ausgeführt werden, then kann der API-Key sicher gespeichert und geprüft werden, and die Konfiguration bleibt für alle CLI-Modi konsistent persistent.

## Tasks / Subtasks

- [ ] Sicheres API-Key-Setup und Zugriffspfad konsolidieren (AC: 1)
  - [ ] Setup-Flow speichert API-Key ausschließlich über Secret-Store/Keychain-Adapter (kein Klartext in persistenter Config)
  - [ ] API-Key-Abruf für relevante Commands (`setup`, `transcribe`, ggf. `diagnose`) vereinheitlichen
  - [ ] Fehlerfälle beim Secret-Store liefern klare, handlungsorientierte stderr-Meldungen mit stabilen Exit-Codes
- [ ] Diagnose-Command für Abhängigkeiten, API-Erreichbarkeit und Konfigurationszustand bereitstellen (AC: 1)
  - [ ] CLI-Command `diagnose` (oder äquivalenter Subcommand) ergänzt und in `cli.ts` angebunden
  - [ ] Diagnose prüft mindestens: FFmpeg-Verfügbarkeit, API-Key-Präsenz, Grundkonfigurationskonsistenz
  - [ ] Diagnose-Output bleibt skriptbar (stdout Ergebnisdaten, stderr nur Fehler/Diagnose)
- [ ] Persistenz und Konsistenz der Konfiguration über CLI-Modi absichern (AC: 1)
  - [ ] Setup-Änderungen sind nach Neustart verfügbar und werden in `record`/`transcribe` konsistent genutzt
  - [ ] Konfigurationsdefaults und Migrations-/Fallback-Verhalten sind deterministisch
  - [ ] Security-Regel prüfen: keine Secret-Leaks in Logs, Fehlermeldungen oder gespeicherten Dateien
- [ ] Tests und Qualitätsgates ergänzen (AC: 1)
  - [ ] Unit-/Integrationstests für Secret-Store-Flow und Diagnosepfade
  - [ ] Regressionstests für persistente Konfigurationsnutzung in betroffenen Commands
  - [ ] `npm run verify` erfolgreich

## Dev Notes

### Developer Context Section

- Story 1.6 baut direkt auf Story 1.5 auf: Fehlerklassifikation/Exit-Code-Contract ist bereits vorhanden und soll wiederverwendet werden.
- Fokus ist Security + Operability für den Erststart und den laufenden CLI-Betrieb.
- Diagnose soll als First-Class-Capability implementiert werden, ohne bestehende Command-Semantik zu brechen.

### Technical Requirements

- API-Key-Handling über OS-Keychain/safeStorage-Adapter; keine Persistenz im Klartext.
- Setup und Diagnose müssen ohne UI-Abhängigkeit im CLI deterministisch funktionieren.
- Fehler auf stderr, Ergebnisdaten auf stdout; Exit-Code-Vertrag aus Story 1.5 nutzen.
- Persistente Konfiguration muss über `setup`, `record`, `transcribe` konsistent greifen.

### Architecture Compliance

- Security-/Diagnose-Logik zentralisieren; keine duplizierte Business-Logik pro Command.
- Adapter-/Utility-Ansatz beibehalten (`whisper-poc/src/adapters`, `whisper-poc/src/utils`, `whisper-poc/src/commands`).
- Keine neuen Exit-Codes ohne zentrale Definition im vorhandenen Error-Contract.
- Secret-Daten niemals in stdout/stderr oder in Datei-Logs ausgeben.

### Library / Framework Requirements

- Bestehender Stack unverändert: TypeScript + Node.js (ESM), `commander`, `inquirer`, `chalk`, `ora`, `openai`.
- Test-Pattern: Node Test Runner (`node --test`) mit `assert`.
- Keine neuen Dependencies ohne explizite Freigabe.

### File Structure Requirements

- Erwartete Kernpfade:
  - `whisper-poc/src/commands/setup.ts`
  - `whisper-poc/src/commands/cli.ts`
  - `whisper-poc/src/commands/transcribe.ts`
  - `whisper-poc/src/adapters/cli/secret-store.adapter.ts`
  - `whisper-poc/src/utils/config.ts`
  - `whisper-poc/src/utils/cli-error-contract.ts`
  - passende `*.test.ts` in `whisper-poc/src/commands` und/oder `whisper-poc/src/utils`
- Story-Datei nur in erlaubten Bereichen aktualisieren (Tasks, Dev Agent Record, File List, Change Log, Status).

### Testing Requirements

- Testfälle für sicheren API-Key-Lifecycle (set/get/clear + Fehlerpfade).
- Testfälle für Diagnose-Command (OK-/Fehlerfälle, Exit-Codes, stdout/stderr-Semantik).
- Regression: bestehende Contract-Tests aus Story 1.4/1.5 bleiben grün.
- Gate: `npm run verify` + relevante Tests erfolgreich.

### Previous Story Intelligence (Story 1.5)

- Zentraler Error-/Exit-Contract ist vorhanden (`validation`=2, `api`=10, `runtime`=20).
- `transcribe` nutzt robuste Fehlerklassifikation; command-level Integrationstests für Exit/stderr sind etabliert.
- Story 1.6 soll diese Infrastruktur konsequent nutzen statt eigene Fehlerpfade einzuführen.

### Git Intelligence Summary

- Letzte Commits zeigen Fokus auf CLI-Contracts, Secret-Store-Integration und Stabilisierung der Fehler-/Output-Semantik.
- Story 1.6 sollte denselben Qualitätsansatz fortführen: deterministische Contracts + Integrationstests für reale CLI-Pfade.

### Latest Tech Information

- Externe Web-Recherche wurde in diesem Lauf nicht ausgeführt; maßgeblich sind die aktuellen Projektversionen in `whisper-poc/package.json`.
- Für Story 1.6 sind keine Library-Upgrades erforderlich.

### Project Structure Notes

- Umsetzung bleibt in der bestehenden `whisper-poc`-Struktur (kein vorgezogener Umbau nach `packages/*`).
- Ziel ist ein belastbarer Setup-/Diagnose-Unterbau als Abschluss von Epic 1.

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Story 1.6)
- Source: \_bmad-output/planning-artifacts/prd.md (FR17, FR18, FR19, NFR12, NFR13)
- Source: \_bmad-output/planning-artifacts/architecture.md (API Key Handling, Monitoring/Diagnostics, stdout/stderr, Exit-Code-Standards)
- Source: \_bmad-output/implementation-artifacts/1-5-fehlerklassifikation-exit-codes-und-stderr-semantik-stabilisieren.md (Previous Story Intelligence)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- create-story Workflow für Story 1.6 über sprint-status Auto-Discovery ausgeführt.
- Artefakte analysiert: epics, prd, architecture, vorige Story 1.5, Git-Historie.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story auf `ready-for-dev` gesetzt.

### File List

- \_bmad-output/implementation-artifacts/1-6-sicheres-setup-diagnose-und-persistente-konfiguration-bereitstellen.md

### Change Log

- 2026-03-01: Story 1.6 aus Backlog generiert und mit umfassendem Dev-Kontext auf `ready-for-dev` gesetzt.
