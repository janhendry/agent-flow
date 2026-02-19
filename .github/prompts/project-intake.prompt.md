---
name: project-intake
description: Bootstrap the agent workflow from an existing project idea (e.g., FEATURE.md). Creates initial backlog + T0001 without starting execution.
agent: queen
---

Du bist in der **Intake/Bootstrap-Phase**. Ziel: Den Workspace in einen Zustand versetzen, in dem der Agent-Workflow sauber starten kann.
Du darfst in dieser Phase Dateien schreiben/ändern, aber du sollst **keinen Implementierungs-Loop starten** (keine Handoffs ausführen).

## Input
- Lies `FEATURE.md` im Workspace (Projektidee/Feature-Doku).
- Lies zusätzlich `agent-bus/project/profile.md` (Guardrails).

## Output (erforderlich)
1) Fülle `agent-bus/backlog/backlog.md`:
   - 3–6 Epics
   - darunter 6–12 Tasks (T0001..T0012), jeweils 1 Zeile
   - Markiere T0001 als **Starttask** (muss ein “thin vertical slice” oder “foundation slice” sein).

2) Lege `agent-bus/tasks/T0001/` an (kopiere Template falls nötig) und fülle:
   - `task.md`: Scope, Non-Goals, Akzeptanzkriterien (Checkboxen), betroffene Files/Module (falls unbekannt: “TBD”)
   - `state.md`: STATE=PLAN
   - `handoff.md`: NEXT=manager (nicht ausführen)

3) Schreibe `agent-bus/tasks/T0001/updates/queen.md` (max. 5 Bullets):
   - Was initialisiert wurde
   - Warum T0001 gewählt wurde
   - Was als nächstes zu tun ist

## Regeln
- Kein Code implementieren.
- Keine lange Prosa: Backlog/Updates maximal Bullet-Style.
- Falls eine Annahme unsicher ist: markiere sie als `TBD` statt zu raten.
