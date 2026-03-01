---
stepsCompleted:
  [
    "step-01-init",
    "step-02-discovery",
    "step-02b-vision",
    "step-02c-executive-summary",
    "step-03-success",
    "step-04-journeys",
    "step-05-domain",
    "step-06-innovation",
    "step-07-project-type",
    "step-08-scoping",
    "step-09-functional",
    "step-10-nonfunctional",
    "step-11-polish",
    "step-12-complete",
    "step-01b-continue",
  ]
inputDocuments:
  - "MVP.md"
workflowType: "prd"
classification:
  projectType: "desktop_app"
  domain: "general"
  complexity: "medium"
  projectContext: "greenfield"
vision:
  statement: "WhisperFlow macht Voice zu einem erstklassigen Input-Kanal im Entwickler-Workflow — so nahtlos und schnell wie eine Tastenkombination, ohne Kontextwechsel, ohne Ablenkung."
  differentiator: "Unsichtbare, immer verfügbare Voice-Schicht — globaler Shortcut, System Tray, Text sofort in der Zwischenablage. Das Tool verschwindet, der Output bleibt."
  coreInsight: "Desktop-Workflows sind noch nicht voice-ready. Entwickler sprechen schneller als sie tippen und sind ständig in Meetings — aber ihre Tools zwingen sie trotzdem, alles zu tippen."
  primaryUseCases:
    - "Diktieren: Commit-Messages, Tickets, Slack, Dokumentation"
    - "Transkription: Meetings, Calls, Videos"
  targetUser: "Softwareentwickler"
---

# Product Requirements Document - agent-flow

**Author:** Yoda
**Date:** 2026-02-21

---

## Executive Summary

WhisperFlow 2.0 startet als **Core-first Produkt** mit zwei CLI-Interfaces: einer klaren, skriptbaren Unix-CLI (non-interactive) und einer interaktiven, menügeführten CLI. Beide Interfaces laufen auf demselben Core (Domain + Application Use-Cases). Die Electron-App-UI wird bewusst in eine spätere Phase verschoben.

**Zielgruppe:** Softwareentwickler, die Voice als produktiven Eingabekanal nutzen wollen — sowohl für eigene Diktate (Commit-Messages, PR-Beschreibungen, Tickets, Slack-Nachrichten, Dokumentation) als auch für die Transkription von Meetings und Calls.

**Problem:** Der bisherige Plan priorisiert früh UI-Implementierung, obwohl der schnellste Wertnachweis über einen testbaren, deterministischen CLI-Flow möglich ist. Für eine robuste Produktbasis braucht es zuerst einen entkoppelten Core mit stabilen Contracts, bevor zusätzliche Interfaces (Electron UI) aufgebaut werden.

### Was WhisperFlow besonders macht

Kern-Differenzierer ist **Interface-Parität auf einem gemeinsamen Core**: dieselben Use-Cases sind sowohl über Unix-CLI als auch über Interactive CLI nutzbar, ohne Logik-Duplikation.

Die technische Umsetzung fokussiert zuerst auf reproduzierbare CLI-Ausführung: klare Parameter, definierte Exit-Codes, saubere stdout/stderr-Trennung und stabile Automatisierbarkeit in Skripten und Pipelines.

## Project Classification

| Feld              | Wert                                                           |
| ----------------- | -------------------------------------------------------------- |
| Projekttyp        | Core Service + Dual CLI Interfaces (UI deferred)               |
| Domain            | Productivity / Developer Tooling                               |
| Komplexität       | Medium (Audio-Pipeline, externe APIs, Multi-Interface-Adapter) |
| Projektstatus     | Greenfield                                                     |
| Primäre Plattform | macOS/Windows CLI zuerst, Electron UI später                   |

---

## Success Criteria

### User Success

