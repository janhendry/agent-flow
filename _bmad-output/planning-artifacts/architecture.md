---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
workflowType: "architecture"
lastStep: 8
status: "complete"
completedAt: "2026-02-28T10:04:15.0812182+01:00"
project_name: "agent-flow"
user_name: "Yoda"
date: "2026-02-28T09:12:26.5179208+01:00"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Die Anforderungen definieren eine klare Core-first-Architektur mit entkoppelten Adaptern. Der Core enthält alle Business-Flows (Recording, Transkription, Output, Fehlerbehandlung), während Unix-CLI und Interactive CLI dieselben Use-Cases konsumieren. Erweiterungen (System-Audio, Glossar/LLM, History) sind als additive Capabilities modelliert; die spätere Electron-UI bleibt ein separater Adapter ohne Core-Refactoring.

Zusätzlich wird eine klare Prioritätslinie sichtbar: zuerst der deterministische Kern-Loop (Record → Transcribe → Clipboard), danach Erweiterungen. Das reduziert Scope-Risiko und stabilisiert die Basis für spätere Adapter.

**Non-Functional Requirements:**
Die NFRs treiben vor allem Determinismus, Zuverlässigkeit und Sicherheit: reproduzierbare CLI-Ausgaben, klare stdout/stderr-Trennung, stabile Exit-Codes, robuste Fehlerbehandlung bei externen Abhängigkeiten sowie sichere Speicherung von API-Keys (OS-Keychain/safeStorage).
Für die spätere Multi-Interface-Entwicklung sind versionierte Adapter-Contracts essenziell, um Interface-Parität dauerhaft sicherzustellen.

**Scale & Complexity:**
Das Projekt liegt im Bereich mittel bis hoch, weil mehrere technische Ebenen kombiniert werden: Audio-Erfassung, FFmpeg-Konvertierung, externe Transkriptions-API, plattformspezifische Integrationen (Shortcuts/Audio), sowie Interface-Parität über mehrere Adapter.

- Primary domain: Desktop + CLI Developer Tooling
- Complexity level: Medium-High
- Estimated architectural components: 10-14

### Technical Constraints & Dependencies

Wesentliche Abhängigkeiten sind FFmpeg (Audio-Pipeline), Whisper API (Transkription), OS-nahe Secret-Storage-Mechanismen und plattformspezifische Audio-/Shortcut-Fähigkeiten (macOS/Windows).
Das MVP ist CLI-first, wodurch API-Verträge, Fehlercodes und deterministische Outputs früh verbindlich sein müssen. Die spätere Electron-Phase muss auf denselben Use-Cases aufsetzen und darf keine fachliche Logik in UI-Layer verlagern.

### Cross-Cutting Concerns Identified

Zentrale querschnittliche Themen sind: Interface-Parität über Adapter, einheitliche Fehlersemantik inkl. Exit-Codes, Security für Secrets/Konfiguration, sowie konsistente Persistenzregeln für History/Profile.
Neu hervorgehoben: **User-Trust by Design** als Architekturziel (latenzarme State-Wechsel, klares Realtime-Feedback, verständliche Fehlerführung) und **Diagnostik/Observability** als erstklassige Capability statt nachgelagertes Add-on.

## Starter Template Evaluation

### Primary Technology Domain

CLI-first Core (Tier 1/2) with existing Electron desktop adapter reserved for Tier 3.

### Starter Options Considered

1. Existing internal starter: whisper-poc (already implemented and tested)
2. External CLI starters (oclif/commander templates)
3. Desktop-first starter (create-electron-app) for later UI phase only

### Selected Starter: Existing internal baseline (whisper-poc)

**Rationale for Selection:**
The project already has a validated CLI proof-of-concept with tested flows. Reusing it as the foundation minimizes risk, preserves proven behavior, and accelerates extraction of a clean interface-agnostic core.

**Initialization Command:**
No new scaffold command required. Continue from existing repository baseline.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript + Node.js CLI runtime

**Styling Solution:**
Not applicable for CLI baseline

**Build Tooling:**
TypeScript build + CLI execution workflow

**Testing Framework:**
Already validated in current POC process

**Code Organization:**
Command-oriented CLI modules suitable for core extraction

**Development Experience:**
Fast local iteration, deterministic CLI behavior

