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

WhisperFlow ist eine Electron-basierte Desktop-Applikation für macOS (primär) und Windows (sekundär), die Voice-to-Text-Transkription als erstklassigen Input-Kanal in den Entwickler-Workflow integriert. Die App läuft unsichtbar im System Tray und wird über globale Tastaturkürzel aktiviert — kein Kontextwechsel, kein UI-Overhead, kein manuelles Wechseln der Anwendung. Das Transkriptionsergebnis landet direkt in der Zwischenablage, einsatzbereit in jeder Applikation.

**Zielgruppe:** Softwareentwickler, die Voice als produktiven Eingabekanal nutzen wollen — sowohl für eigene Diktate (Commit-Messages, PR-Beschreibungen, Tickets, Slack-Nachrichten, Dokumentation) als auch für die Transkription von Meetings und Calls.

**Problem:** Desktop-Workflows sind nicht voice-ready. Entwickler sprechen schneller als sie tippen und verbringen einen signifikanten Teil ihres Arbeitstags in Meetings — doch existierende Tools erzwingen Kontextwechsel, haben inakzeptable Latenz oder liefern unzureichende Qualität für technische Inhalte. Der fehlende Layer ist kein besseres Mikrofon und keine bessere KI — es ist die nahtlose Integration in den Desktop-Workflow.

### Was WhisperFlow besonders macht

Kern-Differenzierer ist **frictionless availability**: WhisperFlow ist immer verfügbar, reagiert wie eine Tastenkombination, und verschwindet nach getaner Arbeit. Kein dediziertes Fenster, kein manueller Upload, keine App die Aufmerksamkeit fordert.

Die technische Umsetzung — globale OS-Shortcuts, FFmpeg-Audiopipeline, Whisper API, optionale LLM-Nachbearbeitung — ist für den Nutzer unsichtbar. Nutzer-Erfahrung: Shortcut drücken → sprechen → loslassen → Text in der Zwischenablage.

## Project Classification

| Feld              | Wert                                                          |
| ----------------- | ------------------------------------------------------------- |
| Projekttyp        | Desktop App (Electron, cross-platform)                        |
| Domain            | Productivity / Developer Tooling                              |
| Komplexität       | Medium (native OS-Integration, externe APIs, FFmpeg-Pipeline) |
| Projektstatus     | Greenfield                                                    |
| Primäre Plattform | macOS (Tier 1 & 2), Windows (Tier 3)                          |

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

| Capability      | Details                                                    |
| --------------- | ---------------------------------------------------------- |
| Audio Recording | Mic-Only, macOS                                            |
| Audio Pipeline  | FFmpeg WAV → WebM/Opus                                     |
| Transkription   | Whisper API (ohne Prompt)                                  |
| Output          | Clipboard                                                  |
| UI              | System Tray, HUD (4 States), Snackbar-Notifications        |
| Shortcuts       | Globale Shortcuts für Recording                            |
| Settings        | API Key, Recording Mode, Shortcuts                         |
| Onboarding      | First-Run-Flow, API-Key-Gate, Test-Recording, FFmpeg-Check |

### Growth Features — Tier 2

- System-Audio + Dual-Recording (macOS via BlackHole)
- Transcription-Prompt (Whisper Stil/Glossar) + LLM Post-Processing (GPT)
- Quick History Overlay (letzte 20 Transkriptionen) + Storage + Auto-Cleanup
- Shortcut Recorder (UI), vollständige Settings-Tabs

### Vision — Tier 3

- Code Review Mode, Full History Window (Audio Playback)
- Silence Detection, Pause/Resume, Push-to-Talk
- Windows Port (vollständig), Transcription Queue

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

**Rising Action:** Alex gibt den Key ein. WhisperFlow führt sofort ein Test-Recording durch — 3 Sekunden sprechen, Transkription erscheint. Funktioniert. Shortcut ist gesetzt. FFmpeg-Check läuft automatisch im Hintergrund.

**Climax:** Setup-Flow endet. App zieht sich in den System Tray zurück. Alex sieht: ein kleines Icon. Fertig.

**Resolution:** Alex hat in unter 3 Minuten eine funktionierende Voice-to-Text-Pipeline auf seinem Rechner — und wusste zu keinem Zeitpunkt, dass FFmpeg involviert war.

---

### Journey Requirements Summary

| Journey               | Revealed Capabilities                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| Diktieren             | Globale Shortcuts, HUD, Clipboard-Output, Mic Recording, Whisper API    |
| Meeting-Transkription | Dual-Recording, System-Audio-Capture, BlackHole-Integration (Tier 2)    |
| Onboarding            | API-Key-Gate, Test-Recording, FFmpeg-Check, First-Run-Flow, System Tray |