- Entwickler integriert WhisperFlow in seinen täglichen Workflow ohne Bewusstsein für das Tool selbst — Voice wird so selbstverständlich wie Cmd+C
- Transkriptionsqualität für technischen Wortschatz (Variablennamen, Frameworks, Fachbegriffe) ist hoch genug für direkten Copy-Paste ohne manuelle Korrektur
- Für die UI-Phase (Tier 3): Globale Shortcuts funktionieren zuverlässig, unabhängig davon welche App im Vordergrund ist
- Onboarding (API-Key, Test-Recording) funktioniert ohne Support-Bedarf

### Business Success

Open-Source-Projekt ohne kommerziellen Zweck. Erfolg wird an Community-Adoption gemessen:

- Organische Weiterempfehlung in Entwickler-Communities (Hacker News, Reddit, Discord)
- GitHub Stars/Forks als Adoptions-Proxy
- Aktive Issues und PRs als Indikator für Community-Gesundheit

### Technical Success

- App startet zuverlässig und läuft stabil im Hintergrund ohne signifikante RAM/CPU-Last
- Keine Abstürze oder Datenverluste bei längeren Recordings
- Kompatibilität mit macOS und Windows 10/11 (Tier 1 & 2) für CLI sichergestellt; UI-spezifische Shortcut-Features folgen in Tier 3

### Measurable Outcomes

| Outcome         | Indikator                                                               |
| --------------- | ----------------------------------------------------------------------- |
| Nutzer-Adoption | Daily Active Usage bei Early Adopters                                   |
| Qualität        | Transkript direkt verwendbar ohne Korrektur (subjektiv, Nutzerfeedback) |
| Stabilität      | Keine kritischen Crashes im normalen Betrieb                            |
| Community       | Organisches Wachstum ohne Marketing-Aufwand                             |

## Product Scope

### MVP — Minimum Viable Product (Tier 1)

| Capability       | Details                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| Core Application | Domain + Use-Cases, interface-agnostisch                               |
| Audio Pipeline   | FFmpeg WAV → WebM/Opus                                                 |
| Transkription    | Whisper API (Basisflow)                                                |
| Unix CLI         | Non-interactive Commands mit klaren Parametern und stabilen Exit-Codes |
| Interactive CLI  | Menügeführtes Terminal-Interface auf denselben Use-Cases               |
| Output           | Deterministische Ausgabe via stdout/stderr + Clipboard-Option          |
| Security         | API-Key sicher speichern (safeStorage/OS-Keychain)                     |

### Growth Features — Tier 2

- Erweiterte CLI-Profile, Glossar-Management und LLM-Post-Processing
- Persistente History, Fuzzy-Search, Storage-Policies und Cleanup
- Verbesserte Interactive-CLI-Navigation und Assistenz-Flows

### Vision — Tier 3

- Electron UI Adapter (Tray, HUD, Settings, Onboarding) auf dem bestehenden Core
- Zusätzliche Interface-Parität zwischen CLI und UI
- Erweiterte Automations- und Queue-Szenarien

---

## User Journeys

### Journey 1: Marcus — Diktieren direkt in der Unix-CLI

**Persona:** Marcus, Senior Developer, arbeitet remote. Schneller Denker, langsamer Tipper. Schreibt täglich Commit-Messages, Tickets, Slack-Nachrichten und PR-Beschreibungen.

**Opening Scene:** Marcus schließt einen Bugfix ab. Für die Commit-Message fehlt ihm Zeit, also landet wieder ein generisches _"fix stuff"_ im Log. Er weiß: sprechen wäre schneller, aber der bisherige Flow ist zu umständlich.

**Rising Action:** Marcus nutzt den non-interactive CLI-Befehl für Aufnahme + Transkription mit Clipboard-Output. Er spricht: _"Fix null pointer exception in user authentication when token expires during active session."_ Der Befehl läuft deterministisch, Exit-Code 0, Ergebnis liegt in der Zwischenablage.