**Tier-3 Note (Desktop):**
The existing whisper-flow Electron codebase remains the designated Tier-3 adapter path and is intentionally out of scope for core-first implementation stories.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Core und CLI bauen auf `whisper-poc` auf (bereits getestete Basis)
- Gemeinsame Codebasis in TypeScript für CLI und spätere App-Adapter
- Keine REST-API im Produktkern
- Persistenz über JSONL + Metadaten statt Datenbank im MVP
- Interactive CLI bleibt Ink-basiert

**Important Decisions (Shape Architecture):**

- State-Management mit Nanostores (leichtgewichtig, adapterübergreifend)
- CLI-Command-Orchestrierung über Commander
- OpenAI Whisper-Integration über offizielles OpenAI SDK
- Strikte Trennung Core (Use-Cases) vs. Adapter (CLI jetzt, App später)
- Build via Vite, Format/Lint via Biome

**Deferred Decisions (Post-MVP):**

- Datenbankeinführung (z. B. SQLite/Postgres) nur bei nachgewiesenem JSONL-Limit
- Electron-spezifische UI-Architekturdetails (Tier 3)
- Externe Service-Schnittstellen nur falls später tatsächlich benötigt

### Data Architecture

- **Storage Format:** JSONL als append-only Event/History-Log
- **Metadata Strategy:** getrennte Metadatenstruktur (Index + technische Felder wie Timestamps, Source, Profile, Duration, Status)
- **Data Model Approach:** transkriptionszentrierte Records mit klarer Schema-Version
- **Migration Approach:** versionierte Reader/Writer; bei Schemawechseln lazy migration beim Lesen
- **Caching Strategy:** in-memory Cache für letzte Ergebnisse und häufig genutzte Metadatenindizes

### Authentication & Security

- **API Key Handling:** nur OS-Keychain/safeStorage-Adapter; kein Klartext in Projektdateien
- **Authorization Pattern:** lokal laufende Single-User-App, daher kein RBAC/Session-Modell im MVP
- **Data Protection:** sensible Felder in Logs minimieren; Secrets nie in stdout/stderr ausgeben
- **Operational Security:** deterministische Fehlercodes ohne Secret-Leakage

### API & Communication Patterns

- **External API Style:** kein REST-API-Layer
- **Internal Communication:** TypeScript Ports/Adapter + Use-Case-Aufrufe
- **Error Handling Standard:** feste Fehlerklassen + stabile Exit-Codes
- **Output Contract:** strikt getrenntes stdout/stderr-Verhalten für Skriptbarkeit
- **Inter-Adapter Reuse:** identischer Core aus CLI und später App konsumierbar

### Frontend Architecture

- **Current Scope:** Interactive CLI via Ink als primäre Nutzeroberfläche (Tier 1/2)
- **State Management:** Nanostores als gemeinsames, leichtgewichtiges State-Modell
- **Component Strategy:** CLI-Komponenten (Ink) als Adapter-Layer, ohne Business-Logik
- **Tier-3 Direction:** Electron bleibt separater Adapter auf denselben Use-Cases

### Infrastructure & Deployment

- **Language/Runtime:** TypeScript (verifiziert: 5.9.3)
- **Key Libraries (version-verified):**
  - nanostores: 1.1.1
  - ink: 6.8.0
  - commander: 14.0.3
  - openai: 6.25.0
  - vite: 7.3.1
  - @biomejs/biome: 2.4.4
- **Build Strategy:** Vite Build-Pipeline für wiederverwendbaren Core + Typecheck als separates Gate
- **Code Quality:** Biome als einheitlicher Formatter/Linter
- **Quality Gates:** `biome check`, Typecheck, Build, Tests
- **Monitoring/Diagnostics:** strukturierte Logs + Diagnose-Command als First-Class Capability

### Decision Impact Analysis

**Implementation Sequence:**

1. Core-Contracts und Use-Case-Grenzen aus `whisper-poc` extrahieren
2. JSONL + Metadaten-Persistenzmodul finalisieren
3. Error-/Output-Contracts für CLI standardisieren
4. Ink/Commander-Adapter auf den extrahierten Core umstellen
5. Diagnose- und Security-Adapter (Keychain/Secrets) härten
6. Tier-3-Electron später auf dieselben Ports setzen

**Cross-Component Dependencies:**

