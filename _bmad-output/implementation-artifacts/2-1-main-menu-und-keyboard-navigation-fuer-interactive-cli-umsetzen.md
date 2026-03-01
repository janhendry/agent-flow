# Story 2.1: Main Menu und Keyboard-Navigation für Interactive CLI umsetzen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Nutzer,
I want ein menügeführtes Interactive CLI,
so that ich ohne Kommando-Memorisierung durch Funktionen navigieren kann.

## Acceptance Criteria

1. Given das Interactive CLI wird gestartet, when der Nutzer mit Tastatur durch Menüpunkte navigiert, then sind Kernfunktionen über ein klares Hauptmenü erreichbar, and Navigation und Aktionen funktionieren vollständig ohne Maus.

## Tasks / Subtasks

- [x] Interactive-CLI-Einstiegspunkt und Main-Menu-Rendering implementieren (AC: 1)
  - [x] Startkommando für Interactive CLI in der bestehenden CLI anbinden
  - [x] Hauptmenü mit klaren, stabilen Einträgen für Kernfunktionen bereitstellen
  - [x] Default-Fokus und initialen Keyboard-State deterministisch setzen
- [x] Vollständige Keyboard-Navigation und Aktionsauslösung absichern (AC: 1)
  - [x] Navigation über Pfeiltasten/Enter (ggf. Esc/Back) ohne Maus umsetzen
  - [x] Menüauswahl auf bestehende Core-Use-Cases routen (ohne Business-Logik-Duplikation)
  - [x] Rückkehr ins Hauptmenü nach Flow-Ende/Abbruch konsistent gestalten
- [x] Fehler- und Ausgabesemantik im interaktiven Kontext stabilisieren (AC: 1)
  - [x] Handlungsorientierte Fehlermeldungen im TUI-Kontext ausgeben
  - [x] Bestehenden Error-/Exit-Code-Contract wiederverwenden, keine neuen Codes einführen
  - [x] Keine Secrets oder internen Details in UI-Ausgaben leaken
- [x] Tests und Qualitätsgates ergänzen (AC: 1)
  - [x] Unit-/Integrationstests für Main-Menu-State und Keyboard-Navigation hinzufügen
  - [x] Regressionstests für bestehende non-interactive CLI-Kommandos grün halten
  - [x] `npm run verify` erfolgreich

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Interactive-Fehlerpfad lief ohne contract-konforme Fehlerausgabe; `interactive` ist jetzt über den bestehenden CLI-Error-Contract abgesichert.
- [x] [AI-Review][MEDIUM] Schutz gegen potenzielle Setup-Redirect-Endlosschleife ergänzt (`maxSetupRedirects`) mit klarer Abbruchmeldung.
- [x] [AI-Review][MEDIUM] Main-Menu-Integrität wird jetzt explizit validiert (keine Duplikate, keine fehlenden Kernziele).

## Dev Notes

### Developer Context Section

- Story 2.1 startet Epic 2 und führt den interaktiven CLI-Adapter ein, ohne den bestehenden non-interactive CLI-Contract zu brechen.
- Fokus ist ein keyboard-first Hauptmenü als Orchestrierungsschicht auf bestehenden Core-Use-Cases.
- Die Story ist absichtlich auf Navigation/Struktur begrenzt; geführte End-to-End-Flows folgen in Story 2.2.

### Technical Requirements

- Interactive CLI muss vollständig per Tastatur bedienbar sein (FR9, NFR9).
- Interactive CLI nutzt dieselben Core-Use-Cases wie Unix-CLI (FR10) und dupliziert keine Business-Logik.
- Fehlerhinweise im Terminal bleiben knapp, präzise und handlungsorientiert (FR12, NFR8).
- Bestehender Error-/Exit-Code-Contract aus Epic 1 bleibt unverändert und kompatibel.

### Architecture Compliance

- Adapter-/Port-Disziplin einhalten: TUI/CLI nur Orchestrierung, keine Fachlogik in Menükomponenten.
- Änderungen in der aktuellen `whisper-poc`-Struktur umsetzen (kein vorgezogener Monorepo-Umbau).
- Bestehende Output-Semantik respektieren: Ergebnisdaten vs. Fehlerpfade klar trennen.
- Security-Regel einhalten: keine Secret-Daten in UI- oder Fehlerausgaben.

### Library / Framework Requirements

- Bestehender Stack beibehalten: TypeScript + Node.js (ESM), `commander`, `inquirer`, `chalk`, `ora`, `openai`.
- Für Interactive-CLI bevorzugt bestehende Projekt-Patterns nutzen; keine neue Dependency ohne explizite Freigabe.
- Tests mit Node Test Runner (`node --test`) und `assert`.

### File Structure Requirements

- Erwartete Kernpfade:
  - `whisper-poc/src/cli.ts`
  - `whisper-poc/src/commands/*` (Interactive-Entry + Routing)
  - ggf. neue TUI-Module unter `whisper-poc/src/commands` oder `whisper-poc/src/utils` nach bestehendem Muster
  - passende `*.test.ts` für Navigation/Contract-Regeln
- Story-Datei nur in erlaubten Bereichen aktualisieren (Tasks, Dev Agent Record, File List, Change Log, Status).

### Testing Requirements

- Tests für Menüaufbau, Fokusführung, Tastaturnavigation und Aktionsrouting.
- Tests für Fehlerpfade im Interactive-Kontext mit bestehendem Error-Contract.
- Regression: bestehende Contract-Tests aus Epic 1 bleiben grün.
- Gate: `npm run verify` + relevante Tests erfolgreich.

