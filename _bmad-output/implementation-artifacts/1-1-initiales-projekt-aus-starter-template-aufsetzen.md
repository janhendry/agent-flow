# Story 1.1: Initiales Projekt aus Starter-Template aufsetzen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Entwickler,
I want die bestehende whisper-poc-Basis als Starter sauber initialisieren,
so that wir mit lauffähiger Ausgangsbasis kontrolliert den Core-first-Ausbau starten.

## Acceptance Criteria

1. Given die Architektur gibt whisper-poc als Starter-Template vor, when das Projekt aus dieser Basis eingerichtet und Abhängigkeiten installiert werden, then ist ein reproduzierbarer, lauffähiger Ausgangsstand für alle Entwickler vorhanden, and die initiale Konfiguration ist dokumentiert und bereit für die nachfolgenden Core-Stories.
2. Given ein frisches Entwickler-Setup, when die Projektinitialisierung gemäß Dokumentation durchgeführt wird, then laufen Typecheck/Build-Basisschritte ohne strukturelle Fehler an, and die Verzeichnisstruktur entspricht den Architektur-Grenzen (core/cli getrennt).
3. Given Security- und Konfigurationsvorgaben aus PRD/Architektur, when Startkonfiguration erstellt wird, then werden keine Secrets im Klartext committet, and API-Key-Verwaltung bleibt auf Keychain/safeStorage-Pfad ausgelegt.

## Tasks / Subtasks

- [x] Starter-Basis verifizieren und als offizieller Ausgangsstand dokumentieren (AC: 1)
  - [x] Prüfen, dass die vorhandene whisper-poc-Basis als alleinige Initialquelle genutzt wird
  - [x] Initialisierungsablauf in reproduzierbare Schritte zerlegen
- [x] Workspace- und Paketstruktur gemäß Architekturgrenzen vorbereiten (AC: 1,2)
  - [x] Core-/Adapter-Grenzen im Verzeichnislayout sicherstellen
  - [x] Basiskonfigurationen für TypeScript/Build/Lint konsistent setzen
- [x] Baseline-Qualitätsgates lauffähig machen (AC: 2)
  - [x] Typecheck als ausführbaren Basisschritt definieren
  - [x] Build- und Lint-EntryPoints dokumentieren
- [x] Sicherheits- und Konfigurationsleitplanken fixieren (AC: 3)
  - [x] Secret-Handling ohne Klartextablage sicherstellen
  - [x] Konfigurationsdateien für lokale Entwicklung und CI trennen
- [x] Übergabehinweise für Folgestories ergänzen (AC: 1,2,3)
  - [x] Klare Liste der erwarteten Artefakte nach Story-Abschluss erstellen

### Review Follow-ups (AI)

- [x] [AI-Review][High] AC2 nachschärfen: Story-Claim "core/cli getrennt" in Story 1.1 entkoppeln oder durch nachweisbare, minimal umgesetzte Strukturmaßnahme belegen. [_bmad-output/implementation-artifacts/1-1-initiales-projekt-aus-starter-template-aufsetzen.md:18]
- [x] [AI-Review][High] AC3 technisch belegbar machen: klaren, verifizierbaren Pfad für sichere Secret-Verwaltung (mindestens Adapter-Plan + konkrete Schnittstelle) ergänzen statt nur Dokumentationshinweis. [_bmad-output/implementation-artifacts/1-1-initiales-projekt-aus-starter-template-aufsetzen.md:19]
- [x] [AI-Review][Medium] `lint`-Script korrigieren oder umbenennen, damit Quality-Gate-Semantik nicht irreführend ist. [whisper-poc/package.json:11]
- [x] [AI-Review][Medium] Reproduzierbare Initialisierung plattformneutral formulieren (Windows + macOS), z. B. Copy-Schritt ohne shell-spezifische Annahme. [whisper-poc/README.md:47]
- [x] [AI-Review][Low] Doku-Dopplung zwischen README und INITIALIZATION reduzieren (Single Source of Truth festlegen + Verlinkung). [whisper-poc/README.md:43]

## Dev Notes

### Developer Context Section

- Diese Story ist die Foundation-Story für Epic 1 und muss den stabilen Startpunkt für alle Folge-Stories schaffen.
- Fokus liegt auf Reproduzierbarkeit und sauberer Architekturgrenze, nicht auf Feature-Implementierung.
- Keine vorgezogene Umsetzung späterer Story-Ziele (kein Scope-Leak in CLI-Features, keine UI-Implementierung).

### Technical Requirements

- Starter-Template-Vorgabe ist bindend: whisper-poc als Basis nutzen, kein alternatives Scaffolding.
- Core-first-Prinzip strikt einhalten: Business-Logik gehört in Core-Bereiche, Adapter enthalten keine Fachlogik.
- Status-/Ausgabeverträge (stdout/stderr, Exit-Code-Semantik) nur vorbereiten, nicht voll implementieren (kommt in späteren Stories).

### Architecture Compliance

- Architektur-Dokument priorisiert: Core + CLI zuerst, Desktop-Adapter später.
- Zielstruktur orientiert sich an klaren Grenzen zwischen:
  - Core (Domain, Use-Cases, Ports)
  - CLI-Adapter (Kommandos, UI/Ink, Infrastrukturadapter)
- Keine API- oder UI-seitige Abkürzung, die die Port/Adapter-Disziplin unterläuft.

### Library & Framework Requirements