**Climax:** Marcus fügt den Text direkt in `git commit` ein. Keine Nacharbeit, keine Kontextwechsel, kein UI nötig.

**Resolution:** Nach zwei Wochen sind seine Commit-Messages konsistent präzise — nicht durch mehr Disziplin, sondern weil der schnellste Weg jetzt der qualitativ beste ist.

---

### Journey 2: Marcus — Meeting-Transkription als CLI-Flow (Tier 2)

**Persona:** Derselbe Marcus, jetzt in einem Architektur-Meeting mit dem Team via Zoom.

**Opening Scene:** Das Meeting startet, Entscheidungen fallen schnell. Marcus möchte sich auf das Gespräch konzentrieren statt parallel Notizen zu tippen.

**Rising Action:** Marcus startet den erweiterten CLI-Flow für Dual-Recording (Mic + System-Audio). Der Laufzeitstatus bleibt terminalbasiert und skriptbar; nach Ende stoppt er die Aufnahme per Befehl.

**Climax:** WhisperFlow transkribiert die Session und gibt das Ergebnis reproduzierbar aus (Datei + optional `stdout`).

**Resolution:** Marcus übernimmt die relevanten Passagen direkt in Tickets und Doku. Das Meeting ist dokumentiert, ohne dass währenddessen manuell mitgeschrieben werden musste.

---

### Journey 3: Erster Start — CLI-Setup & Diagnose

**Persona:** Alex, Entwickler, hat WhisperFlow frisch installiert und einen OpenAI API Key.

**Opening Scene:** Alex öffnet das Terminal und startet den Setup-Flow. Statt UI-Wizard bekommt er einen klaren, schrittweisen CLI-Prozess.

**Rising Action:** Alex hinterlegt den API-Key sicher im OS-Keychain/Safe Storage, führt anschließend den Diagnose-Befehl aus und startet ein kurzes Test-Recording.

**Climax:** Die Diagnose meldet Abhängigkeiten und API-Erreichbarkeit als OK; die Test-Transkription erscheint erfolgreich.

**Resolution:** In unter drei Minuten ist die Voice-to-Text-Pipeline einsatzbereit — reproduzierbar, skriptbar und ohne Electron-Onboarding im MVP.

---

### Journey Requirements Summary

| Journey               | Revealed Capabilities                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| Diktieren             | Non-interactive CLI, Mic Recording, Whisper API, Clipboard-Output, stabile Exit-Codes |
| Meeting-Transkription | Erweiterter CLI-Flow, Dual-Recording, System-Audio-Capture (Tier 2), Datei/`stdout`   |
| Onboarding            | CLI-Setup, sicherer API-Key-Store, Diagnose-Kommandos, Test-Recording                 |

### Traceability Matrix (Journey → FR)

| Journey                                       | Primäre FR-Abdeckung                            | Ergänzende FRs         |
| --------------------------------------------- | ----------------------------------------------- | ---------------------- |
| Journey 1: Diktieren (Unix-CLI)               | FR4, FR5, FR6, FR7, FR8, FR13, FR14, FR15, FR16 | FR1, FR2, FR3          |
| Journey 2: Meeting-Transkription (Tier 2 CLI) | FR20, FR22                                      | FR13, FR14, FR15, FR16 |
| Journey 3: CLI-Setup & Diagnose               | FR17, FR18, FR19                                | FR9, FR10, FR11, FR12  |

**Hinweis:** Globale Shortcuts sind ein UI-spezifisches Zielbild für Tier 3 und werden über den Electron-Adapter (FR23, FR24) abgedeckt, nicht über den Tier-1/Tier-2-CLI-Core.

### UI Journeys (Tier 3, später)

Die folgenden Journeys bleiben als Zielbild für die spätere Electron-App bestehen. Sie sind **nicht** Teil des MVP/Tier 1, sondern werden nach stabiler CLI-Basis aktiviert.

#### UI Journey A: Diktieren per globalem Shortcut + HUD

