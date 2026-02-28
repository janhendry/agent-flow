# Sprint Change Proposal — agent-flow 2.0 (Core + CLI First)

**Datum:** 2026-02-24  
**Workflow:** Correct Course (CC)  
**Status:** Genehmigt zur Umsetzung (Freigabe: yes)

## 1) Issue Summary

### Problem Statement

Das aktuelle Vorhaben ist in Planung und Sequenz primär UI/Electron-first aufgebaut. Das Team möchte strategisch auf ein 2.0-Modell pivotieren: zuerst einen stabilen, wiederverwendbaren Core mit zwei CLI-Interfaces liefern (Unix-Style + interaktives Menü), und die Electron-App-UI erst in einer späteren Phase umsetzen.

### Discovery Context

- Trigger ist **kein einzelner Story-Defekt**, sondern ein strategischer Richtungswechsel.
- Ziel ist schnellere Validierung, Testbarkeit und Simulierbarkeit über CLI, bevor UI-Aufwand gebunden wird.

### Evidenz

- Der aktuelle Plan priorisiert UI-nahe Stories früh.
- Für den gewünschten Lern- und Delivery-Loop ist ein Unix-CLI-Pattern mit klaren Ein-/Ausgaben und stabilen Exit-Codes deutlich schneller prüfbar.
- Ein interaktives CLI-Menü wird zusätzlich gewünscht, soll aber auf demselben Core aufsetzen.

## 2) Impact Analysis

### Epic Impact

- Bestehende Epic-Reihenfolge ist für MVP auf UI-First optimiert und passt nicht mehr zur neuen Zielreihenfolge.
- Für 2.0 werden Core/CLI-Epics nach vorne gezogen; UI-Epics werden in spätere Phase verschoben.

### Story Impact

- Nächste UI-nahe Storys werden für MVP 2.0 depriorisiert.
- Neue/umpriorisierte Storys für Core + Unix-CLI + Interactive-CLI werden zum primären Sprint-Pfad.

### Artifact Conflicts

- **PRD:** MVP-Definition kollidiert mit neuer CLI-first-Strategie.
- **Architecture:** Primäre Laufzeit-/Entry-Strategie muss auf Core + zwei CLI-Adapter umgestellt werden.
- **Epics/Stories:** Reihenfolge, Schwerpunkt und Akzeptanzkriterien müssen angepasst werden.
- **UX:** UI-Spezifikation bleibt wertvoll, ist aber für MVP 2.0 nicht mehr kritischer Pfad.

### Technical Impact

- Einführung klarer Ports/Adapter-Grenzen im Core.
- Definition eines stabilen CLI-Contracts (Parameter, stdin/stdout, stderr, Exit-Codes).
- Vermeidung von Logik-Duplikation zwischen Unix-CLI und Interactive-CLI durch gemeinsame Use-Cases.

## 3) Recommended Approach

### Gewählter Pfad

**Hybrid aus Option 3 (MVP Review) + Option 1 (Direct Adjustment)**

### Begründung

- MVP wird gezielt auf Core + CLI reduziert, um den frühesten belastbaren Nutzwert zu liefern.
- Bereits bestehende Planungsartefakte werden nicht verworfen, sondern kontrolliert auf 2.0 umgestellt.
- Direkte Anpassungen in PRD/Architektur/Epics ermöglichen eine sofortige Re-Planung ohne Neuanfang.

### Aufwand, Risiko, Timeline

- **Aufwand:** Mittel bis Hoch (Dokumente + Sprint-Rebaselining)
- **Risiko:** Mittel (Scope-Schnitt klar, aber Repriorisierung betrifft mehrere Artefakte)
- **Timeline-Impact:** Kurzfristig 1 Planungsiteration Mehraufwand, danach voraussichtlich schnellerer Delivery-Loop

## 4) Detailed Change Proposals

### A) PRD-Änderung

**Artifact:** `_bmad-output/planning-artifacts/prd.md`  
**Section:** Product Scope / MVP

**OLD:**

- MVP enthält System Tray, HUD, Snackbar, Settings, Onboarding als zentralen Erstlieferumfang.