- JSONL-Schema beeinflusst CLI-Output, History und Diagnose
- Error-Code-Standard beeinflusst alle Commands und Teststrategie
- Nanostore-State beeinflusst Ink-Interaktionen und spätere Adapter-Parität
- Port/Adapter-Schnittstellen sind Voraussetzung für Tier-3-Electron-Reuse

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
10 Bereiche, in denen AI-Agents ohne klare Regeln divergierende Entscheidungen treffen könnten (Naming, Struktur, Formate, Events/State, Prozesse).

### Naming Patterns

**Code Naming Conventions:**

- camelCase für Variablen und Funktionen
- PascalCase für Typen/Klassen/Ink-Komponenten
- kebab-case für Dateinamen

**Command & Event Naming:**

- CLI-Commands im Verb-Objekt-Stil (z. B. `record start`, `record stop`, `transcribe run`)
- Events als `domain.action` im kebab-case (z. B. `recording.started`, `transcription.completed`)

**Data Naming Conventions:**

- JSONL-Felder in snake_case
- TypeScript-Domainmodelle in camelCase
- Fehlercodes in UPPER_SNAKE_CASE

### Structure Patterns

**Project Organization:**

- `packages/core` für Domain, Use-Cases, Ports, Contracts, Utils
- `packages/cli` für Commander/Ink Adapter
- `apps/desktop` für Tier 3 (später)

**Shared-in-Core Rule:**

- Kein separates `shared` Paket
- Alles mehrfach Genutzte wandert in `core/contracts` oder `core/utils`
- `core` bleibt adapter-agnostisch (keine Ink-/Commander-/Electron-Abhängigkeiten)

**Testing Structure:**

- Core-Unit-Tests co-located
- Adapter-Integrationstests je Adapter-Layer

### Format Patterns

**Persistence Format (JSONL + Metadata):**

- JSONL als append-only Log
- Pflichtfelder: `schema_version`, `id`, `created_at`, `source`, `profile`, `status`, `duration_ms`, `text`, `metadata`
- Datumswerte persistiert als ISO-8601 UTC-Strings

**CLI IO Contract:**

- `stdout` nur Ergebnisdaten
- `stderr` nur Fehler und Diagnose
- Optionaler JSON-Output-Modus mit stabiler Struktur

### Communication Patterns

**Port/Adapter Discipline:**

- Kommunikation ausschließlich über Core-Ports
- Keine direkten Adapter-zu-Adapter-Aufrufe

**State Management Patterns (Nanostores):**

- State-Änderungen nur über definierte Actions
- Keine direkte Mutation von Store-Inhalten
- Trennung von Read- und Write-Modellen

### Process Patterns

**Error Handling Patterns:**

- Alle Fehler werden auf eine DomainError-Hierarchie gemappt
- Jede Fehlerklasse mappt auf stabilen Exit-Code
- Keine Secret-Daten in Fehlermeldungen

**Validation & Retry Patterns:**

- Eingaben/Konfiguration mit Schema-Validation vor Use-Case-Start
- Retries nur für transiente IO/API-Fehler mit begrenztem Backoff

### Enforcement Guidelines

**All AI Agents MUST:**

- Naming-, Struktur- und IO-Konventionen strikt einhalten
- Port/Adapter-Grenzen respektieren
- Schema-Änderungen mit `schema_version` und Migrationsregel dokumentieren

**Pattern Enforcement:**

- Pflicht-Gates: `biome check`, Typecheck, Build, Tests
- Pattern-Verletzungen als Architekturabweichung im PR dokumentieren
- Pattern-Änderungen nur über Update dieses Architektur-Dokuments

### Pattern Examples

**Good Examples:**

- `recording.started`, `transcription.completed`
- JSONL mit snake_case und stabiler `schema_version`
- Business-Logik ausschließlich im Core

**Anti-Patterns:**

