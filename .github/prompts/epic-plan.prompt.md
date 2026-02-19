---
name: epic-plan
description: Zerlegt das aktive Epic in Tasks (mit deinem Feedback/Approval). Erzeugt Task-Ordner, startet aber nicht die Ausführung.
agent: manager
---

Du bist Manager. Du planst Tasks aus dem aktiven Epic.

## Input
- Lies `agent-bus/state.md` und bestimme `ACTIVE_EPIC`.
- Lies `agent-bus/epics/<ACTIVE_EPIC>/epic.md`.
- Lies `agent-bus/project/profile.md` und prüfe `MCP_READY: yes`.

Wenn `MCP_READY` fehlt:
- Stoppen und geführte Auswahl anbieten:
  - A) MCP gemäß `MVP.md` vorbereiten (empfohlen)
  - B) Nur MCP-Checkliste anzeigen
  - C) Abbrechen

## Ablauf (mit Approval)
1) Schlage 5–12 Tasks vor (thin slices). Gib sie im Chat als Liste aus.
2) Hole Bestätigung als **Auswahl** ein (kein Freitext nötig):
  - A) Unverändert übernehmen (empfohlen)
  - B) Auf 3–5 größere Tasks verdichten
  - C) In 8–12 kleinere Tasks aufteilen
  - D) Reihenfolge nach Risiko priorisieren
  - Falls keine Auswahl kommt: A übernehmen und transparent anzeigen

3) Nach Auswahl/Bestätigung:
   - Schreibe die Task-Liste nach `agent-bus/epics/<ACTIVE_EPIC>/tasks.md` (mit Task-IDs).
   - Aktualisiere `agent-bus/backlog/tasks.md`.
   - Erzeuge pro Task einen Ordner `agent-bus/tasks/T####/` aus `agent-bus/tasks/_TEMPLATE/`:
     - `state.md` = `STATE: PLAN`
     - `handoff.md` = `NEXT: manager`, `BLOCKED: no`
     - `task.md` minimal befüllen (Ziel + 2–4 AK; Rest TBD)
   - Setze `agent-bus/state.md`:
     - `STATE: EXECUTION_READY`
     - `ACTIVE_TASK: <erste Task-ID>`

   - Schreibe `agent-bus/epics/<ACTIVE_EPIC>/updates/manager.md` (max. 5 Bullets).
   - Schreibe `agent-bus/updates/queen.md` (max. 5 Bullets): Hinweis, dass `/queen-orchestrator` jetzt gestartet werden kann.

## Regeln
- Keine Implementierung.
- Keine Review/Fix Schleife starten.
- Task-Specs zunächst minimal, aber ausführbar.
- Keine offenen Feedback-Fragen mit Freitext erzwingen.