- Nutzer startet Recording per globalem Shortcut
- HUD zeigt diskreten Aufnahme-/Transkriptionsstatus
- Ergebnis landet ohne Reibung im aktuellen Eingabefeld (Clipboard/Paste-Flow)

#### UI Journey B: Meeting-Transkription mit Tray-gesteuertem Dual-Recording

- Start/Stop über Tray/HUD statt Terminal
- Mic + System-Audio als UI-gesteuerter Flow (Tier 3+)
- Ergebnisübergabe in Doku- und Ticket-Workflows

#### UI Journey C: First-Run Onboarding in der App

- Geführter Setup-Flow für API-Key und Berechtigungen
- In-App Test-Recording zur sofortigen Verifikation
- Übergang in den Hintergrundbetrieb über System Tray

---

## Desktop App Specific Requirements

### Project-Type Overview

WhisperFlow folgt einem Core-first Ansatz mit Adapter-Architektur. In Tier 1/Tier 2 sind die primären Interfaces CLI-basiert (Unix-CLI + Interactive CLI). Die Electron-App wird als späterer Adapter integriert, ohne Refactoring des Core.

### Technical Architecture Considerations

**Layer-Strategie:**

- Core Layer: Domain + Application Use-Cases (UI/CLI-agnostisch)
- Adapter Layer: Unix-CLI Adapter und Interactive-CLI Adapter (jetzt), Electron Adapter (später)
- Infrastruktur (Audio, API, Storage, Security) wird zentral und adapterübergreifend genutzt

**CLI Contract:**

- Non-interactive CLI: klare Parameter-Schnittstelle, stdout für Ergebnis, stderr für Fehler, stabile Exit-Codes
- Interactive CLI: menügeführte Navigation, intern dieselben Use-Cases wie non-interactive CLI
- Deterministische Output-Optionen (human-readable und skriptfreundlich)

**Adapter-Parität:**

- Alle kritischen Funktionen (record, transcribe, output, errors) müssen aus beiden CLI-Modi erreichbar sein
- Business-Regeln dürfen nicht in Adaptern dupliziert werden
- Electron-spezifische Anforderungen werden erst in Tier 3 aktiviert

**Auto-Update:**

- Für CLI-first Releases optional und distributionsabhängig
- Electron-Update-Mechanismus wird bei UI-Phase konkretisiert

### System Integration

**System-Integration (CLI-first):**

- API-Key und Audio-Abhängigkeiten werden über CLI-Setup- und Diagnose-Kommandos geprüft
- Plattformabhängigkeiten (z. B. BlackHole für System-Audio) werden im CLI klar validiert und gemeldet
- Kein UI-Onboarding im MVP 2.0 erforderlich

### Platform Support Matrix

| Plattform     | Tier  | Status                                       |
| ------------- | ----- | -------------------------------------------- |
| macOS         | 1 & 2 | CLI vollständig unterstützt                  |
| Windows 10/11 | 1 & 2 | CLI funktional unterstützt (adapterabhängig) |
| Linux         | —     | Nicht geplant                                |

### Implementation Considerations

- FFmpeg via `ffmpeg-static` für CLI-Pipeline
- Audio-Capture Adapter abstrahiert (Mic zuerst, System-Audio als Erweiterung)
- Whisper API zunächst online-only
- Electron-spezifische Runtime-Themen werden in UI-Phase ergänzt

---

## Functional Requirements

### Core & Use-Cases

- **FR1:** Das System implementiert einen interface-agnostischen Core mit klaren Domain- und Application-Use-Cases.
- **FR2:** Alle zentralen Business-Flows (record, transcribe, output, error handling) sind ausschließlich im Core implementiert.
- **FR3:** Adapter dürfen keine Business-Regeln duplizieren.

### Unix-CLI (non-interactive)

