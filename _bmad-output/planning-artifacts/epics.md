---
stepsCompleted:
  - "step-01-validate-prerequisites"
  - "step-02-design-epics"
  - "step-03-create-stories"
  - "step-04-final-validation"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
---

# agent-flow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for agent-flow, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Das System implementiert einen interface-agnostischen Core mit klaren Domain- und Application-Use-Cases.
FR2: Alle zentralen Business-Flows (record, transcribe, output, error handling) sind ausschließlich im Core implementiert.
FR3: Adapter dürfen keine Business-Regeln duplizieren.
FR4: Nutzer kann Kernfunktionen über parameterbasierte CLI-Kommandos ausführen.
FR5: CLI-Kommandos liefern maschinenlesbare, deterministische Ausgaben.
FR6: Erfolgsoutput wird über `stdout`, Fehler über `stderr` ausgegeben.
FR7: Jeder relevante Fehlerfall besitzt einen definierten Exit-Code.
FR8: CLI-Kommandos unterstützen pipeline-fähige Nutzung (Unix Pattern).
FR9: Nutzer kann über ein interaktives Terminal-Menü durch verfügbare Aktionen navigieren.
FR10: Das Interactive CLI nutzt dieselben Core-Use-Cases wie die Unix-CLI.
FR11: Interaktive Flows führen Setup, Aufnahme, Transkription und Ausgabe schrittweise durch.
FR12: Nutzer erhält klare, handlungsorientierte Fehlerrückmeldungen im Terminal.
FR13: Das System kann Mic-Only-Aufnahmen ausführen und in einen Transkriptionsflow überführen.
FR14: Die Audio-Pipeline nutzt FFmpeg (WAV → WebM/Opus).
FR15: Das System sendet aufgenommene Audio-Dateien an die Whisper API.
FR16: Das Ergebnis wird standardmäßig in die Zwischenablage kopiert und kann optional auf `stdout` ausgegeben werden.
FR17: Nutzer kann API-Key sicher speichern und abrufen.
FR18: Das System bietet CLI-Setup- und Diagnose-Kommandos (Dependencies, API-Erreichbarkeit, Konfiguration).
FR19: Konfiguration ist persistierbar und für beide CLI-Modi konsistent.
FR20: System-Audio/Dual-Recording wird als erweiterter Adapter ergänzt.
FR21: Glossar- und LLM-Post-Processing wird als optionaler Core-Workflow ergänzt.
FR22: History/Storage/Cleanup werden als nachgelagerte Capability ergänzt.
FR23: Electron UI wird als separater Adapter auf dem Core ergänzt.
FR24: UI und CLI bleiben funktional konsistent (Interface-Parität).

### NonFunctional Requirements

NFR1: CLI-Kommandos starten mit geringer Latenz und sind skriptgeeignet.
NFR2: FFmpeg-Encoding (WAV → WebM/Opus) läuft schneller als Echtzeit.
NFR3: Non-interactive CLI-Ausgaben sind deterministisch und reproduzierbar.
NFR4: Interactive CLI bleibt responsiv und blockiert nicht dauerhaft durch UI-Overhead.
NFR5: Core-Use-Cases sind stabil und adapterunabhängig nutzbar.
NFR6: Fehler in externen Abhängigkeiten (API, Audio, FFmpeg) werden robust behandelt.
NFR7: Fehlgeschlagene API-Calls liefern klare Fehlermeldung und Exit-Code.
NFR8: CLI-Hilfe und Fehlermeldungen sind präzise, kurz und handlungsorientiert.
NFR9: Interactive CLI ist vollständig per Tastatur bedienbar.
NFR10: Beide CLI-Modi nutzen ein einheitliches Command-/Terminologie-Modell.
NFR11: Exit-Codes bleiben über Versionen stabil oder werden kompatibel migriert.
NFR12: API-Keys und Credentials werden verschlüsselt gespeichert (OS-Keychain/safeStorage).
NFR13: Lokale Daten bleiben im User-Kontext; externe Übertragung nur an konfigurierte APIs.

### Additional Requirements

