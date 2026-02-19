---
name: bootstrap
description: Initialisiert nur die Bus-Struktur (ohne Tasks). Setzt Zustand auf EPIC_INTAKE.
agent: queen
---

Du bist Queen. Ziel: Workspace in einen startfähigen Zustand bringen, **ohne** Tasks zu erzeugen.

## Schritte
1) Stelle sicher, dass folgende Dateien/Ordner existieren:
   - `agent-bus/state.md`, `agent-bus/handoff.md`
   - `agent-bus/project/profile.md`
   - `agent-bus/backlog/epics.md`, `agent-bus/backlog/tasks.md`, `agent-bus/backlog/decisions.md`
   - `agent-bus/epics/_TEMPLATE/` und `agent-bus/tasks/_TEMPLATE/`

2) Setze:
   - `agent-bus/state.md` → `STATE: EPIC_INTAKE`, `ACTIVE_EPIC: none`, `ACTIVE_TASK: none`
   - `agent-bus/handoff.md` → `NEXT: queen`, `BLOCKED: no`

3) Schreibe `agent-bus/updates/queen.md` (max. 5 Bullets):
   - Was initialisiert wurde
   - Was als nächstes zu tun ist (`/epic-create`)

## Regeln
- Kein Epic anlegen.
- Keine Tasks anlegen.
- Keine Implementierung.