### Previous Story Intelligence (Story 1.6)

- Setup/Diagnose und persistente Konfiguration sind vorhanden und sollen als bestehende Use-Cases aus dem Menü aufrufbar sein.
- Error-/Exit-Code-Semantik ist stabilisiert (Story 1.5) und muss im interaktiven Adapter konsistent bleiben.
- Security-Grundsatz bleibt aktiv: keine Secret-Leaks in Ausgaben oder Logs.

### Git Intelligence Summary

- Jüngste Änderungen fokussieren auf deterministische CLI-Contracts, Diagnose und robuste Fehlerpfade.
- Für 2.1 ist wichtig, diese Stabilität zu erhalten und nur die Interaktionsschicht darüber zu legen.

### Latest Tech Information

- Externe Web-Recherche wurde in diesem Lauf nicht ausgeführt; maßgeblich sind die aktuell im Projekt vorhandenen Versionen.
- Für Story 2.1 sind keine Library-Upgrades erforderlich.

### Project Structure Notes

- Umsetzung bleibt in der bestehenden `whisper-poc`-Struktur.
- Ziel ist ein belastbarer, keyboard-first Interactive-Entry als Grundlage für 2.2–2.4.

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Story 2.1)
- Source: \_bmad-output/planning-artifacts/prd.md (FR9, FR10, FR12, NFR8, NFR9, NFR10)
- Source: \_bmad-output/planning-artifacts/architecture.md (Core/Adapter-Trennung, Error-Contract, Strukturregeln)
- Source: \_bmad-output/implementation-artifacts/1-6-sicheres-setup-diagnose-und-persistente-konfiguration-bereitstellen.md (Previous Story Intelligence)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- create-story-artige Kontextableitung für Story 2.1 aus Epics/PRD/Architecture durchgeführt.
- Story-Datei für Epic-2-Start erstellt und auf `in-progress` gesetzt (User-Startsignal).
- Interactive-Orchestrierung in dedizierten Command extrahiert und in `cli.ts` als Default + `interactive`-Subcommand verdrahtet.
- Main-Menu-Einträge zentralisiert, damit Navigation konsistent und testbar bleibt.
- Testläufe erfolgreich: `runTests` (fokussiert + komplett) sowie `npm run verify`.
- Senior-Code-Review durchgeführt, 3 Findings identifiziert (1 High, 2 Medium) und vollständig behoben.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Interactive-CLI kann jetzt explizit über `whisper-poc interactive` gestartet werden; Standardaufruf bleibt kompatibel.
- Main-Menu-Einträge wurden in eine zentrale Definition ausgelagert und im App-Menü verwendet.
- Die Setup-Weiterleitung (`open-setup`) bleibt erhalten und kehrt deterministisch ins Hauptmenü zurück.
- Neue Tests decken Main-Menu-Definition, Interactive-Loop und CLI-Help-Contract ab.
- Regressionslauf und Verify-Gates erfolgreich.
- Review-Hardening: contract-konformer Interactive-Fehlerpfad, Redirect-Limit-Schutz und Menü-Integritätsprüfung ergänzt.

### File List

- \_bmad-output/implementation-artifacts/2-1-main-menu-und-keyboard-navigation-fuer-interactive-cli-umsetzen.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- whisper-poc/src/app.tsx
- whisper-poc/src/cli.ts
- whisper-poc/src/commands/interactive-menu.ts
- whisper-poc/src/commands/interactive.ts
- whisper-poc/src/commands/interactive.test.ts
- whisper-poc/src/commands/interactive-cli.integration.test.ts

### Change Log

- 2026-03-01: Story 2.1 aus Backlog erzeugt, mit umfassendem Dev-Kontext angereichert und auf `in-progress` gesetzt.
- 2026-03-01: Story 2.1 implementiert (Interactive-Command, zentrales Main-Menu, Navigation-/Loop-Tests, Verify grün) und auf `review` gesetzt.
- 2026-03-01: Senior-Code-Review abgeschlossen; 3 Findings behoben (Interactive-Error-Contract, Redirect-Limit, Menü-Integrität), Tests/Verify erneut grün und Story auf `done` gesetzt.

## Senior Developer Review (AI)

### Review Outcome

Approve

### Review Date

2026-03-01

### Summary

- Scope geprüft: `whisper-poc/src/app.tsx`, `whisper-poc/src/cli.ts`, `whisper-poc/src/commands/interactive*.ts`.
- AC-Abdeckung bestätigt: Main-Menu vorhanden, keyboard-first Navigation über bestehendes Ink-Select-Pattern, Routing auf bestehende Use-Cases ohne Business-Logik-Duplikation.
- Git-vs-Story geprüft: gelistete Source-Dateien stimmen mit Änderungen überein.

### Findings

- [x] [HIGH] Interactive-Fehlerpfad war nicht explizit auf den zentralen CLI-Error-Contract gemappt.
- [x] [MEDIUM] Potenzieller Endlosschleifenpfad bei wiederholtem `open-setup` ohne Schutzgrenze.
- [x] [MEDIUM] Keine explizite Validierung der Main-Menu-Integrität (Duplikate/fehlende Kernziele).

### Action Items

- [x] Interactive-Actions in `cli.ts` mit `emitCliErrorAndExit("interactive", "setup-runtime", ...)` abgesichert.
- [x] `interactiveCommand` um Redirect-Limit ergänzt.
- [x] Menü-Validierung eingeführt und Tests für Validierung + Error-Contract ergänzt.