- Business-Logik in Ink-UI-Komponenten
- Uneinheitliche Feldnamen in Persistenzdateien
- Neue Exit-Codes ohne zentrale Definition

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
agent-flow/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── biome.json
├── .gitignore
├── .env.example
├── README.md
├── docs/
│   └── architecture/
├── .github/
│   └── workflows/
│       └── ci.yml
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── entities/
│   │       │   ├── value-objects/
│   │       │   └── errors/
│   │       ├── contracts/
│   │       │   ├── schemas/
│   │       │   ├── dto/
│   │       │   └── exit-codes.ts
│   │       ├── ports/
│   │       │   ├── audio.port.ts
│   │       │   ├── transcription.port.ts
│   │       │   ├── secret-store.port.ts
│   │       │   ├── history-store.port.ts
│   │       │   └── clipboard.port.ts
│   │       ├── use-cases/
│   │       │   ├── record/
│   │       │   ├── transcribe/
│   │       │   ├── output/
│   │       │   └── diagnose/
│   │       ├── state/
│   │       │   └── stores/
│   │       ├── persistence/
│   │       │   ├── jsonl/
│   │       │   └── metadata/
│   │       ├── utils/
│   │       └── index.ts
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── main.ts
│           ├── commands/
│           │   ├── record/
│           │   ├── transcribe/
│           │   ├── profile/
│           │   ├── history/
│           │   └── diagnose/
│           ├── ui/
│           │   ├── ink/
│           │   │   ├── screens/
│           │   │   └── components/
│           │   └── formatters/
│           ├── adapters/
│           │   ├── openai/
│           │   ├── ffmpeg/
│           │   ├── filesystem/
│           │   ├── keychain/
│           │   └── clipboard/
│           ├── config/
│           └── index.ts
├── apps/
│   └── desktop/
│       ├── package.json
│       └── src/
├── tests/
│   ├── core/
│   │   ├── unit/
│   │   └── integration/
│   ├── cli/
│   │   ├── integration/
│   │   └── e2e/
│   └── fixtures/
└── data/
  ├── history/
  │   └── transcripts.jsonl
  └── metadata/
    └── index.json
