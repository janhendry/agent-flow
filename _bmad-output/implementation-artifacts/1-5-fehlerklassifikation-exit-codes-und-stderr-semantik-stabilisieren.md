# Story 1.5: Fehlerklassifikation, Exit-Codes und stderr-Semantik stabilisieren

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Skript-Autor,
I want stabile Fehlerklassen mit definierten Exit-Codes,
so that Automations zuverlässig auf Fehler reagieren können.

## Acceptance Criteria

1. Given ein Validierungs-, API- oder Runtime-Fehler tritt auf, when der CLI-Flow fehlschlägt, then wird die Fehlermeldung über stderr ausgegeben, and der Exit-Code ist eindeutig, dokumentiert und versionsstabil.

## Tasks / Subtasks

- [x] Einheitliche Fehlerklassifikation und Exit-Code-Vertrag im CLI-Kern definieren (AC: 1)
  - [x] Kanonische Fehlerklassen (mind. Validation, API, Runtime) mit stabilen Codes als zentralen Contract modellieren
  - [x] Bestehende ad-hoc Fehlercodes in `record`, `transcribe`, `setup` auf den zentralen Contract abbilden
  - [x] Mapping dokumentieren (Fehlerklasse → Exit-Code) und für Folge-Stories wiederverwendbar machen
- [x] stderr-/Exit-Verhalten in Commands konsolidieren (AC: 1)
  - [x] Fehlerausgaben bleiben strikt auf stderr, ohne Ergebnisdaten
  - [x] Prozess beendet mit klassenspezifischem Exit-Code statt pauschalem `1`
  - [x] Erfolgsfälle bleiben unverändert kompatibel zum bestehenden Output-Contract (Story 1.4)
- [x] Regressionssichere Tests für Fehlerpfade ergänzen (AC: 1)
  - [x] Testfälle für Validation-, API- und Runtime-Fehler inkl. erwarteter Exit-Codes
  - [x] Testfälle für stderr-Semantik (keine Ergebnisdaten in Fehlerausgabe)
  - [x] Bestehende Contract-Tests bleiben grün (insb. `transcribe-output-contract`)
- [x] Qualitätsgates ausführen (AC: 1)
  - [x] Relevante Tests erfolgreich
  - [x] `npm run verify` erfolgreich

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Runtime-Fehler in `transcribe` werden über `transcription-failed` als API klassifiziert; lokale FFmpeg-Konvertierungsfehler müssen Runtime-Exit-Code erhalten [whisper-poc/src/commands/transcribe.ts:181]
- [x] [AI-Review][MEDIUM] Unbekannte Fehlercodes fallen stillschweigend auf Runtime zurück; fehlende harte Absicherung der Versionstabilität im Fehlercode-Katalog [whisper-poc/src/utils/cli-error-contract.ts:30]
- [x] [AI-Review][MEDIUM] Fehlende command-level Tests für reale stderr/Exit-Code-Pfade; aktuelle Tests prüfen primär Utility-Mapping [whisper-poc/src/utils/cli-error-contract.test.ts:1]

## Dev Notes

### Developer Context Section

- Story 1.5 erweitert die bereits implementierte Output-Semantik aus Story 1.4 um eine stabile Fehler- und Exit-Code-Ebene.
- Fokus liegt auf deterministischen Fehlerverträgen für Automation/Scripting (Unix-Pattern).
- Keine funktionale Ausweitung auf Setup/Diagnose-Features aus Story 1.6; nur notwendige Konsolidierung der bestehenden Fehlerpfade.

### Technical Requirements

- Fehlerpfade müssen klar klassifiziert werden: Validation, API, Runtime.
- Jeder relevante Fehlerfall bekommt einen stabilen, dokumentierten Exit-Code.
- Fehler-/Diagnoseinformationen gehören auf stderr; Ergebnisdaten bleiben auf stdout.
- Secrets/Sensitive Inhalte dürfen nicht in Fehlermeldungen geleakt werden.
- Bestehender Erfolgspfad aus Story 1.4 bleibt kompatibel (kein Regression in Output-Contract).

### Architecture Compliance

- Fehlervertrag zentralisieren statt command-spezifische Sonderlogik zu duplizieren.
- Änderungen bleiben im CLI/Core-nahen Pfad (`whisper-poc/src/commands`, `whisper-poc/src/utils`), ohne UI/TUI-Business-Logik.
- Exit-Code-Definitionen werden an einer Stelle geführt und von Commands konsumiert.
- Strikte stdout/stderr-Trennung bleibt erhalten.

### Library / Framework Requirements

- Sprache/Runtime: TypeScript + Node.js (ESM)
- CLI & UX-Bibliotheken (bestehend): `commander`, `chalk`, `ora`, `ink`, `inquirer`
- API-Client (bestehend): `openai`
- Test-Pattern: Node Test Runner (`node --test`) mit `assert` aus `node:assert/strict`
- Keine neuen Dependencies ohne explizite Freigabe.

### File Structure Requirements

- Bestehende Starter-Struktur beibehalten (`whisper-poc`), keine vorgezogene Migration in `packages/*`.
- Erwartete Änderungsorte:
  - `whisper-poc/src/commands/record.ts`
  - `whisper-poc/src/commands/transcribe.ts`
  - `whisper-poc/src/commands/setup.ts`
  - `whisper-poc/src/utils/*` (z. B. zentraler Error-/Exit-Contract)
  - `whisper-poc/src/commands/*.test.ts` (Contract/Regression)