---

## Desktop App Specific Requirements

### Project-Type Overview

WhisperFlow ist eine Electron-basierte Desktop-Applikation. Die Architektur wird von Anfang an cross-platform-fähig designed — macOS ist Tier 1 & 2 Zielplattform, Windows Tier 3. Alle plattformspezifischen Integrationen werden abstrahiert, sodass der Windows-Port kein Refactoring der Kernlogik erfordert.

### Technical Architecture Considerations

**Cross-Platform-Strategie:**

- Plattformspezifischer Code (Shortcuts, System Tray, Audio-Capture) wird hinter Abstraktionsschichten gekapselt
- Electron-Renderer-Code (React) ist vollständig plattformunabhängig
- Platform-Adapters für macOS-spezifische Features (BlackHole, globale Shortcuts) werden so designed, dass Windows-Äquivalente (WASAPI) später einsteckbar sind

**Auto-Update:**

- `electron-updater` wird integriert
- Update-Mechanismus ist Teil des Distributions-Setups — von Anfang an eingeplant, nicht MVP-blockierend

### System Integration

**macOS Permissions — Teil des First-Run-Onboarding-Flows:**

| Permission    | Trigger                        | UI                                                                     |
| ------------- | ------------------------------ | ---------------------------------------------------------------------- |
| Microphone    | Erste Aufnahme / First-Run     | macOS System-Dialog + Erklärung im Onboarding                          |
| Accessibility | Globale Shortcuts registrieren | Explizite Anleitung im Onboarding (System Preferences → Accessibility) |

Beide Permissions werden im First-Run-Flow aktiv adressiert — kein stilles Scheitern, keine nachträgliche Fehlermeldung ohne Kontext.

**System Tray:** Primärer Interaktionspunkt. App hat kein permanentes Hauptfenster — nur HUD, Settings und Onboarding öffnen Fenster.

### Platform Support Matrix

| Plattform                     | Tier  | Status                                               |
| ----------------------------- | ----- | ---------------------------------------------------- |
| macOS (Apple Silicon + Intel) | 1 & 2 | Vollständig unterstützt                              |
| Windows 10/11                 | 3     | Architektonisch vorbereitet, spätere Implementierung |
| Linux                         | —     | Nicht geplant                                        |

### Implementation Considerations

- FFmpeg als externe Binary (BYOF-Ansatz) — plattformspezifischer Pfad/Check im Onboarding
- Globale Shortcuts via Electron-Global-Shortcut API — Accessibility-Permission-Abhängigkeit dokumentiert
- System-Audio-Capture (Tier 2) ist macOS-spezifisch via BlackHole — Windows-Äquivalent (WASAPI) für Tier 3 vorgesehen
- Offline-Modus: Online-only via Whisper API bewusst akzeptiert — lokales Whisper-Modell (`whisper.cpp`) ist nicht geplant

---

## Functional Requirements

### Audio Recording

- **FR1:** Nutzer kann eine Mic-Only-Aufnahme über einen globalen Shortcut starten und stoppen
- **FR2:** Nutzer kann eine System-Audio-Only-Aufnahme über einen globalen Shortcut starten und stoppen _(Tier 2)_
- **FR3:** Nutzer kann eine Dual-Recording-Aufnahme (Mic + System-Audio gleichzeitig) über einen globalen Shortcut starten und stoppen _(Tier 2)_
- **FR4:** Nutzer kann den aktiven Recording-Modus in den Settings festlegen
- **FR5:** Das System erkennt verfügbare Audiogeräte automatisch und unterstützt Hot-plug
- **FR6:** Das System prüft beim Start, ob FFmpeg verfügbar ist, und zeigt bei Fehlen eine Fehlermeldung mit Installationshinweis
- **FR7:** Das System prüft beim Start, ob BlackHole verfügbar ist (wenn Dual-/System-Audio-Modus gewählt), und zeigt Setup-Anleitung _(Tier 2)_

### Transkription

- **FR8:** Das System sendet die aufgenommene Audiodatei nach Ende der Aufnahme an die Whisper API zur Transkription
- **FR9:** Nutzer kann einen Transcription-Prompt (Stil/Glossar) für die Whisper API konfigurieren _(Tier 2)_
- **FR10:** Das System kann den transkribierten Text nach der Whisper-Verarbeitung durch ein LLM (GPT) nachbearbeiten lassen _(Tier 2)_
- **FR11:** Nutzer kann LLM Post-Processing in den Settings aktivieren oder deaktivieren _(Tier 2)_

### Output & Clipboard