- TypeScript/Node-basierte Toolchain als Baseline.
- Qualitätswerkzeuge aus Architekturkontext berücksichtigen (Typecheck, Lint/Format, Build).
- Zusätzliche Libraries nur aufnehmen, wenn sie für Initialisierung zwingend sind.

### File Structure Requirements

- Änderungen auf Initialisierungs- und Basiskonfigurationsdateien begrenzen.
- Keine unnötige Umstrukturierung bestehender Domänenlogik.
- Neue Dateien nur anlegen, wenn sie für reproduzierbaren Projektstart benötigt werden.

### Testing Requirements

- Mindestnachweis: Projekt initialisiert und Basiskommandos sind ausführbar.
- Prüfpunkte für Story-Abnahme:
  - Setup-Schritte dokumentiert und reproduzierbar
  - Typecheck/Build-Basisschritt startbar
  - Keine Secret-Leaks in Repo-Dateien

### Project Structure Notes

- In dieser Story wird die Grundlage gelegt; Folge-Stories dürfen auf dieser Struktur aufbauen, aber sie nicht umgehen.
- Falls bestehende Struktur von Architekturvorgaben abweicht: minimale, nachvollziehbare Korrekturen mit klarer Begründung.

### References

- Source: \_bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.1)
- Source: \_bmad-output/planning-artifacts/architecture.md (Starter Template Evaluation, Core Architectural Decisions, Project Structure & Boundaries)
- Source: \_bmad-output/planning-artifacts/prd.md (Functional Requirements FR1–FR3, FR17–FR19; Non-Functional Anforderungen zu Stabilität/Sicherheit)

## Senior Developer Review (AI)

### Review Date

2026-03-01

### Outcome

Approve

### Summary

Alle zuvor offenen Review-Punkte wurden umgesetzt. Zusätzlich wurden in der Secret-Store-Implementierung Robustheits- und Sicherheitsverbesserungen ergänzt (resilientes Parsing, atomisches Schreiben, restriktive Dateirechte auf Unix).

### Action Items

- [x] [High] AC2-Claim und tatsächlichen Scope harmonisieren (Claim anpassen oder minimal belastbaren Strukturbeleg liefern).
- [x] [High] AC3 mit technischer Nachweisbarkeit ergänzen (konkreter Secret-Handling-Integrationspfad).
- [x] [Medium] `lint`-Skript semantisch korrekt ausrichten.
- [x] [Medium] Cross-Platform-Schritte im Initialisierungsabschnitt präzisieren.
- [x] [Low] Doku-Dopplung konsolidieren.
- [x] [Medium] Secret-Store robust gegen korrupte Secret-Dateien machen (safe fallback statt Hard-Fail).
- [x] [Medium] Secret-Write atomisch und mit restriktiven Dateirechten (Unix) durchführen.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Story automatisch aus erstem Backlog-Eintrag in sprint-status abgeleitet.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story ist für dev-story vorbereitet; Fokus auf initiale Plattform-Stabilisierung.
- Foundation-Baseline für `whisper-poc` umgesetzt (reproduzierbare Initialisierung + Security-Leitplanken + Qualitätsgates).
- `npm run verify` erfolgreich ausgeführt (Typecheck + Build).
- Senior-Review durchgeführt: Follow-ups erstellt, Status auf `in-progress` gesetzt bis Review-Punkte abgearbeitet sind.
- High-Follow-ups umgesetzt: Core/Adapter-Struktur durch `SecretStorePort` + CLI-Adapter nachweisbar eingeführt.
- Secret-Handling-Pfad technisch verankert (Adapter-basiert, keychain-ready), `npm run verify` weiterhin grün.
- Medium/Low-Follow-ups umgesetzt: Lint-Semantik präzisiert, README plattformneutralisiert, Foundation-Doku als Single Source verlinkt.
- Finales Code-Review abgeschlossen: verbleibende Secret-Store-Qualitätsbefunde behoben; Story freigegeben (`done`).

### File List

- \_bmad-output/implementation-artifacts/1-1-initiales-projekt-aus-starter-template-aufsetzen.md
- whisper-poc/package.json
- whisper-poc/.gitignore
- whisper-poc/README.md
- whisper-poc/.env.example
- whisper-poc/docs/INITIALIZATION.md
- whisper-poc/src/core/ports/secret-store.port.ts
- whisper-poc/src/adapters/cli/secret-store.adapter.ts
- whisper-poc/src/commands/setup.ts
- whisper-poc/src/commands/transcribe.ts
- whisper-poc/src/app.tsx
- whisper-poc/src/adapters/cli/secret-store.adapter.ts

### Change Log

- 2026-03-01: Story 1.1 implementiert; Baseline-Skripte (`typecheck`, `lint`, `verify`) ergänzt, Initialisierungsdokumentation hinzugefügt, `.env`-Strategie für Secret-Schutz etabliert.
- 2026-03-01: Code-Review durchgeführt; 5 Review-Follow-ups (2 High, 2 Medium, 1 Low) als Aufgaben ergänzt.
- 2026-03-01: High-Review-Follow-ups umgesetzt: minimaler Core/Adapter-Secret-Store eingeführt und in CLI/TUI integriert.
- 2026-03-01: Medium/Low-Review-Follow-ups umgesetzt: Lint-Umbenennung/Präzisierung, plattformneutrale Init-Schritte, Doku-Konsolidierung.
- 2026-03-01: Finales Code-Review: Secret-Store auf Robustheit/Sicherheit gehärtet; Story auf `done` gesetzt.
