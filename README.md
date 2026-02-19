# Agent-Workflow – How to start

## Kurzstart

1. Im Chat den Prompt **/bootstrap** starten.
2. Danach **/epic-create** und die Fragen beantworten (Epic wird angelegt).
3. **/epic-plan** ausführen und die Task-Liste bestätigen.
4. **/queen-orchestrator** starten (führt Tasks über Subagents aus).

## Grundregeln

- Kommunikation und Status-Updates passieren ausschließlich in agent-bus/\*\* (Markdown).
- Updates: max. 5 Bulletpoints pro Datei.
- Globaler Status liegt in agent-bus/state.md.
- Queen orchestriert nur; Produkt-Code wird von Subagents geändert.

## Erwartete Struktur nach /bootstrap

- agent-bus/state.md, agent-bus/handoff.md
- agent-bus/project/profile.md
- agent-bus/backlog/epics.md, tasks.md, decisions.md
- agent-bus/epics/\_TEMPLATE/, agent-bus/tasks/\_TEMPLATE/

## Wenn etwas fehlt

- Kein agent-bus/ vorhanden → /bootstrap
- Kein Epic aktiv → /epic-create
- Keine Tasks vorhanden → /epic-plan
