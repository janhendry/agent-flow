# whisper-poc

CLI-Tool zum Aufnehmen von Audio (Mikrofon, System-Audio oder beides) und Transkribieren mit der OpenAI Whisper API.

---

## Voraussetzungen

### macOS

```bash
# ffmpeg (Pflicht)
brew install ffmpeg

# BlackHole 2ch (nur für System-Audio-Modi)
# → https://existential.audio/blackhole/
# Nach Installation: macOS Systemeinstellungen → Ton → BlackHole 2ch als Ausgabegerät setzen
```

### Windows

> Für **nur Mikrofon** (`mode: mic`) brauchst du **kein** VB-Cable.
> VB-Cable/Stereo Mix ist nur nötig für `system` oder `both`.
> Aktuell nutzt dieses CLI unter Windows `dshow` (nicht `wasapi`-loopback).

```powershell
# ffmpeg (Pflicht)
winget install Gyan.FFmpeg
# oder manuell: https://ffmpeg.org/download.html → Windows builds von gyan.dev
# ffmpeg.exe muss im PATH liegen

# System-Audio – eine der folgenden Optionen:

# Option A: VB-Cable (empfohlen)
# → https://vb-audio.com/Cable/
# Nach Installation: Windows-Einstellungen → Sound → Ausgabe → CABLE Input als Standard

# Option B: Stereo Mix (Realtek/Grafikkarte, oft schon vorhanden)
# Systemsteuerung → Sound → Aufnahme → Rechtsklick → "Deaktivierte Geräte anzeigen"
# → Stereo Mix aktivieren
```

---

## Installation

```bash
cd whisper-poc
npm install
npm run build
npm link          # macht `whisper-poc` global verfügbar
```

---

## Commands

### `setup` – Einmalige Konfiguration

```bash
whisper-poc setup
```

Interaktives Menü zum Konfigurieren:

- **Kompakte Feldliste**: Alle Settings stehen direkt als `Key │ Value` im Menü.
- **Einzelfeld-Änderung**: Du wählst ein Feld und änderst nur dieses.
- **Auto-Save**: Jede Änderung wird sofort gespeichert (kein separates Speichern nötig).
- **Steuerung**: Navigation über Pfeiltasten + Enter.

Verfügbare Felder:

- **Aufnahme-Modus** (`mic` / `system` / `both`)
- **Mikrofon** (aus Liste der erkannten avfoundation-Geräte)
- **System-Audio-Quelle** (z. B. `CABLE Output` oder `Stereo Mix`)
- **Ausgabe-Ordner** (Standard: `~/Desktop/whisper-recordings`)
- **OpenAI API-Key** (setzen/ersetzen oder löschen)
- **Base URL** (optional, für OpenAI-kompatible Endpunkte)

Beenden über **`✅ Fertig`**.

Die Konfiguration wird in `~/.whisper-poc/config.json` gespeichert.

---

### `record` – Aufnahme starten

```bash
whisper-poc record
```

Startet die Aufnahme mit der gespeicherten Konfiguration. Stoppen mit **Ctrl+C**.

Die WAV-Datei wird im konfigurierten Ausgabe-Ordner gespeichert:
`~/Desktop/whisper-recordings/recording-2026-02-23T14-30-00.wav`

**Optionen:**

| Option                | Beschreibung                                      |
| --------------------- | ------------------------------------------------- |
| `-m, --mode <modus>`  | Modus überschreiben: `mic` \| `system` \| `both`  |
| `--mic <index>`       | avfoundation Mikrofon-Index (überschreibt Config) |
| `--system <index>`    | System-Audio-Index (überschreibt Config)          |
| `-o, --output <pfad>` | Ausgabedatei explizit angeben                     |

```bash
# Nur Mikrofon aufnehmen
whisper-poc record --mode mic

# System-Audio aufnehmen (benötigt BlackHole)
whisper-poc record --mode system

# Mikrofon + System-Audio gemischt
whisper-poc record --mode both

# Bestimmtes Mikrofon per Index
whisper-poc record --mic 2

# Bestimmtes System-Audio-Gerät per Index
whisper-poc record --mode both --system 4

# Eigenen Dateinamen angeben
whisper-poc record --output ~/Schreibtisch/meeting.wav
```

> Ohne vorheriges `setup` läuft `record` mit Standardwerten (Mikrofon-Index 0, Ausgabe `~/Desktop/whisper-recordings`).

---

### `transcribe` – Audio transkribieren

```bash
whisper-poc transcribe <datei>
```

Sendet die Datei an die Whisper API und gibt das Transkript aus. Das Ergebnis wird als `.txt` neben der Audiodatei gespeichert.

**Optionen:**

| Option                  | Beschreibung                         |
| ----------------------- | ------------------------------------ |
| `-l, --language <lang>` | Sprache (ISO 639-1, Standard: `de`)  |
| `-o, --output <pfad>`   | Ausgabedatei für das Transkript      |
| `-k, --api-key <key>`   | OpenAI API-Key (überschreibt Config) |
| `-b, --base-url <url>`  | Base URL (überschreibt Config)       |

```bash
# Aufnahme transkribieren (Sprache aus Config)
whisper-poc transcribe ~/Desktop/whisper-recordings/recording-2026-02-23T14-30-00.wav

# Englisches Audio
whisper-poc transcribe meeting.wav --language en

# API-Key direkt angeben (ohne setup)
whisper-poc transcribe aufnahme.wav --api-key sk-...

# Transkript in bestimmte Datei speichern
whisper-poc transcribe aufnahme.wav --output ~/Schreibtisch/transkript.txt
```

---

## Typischer Ablauf

```bash
# 1. Einmalig konfigurieren
whisper-poc setup

# 2. Aufnahme starten → Ctrl+C zum Stoppen
whisper-poc record

# 3. Transkript erstellen
whisper-poc transcribe ~/Desktop/whisper-recordings/recording-2026-02-23T14-30-00.wav
```

---

## API-Key setzen

Der OpenAI API-Key wird in dieser Reihenfolge gesucht:

1. `--api-key` Flag beim Aufruf
2. Konfigurationsdatei (`whisper-poc setup`)
3. Umgebungsvariable `OPENAI_API_KEY`

Die Base URL wird in dieser Reihenfolge gesucht:

1. `--base-url` Flag beim Aufruf
2. Konfigurationsdatei (`whisper-poc setup`)
3. Umgebungsvariable `OPENAI_BASE_URL`

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_BASE_URL=https://api.openai.com/v1
```

---

## Aufnahme-Modi

| Modus    | Was wird aufgenommen             | Benötigt (macOS)   | Benötigt (Windows)                |
| -------- | -------------------------------- | ------------------ | --------------------------------- |
| `mic`    | Nur Mikrofon                     | ffmpeg             | ffmpeg                            |
| `system` | Nur System-Audio                 | ffmpeg + BlackHole | ffmpeg + VB-Cable oder Stereo Mix |
| `both`   | Mikrofon + System-Audio gemischt | ffmpeg + BlackHole | ffmpeg + VB-Cable oder Stereo Mix |

---

## Konfigurationsdatei

```json
// ~/.whisper-poc/config.json
{
  "mode": "both",
  "micIndex": 1,
  "micName": "MacBook Pro Microphone",
  "systemIndex": 4,
  "systemName": "CABLE Output (VB-Audio Virtual Cable)",
  "outputDir": "/Users/name/Desktop/whisper-recordings",
  "apiKey": "sk-..."
}
```