```

### Architectural Boundaries

**API Boundaries:**

- Keine REST-Endpunkte im Produktkern
- Externe Kommunikation nur zu Drittanbieter-APIs (OpenAI) über Adapter

**Component Boundaries:**

- `packages/core` enthält keine CLI-/UI-Abhängigkeiten
- `packages/cli` konsumiert ausschließlich Core-Ports/Use-Cases
- `apps/desktop` (Tier 3) konsumiert später denselben Core

**Service Boundaries:**

- Audio, Transcription, Secret Store, History Store, Clipboard jeweils als austauschbare Adapter
- Keine Adapter-zu-Adapter-Kopplung

**Data Boundaries:**

- Persistenzstandard: JSONL + Metadaten
- Schema-kontrollierte Record-Struktur mit `schema_version`
- Core definiert Datenkontrakte, Adapter implementieren IO

### Requirements to Structure Mapping

**FR Mapping:**

- FR1-FR3 (Core/Adapter-Trennung) → `packages/core` + `packages/cli/adapters`
- FR4-FR12 (CLI) → `packages/cli/commands`, `packages/cli/ui/ink`
- FR13-FR16 (Audio/Transkription/Output) → `packages/core/use-cases/*` + `packages/cli/adapters/*`
- FR17-FR19 (Security/Config/Diagnose) → `secret-store.port`, `config`, `diagnose`
- FR20-FR24 (Tier 2/3 Erweiterungen) → erweiterbare Adapter in `packages/cli` und später `apps/desktop`

**Cross-Cutting Concerns:**

- Error/Exit-Codes → `packages/core/contracts/exit-codes.ts`
- Validation → `packages/core/contracts/schemas`
- State-Parität CLI/App → `packages/core/state/stores`

### Integration Points

**Internal Communication:**

- CLI Commands → Core Use-Cases → Port Interfaces → konkrete Adapter

**External Integrations:**

- OpenAI API über `packages/cli/adapters/openai`
- FFmpeg über `packages/cli/adapters/ffmpeg`
- OS-Keychain/safeStorage über `packages/cli/adapters/keychain`

**Data Flow:**

- Aufnahme → Core-Use-Case → Transkription → Output (stdout/clipboard) + Persistenz (JSONL/Metadata)

### File Organization Patterns

**Configuration Files:**

- Root: Workspace/Build/Quality (`pnpm-workspace`, `tsconfig.base`, `biome`)
- Paket-spezifisch: je `package.json` + `tsconfig.json`

**Source Organization:**

- Feature-orientiert in Use-Cases und Commands
- Gemeinsame Contracts/Utils nur in `core` (kein separates `shared`)

**Test Organization:**

- Core Unit/Integration getrennt
- CLI Integration/E2E separat

**Asset Organization:**

- Runtime-Daten in `data/` (JSONL + Metadaten)
- Kein Asset-Mix in Source-Verzeichnissen

### Development Workflow Integration

**Development Server Structure:**

- CLI-Entwicklung über `packages/cli`
- Core separat build-/testbar

**Build Process Structure:**

- Vite-basierter Build pro Paket, Typecheck separat
- Biome als zentraler Formatter/Linter

**Deployment Structure:**

- CLI als primäres Artefakt (Tier 1/2)
- Desktop-App-Struktur vorbereitet, aber Tier-3-spezifisch getrennt

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Die Entscheidungen sind konsistent: CLI/Core-first, kein REST-Layer, JSONL+Metadaten, Port/Adapter-Trennung, Ink/Nanostores, Vite/Biome. Es gibt keine offensichtlichen Widersprüche zwischen Technologie- und Strukturentscheidungen.

**Pattern Consistency:**
Die Patterns stützen die Architektur: Namenskonventionen, IO-Verträge (`stdout`/`stderr`), Exit-Code-Regeln, Schema-Versionierung und Shared-in-Core-Regel sind aufeinander abgestimmt.

**Structure Alignment:**
Die Projektstruktur unterstützt die Entscheidungen vollständig. Core bleibt adapter-agnostisch, CLI ist sauber als Adapter-Layer definiert, Desktop ist als Tier-3-Adapter vorbereitet.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
Für den aktuellen FR-basierten Stand sind alle Kernbereiche abgedeckt (Core, CLI, Audio/Transkription, Security/Config, Diagnostics, Erweiterbarkeit).

**Functional Requirements Coverage:**
FR1-FR24 sind architektonisch adressiert:

- FR1-FR3 durch klare Core/Adapter-Separation
- FR4-FR12 durch CLI-Struktur und Ink-Adapter
- FR13-FR16 durch Audio/Transkriptions-Use-Cases + Output-Verträge
- FR17-FR19 durch Secret-Store/Config/Diagnose
- FR20-FR24 durch erweiterbare Adapterstruktur und Tier-3-Vorbereitung

**Non-Functional Requirements Coverage:**
NFRs sind abgedeckt durch deterministische CLI-IO, stabile Exit-Codes, Security-Patterns, Quality-Gates und strukturierte Diagnostik/Logs.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Kritische Entscheidungen sind dokumentiert, inklusive verifizierter Tooling-Versionen und klarer Defer-Entscheidungen für Post-MVP.

**Structure Completeness:**
Die Verzeichnisstruktur ist konkret und implementierbar, inklusive Tests, Datenablage und Integrationspunkten.

**Pattern Completeness:**
Konfliktpunkte zwischen AI-Agents sind adressiert (Naming, Struktur, Formate, Kommunikation, Prozesse).

### Gap Analysis Results

**Critical Gaps:**
Keine blockierenden Lücken gefunden.

**Important Gaps:**

- Feingranulare JSONL-Schema-Spezifikation pro Record-Typ kann später noch präzisiert werden
- Exit-Code-Katalog als zentrale Tabelle könnte für Implementierungsteams zusätzlich hilfreich sein

**Nice-to-Have Gaps:**

- Beispiel-ADR-Template für künftige Architekturänderungen
- Kurzer Do/Don't-Guide für Adapter-Implementierungen

### Validation Issues Addressed

- Shared-vs-Core-Frage geklärt: kein separates shared-Paket; gemeinsame Artefakte liegen in core/contracts bzw. core/utils
- Build/Formatter-Präferenz eingearbeitet: Vite + Biome

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Klare Core/Adapter-Grenzen
- Hohe Konsistenz für Multi-Agent-Implementierung
- Pragmatische MVP-Fokussierung (CLI/Core-first)
- Saubere Tier-3-Entkopplung für Desktop

**Areas for Future Enhancement:**

- Erweiterte Schema-Migrationsregeln bei wachsender Historie
- Optionaler Architektur-Health-Check in CI

### Implementation Handoff

**AI Agent Guidelines:**

- Architectural decisions strikt befolgen
- Patterns und IO-Konventionen konsistent anwenden
- Projektgrenzen respektieren (kein Business-Code in Adaptern)
- Bei Unsicherheit Architektur-Dokument als Single Source of Truth nutzen

**First Implementation Priority:**
Core-Contracts und Use-Case-Grenzen aus whisper-poc extrahieren und stabilisieren.