- Starter-Template-Vorgabe aus Architektur: `whisper-poc` als bestehende, validierte Basis verwenden; kein neues Scaffold.
- Implementierungsreihenfolge aus Architektur beachten: zuerst Core-Contracts/Use-Cases extrahieren, dann Persistenz, Error/Output-Contracts, dann CLI-Adapter-Härtung.
- Strukturvorgabe: `packages/core` als adapter-agnostischer Kern, `packages/cli` als Adapter, `apps/desktop` erst Tier 3.
- Port/Adapter-Disziplin: keine Adapter-zu-Adapter-Kopplung; Kommunikation nur über Core-Ports.
- Persistenzstandard: JSONL (append-only) + Metadatenindex; Schema-Versionierung (`schema_version`) mit Migrationsstrategie.
- Einheitliche Error-Semantik: DomainError-Hierarchie und stabiler Exit-Code-Katalog zentral pflegen.
- Build- und Qualitäts-Gates verpflichtend: `biome check`, Typecheck, Build, Tests.
- Diagnostik als First-Class-Capability (Setup/Health-Checks, strukturierte Logs).
- UX-Flow (Tier 3): Keyboard-first, globaler Shortcut, HUD als passives Overlay ohne Klickinteraktion.
- HUD-State-Anforderungen: klare Zustände `recording`, `transcribing`, `success`, `error`; Auto-dismiss im Success-State (~1,5s).
- Echtzeit-Audiopegel im Recording-State als Vertrauensanker; visuelle Reaktion ohne wahrnehmbaren Delay.
- Fehlermuster UX: non-blocking Error-State, handlungsorientierte Texte, jederzeit Neustart via Shortcut.
- Accessibility-Basis für UI: WCAG-AA-Kontrast, sichtbarer Focus-Ring, vollständige Keyboard-Navigation, `prefers-reduced-motion` respektieren.
- Overlay-Anforderungen: History-Overlay (`Cmd+Shift+H`) und Profilwechsel-Overlay (`Cmd+Shift+P`) als Spotlight-artige, tastaturgesteuerte Fenster.
- Settings-Informationsarchitektur: Tabs für General/Shortcuts/Profile/System Prompts/Glossare/API Key/Audio/Display/About mit klaren Feld- und Validierungsregeln.
- Plattformfokus: CLI auf macOS + Windows 10/11 (Tier 1/2), Linux nicht geplant; UI primär macOS in Tier 3.

### FR Coverage Map

FR1: Epic 1 - Interface-agnostischer Core als stabile Basis für alle Interfaces
FR2: Epic 1 - Record/Transcribe/Output/Error-Handling zentral im Core
FR3: Epic 1 - Keine Business-Logik-Duplikation in Adaptern
FR4: Epic 1 - Parameterbasierte Unix-CLI-Kommandos
FR5: Epic 1 - Deterministische, maschinenlesbare CLI-Ausgaben
FR6: Epic 1 - Korrekte `stdout`/`stderr`-Trennung
FR7: Epic 1 - Definierte Exit-Codes für relevante Fehlerfälle
FR8: Epic 1 - Pipeline-fähige Unix-CLI-Nutzung
FR9: Epic 2 - Menübasierte Navigation im Interactive CLI
FR10: Epic 2 - Interactive CLI nutzt denselben Core wie Unix-CLI
FR11: Epic 2 - Geführte Setup-/Aufnahme-/Transkriptions-/Output-Flows
FR12: Epic 2 - Handlungsorientierte Fehlerrückmeldungen im Terminal
FR13: Epic 1 - Mic-Only-Aufnahme als Teil des Kernflows
FR14: Epic 1 - FFmpeg-Audiopipeline im Kernprozess
FR15: Epic 1 - Whisper-API-Anbindung für Transkription
FR16: Epic 1 - Ergebnis in Clipboard und optional `stdout`
FR17: Epic 1 - Sicheres Speichern/Abrufen des API-Keys
FR18: Epic 1 - Setup- und Diagnose-Kommandos im Core/Unix-CLI-Kontext
FR19: Epic 1 - Persistente, konsistente Konfiguration für CLI-Modi
FR20: Epic 2 - Erweiterter Interactive-Flow für System-Audio/Dual-Recording
FR21: Epic 2 - Interactive-Orchestrierung für optionales Glossar/LLM-Post-Processing
FR22: Epic 2 - Interactive-Zugriff auf History/Storage/Cleanup
FR23: Epic 3 - Electron-UI als separater Adapter auf dem Core
FR24: Epic 3 - Funktionale Parität zwischen UI und CLI

## Epic List

### Epic 1: Core + Unix-CLI Interface

Nutzer können den vollständigen Voice-Core über ein deterministisches, skriptbares Unix-CLI nutzen (record/transcribe/output), inkl. stabiler Fehler- und Exit-Code-Semantik.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR13, FR14, FR15, FR16, FR17, FR18, FR19

### Epic 2: Interactive CLI

Nutzer können denselben Core über eine geführte, menübasierte Interactive CLI bedienen, inklusive klarer Recovery- und Diagnostik-Flows.
**FRs covered:** FR9, FR10, FR11, FR12, FR20, FR21, FR22

### Epic 3: UI App (Electron Adapter)

Nutzer erhalten eine Desktop-UI mit denselben Kernfunktionen und konsistenter Semantik zur CLI (Interface-Parität).
**FRs covered:** FR23, FR24

