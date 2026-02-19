---
name: git-runner
description: Run checks, commit, push (GIT).
agent: git-runner
argument-hint: TASK-ID (optional, default is ACTIVE_TASK)
---

Arbeite am aktuellen TASK über `agent-bus/`.
- Bestimme TASK aus `agent-bus/state.md` (`ACTIVE_TASK`) oder dem Argument.
- Folge der Rolle aus deinem Agent-Profil.
- Schreibe dein Update nach `agent-bus/tasks/<TASK>/updates/git-runner.md` (max. 5 Bullets).
- Aktualisiere die Task-Dateien, die in deinem Profil erlaubt sind.
