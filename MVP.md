# MVP-Konzept: Copilot-Skill → lokale Developer-Doku (TOC + Kapitel-Index + Suche)

## Ziel

Copilot Agent soll **ohne Websearch** interne **Entwicklerdoku** (API, Customizer, Patterns) nutzen können:

- schnell relevante Stellen finden,
- gezielt Kapitel nachladen,
- beim Implementieren den Kontext aufbauen.

## Kritischer Use Case

**„Ich implementiere Feature X und brauche die passende Doku-Stelle sofort.“**

1. Agent sucht nach der Frage.
2. Agent lädt passende Kapitel nach.
3. Agent nutzt den Text als Grundlage für die Implementierung und verweist auf den Kapitelindex.

## Grundprinzip

- Doku wird als **ein Dokument** betrachtet.
- Navigation erfolgt über einen **Kapitelindex**: `1`, `1.1`, `1.1.3`.
- TOC-Zeilen sind **Text** im Format: `{index}_{Überschrift}`.
- Nachladen erfolgt **nur** per Index (keine Section-IDs, keine Pfad-/Metadatenobjekte im Body).

## Begriffe (präzisiert)

- **Deterministisch**: Bei gleicher aktiver Doku und gleicher Anfrage ist die Antwort strukturell gleich (gleiche Kapitelindizes/Reihenfolge im TOC, gleiche Kapitelauflösung).
- **root** (`/docs/toc`): Startknoten im Indexbaum; Beispiel `root=2` liefert nur den Unterbaum ab Kapitel `2`.
- **Index**: Kapitel-Tree-Struktur und Navigationsschlüssel (`1`, `1.2`, `1.2.1`).

---

## UI-Scope (Streamlit, MVP)

- Upload von Markdown-Dateien zur Erstellung eines **Dokuset**.
- Beim Upload wird Embedding/Index direkt erzeugt.
- **Nur bei erfolgreicher Verarbeitung** wird das Dokuset angelegt und im Selector sichtbar.
- Upload/Index **aktiviert keine Doku automatisch**.
- Aktive Doku wird ausschließlich über einen UI-Selector gesetzt.
- UI testet **nur einzelne Endpunkte** (`/docs/toc`, `/docs/chapter/{index}`, `/docs/search`), nicht den Agent-Flow.
- Response-Ausgaben werden im UI **immer als Raw-Output** angezeigt.
- Betriebsmodus: **Single-User**.

---

## MVP-Endpunkte

### 1) TOC abrufen

`GET /docs/toc`

**Query (optional)**

- `max_level`: maximale Tiefe (z. B. `2..6`)
- `root`: Start ab einem Index (z. B. `2` oder `1.1`)

**Response**

- Body: **Text/Markdown** (TOC)
- Format je Zeile: `{index}_{title}`  
  Beispiel:

```md
1* API
1.1* Authentication
1.1.1* Tokens
1.2* Errors
2* Customizer
2.1* Rule Pipeline
```

### 2) Kapitel nachladen

`GET /docs/chapter/{index}`

**Query (optional)**

- `depth`:
  - `0`: nur dieses Kapitel
  - `1`: Kapitel + direkte Unterkapitel
  - `>1`: Kapitel + Unterbaum bis zur Tiefe

**Response**

- Body: **Text/Markdown** (Kapitel-Ausschnitt)

**Fehlerfall (MVP)**

- Ungültiger `index` → **Not Found** (präferiert `404`) mit kurzem Hinweis, dass der Kapitelindex nicht existiert.

### 3) In Doku suchen

`POST /docs/search`

**Request (JSON)**

```json
{ "query": "token refresh", "limit": 5, "cursor": null }
```

**Response (JSON)**

```json
{
  "next_cursor": "opaque",
  "hits": [
    {
      "index": "1.1.2",
      "title": "Token Refresh",
      "score": 0.84,
      "snippet": "..."
    }
  ]
}
```

**Scope-Regel (MVP)**

- Suche läuft ausschließlich gegen die **aktive Doku**.

---

## Copilot-Skill-Regeln (MVP)

- **Immer zuerst suchen**: `/docs/search` (initial `limit=5`).
- **Nur gezielt nachladen**: passende Kapitel via `/docs/chapter/{index}` (typisch `depth=0`).
- **Nur bei Bedarf**: weitere Treffer über `cursor`.
- **Referenzieren**: Antworten/Implementierungen nennen den Kapitelindex (z. B. „siehe 1.1.2“).
- **Keine Halluzination**: bei `hits=[]` → „nicht in der Doku gefunden“ + ggf. Rückfrage.

---

## MVP-Abläufe

### A) Frage → Antwort/Implementierung

1. `POST /docs/search`
2. `GET /docs/chapter/{bestIndex}?depth=0`
3. (optional) weitere passende Kapitel via `GET /docs/chapter/{index}?depth=0`
4. Ergebnis nutzen (Implementierung / Erklärung) + Index-Verweis

### B) Navigation (TUI/Agent)

1. `GET /docs/toc?max_level=3`
2. Nutzer/Agent wählt Index
3. `GET /docs/chapter/{index}?depth=1`

---

## Akzeptanzkriterien (DoD)

- TOC ist **deterministisch** und **parsebar** (`{index}_{title}`).
- Kapitel können zuverlässig per `index` nachgeladen werden (`/docs/chapter/{index}`).
- Suche liefert Treffer mit `index` + kurzem `snippet` + `score` und ist paged (`cursor`).
- Skill lädt Kapitel gezielt auf Basis der Suchtreffer nach.

## DoD-Erweiterung v1 (Härtung)

- Ein Dokuset wird nur angelegt, wenn Upload + Embedding/Index vollständig erfolgreich sind.
- Neu erzeugte Dokusets werden nicht automatisch aktiv; aktive Doku wird nur über den Selector gesetzt.
- Endpunkte arbeiten strikt gegen die aktive Doku; Suchanfragen berücksichtigen keine andere Doku.
- `GET /docs/chapter/{index}` liefert bei ungültigem Index Not Found mit kurzer klarer Fehlermeldung.
- UI zeigt pro Endpoint-Test mindestens: **Request + Statuscode + Response-Body (immer raw)** (Option A).
- UI enthält ausschließlich Endpoint-Tests, keine Agent-Flow-Orchestrierung.
- System ist explizit auf Single-User-Betrieb begrenzt.

## Priorisierung (Solution Matrix v1)

**Must (MVP v1):**

- Dokuset nur bei erfolgreichem Upload + Embedding + Index anlegen.
- Aktive Doku nur über Selector setzen (kein Auto-Activate).
- Suche strikt nur gegen aktive Doku ausführen.
- Not-Found mit kurzem Hinweis bei ungültigem Kapitelindex liefern.
- Response immer als Raw-Output anzeigen.
- Pro Endpoint eigene Testkarte verwenden.
- Strukturierte Parameterfelder einsetzen.
- Ergebnis je Testkarte mit Request, Statuscode und Raw-Response anzeigen.

**Should (MVP v1.1 bei Zeitknappheit verschiebbar):**

- Request-Preview direkt vor Execute in der Testkarte.
- Search-Hits mit Direktaktion zum Kapitel-Nachladen.
