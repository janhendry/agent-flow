# Story 1.4: Output-Contract mit Clipboard- und stdout-Option umsetzen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Entwickler,
I want einen klaren Output-Contract für Textausgabe,
so that Ergebnisse direkt in Clipboard und optional in stdout nutzbar sind.

## Acceptance Criteria

1. Given eine erfolgreiche Transkription, when der Nutzer Standard- oder stdout-Output wählt, then steht der Text standardmäßig in der Zwischenablage bereit, and optional wird derselbe Inhalt korrekt über stdout ausgegeben.

## Tasks / Subtasks

- [x] Output-Use-Case für Textausgabe mit deterministischem Vertrag umsetzen (AC: 1)
  - [x] Standardpfad schreibt Transkript in die Zwischenablage
  - [x] Optionaler `--stdout`-Pfad gibt denselben Inhalt unverändert auf stdout aus
  - [x] stdout/stderr-Semantik bleibt strikt getrennt (Ergebnis vs. Diagnose/Fehler)
- [x] CLI-Integration für Output-Optionen ergänzen (AC: 1)
  - [x] Relevante Command-Option(en) für Output-Modus konsistent anbinden
  - [x] Bestehende non-interactive Pipeline-Fähigkeit nicht regressiv verändern
- [x] Fehler- und Randfälle sauber behandeln (AC: 1)
  - [x] Clipboard-Fehler liefern verständliche Meldung ohne Secret-Leakage
  - [x] Fallback-/Diagnosepfade verletzen den Output-Contract nicht
- [x] Vertrags-/Regressionstests ergänzen (AC: 1)
  - [x] Testfall: Clipboard-Standardpfad
  - [x] Testfall: stdout-Option liefert identischen Inhalt
  - [x] Testfall: stderr bleibt frei von Ergebnisdaten
- [x] Qualitätsgates ausführen (AC: 1)
  - [x] `npm run verify` erfolgreich
  - [x] Relevante Tests erfolgreich

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Erfolgsfall schreibt Diagnose-Event auf stderr; bei Erfolg soll stderr leer bleiben [whisper-poc/src/commands/transcribe.ts:197]
- [x] [AI-Review][HIGH] Standardpfad gibt Transkript auf stdout aus, obwohl stdout als optionaler Pfad definiert ist [whisper-poc/src/commands/transcribe.ts:214]
- [x] [AI-Review][HIGH] Bei aktiviertem stdout bricht ein Clipboard-Fehler vor stdout-Emission ab [whisper-poc/src/commands/transcribe.ts:188]
- [x] [AI-Review][MEDIUM] Story File List unvollständig gegenüber tatsächlichen Code-Änderungen [whisper-poc/src/cli.ts:1]
- [x] [AI-Review][MEDIUM] Testabdeckung unvollständig für Output-Contract (success-stderr-leer, Clipboard-Fehler bei stdout) [whisper-poc/src/commands/transcribe-output-contract.test.ts:1]
- [x] [AI-Review][LOW] stdout-Payload hängt immer Newline an und ist damit nicht strikt unverändert [whisper-poc/src/commands/transcribe.ts:45]

## Dev Notes

### Developer Context Section

- Story 1.4 fokussiert ausschließlich den Output-Contract nach erfolgreicher Transkription.
- Keine Vorgriffe auf Story 1.5 (Exit-Code-Katalog/Fehlerklassen) oder Story 1.6 (Setup/Diagnose).

### Technical Requirements

- Ergebnisdaten gehören auf stdout (wenn explizit gewählt), Fehler und Diagnose auf stderr.
- Clipboard- und stdout-Ausgabe müssen inhaltlich konsistent sein (gleicher Text, keine stillen Transformationen).
- Sensible Daten dürfen nicht über Diagnoseausgaben offengelegt werden.

### Architecture Compliance

- Output-Logik bleibt im Core-/Utility-nahen Pfad, nicht in UI/TUI.
- CLI konsumiert den Output-Contract, dupliziert aber keine Business-Regeln.
- Deterministisches Verhalten bei wiederholter Ausführung mit identischem Input.

### Testing Requirements

- `npm run verify` muss grün bleiben.
- Unit-/Contract-Tests decken Clipboard- und stdout-Pfade sowie IO-Semantik ab.

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Story 1.4)
- Source: \_bmad-output/planning-artifacts/prd.md (FR16, FR6, FR8)
- Source: \_bmad-output/planning-artifacts/architecture.md (Output Contract, stdout/stderr-Trennung)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Story 1.4 aus Epic-Artefakt vorbereitet.
- `runTests` erfolgreich (inkl. `transcribe-output-contract.test.ts`).
- `npm run verify` erfolgreich (Typecheck + Build).

### Completion Notes List

- Story als `ready-for-dev` vorbereitet und mit AC-orientierten Tasks strukturiert.
- Referenzen auf PRD/Architektur für Output-Vertrag ergänzt.
- Standard-Output auf Clipboard erweitert; bei Fehlern klare `clipboard-failed`-Semantik.
- `--stdout` gibt denselben Transkriptinhalt aus; Diagnose bleibt auf `stderr`.
- Vertrags-Helfer und dedizierte Output-Contract-Tests ergänzt.
- Review-Fixes umgesetzt: kein stderr im Erfolgsfall, kein Transkript-stdout im Standardpfad, `--stdout` bleibt bei Clipboard-Fehler nicht-fatal.
- Testabdeckung für TTY/`--stdout`-Vertragsverhalten und Clipboard-Fehlerentscheidungen erweitert.

### File List

- \_bmad-output/implementation-artifacts/1-4-output-contract-mit-clipboard-und-stdout-option-umsetzen.md
- whisper-poc/src/commands/transcribe.ts
- whisper-poc/src/commands/transcribe-output-contract.test.ts
- whisper-poc/src/commands/cli-contract.test.ts
- whisper-poc/src/cli.ts

### Change Log

- 2026-03-01: Story 1.4 als `ready-for-dev` angelegt und für Implementierung vorbereitet.
- 2026-03-01: Output-Contract umgesetzt (Clipboard-Default + optionales stdout mit strikter stdout/stderr-Semantik).
- 2026-03-01: Contract-Tests ergänzt und Qualitätsgates erfolgreich ausgeführt.
- 2026-03-01: Senior-Code-Review durchgeführt; Findings als `Review Follow-ups (AI)` ergänzt und Status auf `in-progress` gesetzt.
- 2026-03-01: High/Medium-Review-Findings behoben, Tests erweitert und Story auf `done` gesetzt.
- 2026-03-01: Low-Review-Finding behoben (`stdout`-Payload jetzt ohne erzwungenes Newline) und Follow-up abgeschlossen.