- **FR4:** Nutzer kann Kernfunktionen über parameterbasierte CLI-Kommandos ausführen.
- **FR5:** CLI-Kommandos liefern maschinenlesbare, deterministische Ausgaben.
- **FR6:** Erfolgsoutput wird über `stdout`, Fehler über `stderr` ausgegeben.
- **FR7:** Jeder relevante Fehlerfall besitzt einen definierten Exit-Code.
- **FR8:** CLI-Kommandos unterstützen pipeline-fähige Nutzung (Unix Pattern).

### Interactive CLI (menügeführt)

- **FR9:** Nutzer kann über ein interaktives Terminal-Menü durch verfügbare Aktionen navigieren.
- **FR10:** Das Interactive CLI nutzt dieselben Core-Use-Cases wie die Unix-CLI.
- **FR11:** Interaktive Flows führen Setup, Aufnahme, Transkription und Ausgabe schrittweise durch.
- **FR12:** Nutzer erhält klare, handlungsorientierte Fehlerrückmeldungen im Terminal.

### Audio & Transkription

- **FR13:** Das System kann Mic-Only-Aufnahmen ausführen und in einen Transkriptionsflow überführen.
- **FR14:** Die Audio-Pipeline nutzt FFmpeg (WAV → WebM/Opus).
- **FR15:** Das System sendet aufgenommene Audio-Dateien an die Whisper API.
- **FR16:** Das Ergebnis wird standardmäßig in die Zwischenablage kopiert und kann optional auf `stdout` ausgegeben werden.

### Konfiguration & Sicherheit

- **FR17:** Nutzer kann API-Key sicher speichern und abrufen.
- **FR18:** Das System bietet CLI-Setup- und Diagnose-Kommandos (Dependencies, API-Erreichbarkeit, Konfiguration).
- **FR19:** Konfiguration ist persistierbar und für beide CLI-Modi konsistent.

### Erweiterungen (Tier 2+)

- **FR20:** System-Audio/Dual-Recording wird als erweiterter Adapter ergänzt.
- **FR21:** Glossar- und LLM-Post-Processing wird als optionaler Core-Workflow ergänzt.
- **FR22:** History/Storage/Cleanup werden als nachgelagerte Capability ergänzt.
- **FR23:** Electron UI wird als separater Adapter auf dem Core ergänzt.
- **FR24:** UI und CLI bleiben funktional konsistent (Interface-Parität).

---

## Non-Functional Requirements

### Performance

- **NFR1:** CLI-Kommandos starten mit geringer Latenz und sind skriptgeeignet.
- **NFR2:** FFmpeg-Encoding (WAV → WebM/Opus) läuft schneller als Echtzeit.
- **NFR3:** Non-interactive CLI-Ausgaben sind deterministisch und reproduzierbar.
- **NFR4:** Interactive CLI bleibt responsiv und blockiert nicht dauerhaft durch UI-Overhead.

### Reliability

- **NFR5:** Core-Use-Cases sind stabil und adapterunabhängig nutzbar.
- **NFR6:** Fehler in externen Abhängigkeiten (API, Audio, FFmpeg) werden robust behandelt.
- **NFR7:** Fehlgeschlagene API-Calls liefern klare Fehlermeldung und Exit-Code.

### CLI Usability

- **NFR8:** CLI-Hilfe und Fehlermeldungen sind präzise, kurz und handlungsorientiert.
- **NFR9:** Interactive CLI ist vollständig per Tastatur bedienbar.
- **NFR10:** Beide CLI-Modi nutzen ein einheitliches Command-/Terminologie-Modell.
- **NFR11:** Exit-Codes bleiben über Versionen stabil oder werden kompatibel migriert.

### Security & Datenschutz

- **NFR12:** API-Keys und Credentials werden verschlüsselt gespeichert (OS-Keychain/safeStorage).
- **NFR13:** Lokale Daten bleiben im User-Kontext; externe Übertragung nur an konfigurierte APIs.