## Epic 1: Core + Unix-CLI Interface

Nutzer können den vollständigen Voice-Core über ein deterministisches, skriptbares Unix-CLI nutzen (record/transcribe/output), inkl. stabiler Fehler- und Exit-Code-Semantik.

### Story 1.1: Initiales Projekt aus Starter-Template aufsetzen

As a Entwickler,
I want die bestehende `whisper-poc`-Basis als Starter sauber initialisieren,
So that wir mit lauffähiger Ausgangsbasis kontrolliert den Core-first-Ausbau starten.

**Acceptance Criteria:**

**Given** die Architektur gibt `whisper-poc` als Starter-Template vor
**When** das Projekt aus dieser Basis eingerichtet und Abhängigkeiten installiert werden
**Then** ist ein reproduzierbarer, lauffähiger Ausgangsstand für alle Entwickler vorhanden
**And** die initiale Konfiguration ist dokumentiert und bereit für die nachfolgenden Core-Stories.

### Story 1.2: Deterministische Unix-CLI-Befehle für Record/Transcribe bereitstellen

As a Power-User,
I want non-interactive CLI-Kommandos mit klaren Parametern,
So that ich den Record- und Transcribe-Flow skriptbar ausführen kann.

**Acceptance Criteria:**

**Given** ein Nutzer startet `record`/`transcribe` via CLI
**When** Kommandos mit gültigen Flags ausgeführt werden
**Then** liefert die CLI deterministische Ergebnisse bei identischem Input
**And** die Ausgabe ist pipeline-fähig und ohne interaktive Rückfragen nutzbar.

### Story 1.3: Audio-Pipeline und Whisper-Transkription im Kernflow integrieren

As a Nutzer,
I want Mic-Only-Audio zuverlässig aufnehmen und transkribieren,
So that ich Voice-Input direkt produktiv verwenden kann.

**Acceptance Criteria:**

**Given** eine gestartete Mic-Only-Aufnahme
**When** der Flow Audio über FFmpeg in WebM/Opus verarbeitet und an Whisper sendet
**Then** wird ein Transkript erzeugt
**And** der Flow bleibt bei wiederholter Ausführung stabil und reproduzierbar.

### Story 1.4: Output-Contract mit Clipboard- und stdout-Option umsetzen

As a Entwickler,
I want einen klaren Output-Contract für Textausgabe,
So that Ergebnisse direkt in Clipboard und optional in stdout nutzbar sind.

**Acceptance Criteria:**

**Given** eine erfolgreiche Transkription
**When** der Nutzer Standard- oder stdout-Output wählt
**Then** steht der Text standardmäßig in der Zwischenablage bereit
**And** optional wird derselbe Inhalt korrekt über stdout ausgegeben.

### Story 1.5: Fehlerklassifikation, Exit-Codes und stderr-Semantik stabilisieren

As a Skript-Autor,
I want stabile Fehlerklassen mit definierten Exit-Codes,
So that Automations zuverlässig auf Fehler reagieren können.

**Acceptance Criteria:**

**Given** ein Validierungs-, API- oder Runtime-Fehler tritt auf
**When** der CLI-Flow fehlschlägt
**Then** wird die Fehlermeldung über stderr ausgegeben
**And** der Exit-Code ist eindeutig, dokumentiert und versionsstabil.

### Story 1.6: Sicheres Setup, Diagnose und persistente Konfiguration bereitstellen

As a Erstnutzer,
I want API-Key-Setup, Diagnose und persistente Konfiguration,
So that ich WhisperFlow sicher einrichten und zuverlässig betreiben kann.

**Acceptance Criteria:**

**Given** ein neuer Nutzer hat noch keine gültige Konfiguration
**When** Setup- und Diagnose-Kommandos ausgeführt werden
**Then** kann der API-Key sicher gespeichert und geprüft werden
**And** die Konfiguration bleibt für alle CLI-Modi konsistent persistent.

## Epic 2: Interactive CLI

Nutzer können denselben Core über eine geführte, menübasierte Interactive CLI bedienen, inklusive klarer Recovery- und Diagnostik-Flows.

### Story 2.1: Main Menu und Keyboard-Navigation für Interactive CLI umsetzen

As a Nutzer,
I want ein menügeführtes Interactive CLI,
So that ich ohne Kommando-Memorisierung durch Funktionen navigieren kann.

**Acceptance Criteria:**

**Given** das Interactive CLI wird gestartet
**When** der Nutzer mit Tastatur durch Menüpunkte navigiert
**Then** sind Kernfunktionen über ein klares Hauptmenü erreichbar
**And** Navigation und Aktionen funktionieren vollständig ohne Maus.

