# Copilot Instructions (Repo)

Dieses Repo nutzt einen file-basierten Agent-Workflow über `agent-bus/`.

## Kommunikationsregeln
- Kommunikation ausschließlich über `agent-bus/**` (Markdown).
- Updates: max. 5 Bulletpoints pro Datei, keine Prosa.
- Globale Phase steht in `agent-bus/state.md`.

## Execution-Regeln
- Pro Task: `agent-bus/tasks/T####/state.md` + `handoff.md` steuern den Ablauf.
- Review-Findings als Checkboxliste in `review.md`.
- Kein Commit/Push solange offene Findings existieren.

## Bootstrap/Epics first
- Keine Tasks am Anfang.
- Nutze `/bootstrap` → `/epic-create` → `/epic-plan` → `/queen-orchestrator`.


## Subagents
- Queen delegiert Rollen optional via `#runSubagent`.
- Wenn das Tool nicht verfügbar ist, nutze die Rollen-Prompts (/manager, /implementer, ...).
