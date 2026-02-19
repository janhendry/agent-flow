# Agent-Workflow – How to start

## Kurzstart

1. MCP gemäß [MVP.md](MVP.md) vorbereiten (aktive Doku, Endpunkte `/docs/toc`, `/docs/chapter/{index}`, `/docs/search`, Such-→Kapitel-Ablauf).
2. Im Chat den Prompt **/bootstrap** starten.
3. Danach **/epic-create** und die vorgeschlagenen Optionen auswählen (statt Freitext).
4. **/epic-plan** ausführen und eine der vorgeschlagenen Plan-Optionen auswählen.
5. **/queen-orchestrator** starten (führt Tasks über Subagents aus).

## Grundregeln

- Kommunikation und Status-Updates passieren ausschließlich in agent-bus/\*\* (Markdown).
- Updates: max. 5 Bulletpoints pro Datei.
- Interaktive Schritte laufen geführt über Optionen (A/B/C) mit einer empfohlenen Standardoption.
- Globaler Status liegt in agent-bus/state.md.
- Queen orchestriert nur; Produkt-Code wird von Subagents geändert.

## Erwartete Struktur nach /bootstrap

- agent-bus/state.md, agent-bus/handoff.md
- agent-bus/project/profile.md
- agent-bus/backlog/epics.md, tasks.md, decisions.md
- agent-bus/epics/\_TEMPLATE/, agent-bus/tasks/\_TEMPLATE/

## Wenn etwas fehlt

- MCP nicht vorbereitet laut MVP → zuerst MCP vorbereiten, dann `/bootstrap`
- Kein agent-bus/ vorhanden → /bootstrap
- Kein Epic aktiv → /epic-create
- Keine Tasks vorhanden → /epic-plan