- **FR12:** Das System kopiert das Transkriptionsergebnis automatisch in die System-Zwischenablage
- **FR13:** Nutzer kann vergangene Transkriptionen in einem Quick History Overlay einsehen (letzte 20) _(Tier 2)_
- **FR14:** Nutzer kann einen Eintrag aus der History erneut in die Zwischenablage kopieren _(Tier 2)_

### System Tray & Globale Shortcuts

- **FR15:** Die App läuft als System-Tray-Applikation ohne permanentes Hauptfenster
- **FR16:** Nutzer kann über das Tray-Icon auf Settings und weitere Funktionen zugreifen
- **FR17:** Nutzer kann globale Tastaturkürzel für Recording-Aktionen konfigurieren
- **FR18:** Globale Shortcuts funktionieren unabhängig davon, welche App im Vordergrund ist
- **FR19:** Nutzer kann den Shortcut-Recorder nutzen, um Shortcuts per UI neu zu belegen _(Tier 2)_

### HUD & Feedback

- **FR20:** Das System zeigt ein HUD mit dem Status "Recording" während einer aktiven Aufnahme
- **FR21:** Das System zeigt ein HUD mit dem Status "Transcribing" während der API-Verarbeitung
- **FR22:** Das System zeigt eine Erfolgsbestätigung ("✓") wenn das Transkript in der Zwischenablage ist
- **FR23:** Das System zeigt eine Fehlermeldung wenn Aufnahme oder Transkription fehlschlägt
- **FR24:** Das System zeigt Snackbar-Benachrichtigungen für relevante Ereignisse

### Settings & Konfiguration

- **FR25:** Nutzer kann seinen OpenAI API Key eingeben und speichern
- **FR26:** Nutzer kann den Standard-Recording-Modus (Mic/System/Dual) konfigurieren
- **FR27:** Nutzer kann globale Shortcuts für alle Recording-Aktionen konfigurieren
- **FR28:** Nutzer kann Sprache/Stil-Präferenz für die Whisper-Transkription konfigurieren _(Tier 2)_
- **FR29:** Nutzer kann Auto-Cleanup-Regeln für gespeicherte Aufnahmen konfigurieren _(Tier 2)_

### Onboarding & Erster Start

- **FR30:** Die App erkennt beim ersten Start, dass noch kein API Key konfiguriert ist, und führt den Nutzer durch einen First-Run-Flow
- **FR31:** Das System fordert beim First-Run aktiv die benötigten macOS-Permissions an (Mikrofon, Accessibility) mit erklärender UI
- **FR32:** Das System führt nach API-Key-Eingabe automatisch ein Test-Recording durch, um die Konfiguration zu validieren
- **FR33:** Das System prüft beim Onboarding automatisch die FFmpeg-Verfügbarkeit und zeigt Installationshinweise bei Fehlen
- **FR34:** Nach erfolgreichem Onboarding zieht sich die App in den System Tray zurück

### Storage & Datenverwaltung _(Tier 2)_

- **FR35:** Das System speichert Transkriptionen lokal mit Metadaten (Timestamp, Dauer, Modus)
- **FR36:** Das System bereinigt gespeicherte Aufnahmen automatisch nach konfigurierbaren Regeln
- **FR37:** Nutzer kann den Speicherort für Aufnahmen konfigurieren

### Auto-Update & Distribution

- **FR38:** Das System prüft auf Updates und benachrichtigt den Nutzer, wenn eine neue Version verfügbar ist
- **FR39:** Nutzer kann den Update-Modus konfigurieren: automatisch im Hintergrund installieren oder nur benachrichtigen (manuell installieren)

---

## Non-Functional Requirements

### Performance

- **NFR1:** Der globale Shortcut reagiert innerhalb von 200ms (Recording startet ohne wahrnehmbare Verzögerung)
- **NFR2:** Die App startet und ist im System Tray verfügbar ohne merkliche Verzögerung beim Login
- **NFR3:** FFmpeg-Encoding (WAV → WebM/Opus) läuft schneller als Echtzeit (kein Bottleneck vor API-Call)
- **NFR4:** Die App verursacht im Idle-Zustand (kein Recording) weniger als 50MB RAM und unter 1% CPU

### Reliability

- **NFR5:** Die App läuft stabil im Hintergrund ohne Memory Leaks bei kontinuierlicher Nutzung über mehrere Stunden
- **NFR6:** Globale Shortcuts werden nach App-Neustart sowie nach System-Sleep/Wake zuverlässig neu registriert
- **NFR7:** Ein fehlgeschlagener API-Call (Timeout, Netzwerkfehler) führt zu einer klaren Fehlermeldung — kein stiller Fehler, kein Absturz

### Accessibility

- **NFR8:** Die App respektiert macOS System-Accessibility-Einstellungen (z.B. Reduced Motion für HUD-Animationen)
