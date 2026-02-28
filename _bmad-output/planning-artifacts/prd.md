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
- Globale Shortcuts funktionieren zuverlässig, unabhängig davon welche App im Vordergrund ist
- Onboarding (API-Key, Test-Recording) funktioniert ohne Support-Bedarf

### Business Success

Open-Source-Projekt ohne kommerziellen Zweck. Erfolg wird an Community-Adoption gemessen:

- Organische Weiterempfehlung in Entwickler-Communities (Hacker News, Reddit, Discord)
- GitHub Stars/Forks als Adoptions-Proxy
- Aktive Issues und PRs als Indikator für Community-Gesundheit

### Technical Success

- App startet zuverlässig und läuft stabil im Hintergrund ohne signifikante RAM/CPU-Last
- Keine Abstürze oder Datenverluste bei längeren Recordings
- Kompatibilität mit macOS (Tier 1 & 2) sichergestellt; Windows (Tier 3) funktional portierbar

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

### Journey 1: Marcus — Der diktierende Entwickler

**Persona:** Marcus, Senior Developer, arbeitet remote. Schneller Denker, langsamer Tipper. Schreibt täglich Dutzende kleine Texte: Commit-Messages, Jira-Tickets, Slack-Nachrichten, PR-Beschreibungen.

**Opening Scene:** Marcus schließt einen Bugfix ab. Er muss eine Commit-Message schreiben — wie immer tippt er `fix stuff` weil alles andere zu aufwendig ist. Dabei hat er die Beschreibung im Kopf, er könnte sie in 10 Sekunden sprechen. Aber tippen dauert 60 Sekunden und kostet Konzentration.

**Rising Action:** Marcus drückt den globalen Shortcut. Das HUD erscheint unauffällig am Bildschirmrand — Recording-Indikator. Er spricht: _"Fix null pointer exception in user authentication when token expires during active session."_ Shortcut loslassen.

**Climax:** Das HUD wechselt kurz auf „Transcribing" — dann „✓". Marcus klickt in das Commit-Feld und drückt Cmd+V. Die exakte Formulierung steht da, fertig.

**Resolution:** Marcus bemerkt nach zwei Wochen, dass er aufgehört hat, schlechte Commit-Messages zu schreiben. Nicht weil er sich mehr Mühe gibt — sondern weil es jetzt keinen Aufwand mehr kostet.

---

### Journey 2: Marcus — Meeting-Transkription (Dual-Recording)

**Persona:** Derselbe Marcus, jetzt in einem Architektur-Meeting mit dem Team via Zoom (Tier 2).

**Opening Scene:** Das Meeting beginnt. Entscheidungen werden getroffen, Action Items vergeben. Marcus weiß: die Hälfte wird vergessen sein, bevor er Zeit hat, Notizen zu schreiben.

**Rising Action:** Marcus drückt den Shortcut für Dual-Recording — Mic + System-Audio läuft im Hintergrund. Er fokussiert sich voll aufs Gespräch, ohne gleichzeitig mitschreiben zu müssen. Das HUD zeigt dezent den laufenden Timer.

**Climax:** Meeting endet. Marcus stoppt die Aufnahme. WhisperFlow transkribiert das komplette Gespräch — alle Stimmen, alle Entscheidungen.

**Resolution:** Marcus kopiert die relevanten Passagen direkt in sein Ticket-System. Keine Erinnerungslücken. Das Meeting ist dokumentiert ohne zusätzlichen Aufwand.

---

### Journey 3: Erster Start — Onboarding

**Persona:** Alex, Entwickler, hat WhisperFlow gerade installiert. Hat einen OpenAI API Key, aber noch nie eine Electron-App manuell konfiguriert.

**Opening Scene:** App startet. Kein leeres Interface, keine überfordernde Settings-Seite. Ein klarer First-Run-Flow: API Key eingeben.

**Rising Action:** Alex gibt den Key ein. WhisperFlow führt sofort ein Test-Recording durch — 3 Sekunden sprechen, Transkription erscheint. Funktioniert. Shortcut ist gesetzt.

**Climax:** Setup-Flow endet. App zieht sich in den System Tray zurück. Alex sieht: ein kleines Icon. Fertig.

**Resolution:** Alex hat in unter 3 Minuten eine funktionierende Voice-to-Text-Pipeline auf seinem Rechner — und wusste zu keinem Zeitpunkt, dass FFmpeg involviert war.

---

### Journey Requirements Summary

| Journey               | Revealed Capabilities                                                |
| --------------------- | -------------------------------------------------------------------- |
| Diktieren             | Globale Shortcuts, HUD, Clipboard-Output, Mic Recording, Whisper API |
| Meeting-Transkription | Dual-Recording, System-Audio-Capture, BlackHole-Integration (Tier 2) |
| Onboarding            | API-Key-Gate, Test-Recording, First-Run-Flow, System Tray            |

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
