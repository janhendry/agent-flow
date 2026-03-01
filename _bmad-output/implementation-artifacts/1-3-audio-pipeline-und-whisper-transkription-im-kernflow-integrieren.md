# Story 1.3: Audio-Pipeline und Whisper-Transkription im Kernflow integrieren

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Nutzer,
I want Mic-Only-Audio zuverlässig aufnehmen und transkribieren,
so that ich Voice-Input direkt produktiv verwenden kann.

## Acceptance Criteria

1. Given eine gestartete Mic-Only-Aufnahme, when der Flow Audio über FFmpeg in WebM/Opus verarbeitet und an Whisper sendet, then wird ein Transkript erzeugt, and der Flow bleibt bei wiederholter Ausführung stabil und reproduzierbar.

## Tasks / Subtasks

- [x] FFmpeg-basierte Upload-Pipeline für Whisper im Kernflow ergänzen (AC: 1)
  - [x] Vor Whisper-Upload eine WebM/Opus-Konvertierung für nicht-WebM-Inputs durchführen
  - [x] Opus-Parameter stabil und reproduzierbar setzen (`libopus`, `48k`, `vbr on`, `application voip`)
- [x] Transkriptionsflow robustisieren (AC: 1)
  - [x] Temporäre Upload-Dateien nach API-Call verlässlich aufräumen
  - [x] Konvertierungsfehler verständlich propagieren
- [x] Regressions-/Vertrags-Tests ergänzen (AC: 1)
  - [x] Entscheidung „Konvertierung nötig?“ per Unit-Test abdecken
  - [x] FFmpeg-Arg-Contract per Unit-Test absichern
- [x] Qualitätsgates ausführen (AC: 1)
  - [x] Typecheck/Build erfolgreich
  - [x] Relevante Tests erfolgreich

## Dev Notes

### Developer Context Section

- Story 1.3 fokussiert den Kernflow zwischen Aufnahme, Audio-Pipeline und Whisper-Upload.
- Scope bleibt auf stabiler Mic-Only-Transkriptionskette; keine Vorgriffe auf Story 1.4+.

### Technical Requirements

- Upload-Pipeline muss Audio vor Whisper standardisiert als WebM/Opus bereitstellen.
- Konvertierung darf bestehende CLI-Verträge nicht brechen.
- Fehler in der Konvertierung müssen klar und reproduzierbar sein.

### Architecture Compliance

- Pipeline-Logik bleibt im Utility-/Core-nahen Pfad, nicht in UI/TUI.
- Deterministische Parameterwahl für FFmpeg.

### Testing Requirements

- `npm run verify` muss grün bleiben.
- Unit-Tests decken Pipeline-Entscheidung und FFmpeg-Argument-Contract ab.

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Story 1.3)
- Source: \_bmad-output/planning-artifacts/prd.md (FR13–FR15)
- Source: \_bmad-output/planning-artifacts/architecture.md (Audio-Pipeline/CLI-Contract)

## Senior Developer Review (AI)

### Review Date

2026-03-01

### Outcome

Approve

### Summary

Adversarial Review durchgeführt und alle High-/Medium-Findings direkt behoben. Die Upload-Konvertierung ist jetzt gegen Hänger abgesichert und der Temp-File-Cleanup läuft auch bei frühen Fehlern (z. B. SDK-Import/Client-Erstellung). Zusätzlich wurde der FFmpeg-Arg-Contract-Test auf `vbr` und `compression_level` erweitert.

### Action Items

- [x] [High] Temp-Datei-Cleanup auf den gesamten Flow ausweiten (inkl. Fehler vor API-Call).
- [x] [High] Timeout/Abort für FFmpeg-Konvertierung ergänzen.
- [x] [Medium] FFmpeg-Contract-Test um `-vbr on` und `-compression_level 10` ergänzen.
- [x] [Medium] Git-vs-Story-Diskrepanzen transparent dokumentieren (Stacked Changes aus Story 1.1/1.2 im selben Commit-Stand).
- [x] [Medium] Story-Review auf tatsächliche 1.3-Dateien fokussieren und Status synchronisieren.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm run verify` in `whisper-poc` erfolgreich.
- Relevante Tests erfolgreich (`cli-contract.test.ts`, `whisper-contract.test.ts`).
- Code-Review-Fixlauf erfolgreich: `whisper-contract.test.ts` und `cli-contract.test.ts` grün.

### Completion Notes List

- Whisper-Upload-Pipeline auf WebM/Opus-Vorbereitung für Nicht-WebM-Inputs erweitert.
- Deterministische FFmpeg-Parameter für Speech-optimierte Opus-Konvertierung eingeführt.
- Temporäre Upload-Datei wird nach API-Call sicher bereinigt.
- Unit-Tests für Konvertierungsentscheidung und FFmpeg-Arg-Vertrag ergänzt.
- Temp-Datei-Cleanup auf den gesamten Transkriptionsflow ausgedehnt (inkl. Fehler vor Whisper-Request).
- FFmpeg-Konvertierung um Timeout-Schutz ergänzt, um Hänger reproduzierbar abzufangen.
- Story-Dokumentation nach adversarial Review aktualisiert und auf `done` gesetzt.

### File List

- \_bmad-output/implementation-artifacts/1-3-audio-pipeline-und-whisper-transkription-im-kernflow-integrieren.md
- whisper-poc/src/utils/whisper.ts
- whisper-poc/src/utils/whisper-contract.test.ts

### Change Log

- 2026-03-01: Story 1.3 umgesetzt: FFmpeg-WebM/Opus-Konvertierung vor Whisper-Upload für nicht-WebM-Inputs ergänzt.
- 2026-03-01: Konvertierungs- und Upload-Flow robuster gemacht (Fehlerdiagnose + Temp-Datei-Cleanup).
- 2026-03-01: Unit-Tests für Pipeline-Contract ergänzt; Verifikation erfolgreich.
- 2026-03-01: Code-Review-Follow-ups umgesetzt (Flow-weites Cleanup, FFmpeg-Timeout, erweiterter Arg-Contract-Test); Story-Status auf `done` gesetzt.