**NEW:**

- MVP 2.0 enthält primär:
  1. Core-Service (Domain + Application Use-Cases)
  2. Unix-Style CLI (non-interactive)
  3. Interactive CLI (menügeführt)
- Electron-UI wird als **spätere Interface-Phase** explizit deferred.
- CLI-Qualitätskriterien: stabile Parameter, klare stdout/stderr-Trennung, reproduzierbare Ausgaben, definierte Exit-Codes.

**Rationale:**
Schnellere Validierung und Testbarkeit; geringerer Anfangsaufwand bei maximaler Wiederverwendbarkeit.

---

### B) Architektur-Änderung

**Artifact:** `_bmad-output/planning-artifacts/architecture.md`  
**Section:** Core Architecture / Interface Strategy

**OLD:**

- Electron-nahe App-Struktur als primärer Entry-Point mit frühen UI-Workflows.

**NEW:**

- Layered Architecture mit klaren Grenzen:
  - **Core Layer:** Domain + Application (UI-agnostisch)
  - **Adapter Layer 1:** Unix-CLI Adapter (non-interactive)
  - **Adapter Layer 2:** Interactive-CLI Adapter (TUI-Menü)
  - **Adapter Layer 3:** Electron UI Adapter (später)
- Beide CLI-Adapter verwenden dieselben Use-Cases und Services (kein Fork der Business-Logik).

**Rationale:**
Entkopplung erhöht Wartbarkeit, Testbarkeit und minimiert Umbauaufwand für spätere UI.

---

### C) Epics/Stories-Änderung

**Artifact:** `_bmad-output/planning-artifacts/epics.md`  
**Section:** Epic List / Story Sequencing

**OLD:**

- Frühere Priorität auf UI-nahe Epics (Tray/HUD/Onboarding).

**NEW (2.0-Reihenfolge):**

1. **Epic A:** Core Domain/Application Foundation
2. **Epic B:** Unix-Style CLI Interface
3. **Epic C:** Interactive CLI Interface
4. **Epic D:** Electron UI Interface (deferred)

**Rationale:**
Direkte Nutzbarkeit, frühe Automatisierbarkeit und klare technische Basis für alle späteren Interfaces.

## 5) Implementation Handoff

### Scope-Klassifikation

**Major** — fundamentale Replanung der MVP-Prioritäten und Artefaktabstimmung erforderlich.

### Handoff-Empfänger

- **Product Manager / Architect**
- **Scrum Master**
- **Developer Agent**

### Verantwortlichkeiten

- **PM:** PRD v2 freigeben (CLI-first Scope, UI deferred)
- **Architect:** Zielarchitektur v2 mit Core + Dual-CLI-Adaptern präzisieren
- **SM:** Sprint-Backlog rebaselinen, Story-Reihenfolge auf 2.0 umstellen
- **Dev:** Umsetzung entlang neuer Story-Sequenz starten (Core → Unix-CLI → Interactive-CLI)

### Success Criteria

- PRD/Architektur/Epics sind auf 2.0 konsistent.
- Sprint-Status priorisiert Core + CLI Storys.
- Erste ausführbare Unix-CLI-Commands mit stabilen Exit-Codes vorhanden.
- Interactive CLI nutzt denselben Core ohne Logik-Duplikate.

---

## Nächste BMAD-Route

1. `/bmad-bmm-create-prd` (v2 Scope fixieren)
2. `/bmad-bmm-create-architecture` (Layer + Adapter finalisieren)
3. `/bmad-bmm-create-epics-and-stories` (2.0 Stories erzeugen)
4. `/bmad-bmm-sprint-planning` (Sprint auf v2 umstellen)

---

## Approval & Handoff Log

- **User Approval:** yes (2026-02-24)
- **Scope Classification:** Major
- **Handoff Completed To:** Product Manager / Architect / Scrum Master / Developer Agent
- **Operational Follow-up:** `_bmad-output/implementation-artifacts/sprint-status.yaml` auf 2.0 Core+CLI-First-Reihenfolge aktualisiert