- Story-Datei nur in erlaubten Bereichen aktualisieren (Tasks, Dev Agent Record, File List, Change Log, Status).

### Testing Requirements

- Neue Tests müssen Fehlerklassen + Exit-Code-Mapping verifizieren.
- stderr-Verhalten bei Fehlern explizit prüfen (JSON-Fehlerevent, keine Nutzdatenleaks).
- Bestehende Vertrags-Tests aus Story 1.4 dürfen nicht brechen.
- Gate: `npm run verify` und relevante Tests erfolgreich.

### Previous Story Intelligence (Story 1.4)

- Output-Contract wurde verschärft: kein Success-Event auf stderr, stdout-Text unverändert.
- Clipboard-Fehler sind im `--stdout`-Pfad nicht-fatal (Warning auf stderr), im Standardpfad fatal.
- Bereits vorhandene Tests (`transcribe-output-contract`, `cli-contract`) sind Referenz für deterministische Vertragsprüfungen.
- Story 1.5 muss diese Semantik erhalten und nur den Fehler-/Exit-Teil standardisieren.

### Git Intelligence Summary

- Letzte Commits zeigen Fokus auf CLI-Contracts, Secret-Store-Integration und Story-/Planungsartefakte.
- `feat: Add CLI secret store ...` deutet auf laufende Konsolidierung der CLI-Basis hin; Story 1.5 soll diesen Pfad ohne Breaking Changes fortsetzen.
- Architektur-/PRD-Refactor in jüngeren Commits bestätigt den Core+CLI-first Fokus und stabile Contracts als Priorität.

### Latest Tech Information

- Externe Web-Recherche wurde in diesem Lauf nicht ausgeführt; als verbindliche Basis gelten die im Projekt vorhandenen Versionen in `whisper-poc/package.json`.
- Für diese Story sind keine Versions-Upgrades notwendig; Priorität ist konsistente Vertragssemantik.

### Project Structure Notes

- Diese Story bleibt innerhalb der aktuellen `whisper-poc`-Codebasis.
- Die in `architecture.md` skizzierte spätere Zielstruktur (`packages/core`, `packages/cli`) dient als Leitlinie, wird hier aber nicht vorgezogen.

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Story 1.5)
- Source: \_bmad-output/planning-artifacts/prd.md (FR6, FR7, FR8, NFR7, NFR11)
- Source: \_bmad-output/planning-artifacts/architecture.md (Error Handling Standard, Output Contract, stdout/stderr-Trennung)
- Source: \_bmad-output/implementation-artifacts/1-4-output-contract-mit-clipboard-und-stdout-option-umsetzen.md (Previous Story Intelligence)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- create-story Workflow für Story 1.5 über sprint-status Auto-Discovery ausgeführt.
- Artefakte analysiert: epics, prd, architecture, vorige Story 1.4, Git-Historie.
- Zentraler Error-/Exit-Contract in `whisper-poc/src/utils/cli-error-contract.ts` eingeführt.
- `record`, `transcribe`, `setup` auf klassenspezifische Exit-Codes migriert.
- `runTests` (gesamt) erfolgreich und `npm run verify` in `whisper-poc` erfolgreich.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story auf `ready-for-dev` gesetzt.
- Fehlerklassen zentralisiert (`validation`, `api`, `runtime`) mit stabilen Exit-Codes (`2`, `10`, `20`).
- CLI-Fehlerevents enthalten jetzt zusätzlich `errorClass`; Erfolgsverhalten aus Story 1.4 bleibt kompatibel.
- Setup-Fehlerpfade standardisiert (Prompt-Abbruch bleibt nicht-fatal, technische Fehler werden als Runtime-Error mit Exit-Code behandelt).
- Neue Contract-Tests für Fehlerklassifikation/Exit-Code-Mapping ergänzt.
- Review-Findings aufgelöst: Runtime/API-Trennung in `transcribe` präzisiert, Fehlercode-Katalog typisiert, command-level Exit/stderr-Integrationstests ergänzt.

### File List

- \_bmad-output/implementation-artifacts/1-5-fehlerklassifikation-exit-codes-und-stderr-semantik-stabilisieren.md
- whisper-poc/src/utils/cli-error-contract.ts
- whisper-poc/src/utils/cli-error-contract.test.ts
- whisper-poc/src/commands/transcribe.ts
- whisper-poc/src/commands/record.ts
- whisper-poc/src/commands/setup.ts
- whisper-poc/src/commands/error-contract.integration.test.ts
- \_bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-03-01: Story 1.5 aus Backlog generiert und mit umfassendem Dev-Kontext auf `ready-for-dev` gesetzt.
- 2026-03-01: Fehlerklassifikation + Exit-Code-Contract zentralisiert, Commands migriert, Contract-Tests ergänzt und Story auf `review` gesetzt.
- 2026-03-01: Senior-Code-Review durchgeführt; Action-Items unter `Review Follow-ups (AI)` ergänzt und Status auf `in-progress` gesetzt.
- 2026-03-01: Review-Action-Items umgesetzt (3/3), Integrations-Tests ergänzt und Story zurück auf `review` gesetzt.
- 2026-03-01: Follow-up-Fixes final validiert (robuste Klassifikation + record/setup Integrationspfade) und Story auf `done` gesetzt.