### Story 2.2: Geführten Record→Transcribe→Success/Error-Flow implementieren

As a Nutzer,
I want einen schrittweisen interaktiven Ablauf,
So that ich Aufnahme und Transkription mit laufendem Status sicher ausführen kann.

**Acceptance Criteria:**

**Given** ein Nutzer startet den Record-Flow im Interactive CLI
**When** die Aufnahme gestoppt wird
**Then** wechselt der Ablauf in einen Transcribing-Status mit verständlichem Feedback
**And** endet deterministisch in einem Success- oder Error-Screen.

### Story 2.3: Recovery- und Diagnose-Aktionen im Fehlerkontext anbieten

As a Nutzer,
I want Retry- und Diagnoseoptionen direkt im Fehlerbildschirm,
So that ich Probleme ohne Kontextverlust beheben kann.

**Acceptance Criteria:**

**Given** eine Transkription schlägt im Interactive CLI fehl
**When** der Error-Screen angezeigt wird
**Then** sind mindestens Retry, Details und Setup/Diagnose-Aktionen verfügbar
**And** der Nutzer kann ohne Neustart des Programms weiterarbeiten.

### Story 2.4: Erweiterte Capability-Flows (Dual-Audio, LLM/Glossar, History) integrieren

As a fortgeschrittener Nutzer,
I want erweiterte Features im Interactive CLI nutzen,
So that ich komplexe Workflows ohne Wechsel auf die Unix-CLI ausführen kann.

**Acceptance Criteria:**

**Given** erweiterte Capabilities sind im Core verfügbar
**When** der Nutzer diese über Interactive-Menüs ausführt
**Then** funktionieren System-Audio/Dual-Recording, optionales LLM/Glossar und History-Flows konsistent
**And** die Ergebnisse folgen denselben Kernregeln wie im Unix-Interface.

## Epic 3: UI App (Electron Adapter)

Nutzer erhalten eine Desktop-UI mit denselben Kernfunktionen und konsistenter Semantik zur CLI (Interface-Parität).

### Story 3.1: Electron-Adapter auf Core-Use-Cases anbinden

As a Desktop-Nutzer,
I want die UI-App direkt auf denselben Core zugreifen,
So that Funktionen identisch zur CLI arbeiten.

**Acceptance Criteria:**

**Given** die Electron-App wird gestartet
**When** UI-Aktionen Record/Transcribe auslösen
**Then** werden dieselben Core-Use-Cases wie in CLI-Pfaden verwendet
**And** es entsteht keine separate Business-Logik im UI-Layer.

### Story 3.2: HUD-Overlay mit Recording/Transcribing/Success/Error-States bereitstellen

As a Desktop-Nutzer,
I want ein passives HUD-Overlay mit klaren Zuständen,
So that ich den Voice-Flow ohne Kontextwechsel sicher steuern kann.

**Acceptance Criteria:**

**Given** ein globaler Shortcut startet den Flow
**When** die Zustände Recording, Transcribing, Success oder Error eintreten
**Then** zeigt das HUD den aktuellen State eindeutig und non-blocking
**And** der Success-State wird automatisch nach kurzer Dauer ausgeblendet
**And** im Dual-Modus (Mic + System) zeigt das HUD zwei getrennte Echtzeit-Pegelbalken (Mic oben, System unten) mit farblicher Differenzierung — konsistent zum bewährten Dual-Pegel-Pattern der CLI
**And** im Single-Modus (Mic Only / System Only) zeigt das HUD einen einzelnen Pegelbalken.

### Story 3.3: Settings- und Overlay-Konfiguration für produktive UI-Nutzung implementieren

As a Nutzer,
I want zentrale Settings für Shortcuts, Profile, Audio, Display und API,
So that ich die UI-App auf meinen Workflow anpassen kann.

**Acceptance Criteria:**

**Given** die Settings-Ansicht ist geöffnet
**When** ein Nutzer Konfigurationen ändert und speichert
**Then** werden die Werte validiert und persistent übernommen
**And** Overlay-Positionen sowie zentrale UI-Flows folgen den definierten UX-Vorgaben.

### Story 3.4: Interface-Parität zwischen CLI und UI validieren

As a Produktteam,
I want nachweisbare Parität zwischen UI- und CLI-Verhalten,
So that Nutzer über alle Interfaces konsistente Ergebnisse und Fehlersignale erhalten.

**Acceptance Criteria:**

**Given** identische Inputs werden in CLI und UI ausgeführt
**When** Ergebnisse und Fehlerfälle verglichen werden
**Then** sind Output-Semantik und Kernverhalten funktional konsistent
**And** Abweichungen werden als Defekte oder explizite Design-Entscheidungen dokumentiert.
