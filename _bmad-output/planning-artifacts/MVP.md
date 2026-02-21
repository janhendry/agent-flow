# WhisperFlow - Feature & Use Case Analyse

## 🎯 Was ist WhisperFlow?

**WhisperFlow** ist eine professionelle Desktop-App (Electron-basiert) für **Voice-to-Text Transkription** mit globalem Tastaturkürzel. Die App läuft im System Tray und ermöglicht es, Sprache in Echtzeit aufzunehmen, zu transkribieren und **in die Zwischenablage zu kopieren**.

**Zielplattformen**: macOS (Tier 1 & 2), Windows (Tier 3)

---

## 🏁 MVP SCOPE — DREI TIERS

> Dieses Dokument beschreibt die vollständige Feature-Spezifikation. Die folgende Einteilung definiert, was in welchem Release-Tier enthalten ist.

### Tier 1 — MVP Core ✅

_Ziel: Erste funktionierende Version. App liefert Mehrwert._

| Feature                                               | Sektion  |
| ----------------------------------------------------- | -------- |
| Mic-Only Recording (macOS)                            | 1.1, 1.2 |
| FFmpeg-Basis-Pipeline (WAV → WebM/Opus)               | 1.2      |
| FFmpeg Dependency Check + Fehlerhinweis               | 1.5      |
| Whisper API Transkription (ohne Prompt)               | 2.1      |
| Clipboard-Output                                      | 3.1      |
| System Tray (Basis)                                   | 5.1      |
| Settings: API Key, Recording Mode, Shortcuts          | 7.1, 7.2 |
| Globale Shortcuts für Mic-Recording                   | 6.1, 6.2 |
| HUD (Recording + Transcribing + Success/Error States) | 5.2      |
| Snackbar-Notifications                                | 1.4      |
| macOS Support                                         | —        |
| Onboarding / First Run (API-Key-Gate, Test Recording) | 5.6      |

---

### Tier 2 — MVP+ 🔜

_Ziel: Vollständige Nutzererfahrung für die Kernzielgruppe._

| Feature                                             | Sektion        |
| --------------------------------------------------- | -------------- |
| System-Audio + Dual-Recording (macOS via BlackHole) | 1.1, 1.3, 10.3 |
| BlackHole Dependency Check + Setup-Guidance         | 1.5            |
| Transcription-Prompt (Whisper Stil/Glossar)         | 2.2            |
| LLM Post-Processing (GPT)                           | 2.2            |
| Quick History Overlay (letzte 20 Transkriptionen)   | 4.1            |
| Storage + Auto-Cleanup                              | 4.3, 4.5       |
| Shortcut Recorder (UI zum Konfigurieren)            | 6.3            |
| Settings: alle Tabs vollständig                     | 5.3            |

---

### Tier 3 — V2 🔮

_Ziel: Erweiterte Features nach Validierung der Kernfunktion._

| Feature                                                  | Sektion      |
| -------------------------------------------------------- | ------------ |
| Code Review Mode                                         | 2.3          |
| Full History Window (Audio Playback, Bulk-Ops, Filter)   | 4.2          |
| Silence Detection (Auto-Stop)                            | Edge Cases   |
| Pause/Resume Recording + Push-to-Talk                    | 6.2, 8.3     |
| Multi-Monitor HUD-Konfiguration                          | 5.2          |
| Settings: Export/Import                                  | 7.2          |
| Transcription Queue (Background-Processing)              | Domain Layer |
| Windows Port (Mic, System-Audio via WASAPI, vollständig) | 1.3, 10.2    |

---

## 📋 HAUPTFEATURES

### 1. Audio Recording System

#### 1.1 Drei Recording Modi

##### Use Case: Flexible Audio-Aufnahme

Der Nutzer möchte verschiedene Audio-Quellen aufnehmen können, je nach Situation:

- **Microphone Only (Mic)**:
  - Nimmt nur das Mikrofon auf
  - **Use Case**: Diktieren von Notizen, Dokumentation, E-Mails - wenn keine andere Audio-Quelle gewünscht ist

- **System Audio (Output)**:
  - Nimmt nur Computer-Audio auf (Videos, Musik, Calls)
  - **Use Case**: Transkription von YouTube-Videos, Podcasts, oder Audio-Inhalten ohne eigene Stimme

- **Dual Recording (Mixed)**:
  - Nimmt Mikrofon + System-Audio gleichzeitig auf
  - **Use Case**: In Teams/Zoom Calls - eigene Stimme aufnehmen UND alle anderen Teilnehmer (System-Audio). So wird die komplette Konversation erfasst für Meeting-Transkriptionen

**Wichtig**: Die Modi sind für unterschiedliche Situationen gedacht. Bei Meetings will man beides (Dual), bei einfachem Diktieren nur Mic, bei Video-Transkription nur System Audio.

#### 1.2 FFmpeg-basierte Audio-Pipeline

- High-Quality Recording (bis 48kHz, 16-bit)
- Real-time Monitoring (Audio-Level, Timer, Quality Indicator)
- Automatische Geräte-Erkennung mit Hot-plug Support
- Format: WAV Recording → WebM/Opus für API (64 kbps Opus ≈ 0.5 MB/Min. → 30 Min. ≈ ~15 MB, 60 Min. ≈ ~30 MB)

**Optimale FFmpeg-Parameter (aus Research):**

```
ffmpeg -i input.wav -c:a libopus -b:a 48k -vbr on -compression_level 10 -application voip -f webm output.webm
```

| Parameter               | Wert               | Begründung                                                                           |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| `-c:a libopus`          | libopus Encoder    | Volle Opus-Feature-Unterstützung (SILK+CELT), besser als nativer FFmpeg-Opus-Encoder |
| `-b:a 48k`              | 48 kbps            | Optimaler Punkt: volle Whisper-Qualität, 16:1 Kompression vs. WAV                    |
| `-vbr on`               | Variable Bitrate   | Bessere Qualität bei gleicher Dateigröße                                             |
| `-compression_level 10` | Max. Qualität      | Standard, kein Performance-Impact beim Encoding                                      |
| `-application voip`     | Sprach-Optimierung | Für Sprach-Transkription optimiert (vs. `audio` für Musik)                           |

**I/O-Strategie: File-basiert (nicht Streaming-Pipes)**

- WAV-Datei auf Disk → FFmpeg liest WAV → WebM-Datei auf Disk → Upload zu Whisper API
- Kein In-Memory-Buffer, kein stdio-Streaming
- Vorteile: Debuggbar (alle Zwischendateien inspizierbar), kein OOM-Risiko bei langen Aufnahmen, einfacher Error-Recovery

#### 1.3 Platform-spezifische Implementierungen

- **macOS**: BlackHole Integration für System-Audio + Multi-Output Device Management
- **Windows**: DirectShow/WASAPI

> ⚠️ **Tier 3 — Windows ist kein MVP-Scope.** Tier 1 und Tier 2 sind macOS-only. Der Windows Port (Mic + System-Audio via WASAPI Loopback) ist für Tier 3 geplant. Die technische Spezifikation für Windows System-Audio (WASAPI Loopback, Stereo-Mix-Aktivierung, Windows 10/11 Unterschiede) ist noch nicht ausgearbeitet.

**Hinweis**: Linux Support wird NICHT implementiert.

#### 1.3.1 Distribution & macOS Entitlements

**Distributionskanal: Direct Download (kein Mac App Store)**

WhisperFlow wird ausschließlich als Direct Download vertrieben (`dmg` / `zip`). Ein Mac App Store Release ist explizit ausgeschlossen, da:

- Der App Store erzwingt **App Sandboxing** — externe Binaries (FFmpeg) und Kernel Extensions (BlackHole) sind damit nicht nutzbar
- `com.apple.security.app-sandbox` würde den gesamten Audio-Capture-Ansatz unterbinden

**macOS Hardened Runtime + Notarization**

WhisperFlow muss notarisiert werden (ab macOS 10.15 Pflicht für Direct-Download-Apps). Dafür sind folgende Entitlements erforderlich:

```xml
<!-- entitlements.mac.plist -->
<key>com.apple.security.cs.allow-unsigned-executable-memory</key>
<true/>  <!-- Electron benötigt dies -->

<key>com.apple.security.cs.disable-library-validation</key>
<true/>  <!-- Erlaubt externe Binaries (FFmpeg) ohne Apple-Signatur -->

<key>com.apple.security.device.audio-input</key>
<true/>  <!-- Mikrofon-Zugriff -->

<key>com.apple.security.device.audio-output</key>
<true/>  <!-- System-Audio Capture (BlackHole) -->
```

**electron-builder Konfiguration**:

```yaml
# electron-builder.yml
appId: com.whisperflow.app
productName: WhisperFlow

mac:
  hardenedRuntime: true
  gatekeeperAssess: false
  notarize: true # Apple Notary Service via API Key
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  target:
    - target: dmg
    - target: zip # Pflicht für electron-updater Auto-Updates

extraResources:
  - from: node_modules/ffmpeg-static/ffmpeg
    to: ffmpeg

asarUnpack:
  - resources/ffmpeg # ffmpeg-Binary aus ASAR ausschließen (PFLICHT)
```

**Wichtig**: `disable-library-validation` ist notwendig, da FFmpeg ein nicht von Apple signiertes Binary ist. Ohne diese Entitlement verweigert macOS die Ausführung unter Hardened Runtime.

**Notarization via API Key** (sicherer als Apple ID + Passwort):

```bash
# Einmalig in Apple Developer Console generieren
# Dann als Environment-Variablen setzen:
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_KEY="/path/to/AuthKey_XXXXXXXXXX.p8"
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**`asarUnpack` ist kritisch**: Ohne `asarUnpack` ist das FFmpeg-Binary im ASAR-Archiv eingeschlossen und kann nicht als ausführbares Programm gestartet werden. `child_process.spawn()` benötigt einen echten Dateisystem-Pfad.

#### 1.4 Snackbar & Notifications System

##### Use Case: Zentrales User-Feedback

Ein globales Notification-System zeigt Success/Error/Warning/Info Messages für alle Actions.

**Architektur**:

- NanoStore im Main Process
- **Dediziertes Snackbar Window** (Overlay, nur für Notifications)
- Queue System: Mehrere Notifications werden nacheinander angezeigt

**Typische Use Cases**:

- Recording gestartet → "Recording started" (Success)
- API Error → "Transcription failed: API timeout" (Error)
- Settings gespeichert → "Settings saved" (Success)

**Vorteil**: Konsistentes Feedback über alle Windows, keine duplizierten Snackbars.

#### 1.5 Dependency Management

##### Use Case: Sicherstellung der Funktionalität

Die App benötigt für System-Audio BlackHole (macOS, Tier 2), das der Nutzer selbst installieren muss. **FFmpeg wird automatisch gebündelt** — kein User-Setup nötig.

**FFmpeg-Strategie: `ffmpeg-static` (gebündelt)**

> **⚠️ Strategiewechsel gegenüber ursprünglichem Konzept**: Research zeigt, dass `ffmpeg-static` (npm-Package, liefert plattformspezifische FFmpeg-Binaries mit) der robusteste Ansatz für Electron-Apps ist. `fluent-ffmpeg` — der bisherige De-facto-Standard — ist seit **Mai 2025 deprecated und archiviert**. Die neue Strategie ist daher `child_process.spawn()` + `ffmpeg-static` statt "Bring Your Own".

- ✅ **`ffmpeg-static`**: FFmpeg-Binary wird automatisch mit der App mitgeliefert (macOS ARM64/x64, Windows x64)
- ✅ **`child_process.spawn()`**: Direkter FFmpeg-Subprocess — keine Abstraktionsschicht, volle CLI-Parameter-Kontrolle
- ✅ **Kein fluent-ffmpeg**: Deprecated seit Mai 2025 — wird nicht verwendet
- ✅ **electron-builder `extraResources`**: FFmpeg-Binary wird beim App-Build korrekt eingebettet
- ✅ **Kein User-Setup für FFmpeg nötig**: App funktioniert out-of-the-box

**Use Case**:

1. **Beim App-Start**: Prüfe automatisch, ob BlackHole installiert ist (macOS only)
2. **Wenn BlackHole fehlt**: Zeige Hinweis, dass System-Audio und Dual-Recording nicht verfügbar sind, mit Link zur Installation
3. **Graceful Degradation**: Ohne BlackHole (macOS) → nur Microphone-Modus verfügbar (Tier-1-Core-Funktion bleibt intakt)
4. **Status-Anzeige**: In Settings (Dependencies-Tab) zeige Status: BlackHole ✓/✗
5. **Re-Check**: Button zum erneuten Prüfen nach Installation

**Ziel**: App funktioniert out-of-the-box (Mic-Mode), System-Audio-Modus wird nach BlackHole-Installation verfügbar.

---

### 2. Transcription Features

#### 2.1 OpenAI Whisper API Integration

- Vollständige Whisper API Integration

> **📏 Whisper API File-Size-Limit: 25 MB**
> Audio wird als WebM/Opus übertragen (64 kbps ≈ 0.5 MB/Min.). In der Praxis kein Problem für typische Aufnahmen bis ~45 Minuten. Bei sehr langen Aufnahmen (>45 Min. bei 64 kbps bzw. >60 Min. bei niedrigerer Bitrate) kann das Limit erreicht werden.
>
> - **Schutzmaßnahme**: App zeigt eine Warnung wenn die Aufnahme 40 Minuten überschreitet.
> - **Sehr lange Aufnahmen (>45 Min.)**: Audio-Chunking ist für Tier 2 vorgesehen. Bis dahin ist der User verantwortlich, lange Meetings in Abschnitte aufzuteilen.

#### 2.2 Zwei-Stufen-Prompt-System

##### Prompt 1: Transcription Prompt (Whisper API)

**Use Case**: Einfluss auf die Transkription durch Beispiel-Texte

Der Nutzer kann bei der Whisper-API einen **Prompt mitgeben**, der die Transkription beeinflusst. Dies funktioniert NICHT durch Anweisungen wie "formuliere höflich", sondern durch **Beispiel-Texte**, aus denen Whisper den Stil lernt.

**Wie es funktioniert**:
Whisper analysiert den Beispiel-Text und adaptiert:

- **Ton & Formalität**: Höflich vs. casual
- **Satzstruktur**: Kurze Sätze vs. ausführlich
- **Vokabular**: Fachsprache vs. Alltagssprache
- **Glossar**: Spezielle Begriffe, Namen, Akronyme

**Beispiele**:

1. **Höflicher/Formeller Stil**:

```
Prompch möchte Ihnen mitteilen,
dass das Meeting auf nächste Woche verschoben wurde.
Mit freundlichen Grüßen."
```

→ Whisper transkribiert im gleichen formellen Ton

2. **Technisches Glossar**:

```
Prompt: "Die API verwendet OAuth2 für Authentication.
Der Kubernetes-Cluster läuft auf AWS.
Das Frontend ist in React implementiert."
```

→ Whisper schreibt "OAuth2" statt "OAuth 2", "Kubernetes" statt "Cubernetes"

3. **Casual Notizen-Stil**:

```
Prompt: "Meeting war gut. Sarah meinte wir sollten Feature X priorisieren.
Tom checkt das Backend. Deadline: nächste Woche."
```

→ Whisper nutzt kurze, informelle Sätze

4. **Code-Dokumentation**:

```
Prompt: "The function calculates the Fibonacci sequence recursively.
It accepts an integer parameter and returns the result as BigInt."
```

→ Whisper nutzt technische, präzise Sprache

**Wichtig**:

- ❌ **NICHT**: "Formuliere höflich" (Anweisungen funktionieren nicht)
- ✅ **SONDERN**: Beispiel-Text im gewünschten Stil (Whisper lernt daraus)
- Der Prompt hat KEINEN Kontext über den Inhalt, nur über Stil/Format
- Prompt sollte 50-200 Wörter sein (zu kurz = wenig Effekt, zu lang = verwässert)

**Settings**:

```typescript
interface WhisperSettings {
  transcriptionPrompt?: string; // Beispiel-Text für Stil-Adaption
  // Beispiel: "Sehr geehrter Herr Müller, vielen Dank für Ihre Nachricht..."
}
```

##### Prompt 2: Post-Processing Prompt (LLM)

**Use Case**: Text nach der Transkription weiterverarbeiten

Nach der Whisper-Transkription kann optional ein **LLM (GPT-4/GPT-3.5)** den Text verarbeiten.

**Use Cases**:

1. **Text umformatieren**:
   - Input: Rohe Transkription
   - Prompt: "Formatiere diesen Text als strukturierte Meeting-Notizen mit Agenda-Punkten"
   - Output: Strukturierte Notizen

2. **Grammatik korrigieren**:
   - Prompt: "Korrigiere Grammatik und Rechtschreibung, behalte den Inhalt bei"

3. **Zusammenfassen**:
   - Prompt: "Fasse den Text in 3-5 Bullet Points zusammen"

4. **Code formatieren**:
   - Prompt: "Extrahiere Code-Snippets und formatiere sie mit Syntax-Highlighting"

5. **E-Mail-Stil**:
   - Prompt: "Formuliere den Text als professionelle E-Mail mit Anrede und Grußformel"

6. **Auf Text antworten**:
   - Input: Transkription einer Frage
   - Prompt: "Beantworte diese Frage detailliert"
   - Output: Antwort (nicht die Frage)

**Wichtig**: Hier wird die fertige Transkription als Input genommen und der LLM kann beliebig damit arbeiten - umformatieren, beantworten, zusammenfassen, etc.

**Settings**:

```typescript
interface PostProcessingSettings {
  postProcessingEnabled: boolean;
  postProcessingModel:
    | "gpt-4o-mini"
    | "gpt-4o"
    | "gpt-4-turbo"
    | "gpt-3.5-turbo"; // Default: gpt-4o-mini
  postProcessingPrompt: string;
  // Beispiel: "Formatiere als Meeting-Notizen mit Kategorien: Agenda, Entscheidungen, Action Items"
}
```

---

#### 2.3 Code Review Mode

##### Use Case: Voice-basierte Code-Review-Kommentare

Der Nutzer möchte Code reviewen, ohne manuell Kommentare zu tippen. Er markiert Code, spricht seine Review-Gedanken, und erhält einen formatierten GitHub-Review-Kommentar.

**Workflow**:

1. **Code markieren & kopieren** (z.B. in GitHub, VSCode, IntelliJ)
2. **Code Review Recording starten** via Shortcut (z.B. `Cmd+Option+C` / `Ctrl+Alt+C`)
3. **App liest automatisch Clipboard** aus (= markierter Code)
4. **User spricht Review-Kommentar**: "Hier solltest du lieber einen Guard verwenden für null checks. Außerdem würde ich die Funktion in zwei kleinere splitten für bessere Testbarkeit"
5. **Stop Recording**
6. **Transkription** läuft
7. **LLM Post-Processing** mit speziellem Code-Review-Prompt:
   - Input: Code (aus Clipboard) + Voice-Kommentar (transkribiert)
   - Output: GitHub-formatierter Review-Kommentar
8. **Fertiger Review-Kommentar in Clipboard**
9. User fügt in GitHub/GitLab ein

**Features**:

- **Automatische Clipboard-Integration**: Code wird beim Recording-Start gecached
- **Spezieller Code-Review-Prompt**: LLM formatiert als konstruktiven GitHub-Kommentar
- **Markdown-Formatierung**: Output mit Code-Blocks, Bullet-Points, etc.
- **Eigener Shortcut**: Separater Shortcut für Code-Review-Mode

**LLM-Prompt (Template)**:

```
You are an experienced code reviewer. You will receive:
1. Code snippet (from clipboard)
2. Voice comment (transcribed from speech)

Your task: Write a professional, constructive GitHub code review comment.

Guidelines:
- Be specific and reference exact lines/patterns
- Suggest concrete improvements with code examples if helpful
- Use markdown formatting (code blocks, bullet points, emphasis)
- Be constructive, not just critical
- Keep it concise but thorough

Code:
```

${clipboardContent}

```

Voice Comment:
${transcription}

Output: GitHub-formatted review comment in markdown.
```

**Beispiel**:

**Input**:

- Code:
  ```javascript
  function processUser(user) {
    return user.name.toUpperCase();
  }
  ```
- Voice: "Hier fehlt ein null check für user und user.name, sonst crasht das"

**Output** (in Clipboard):

````markdown
**Potential Null Reference Issue**

The function assumes `user` and `user.name` are always defined, which could lead to runtime errors.

**Suggestion:**

```javascript
function processUser(user) {
  if (!user?.name) {
    throw new Error("User or user name is missing");
  }
  return user.name.toUpperCase();
}
```
````

Consider adding validation or using optional chaining to handle edge cases safely.

````

**Settings**:

```typescript
interface CodeReviewSettings {
  enabled: boolean // Standard: true
  shortcut: string // Standard: Cmd+Option+C / Ctrl+Alt+C
  codeReviewPrompt: string // Anpassbarer Prompt-Template
  includeCodeInOutput: boolean // Standard: false (nur Review-Text, kein Code)
}
````

**Standard Shortcuts** (Ergänzung):

- **Code Review Recording**: `Cmd+Option+C` / `Ctrl+Alt+C`

---

### 3. Clipboard-System (KEIN direktes Einfügen)

#### 3.1 Clipboard-basierte Ausgabe

**Use Case**: Maximale Flexibilität für den Nutzer

Statt Text automatisch einzufügen, wird er **nur in die Zwischenablage (Clipboard) kopiert**.

**Workflow**:

1. Recording → Transkription → [Optional: Post-Processing]
2. **Fertiger Text wird in Clipboard kopiert**"
3. Nutzer wechselt zu gewünschter App
4. Nutzer drückt Cmd+V (macOS) / Ctrl+V (Windows)

**WICHTIG**: Es gibt KEIN automatisches Einfügen in Apps, keine App-Detection, keine Context-Awareness. Nur Clipboard!

---

### 4. Transcription History & Quick Access

#### 4.1 Quick History Overlay (Windows+V Style)

##### Use Case: Schneller Zugriff auf alte Transkriptionen

Der Nutzer möchte schnell auf vorherige Transkriptionen zugreifen, ohne ein volles Window zu öffnen - ähnlich wie Windows+V für Clipboard History.

**Workflow**:

1. Nutzer drückt **Shortcut** (z.B. `Cmd+Shift+H` / `Ctrl+Shift+H`)
2. **Overlay öffnet sich** über aktueller App (Always on Top)
3. **Liste zeigt**: Letzte 10-20 Transkriptionen mit Preview
4. **Navigation**: Pfeiltasten ↑↓ zum Durchblättern
5. **Auswahl**: Enter drücken
6. **Aktion**: Ausgewählte Transkription → Clipboard kopiert
7. **Overlay schließt** sich automatisch

**Features**:

- **Minimal Design**: Kompaktes Overlay, nicht viel Screen-Space
- **Preview**: Erste 100 Zeichen jeder Transkription sichtbar
- **Timestamp**: Wann wurde es transkribiert (z.B. "vor 2 Minuten", "vor 1 Stunde")
- **Keyboard Navigation**: Nur Pfeiltasten + Enter nötig
- **ESC zum Schließen**: Overlay ohne Aktion schließen
- **Recording Mode Icon**: Zeigt ob Mic/Output/Dual
- **Search**: Typ-to-Search (wie Spotlight) - tippe "meeting" → filtert Liste

**Settings**:

```typescript
interface QuickHistorySettings {
  shortcut: string; // Standard: Cmd+Shift+H / Ctrl+Shift+H
  position: "center" | "top" | "mouse-cursor"; // Standard: center
  opacity: number; // Standard: 0.95
  showTimestamp: boolean; // Standard: true
  showRecordingMode: boolean; // Standard: true
  enableSearch: boolean; // Standard: true
}
```

**UI-Beispiel**:

```
┌─────────────────────────────────────────┐
│  🎤 Transcription History (20)          │
├─────────────────────────────────────────┤
│ ▶ Meeting Notes - Product Roadmap Q1... │  ← Selected
│   vor 5 Minuten | Dual Recording        │
├─────────────────────────────────────────┤
│   Email to John about deadline ext...   │
│   vor 15 Minuten | Mic                  │
├─────────────────────────────────────────┤
│   Code comment for authentication...    │
│   vor 1 Stunde | Mic                    │
├─────────────────────────────────────────┤
│   ...                                   │
└─────────────────────────────────────────┘
    ↑↓ Navigate | ⏎ Select | ⎋ Close
```

**Vorteile**:

- ⚡ **Schneller als Full Window**: Kein Klicken nötig
- 🎯 **Fokussiert**: Nur letzte Transkriptionen
- ⌨️ **Keyboard-First**: Komplett mit Tastatur bedienbar
- 🔍 **Search**: Schnell finden ohne scrollen

---

#### 4.2 Full History Window

Für erweiterte Operationen gibt es zusätzlich ein vollständiges History Window:

**Features**:

- **Complete History**: Alle Transkriptionen (nicht nur letzte 20)
- **Advanced Search & Filter**: Nach Datum, Modus, Keywords, Länge
- **Bulk Operations**: Mehrere Aufnahmen gleichzeitig löschen
- **Audio Playback**: Original-Audio anhören
- **Details View**: Metadaten, Duration, Quality Metrics

**Audio Playback — UI-Verhalten bei fehlender Audio-Datei**:

Audio-Dateien werden per Default nach 7 Tagen gelöscht (`deleteAudioAfterDays: 7`), Transkriptionen bleiben 30 Tage. Einträge ohne Audio-Datei müssen im UI klar kommuniziert werden:

- **Playback-Button**: Ausgegraut (`disabled`), nicht klickbar
- **Tooltip** bei Hover: „Audio wurde automatisch gelöscht (Storage Settings → Audio nach X Tagen)"
- **Icon**: Playback-Icon erhält ein Durchgestrichen-Overlay oder grau-out
- **Kein Fehler-Dialog**: Kein Popup — nur passiver visueller Hinweis
- **Details View**: Zeigt „Audio: nicht verfügbar" statt Dateiname/Größe

> Diese Situation ist der **Normalzustand** bei Standard-Settings und kein Error-Case.

**Unterschied zu Quick Overlay**:

- Quick Overlay: Schneller Zugriff, letzte Transkriptionen
- Full Window: Verwaltung, Suche, Details, Bulk-Ops

---

#### 4.3 Audio Storage Service

- Hierarchische Ordnerstruktur (Jahr-Monat)
- Separate oder gemischte Audio-Dateien bei Dual-Recording
- JSON-Metadaten für jede Aufnahme

#### 4.4 Recording Metadata

- Timestamp, Duration, Mode, Devices
- Quality Level (low/medium/high)
- Transcription Status & Text
- File Paths zu Audio-Dateien

#### 4.5 Storage Settings

##### Use Case: Flexible Storage Management mit Selective Cleanup

Der Nutzer möchte Speicherplatz sparen, aber Transkriptionen länger behalten als die großen Audio-Dateien.

**Konzept: Selective Cleanup**

Audio-Dateien verbrauchen viel Speicherplatz (z.B. 10 MB/Minute bei High-Quality), während Transkriptionen minimal sind (wenige KB). Die App ermöglicht separate Retention-Zeiten:

**Settings**:

```typescript
interface StorageSettings {
  storageLocation: string; // Basis-Ordner für alle Recordings
  maxStorageSize?: number; // MB, optional - Warnung wenn überschritten

  // Selective Cleanup - Separate Retention
  deleteAudioAfterDays: number | null; // null = nie löschen
  deleteTranscriptionAfterDays: number | null; // null = nie löschen

  // Favorites Protection
  keepFavorites: boolean; // Standard: true - Favoriten nie löschen
}
```

**Standard-Werte (Empfohlen)**:

- `deleteAudioAfterDays: 7` - Audio nach 1 Woche löschen (spart Platz)
- `deleteTranscriptionAfterDays: 30` - Transkripte 1 Monat behalten
- `keepFavorites: true` - Favoriten nie löschen
- `maxStorageSize: 5000` MB (5 GB Warnung)

**Workflow**:

1. **User-Konfiguration**: In Settings kann der User beide Werte einstellen
2. **Optionen**:
   - Zahl eingeben (z.B. 7, 30, 90) → Löschen nach X Tagen
   - `null` / "Nie löschen" → Dateien bleiben permanent
3. **Auto-Cleanup läuft täglich** (Background)
4. **Cleanup-Logik**:
   - Prüfe jede Recording
   - Wenn `deleteAudioAfterDays` nicht null UND Audio älter → lösche Audio-Datei
   - Wenn `deleteTranscriptionAfterDays` nicht null UND Transkript älter → lösche Transkript + Metadata
   - Wenn Recording favorisiert UND `keepFavorites: true` → überspringen
5. **Storage-Warnung**: Wenn Gesamt-Größe > `maxStorageSize` → zeige Notification

**Beispiel-Szenarien**:

1. **Standard-User** (Platzsparend):
   - Audio: 7 Tage
   - Transkript: 30 Tage
   - → Audio schnell weg, Text länger verfügbar

2. **Archivierer** (Alles behalten):
   - Audio: null (nie löschen)
   - Transkript: null (nie löschen)
   - → Nichts wird automatisch gelöscht

3. **Minimalist** (Nur Transkripte):
   - Audio: 1 Tag (sofort weg)
   - Transkript: 90 Tage
   - → Audio nur temporär, Text long-term

4. **Ephemeral** (Alles temporär):
   - Audio: 1 Tag
   - Transkript: 7 Tage
   - → Alles schnell gelöscht

**UI in Settings**:

```
Storage Settings
├─ Storage Location: [/Users/.../whisperflow] [Browse...]
├─ Max Storage Size: [5000] MB (Warning threshold)
│
├─ Auto Cleanup
│  ├─ Delete Audio Files after: [7] days [✓ Never]
│  ├─ Delete Transcriptions after: [30] days [✓ Never]
│  └─ [✓] Keep favorited recordings forever
│
└─ Current Usage: 234 MB / 5000 MB (4.7%)
```

**Vorteile**:

- ✅ **Flexibel**: Beide Werte separat konfigurierbar
- ✅ **Platzsparend**: Audio früher löschen, Text behalten
- ✅ **Optional**: `null` = nie löschen möglich
- ✅ **Favorites-Schutz**: Wichtige Recordings geschützt
- ✅ **Einfach**: Klare Tage-Werte, kein komplexes System

---

### 5. User Interface & Windows

#### 5.1 System Tray App

- Läuft unsichtbar im System Tray
- Status Indicator (Recording-Status im Icon)
- Quick Access Menu: Settings, History, Quit
- Quick Info: Mode, Mic Status

#### 5.2 HUD Window (Heads-Up Display)

- Minimal, transparentes Overlay
- Disable/Enable via Settings
- Konfigurierbare Position (top-right, top-left, bottom-right, bottom-left)
- Always On Top
- Zeigt: Recording Mode, Audio Level Meter, Timer
- Auto-Hide nach end transcription + processing

##### HUD States & Visualisierung

Das HUD durchläuft verschiedene Zustände während des Recording-Workflows:

**State 1: Recording (Aktive Aufnahme)**

```
╭──────────────────╮
│ 🎤 ▓▓▓▓▓░░░ 00:23│  ← Icon + Level + Timer
╰──────────────────╯
```

- **Nur**: Icon + Audio-Pegel + Timer
- **Kein Text** (kein "Recording")
- **Icon**: 🎤 (Mic) / 🔊 (Output) / 🎙️ (Dual) / 💻 (Code)
- **Größe**: ~180px × 40px

---

**State 2: Transcribing**

```
╭──────────────────╮
│ ◐ Transcribing   │  ← Spinner + Text
╰──────────────────╯
```

- **Loading-Spinner**: ◐ (rotierend)
- **Text**: "Transcribing"
- **Größe**: ~180px × 40px

---

**State 3: Enhancing (Optional)**

```
╭──────────────────╮
│ ◑ Enhancing      │  ← Spinner + Text
╰──────────────────╯
```

- **Loading-Spinner**: ◑ (rotierend)
- **Text**: "Enhancing"
- **Nur wenn** LLM aktiv
- **Größe**: ~180px × 40px

---

**State 4: Success (1.5s)**

```
╭──────────────────╮
│ ✓ Copied         │
╰──────────────────╯
```

- **Minimal**: ✓ + "Copied"
- **Dann**: Fade-out → Hidden

---

**State 5: Error (3 Sekunden)**

```
╭──────────────────╮
│ ⚠️ API Error     │
╰──────────────────╯
```

- **Kurze Error-Message**
- **Keine Buttons** (nicht interaktiv)
- **Auto-Hide**: Nach 3 Sekunden
- **Größe**: ~180px × 40px

---

##### Design Details

**Minimalismus-Prinzip**:

- ✅ **Abgerundete Ecken** (border-radius: 12px)
- ✅ **Recording**: Nur Icon + Pegel + Timer (kein Text)
- ✅ **Processing States**: Loading-Spinner + Ein-Wort-Text
- ✅ **Kompakte Größe** (180px breit, 40px hoch - alle States)
- ✅ **Inline-Info** (alles in einer Zeile)
- ✅ **Nicht interaktiv** (Click-through, keine Buttons)

**Farben** (Minimal):

- Recording: Grün Akzent
- Processing: Orange
- Success: Grün
- Error: Rot

**Transparency**:

- Recording/Processing: 85% transparent
- Success: 90% transparent
- Error: 85% transparent (gleich wie andere States)

**Animations**:

- Fade-In/Out: 200ms
- Spinner: Rotation
- Smooth, subtil

**Auto-Hide**:

- Success: 1.5 Sekunden
- Error: 3 Sekunden

---

##### Spezielle Anforderungen:

**Verhalten**:

- **Click-Through Mode**: HUD ist komplett nicht interaktiv - Maus geht durch das Fenster hindurch
  - User kann weiterarbeiten ohne dass HUD stört
  - Kein versehentliches Klicken auf HUD möglich
  - Gilt für ALLE States (inkl. Error)
- **Konfigurierbare Monitor-Anzeige**: HUD-Anzeige ist flexibel konfigurierbar
  - **Aktiver Monitor** (Standard): HUD erscheint nur auf dem Monitor mit aktiver App/Maus
  - **Alle Monitore**: HUD erscheint auf allen verbundenen Monitoren gleichzeitig
  - **Bestimmter Monitor**: User wählt einen festen Monitor (z.B. "Monitor 1", "Monitor 2")
  - **Deaktiviert**: HUD wird nicht angezeigt (für Nutzer die es nicht brauchen)
  - Bei Recording-Start wird die gewählte Konfiguration angewendet, kein automatisches Folgen während Recording

---

#### 5.3 Settings Window

- Frameless Design mit Tab-Navigation
- **Sections**:
  - Whisper API (API Key, Base URL, Model, Transcription-Prompt, Temperature)
  - LLM API (API Key, Base URL, Model, Post-Processing aktivieren, Post-Processing-Prompt)
  - Audio Settings (Recording Mode Default, Devices, Quality)
  - Shortcuts (Alle Tastenkürzel)
  - Storage (Location, Limits, Retention)
  - Dependencies (FFmpeg/BlackHole Status)
- Echtzeit-Validierung von API Keys
- Presets für Quick-Setup

##### Window-Steuerung & Header

**Technische Implementierung**:

**Custom Header mit Window Controls** (Component: `WindowHeader.tsx`):

- **Draggable Header**: Header ist verschiebbar via `-webkit-app-region: drag` CSS Property
  - User kann Window am Header grabben und verschieben
  - Gesamter Header-Bereich ist drag-enabled
- **Platform-spezifische Controls**:
  - **macOS**: Nutzt native Traffic Light Buttons (links oben)
    - Position: `trafficLightPosition: { x: 15, y: 15 }`
    - `titleBarStyle: 'hidden'` für custom Header
    - Titel zentriert, Spacer für Traffic Lights
  - **Windows**: Custom Buttons (rechts oben) mit SVG-Icons
    - Minimize, Maximize/Restore, Close Buttons
    - Hover-Effekte: `hover:bg-[var(--surface-hover)]`, Close Button wird rot
    - `-webkit-app-region: no-drag` auf Buttons (sonst nicht klickbar)
- **Rechtsklick auf Header**: Funktioniert automatisch (Context-Menu)
  - Durch `-webkit-app-region: drag` ist Header interaktiv
  - System Context-Menu (macOS: Window-Optionen, Windows: Move/Size)

**Electron Window Options**:

```typescript
{
  frame: false,              // Kein Standard-Frame
  transparent: false,        // Nicht transparent (Settings haben Background)
  resizable: true,           // Größe änderbar
  minimizable: true,         // Minimieren erlaubt
  maximizable: false,        // Nicht maximieren (feste Größe bevorzugt)
  fullscreenable: false,     // Kein Fullscreen
  alwaysOnTop: false,        // Nicht immer im Vordergrund
  titleBarStyle: 'hidden',   // macOS: Hide title bar, show traffic lights
  trafficLightPosition: { x: 15, y: 15 }  // macOS Traffic Lights Position
}
```

**Always-On-Top Konfiguration** (besonders wichtig für HUD):

Für Windows die **über andere Apps** erscheinen sollen (HUD, History):

```typescript
// Nach Window-Erstellung:
window.setAlwaysOnTop(true, 'screen-saver', 1)  // HUD: Höchstes Level
window.setAlwaysOnTop(true, 'floating')         // History: Floating Level

// macOS-spezifische Optionen bei Window-Creation:
...(process.platform === 'darwin' && {
  type: 'panel',                    // Panel-Type für Overlays
  level: 'screen-saver',            // Höchstes Level (über Fullscreen-Apps)
  visibleOnAllWorkspaces: true      // Auf allen Spaces sichtbar
})

// Zusätzliche Runtime-Konfiguration:
window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
window.setFocusable(false)  // Für HUD: Kein Focus (Click-through)
```

> **⚡ HUD Latenz-Kritisch — Pre-Created Window (PFLICHT)**:
> Das HUD-Fenster wird beim App-Start **sofort erstellt, aber versteckt** (`show: false`).
> `win.show()` beim Shortcut-Trigger = **< 5ms Latenz**.
> `new BrowserWindow()` on-demand = **500–2000ms** — komplett inakzeptabel für WhisperFlow-UX.
>
> ```typescript
> // RICHTIG: HUD beim App-Start pre-create
> const hud = new BrowserWindow({
>   show: false, // Versteckt starten
>   backgroundThrottling: false, // Kein Throttling wenn versteckt
>   frame: false,
>   transparent: true,
>   alwaysOnTop: true,
>   focusable: false,
>   type: "panel",
> });
> // Bei Shortcut-Trigger:
> hud.show(); // < 5ms
> // Beim Shortcut-Release:
> hud.hide(); // < 5ms
> ```

**Window Levels** (nach Priorität):

1. `'screen-saver'` - Höchstes Level, über allen Apps inkl. Fullscreen (für HUD)
2. `'floating'` - Über normale Apps, unter Fullscreen (für History/Overlays)
3. `'normal'` - Standard-Level (für Settings)

**macOS-Spezifische Settings**:

- `type: 'panel'` - Macht Window zu Panel-Type (kein Dock-Icon, immer im Vordergrund)
- `level: 'screen-saver'` - Erscheint über Fullscreen-Apps
- `visibleOnAllWorkspaces: true` - Bleibt auf allen Spaces/Desktops sichtbar
- `window.setWindowButtonVisibility(false)` - Versteckt Traffic Lights (für HUD)
- `window.showInactive()` - Zeigt Window ohne Focus zu nehmen (macOS only)

**CSS für Draggable Header**:

```css
.window-header {
  -webkit-app-region: drag;  /* Header ist draggable */
  cursor: move;              /* Zeigt Move-Cursor */
  select-none;               /* Kein Text-Selection beim Dragging */
}

.window-control-btn {
  -webkit-app-region: no-drag;  /* Buttons sind klickbar, nicht draggable */
}
```

**Features**:

- ✅ **Frameless Window** mit custom Header
- ✅ **Verschiebbar** via Header (kompletter Header ist drag-area)
- ✅ **Rechtsklick funktioniert** (System Context-Menu)
- ✅ **Platform-spezifische Controls** (macOS Traffic Lights vs Windows Buttons)
- ✅ **Hover-Effekte** auf Buttons (visuelle Feedback)
- ✅ **Close Button Highlight** (rot bei Hover auf Windows)
- ✅ **Minimize/Maximize** (Windows) vs. Traffic Lights (macOS)

**Wichtig**: Der gleiche Ansatz soll für alle Window-Typen verwendet werden (Settings, History, etc.)

#### 5.4 Transcription History Window

- Transparent mit Glaseffekt, Always On Top
- Liste aller Transkriptionen
- Audio Playback, Copy to Clipboard

#### 5.5 React 19 Frontend

- React 19 + TypeScript + Tailwind CSS
- Radix UI für Accessibility
- Framer Motion für Animationen
- NanoStores State Management mit [@janhendry/nanostore-ipc-bridge](https://github.com/janhendry/nanostore-ipc-bridge)

---

#### 5.6 Onboarding / First Run

##### Use Case: Neuer User startet WhisperFlow zum ersten Mal

**Trigger**: App wird gestartet und es ist noch kein API-Key konfiguriert.

**Workflow**:

1. **App-Start-Erkennung**: Beim ersten Start prüft die App, ob ein Whisper API-Key gesetzt ist
2. **Pflichtfeld-Gate**: Solange kein API-Key eingegeben ist, sind Recording-Shortcuts deaktiviert, Tray zeigt `⚠️`-Status
3. **Settings Window** öffnet sich automatisch auf Tab „Whisper API", API-Key-Feld ist fokussiert, mit Link zu [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
4. **API-Key eingeben** → Live-Validierung (Test-Request gegen Whisper API)
5. **Dependency Check** läuft automatisch nach erfolgreicher API-Key-Validierung:
   - FFmpeg gefunden → ✓ grünes Häkchen
   - FFmpeg fehlt → Installationsanleitung direkt im Dependencies-Tab
6. **Bereit-State**: API-Key valid + FFmpeg vorhanden → Tray zeigt normalen Status, Shortcuts aktiv
7. **Optional: Test Recording**: Button im Settings-Tab nimmt 3 Sekunden auf und transkribiert — verifiziert den kompletten Flow

**Folgestart (bereits konfiguriert)**:

- API-Key vorhanden → normaler App-Start, kein Onboarding
- FFmpeg fehlt nach Deinstallation → Tray `⚠️` + Notification mit Link zu Settings

**State-Interface**:

```typescript
interface FirstRunState {
  isFirstRun: boolean; // true wenn kein API-Key konfiguriert
  apiKeyValid: boolean; // API-Key wurde erfolgreich validiert
  ffmpegAvailable: boolean; // FFmpeg ist installiert und gefunden
  isReady: boolean; // apiKeyValid && ffmpegAvailable
}
```

**Tier**: 1 — Ohne First-Run-Gate ist die App für neue User nicht nutzbar.

---

### 6. Global Shortcuts System

#### 6.1 Shortcut Manager

- Systemweite Shortcuts in jeder App
- Cross-platform (Cmd auf macOS, Ctrl auf Windows)
- Frei konfigurierbar
- Conflict Detection & Hot-reload

#### 6.2 Standard Shortcuts

- **Mic Recording**: `Cmd+Shift+M` / `Ctrl+Shift+M`
- **Output Recording**: `Cmd+Shift+O` / `Ctrl+Shift+O`
- **Dual Recording**: `Cmd+Shift+D` / `Ctrl+Shift+D`
- **Code Review Recording**: `Cmd+Option+C` / `Ctrl+Alt+C`
- **Start/Stop**: `Cmd+Shift+R` / `Ctrl+Shift+R`
- **Pause/Resume**: `Cmd+Shift+P` / `Ctrl+Shift+P` _(Tier 3)_
- **Cancel Recording**: `Cmd+Shift+Esc` / `Ctrl+Shift+Esc`

#### 6.3 Shortcut Recorder

- Visual Feedback UI
- Validation & Conflict Detection
- Suggested free Shortcuts

---

### 7. Settings & Configuration

#### 7.1 Persistent Settings Store

- electron-store für sichere persistente Speicherung
- Auto-sync, Reset to Defaults

#### 7.2 Umfangreiche Settings

```typescript
interface AppSettings {
  // Whisper API Configuration
  whisper: {
    apiKey: string;
    baseURL?: string; // Custom Endpoint/Proxy für Whisper
    model: "gpt-4o-mini-transcribe" | "whisper-1"; // Default: gpt-4o-mini-transcribe (günstiger, ausreichend)
    transcriptionPrompt?: string; // Glossar, Stil für Whisper
    temperature?: number;
  };

  // LLM API Configuration (Post-Processing)
  llm: {
    apiKey: string;
    baseURL?: string; // Custom Endpoint/Proxy für LLM
    model: "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo" | "gpt-3.5-turbo"; // Default: gpt-4o-mini
    enabled: boolean; // Post-Processing aktivieren
    postProcessingPrompt: string; // Text-Transformation nach Transkription
  };

  // Recording
  recordingQuality: "low" | "medium" | "high";
  maxRecordingDuration: number;
  defaultRecordingMode: "mic" | "output" | "dual";
  audioDevices: {
    micDevice?: string;
    outputDevice?: string;
    fallbackToDefault: boolean;
  };

  // UI
  theme: "light" | "dark" | "system";
  hudEnabled: boolean; // HUD komplett aktivieren/deaktivieren
  hudDisplayMode:
    | "active-monitor"
    | "all-monitors"
    | "specific-monitor"
    | "disabled";
  hudSpecificMonitor?: number; // Monitor-Index wenn 'specific-monitor' gewählt (z.B. 0, 1, 2)
  hudPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  hudOpacity: number;

  // Shortcuts
  shortcuts: {
    micRecording: string;
    outputRecording: string;
    dualRecording: string;
    codeReviewRecording: string;
    pauseResume: string; // Tier 3
  };

  // Storage
  storageLocation: string;
  maxStorageSize?: number; // MB, Warning threshold
  deleteAudioAfterDays: number | null; // null = nie löschen
  deleteTranscriptionAfterDays: number | null; // null = nie löschen
  keepFavorites: boolean; // Standard: true

  // Dependencies
  dependencyStatus: {
    ffmpeg: "installed" | "missing";
    blackhole?: "installed" | "missing"; // nur macOS
  };
}
```

#### 7.3 Settings Validation

- Shortcut Conflicts
- Storage Paths

---

### 8. State Management

#### 8.1 NanoStores Architecture

- Reactive State mit automatischen UI-Updates
- Typed Stores (TypeScript)
- [@janhendry/nanostore-ipc-bridge](https://github.com/janhendry/nanostore-ipc-bridge) für automatische Main ↔ Renderer Sync
- Zero-Config Multi-Window Synchronisation mit Revision Tracking
- Universal Stores via `syncedAtom()` - eine Datei für Main & Renderer

> **⚙️ Alpha-Package — bewusste Entscheidung**: `@janhendry/nanostore-ipc-bridge` befindet sich im Alpha-Status (`0.1.0-alpha`). Das Package wird vom Projektautor selbst entwickelt und gepflegt. Breaking Changes sind bekannt und werden direkt kontrolliert. Es gibt keine externe Abhängigkeit von Drittpartei-Entscheidungen.

#### 8.3 Recording State Machine

- **States (Tier 1)**: idle, recording, processing, error, success
- **States (Tier 3)**: + paused (für Pause/Resume und Push-to-Talk)
- **Transitions**: Validierte State-Übergänge
  - START: idle → recording
  - STOP: recording → processing _(Tier 1)_ / recording|paused → processing _(Tier 3)_
  - CANCEL: recording → idle (ohne Transkription) _(Tier 1)_ / recording|paused → idle _(Tier 3)_
  - PAUSE: recording → paused _(Tier 3)_
  - RESUME: paused → recording _(Tier 3)_
  - PROCESSING_COMPLETE: processing → idle
  - PROCESSING_ERROR: processing → idle
- **Guards**: Nur erlaubte Aktionen je State
  - canStart(): true wenn idle
  - canStop(): true wenn recording _(Tier 1)_ / recording oder paused _(Tier 3)_
  - canCancel(): true wenn recording _(Tier 1)_ / recording oder paused _(Tier 3)_
  - canPause(): true wenn recording _(Tier 3)_
  - canResume(): true wenn paused _(Tier 3)_

> **Tier 3 — Pause/Resume & Push-to-Talk**: Pause/Resume ist dasselbe technische Feature wie Push-to-Talk (Shortcut halten = Recording läuft, loslassen = Pause). Beide Interaktionsmodelle nutzen `PAUSE`/`RESUME`-Transitions und werden gemeinsam in Tier 3 umgesetzt.

---

### 10. External Integrations

#### 10.1 OpenAI API

- **Whisper API**: Audio → Text Transcription mit optionalem Transcription-Prompt
- **GPT API**: Text Post-Processing mit konfigurierbarem Prompt
- **Custom Base URL**: Support für Proxies/Custom Endpoints

#### 10.2 FFmpeg Integration

**`ffmpeg-static` + `child_process.spawn()`** — gebündelte FFmpeg-Binary:

- ✅ **`ffmpeg-static`** (v5.3.0, FFmpeg 6.1.1): Plattformspezifische Binaries für macOS ARM64/x64, Windows x64
- ✅ **`child_process.spawn()`**: Direkter FFmpeg-Subprocess ohne Wrapper-Bibliothek
- ✅ **Kein fluent-ffmpeg**: Deprecated Mai 2025, archiviert, nicht kompatibel mit FFmpeg 6.x/7.x
- ✅ **electron-builder `extraResources`**: Binary wird beim Build eingebettet, Pfad via `process.resourcesPath`
- ✅ **Out-of-the-box**: Kein User-Setup für FFmpeg — App liefert eigene Binary mit

> **Hinweis BlackHole**: BlackHole bleibt "Bring Your Own" (macOS System-Audio) — es ist ein Audio-Treiber, kein Binary das gebündelt werden kann.

**Features**:

- Audio Recording für alle Modi (Mic, Output, Dual)
- Format Conversion (WAV → WebM/Opus) mit optimalen Parametern (`libopus`, `48k`, `vbr on`, `application=voip`)
- File-basierte I/O Pipeline (WAV-Datei → WebM-Datei → Upload)
- Device Enumeration
- Cross-platform Support (macOS Tier 1&2, Windows Tier 3)

**API-Kosten (Referenz aus Research)**:

| Nutzung    | Modell                 | Kosten/Monat |
| ---------- | ---------------------- | ------------ |
| 10 Min/Tag | gpt-4o-mini-transcribe | ~$0.66       |
| 30 Min/Tag | gpt-4o-mini-transcribe | ~$1.98       |
| 10 Min/Tag | whisper-1              | ~$1.20       |

→ `gpt-4o-mini-transcribe` ist günstiger und ausreichend für Sprach-Transkription

#### 10.3 BlackHole (macOS only)

- Virtual Audio Device für System-Audio Capture
- Multi-Output Device Routing
- Auto-Detection & Setup Guidance

---

## 🎬 USE CASES

### Use Case 0: First Run Setup

**Actor**: Neuer User  
**Ziel**: App zum ersten Mal einrichten und erste erfolgreiche Transkription durchführen  
**Schritte**:

1. WhisperFlow installieren und starten
2. **Settings Window öffnet sich automatisch** (kein API-Key erkannt, Tray zeigt `⚠️`)
3. **Whisper API-Key eingeben** → Live-Validierung läuft
4. Validierung erfolgreich → FFmpeg-Check läuft automatisch
5. FFmpeg fehlt → Installationsanleitung im Dependencies-Tab → User installiert: `brew install ffmpeg`
6. **„Re-Check"** Button → FFmpeg gefunden ✓
7. **„Test Recording"** Button → 3-Sekunden-Aufnahme + Transkription erscheint im Settings-Tab
8. Settings schließen → Tray normal, Shortcuts aktiv
9. `Cmd+Shift+M` → erste echte Aufnahme

**Features**: First Run Detection (5.6), API-Key Live-Validierung, Dependency Check (1.5), Test Recording

---

### Use Case 1: Dictation for Documentation

**Actor**: Developer/Writer  
**Ziel**: Dokumentation schneller schreiben  
**Schritte**:

1. `Cmd+Shift+M` drücken (Mic Recording)
2. Diktiere Dokumentation
3. `Cmd+Shift+M` erneut → Stop
4. **Text wird in Clipboard kopiert**
5. Öffne Markdown-Editor / Google Docs / Notion
6. **Cmd+V** → Text einfügen
7. Optional: Anpassungen vornehmen

**Features**: Mic Recording, Whisper mit Transcription-Prompt (z.B. "Markdown-Formatierung"), Optional Post-Processing (z.B. "Strukturiere als Dokumentation")

---

### Use Case 2: Meeting Transcription (Teams/Zoom)

**Actor**: Team Member  
**Ziel**: Meeting mitschneiden mit allen Teilnehmern  
**Schritte**:

1. Starte Zoom/Teams Meeting
2. **`Cmd+Shift+D` für Dual Recording** → Eigene Stimme (Mic) + alle anderen (System-Audio)
3. Meeting läuft
4. Am Ende: `Cmd+Shift+D` → Stop
5. Transkription läuft im Hintergrund
6. **Text in Clipboard** + Notification
7. Öffne Confluence/Notion
8. **Cmd+V** → Meeting-Notizen einfügen

**Features**: Dual Recording, BlackHole (macOS), Deferred Transcription, Optional Post-Processing (z.B. "Formatiere als Meeting-Notizen mit Agenda, Entscheidungen, Action Items")

---

### Use Case 3: Code Comments via Voice

**Actor**: Developer  
**Ziel**: Code-Kommentare per Sprache hinzufügen  
**Schritte**:

1. `Cmd+Shift+M` drücken
2. Beschreibe Funktion: "This function calculates the Fibonacci sequence recursively"
3. Stop Recording
4. **Text in Clipboard**
5. In IDE (VSCode): **Cmd+V** über Funktion
6. Optional: `//` davor einfügen

**Features**: Mic Recording, Transcription-Prompt (z.B. "Technische Begriffe: Fibonacci, recursive, algorithm")

---

### Use Case 4: Video Content Transcription

**Actor**: Content Creator  
**Ziel**: YouTube-Video transkribieren  
**Schritte**:

1. Öffne YouTube Video
2. **`Cmd+Shift+O` für System-Audio Recording**
3. Spiele Video ab
4. Stop Recording
5. **Transkription in Clipboard**
6. Öffne YouTube Studio
7. **Cmd+V** → Video-Beschreibung einfügen

**Features**: System Audio Recording, BlackHole (macOS)

---

### Use Case 5: Email Dictation mit Professionalität

**Actor**: Business Professional  
**Ziel**: E-Mails schneller schreiben, aber professionell  
**Schritte**:

1. `Cmd+Shift+M`
2. Diktiere E-Mail-Inhalt informell: "Hey sag ihm dass wir das Meeting verschieben müssen auf nächste Woche, hab noch andere Termine"
3. Stop
4. **Post-Processing aktiv** mit Prompt: "Formuliere als professionelle E-Mail mit Anrede, Grußformel und höflichem Ton"
5. **Fertiger Text in Clipboard**: "Sehr geehrter Herr X, hiermit möchte ich Sie darüber informieren..."
6. Gmail öffnen, **Cmd+V**

**Features**: Mic Recording, Post-Processing LLM mit Custom Prompt

---

### Use Case 6: Multi-Language Documentation

**Actor**: International Team  
**Ziel**: In verschiedenen Sprachen diktieren  
**Schritte**:

1. Diktiere auf Deutsch/Englisch/Spanisch
2. Whisper erkennt Sprache automatisch
3. Transcription-Prompt: "Technische Begriffe: API, OAuth2, Kubernetes - nicht übersetzen"
4. **Text in Clipboard** in korrekter Sprache
5. Einfügen in Dokumentation

**Features**: Multi-Language Detection, Transcription-Prompt mit Glossar

---

### Use Case 7: Podcast Episode Notes

**Actor**: Podcaster  
**Ziel**: Eigene Episode zusammenfassen  
**Schritte**:

1. Öffne Audio-Player mit Episode
2. **`Cmd+Shift+O`** (System Audio)
3. Spiele relevante Teile ab
4. Stop
5. **Post-Processing** mit Prompt: "Fasse in 5 Bullet Points zusammen und extrahiere Key-Quotes"
6. **Formatted Summary in Clipboard**
7. Einfügen in Show Notes

**Features**: System Audio Recording, Post-Processing LLM

---

### Use Case 8: Question & Answer Flow

**Actor**: Researcher  
**Ziel**: Frage stellen und Antwort erhalten  
**Schritte**:

1. `Cmd+Shift+M`
2. Diktiere Frage: "What are the main benefits of Kubernetes over traditional deployment?"
3. Stop
4. **Post-Processing** mit Prompt: "Beantworte diese Frage detailliert in 3-5 Absätzen"
5. **Antwort (nicht die Frage!) in Clipboard**
6. Einfügen in Dokument

**Features**: Mic Recording, Post-Processing LLM mit Custom Prompt

---

### Use Case 9: Recording History & Reuse

**Actor**: Writer  
**Ziel**: Alte Aufnahmen wiederfinden und wiederverwenden  
**Schritte**:

1. Öffne History Window
2. Suche nach "Quantum Computing"
3. Filtere nach Datum
4. Finde relevante Transkription
5. **Copy to Clipboard** Button
6. Einfügen wo gewünscht

**Features**: Storage, Search & Filter, Clipboard Copy

---

## 🛠️ MAIN PROCESS ARCHITEKTUR

### Architektur-Prinzipien

WhisperFlow folgt einer **3-Layer Architecture** mit klarer Trennung der Verantwortlichkeiten:

1. **Application Layer**: High-level Orchestration & Business Workflows
2. **Domain Layer**: Domain-spezifische Services & Business Logic
3. **Infrastructure Layer**: Low-level Technical Implementation & External Adapters

**Architektur-Entscheidungen**:

- ✅ **Service Container** mit Dependency Injection für zentrale Instanz-Verwaltung
- ✅ **Domain-Gruppierung** (Audio, Transcription, UI, System) für klare Modularität
- ✅ **Orchestrator-Pattern** für komplexe Multi-Service Workflows
- ✅ **Exception-based Error Handling**: Services werfen Errors, Orchestrator fängt und behandelt
- ✅ **Store Independence**: NanoStores sind unabhängig, Services schreiben über Actions
- ✅ **Interface-based Design**: Alle Services implementieren Interfaces für Testbarkeit
- ✅ **electron-vite** als Build-Tool: separater Build für Main, Preload, Renderer
- ✅ **TypeScript 3-Config-System**: `tsconfig.node.json` (Main/Preload) + `tsconfig.web.json` (Renderer) + `tsconfig.json` (References)
- ✅ **Preload per Fenstertyp**: Least-Privilege — jedes Fenster bekommt nur die APIs die es braucht

---

### 📁 Folder-Struktur

```
src/main/
├── app/
│   ├── ServiceContainer.ts              # Central DI Container
│   ├── AppLifecycleManager.ts           # Startup, Shutdown, Health Monitoring
│   └── orchestrators/
│       ├── RecordingOrchestrator.ts     # Recording Pipeline Coordination
│       ├── TranscriptionOrchestrator.ts # Transcription + Enhancement Flow
│       └── HistoryOrchestrator.ts       # History Management + Cleanup
│
├── domains/
│   ├── audio/
│   │   ├── services/
│   │   │   ├── AudioRecordingService.ts    # Recording Lifecycle (Start/Stop/Pause)
│   │   │   ├── AudioDeviceService.ts       # Device Management, Hot-plug
│   │   │   └── AudioStorageService.ts      # Save/Load Recordings, Metadata
│   │   ├── infrastructure/
│   │   │   ├── AudioRecorderFactory.ts     # Platform-specific Recorder Creation
│   │   │   ├── MacOSAudioRecorder.ts       # macOS Implementation
│   │   │   ├── WindowsAudioRecorder.ts     # Windows Implementation
│   │   │   ├── FFmpegAdapter.ts            # FFmpeg Process Wrapper
│   │   │   ├── BlackHoleAdapter.ts         # macOS Multi-Output Management
│   │   │   └── DeviceEnumerator.ts         # OS Audio Device Detection
│   │   └── types/
│   │       ├── IAudioRecorder.ts           # Recorder Interface
│   │       └── audio-types.ts              # Shared Audio Types
│   │
│   ├── transcription/
│   │   ├── services/
│   │   │   ├── TranscriptionService.ts     # Whisper + LLM Post-Processing
│   │   │   └── TranscriptionQueueService.ts # Background Queue Management
│   │   ├── infrastructure/
│   │   │   ├── WhisperAPIAdapter.ts        # OpenAI Whisper Client
│   │   │   └── LLMAPIAdapter.ts            # OpenAI GPT Client
│   │   └── types/
│   │       └── transcription-types.ts
│   │
│   ├── ui/
│   │   ├── services/
│   │   │   ├── WindowService.ts            # Window Lifecycle (Create/Show/Hide)
│   │   │   ├── TrayService.ts              # System Tray Management
│   │   │   ├── NotificationService.ts      # Snackbar + OS Notifications
│   │   │   ├── HUDService.ts               # HUD Window Management
│   │   │   └── ShortcutService.ts          # Global Shortcuts Registration
│   │   └── types/
│   │       └── ui-types.ts
│   │
│   └── system/
│       ├── services/
│       │   ├── SettingsService.ts          # Settings Persistence + Validation
│       │   ├── ClipboardService.ts         # Clipboard Operations
│       │   ├── HistoryService.ts           # History Management, Search
│       │   └── DependencyService.ts        # FFmpeg/BlackHole Detection
│       ├── infrastructure/
│       │   ├── DependencyChecker.ts        # System Dependency Detection
│       │   └── FileSystemAdapter.ts        # File Operations
│       └── types/
│           └── system-types.ts
│
└── stateMachines/
    └── recordingMachine.ts              # Recording State Machine (XState)

src/preload/
├── index.ts                             # Settings Window API (voller Zugriff)
├── hud.ts                               # HUD-only (nur onRecordingStatus, onTranscriptionUpdate)
└── snackbar.ts                          # Snackbar-only (nur onNotification)

src/shared/
├── ipc.ts                               # Typen für alle IPC-Channels (InvokeMap + EventMap)
├── stores/
│   ├── recordingStore.ts                # syncedAtom (synchronized to Renderer)
│   ├── transcriptionStore.ts            # syncedAtom
│   ├── settingsStore.ts                 # syncedAtom
│   ├── historyStore.ts                  # syncedAtom
│   └── uiStore.ts                       # syncedAtom
│   └── actions/
│       ├── recordingActions.ts          # Recording State Mutations
│       ├── transcriptionActions.ts      # Transcription State Mutations
│       ├── settingsActions.ts           # Settings Mutations
│       ├── historyActions.ts            # History Mutations
│       └── uiActions.ts                 # UI State Mutations
│
├── services/
│   ├── recordingService.ts              # defineService (universal: Main + Renderer)
│   ├── transcriptionService.ts          # defineService (universal: Main + Renderer)
│   ├── settingsService.ts               # defineService (universal: Main + Renderer)
│   ├── historyService.ts                # defineService (universal: Main + Renderer)
│   └── uiService.ts                     # defineService (universal: Main + Renderer)
│
└── types/
    ├── recording.ts
    ├── transcription.ts
    ├── settings.ts
    └── ui.ts
```

---

## 🏗️ Layer-by-Layer Breakdown

### 1️⃣ Application Layer (Orchestrators)

**Zweck**: Koordiniert komplexe Multi-Service Workflows, behandelt Fehler, aktualisiert State.

#### RecordingOrchestrator

**Verantwortlichkeiten**:

- Koordiniert gesamten Recording-Workflow
- Validiert Recording-Modus (Mic/Output/Dual)
- Orchestriert Services (AudioRecordingService, AudioStorageService, HUDService)
- Error Handling & State Updates

**Workflow**:

```typescript
class RecordingOrchestrator {
  constructor(
    private audioRecordingService: AudioRecordingService,
    private audioStorageService: AudioStorageService,
    private hudService: HUDService,
    private dependencyService: DependencyService,
  ) {}

  async startRecording(mode: RecordingMode): Promise<void> {
    try {
      // 1. Validate Dependencies
      await this.dependencyService.validateForMode(mode);

      // 2. Update State
      recordingActions.setState("recording");
      recordingActions.setMode(mode);

      // 3. Show HUD
      await this.hudService.show(mode);

      // 4. Start Recording
      await this.audioRecordingService.start(mode);
    } catch (error) {
      recordingActions.setState("error");
      recordingActions.setError(error.message);
      throw error; // Re-throw for IPC handler
    }
  }

  async stopRecording(): Promise<string> {
    try {
      // 1. Stop Recording
      const audioFile = await this.audioRecordingService.stop();

      // 2. Save to Storage
      const recordingId = await this.audioStorageService.save(audioFile);

      // 3. Update State
      recordingActions.setState("processing");
      recordingActions.setRecordingId(recordingId);

      // 4. Update HUD
      await this.hudService.showProcessing("transcribing");

      return recordingId;
    } catch (error) {
      recordingActions.setState("error");
      throw error;
    }
  }
}
```

---

#### TranscriptionOrchestrator

**Verantwortlichkeiten**:

- Koordiniert Transcription + Optional LLM Enhancement
- Verwaltet Transcription Queue
- Clipboard Integration
- Notification Handling

**Workflow**:

```typescript
class TranscriptionOrchestrator {
  constructor(
    private transcriptionService: TranscriptionService,
    private clipboardService: ClipboardService,
    private notificationService: NotificationService,
    private hudService: HUDService,
  ) {}

  async transcribeRecording(recordingId: string): Promise<void> {
    try {
      // 1. Update State
      transcriptionActions.setState("transcribing");

      // 2. Transcribe with Whisper
      const transcription =
        await this.transcriptionService.transcribe(recordingId);

      // 3. Optional: LLM Post-Processing
      let finalText = transcription;
      if (settingsStore.get().llm.enabled) {
        await this.hudService.showProcessing("enhancing");
        finalText = await this.transcriptionService.enhance(transcription);
      }

      // 4. Copy to Clipboard
      await this.clipboardService.copy(finalText);

      // 5. Update State
      transcriptionActions.setState("success");
      transcriptionActions.setTranscription(finalText);

      // 6. Show Success
      await this.hudService.showSuccess();
      await this.notificationService.success("Transcription ready");
    } catch (error) {
      transcriptionActions.setState("error");
      await this.hudService.showError(error.message);
      await this.notificationService.error(
        `Transcription failed: ${error.message}`,
      );
      throw error;
    }
  }
}
```

---

#### HistoryOrchestrator

**Verantwortlichkeiten**:

- Verwaltet Recording History
- Koordiniert Auto-Cleanup
- Search & Filter Logik

**Workflow**:

```typescript
class HistoryOrchestrator {
  constructor(
    private historyService: HistoryService,
    private audioStorageService: AudioStorageService,
  ) {}

  async performAutoCleanup(): Promise<void> {
    try {
      const settings = settingsStore.get();

      // Get recordings to cleanup
      const toCleanup = await this.historyService.getRecordingsForCleanup(
        settings.deleteAudioAfterDays,
        settings.deleteTranscriptionAfterDays,
        settings.keepFavorites,
      );

      // Delete files
      for (const recording of toCleanup) {
        if (recording.shouldDeleteAudio) {
          await this.audioStorageService.deleteAudio(recording.id);
        }
        if (recording.shouldDeleteTranscription) {
          await this.historyService.deleteRecording(recording.id);
        }
      }

      // Update State
      historyActions.removeRecordings(toCleanup.map((r) => r.id));
    } catch (error) {
      console.error("Auto-cleanup failed:", error);
      // Non-critical error - don't throw
    }
  }
}
```

---

### 2️⃣ Domain Layer (Services)

**Zweck**: Domain-spezifische Business Logic, keine UI oder externe Abhängigkeiten.

#### Audio Domain

**AudioRecordingService**:

- `start(mode: RecordingMode): Promise<void>` - Startet Recording
- `stop(): Promise<string>` - Stoppt und liefert Audio-File Path
- `pause(): Promise<void>` - Pausiert Recording
- `resume(): Promise<void>` - Setzt Recording fort
- `cancel(): Promise<void>` - Bricht ab ohne zu speichern

**AudioDeviceService**:

- `listDevices(): Promise<AudioDevice[]>` - Listet verfügbare Devices
- `getDefaultDevice(type: 'input' | 'output'): Promise<AudioDevice>` - Default Device
- `watchDeviceChanges(callback: (devices) => void): void` - Hot-plug Detection

**AudioStorageService**:

- `save(audioFile: string, metadata: RecordingMetadata): Promise<string>` - Speichert Recording
- `load(id: string): Promise<Recording>` - Lädt Recording
- `delete(id: string): Promise<void>` - Löscht Recording
- `deleteAudio(id: string): Promise<void>` - Löscht nur Audio, behält Metadata
- `getStorageStats(): Promise<StorageStats>` - Storage-Statistiken

---

#### Transcription Domain

**TranscriptionService**:

- `transcribe(recordingId: string): Promise<string>` - Whisper Transcription
- `enhance(text: string): Promise<string>` - LLM Post-Processing
- `validateAPIKey(type: 'whisper' | 'llm'): Promise<boolean>` - API Key Test

**TranscriptionQueueService** _(Tier 2)_:

> In **Tier 1** transkribiert der `TranscriptionOrchestrator` synchron direkt — die State Machine verhindert parallele Recordings, daher ist keine Queue nötig. Der Queue-Service wird in **Tier 2** integriert, wenn Hintergrund-Transkription gewünscht ist (neue Aufnahme starten während vorherige noch transkribiert).

- `enqueue(recordingId: string): Promise<void>` - Fügt zu Queue hinzu
- `getQueueStatus(): QueueStatus` - Queue-Status
- `clearQueue(): Promise<void>` - Leert Queue

---

#### UI Domain

**WindowService**:

- `create(type: WindowType, options?: WindowOptions): BrowserWindow` - Erstellt Window
- `show(type: WindowType): void` - Zeigt Window
- `hide(type: WindowType): void` - Versteckt Window
- `getWindow(type: WindowType): BrowserWindow | null` - Holt Window-Instanz

**TrayService**:

- `initialize(): void` - Erstellt Tray Icon
- `updateStatus(status: RecordingStatus): void` - Aktualisiert Icon
- `updateMenu(items: MenuItemOptions[]): void` - Aktualisiert Menu

**NotificationService**:

- `success(message: string): Promise<void>` - Success Notification
- `error(message: string): Promise<void>` - Error Notification
- `warning(message: string): Promise<void>` - Warning Notification
- `info(message: string): Promise<void>` - Info Notification

**HUDService**:

- `show(mode: RecordingMode): Promise<void>` - Zeigt HUD für Recording
- `showProcessing(type: 'transcribing' | 'enhancing'): Promise<void>` - Processing State
- `showSuccess(): Promise<void>` - Success State
- `showError(message: string): Promise<void>` - Error State
- `hide(): Promise<void>` - Versteckt HUD

**ShortcutService**:

- `register(shortcuts: ShortcutMap): void` - Registriert Shortcuts
- `unregister(shortcut: string): void` - Deregistriert Shortcut
- `validateShortcut(shortcut: string): boolean` - Validiert Format
- `detectConflicts(shortcuts: ShortcutMap): string[]` - Findet Konflikte

---

#### System Domain

**SettingsService**:

- `load(): Promise<AppSettings>` - Lädt Settings
- `save(settings: Partial<AppSettings>): Promise<void>` - Speichert Settings
- `validate(settings: AppSettings): ValidationResult` - Validiert Settings
- `reset(): Promise<void>` - Reset zu Defaults
- `export(): Promise<string>` - Exportiert Settings als JSON
- `import(json: string): Promise<void>` - Importiert Settings

**ClipboardService**:

- `copy(text: string): Promise<void>` - Kopiert zu Clipboard
- `read(): Promise<string>` - Liest Clipboard
- `backup(): string` - Sichert aktuellen Clipboard
- `restore(backup: string): Promise<void>` - Stellt Backup wieder her

**HistoryService**:

- `getAll(): Promise<Recording[]>` - Alle Recordings
- `search(query: string): Promise<Recording[]>` - Suche
- `filter(filters: HistoryFilters): Promise<Recording[]>` - Filter
- `getRecordingsForCleanup(...): Promise<RecordingCleanupInfo[]>` - Cleanup-Kandidaten
- `deleteRecording(id: string): Promise<void>` - Löscht Recording komplett

**DependencyService**:

- `checkFFmpeg(): Promise<DependencyStatus>` - FFmpeg Status
- `checkBlackHole(): Promise<DependencyStatus>` - BlackHole Status (macOS)
- `validateForMode(mode: RecordingMode): Promise<void>` - Throws wenn Dependencies fehlen
- `getInstallationInstructions(dep: string): string` - Installation Guide

---

### 3️⃣ Infrastructure Layer (Adapters)

**Zweck**: Low-level Implementation, OS-spezifischer Code, externe API Clients.

#### Audio Infrastructure

**AudioRecorderFactory**:

- `create(mode: RecordingMode): IAudioRecorder` - Erstellt OS-spezifischen Recorder

**MacOSAudioRecorder / WindowsAudioRecorder**:

- Implementieren `IAudioRecorder` Interface
- Platform-spezifische Recording-Logik

**FFmpegAdapter**:

> **Implementierung**: `child_process.spawn()` + `ffmpeg-static`. FFmpeg-Pfad via `require('ffmpeg-static')`. Kein `fluent-ffmpeg` (deprecated Mai 2025).

```typescript
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
// ffmpegPath = '/path/to/bundled/ffmpeg' (automatisch aus ffmpeg-static)
```

- `startRecording(options: FFmpegOptions): FFmpegProcess` - Startet FFmpeg via `spawn(ffmpegPath, args)`
- `stopRecording(process: FFmpegProcess): Promise<string>` - Stoppt und liefert WebM-File-Path
- `convert(inputWav: string, outputWebm: string): Promise<void>` - WAV → WebM/Opus (file-basiert)

**BlackHoleAdapter** (macOS only):

- `isInstalled(): Promise<boolean>` - Prüft Installation
- `createMultiOutputDevice(): Promise<string>` - Erstellt Multi-Output Device
- `deleteMultiOutputDevice(id: string): Promise<void>` - Löscht Device

**DeviceEnumerator**:

- `enumerateDevices(): Promise<AudioDevice[]>` - OS-spezifische Device-Liste

---

#### Transcription Infrastructure

**WhisperAPIAdapter**:

- `transcribe(audioFile: string, options: WhisperOptions): Promise<string>` - Whisper API Call

**LLMAPIAdapter**:

- `complete(prompt: string, text: string, options: LLMOptions): Promise<string>` - GPT API Call

---

#### System Infrastructure

**DependencyChecker**:

- `checkCommand(command: string): Promise<boolean>` - Prüft ob Command verfügbar
- `getVersion(command: string): Promise<string>` - Version auslesen
- `findInPath(command: string): Promise<string | null>` - Path Resolution

**FileSystemAdapter**:

- `exists(path: string): Promise<boolean>` - File/Folder Existenz
- `createDirectory(path: string): Promise<void>` - Ordner erstellen
- `deleteFile(path: string): Promise<void>` - File löschen
- `getFileSize(path: string): Promise<number>` - Dateigröße
- `calculateDirectorySize(path: string): Promise<number>` - Ordner-Größe

---

### 🎯 Service Container & Dependency Injection

**ServiceContainer** verwaltet alle Service-Instanzen zentral:

```typescript
// app/ServiceContainer.ts
class ServiceContainer {
  private services = new Map<string, any>();

  // Register Factories
  register<T>(name: string, factory: (container: ServiceContainer) => T): void {
    this.services.set(name, { factory, instance: null });
  }

  // Get Service (lazy instantiation)
  get<T>(name: string): T {
    const entry = this.services.get(name);
    if (!entry.instance) {
      entry.instance = entry.factory(this);
    }
    return entry.instance;
  }

  // Initialize all services
  initializeAll(): void {
    for (const [name] of this.services) {
      this.get(name); // Trigger instantiation
    }
  }
}

// Service Registration (in main/index.ts)
const container = new ServiceContainer();

// Infrastructure Layer
container.register("ffmpegAdapter", () => new FFmpegAdapter());
container.register("whisperAPIAdapter", () => new WhisperAPIAdapter());
container.register("llmAPIAdapter", () => new LLMAPIAdapter());
container.register("dependencyChecker", () => new DependencyChecker());
container.register("fileSystemAdapter", () => new FileSystemAdapter());

// Domain Services
container.register(
  "audioRecordingService",
  (c) =>
    new AudioRecordingService(
      c.get("ffmpegAdapter"),
      c.get("audioDeviceService"),
    ),
);
container.register(
  "transcriptionService",
  (c) =>
    new TranscriptionService(
      c.get("whisperAPIAdapter"),
      c.get("llmAPIAdapter"),
    ),
);
container.register("windowService", () => new WindowService());
container.register("clipboardService", () => new ClipboardService());
// ... alle Services registrieren

// Orchestrators
container.register(
  "recordingOrchestrator",
  (c) =>
    new RecordingOrchestrator(
      c.get("audioRecordingService"),
      c.get("audioStorageService"),
      c.get("hudService"),
      c.get("dependencyService"),
    ),
);
container.register(
  "transcriptionOrchestrator",
  (c) =>
    new TranscriptionOrchestrator(
      c.get("transcriptionService"),
      c.get("clipboardService"),
      c.get("notificationService"),
      c.get("hudService"),
    ),
);

// Export Container
export { container };
```

---

### 🌉 Bridge Services (IPC Communication)

**Bridge Services** nutzen die `@janhendry/nanostore-ipc-bridge` Library für automatische RPC-Calls zwischen Main und Renderer.

**Pattern**: `defineService()` in `shared/services/` - **einheitlich für ALLE Services**

**State-Updates**: PRIMARY über **Store Actions** (automatisch synchronisiert)  
**Events**: OPTIONAL für Real-time Zusatzinfos (Audio Level, Notifications)

```typescript
// shared/services/recordingService.ts
import { defineService } from "@janhendry/nanostore-ipc-bridge/services";
import type { RecordingMode } from "../types";

export const recordingService = defineService("recording", {
  async start(mode: RecordingMode): Promise<void> {
    const orchestrator = container.get("recordingOrchestrator");
    await orchestrator.startRecording(mode);
    // ✅ State-Update via Store Actions im Orchestrator
    // ✅ Store Sync automatisch via nanostore-ipc-bridge
  },

  async stop(): Promise<string> {
    const orchestrator = container.get("recordingOrchestrator");
    const recordingId = await orchestrator.stopRecording();
    // ✅ State-Update via recordingActions.setState('idle') im Orchestrator
    return recordingId;
  },

  async pause(): Promise<void> {
    await container.get("recordingOrchestrator").pauseRecording();
  },

  async resume(): Promise<void> {
    await container.get("recordingOrchestrator").resumeRecording();
  },

  async cancel(): Promise<void> {
    await container.get("recordingOrchestrator").cancelRecording();
  },
});

// OPTIONAL: Events für Real-time Updates OHNE State
export function broadcastAudioLevel(level: number) {
  recordingService.broadcast("audioLevel", { level });
  // ⚠️ Nicht für State! Nur für UI-Visualisierung
}
```

**Usage im Renderer** (direkter Import):

```typescript
// Renderer: Direkter Import aus shared/services/
import { useStore } from '@nanostores/react'
import { recordingStore } from '@/shared/stores/recordingStore'
import { recordingService } from '@/shared/services/recordingService' // ✅ Direct import!

function RecordingButton() {
  const recording = useStore(recordingStore)

  const handleStart = async () => {
    try {
      // ✅ RPC Call via direkten Service-Import
      await recordingService.start('mic')
      // ✅ Store Update automatisch → React re-render
      // recording.state ist jetzt 'recording'
    } catch (error) {
      console.error('Recording failed:', error.message)
    }
  }

  return (
    <button onClick={handleStart} disabled={recording.state !== 'idle'}>
      {recording.state === 'idle' ? 'Start Recording' : recording.state}
    </button>
  )
}
```

**Service Definition Beispiele**:

```typescript
// shared/services/settingsService.ts
export const settingsService = defineService("settings", {
  async save(settings: Partial<AppSettings>) {
    await container.get("settingsService").save(settings);
  },
  async reset() {
    await container.get("settingsService").reset();
  },
});

// shared/services/transcriptionService.ts
export const transcriptionService = defineService("transcription", {
  async transcribe(recordingId: string) {
    await container
      .get("transcriptionOrchestrator")
      .transcribeRecording(recordingId);
  },
  async getQueueStatus() {
    return await container.get("transcriptionOrchestrator").getQueueStatus();
  },
});
```

**Vorteile des defineService() Patterns**:

✅ **Kein manuelles IPC**: `ipcMain.handle()` / `ipcRenderer.invoke()` nicht nötig  
✅ **Universal**: Eine Definition für Main UND Renderer (direkter Import)  
✅ **Type-Safe**: TypeScript-Support für alle Service Calls  
✅ **Automatische Serialisierung**: Komplexe Objects werden automatisch übertragen  
✅ **Error Propagation**: Exceptions werden automatisch durchgereicht  
✅ **Clean API**: Renderer-Code sieht aus wie lokale Function-Calls  
✅ **Store Sync automatisch**: State-Updates via Actions → Auto-Sync zu allen Renderer  
✅ **Events optional**: Für Real-time Updates ohne State (Audio Level, Notifications)

---

### 📦 Store Architecture & Actions

**Stores sind komplett unabhängig** von Services. Services schreiben über **Actions**:

```typescript
// stores/recordingStore.ts
import { atom } from "nanostores";

export const recordingStore = atom<RecordingState>({
  state: "idle",
  mode: null,
  duration: 0,
  error: null,
  recordingId: null,
});

// stores/actions/recordingActions.ts
import { recordingStore } from "../recordingStore";

export const recordingActions = {
  setState(state: RecordingState["state"]) {
    recordingStore.set({ ...recordingStore.get(), state });
  },

  setMode(mode: RecordingMode) {
    recordingStore.set({ ...recordingStore.get(), mode });
  },

  setDuration(duration: number) {
    recordingStore.set({ ...recordingStore.get(), duration });
  },

  setError(error: string | null) {
    recordingStore.set({ ...recordingStore.get(), error });
  },

  setRecordingId(recordingId: string | null) {
    recordingStore.set({ ...recordingStore.get(), recordingId });
  },

  reset() {
    recordingStore.set({
      state: "idle",
      mode: null,
      duration: 0,
      error: null,
      recordingId: null,
    });
  },
};
```

**Services nutzen Actions**:

```typescript
// In RecordingOrchestrator
import { recordingActions } from "../../stores/actions/recordingActions";

recordingActions.setState("recording");
recordingActions.setMode(mode);
```

---

### ⚠️ Error Handling Strategy

**Principle**: Services werfen Exceptions, Orchestrator fängt und behandelt.

```typescript
// Service Level - Wirft Errors
class AudioRecordingService {
  async start(mode: RecordingMode): Promise<void> {
    if (!this.isValidMode(mode)) {
      throw new Error(`Invalid recording mode: ${mode}`);
    }

    const devices = await this.audioDeviceService.listDevices();
    if (devices.length === 0) {
      throw new Error("No audio devices found");
    }

    // Start recording...
  }
}

// Orchestrator Level - Fängt Errors
class RecordingOrchestrator {
  async startRecording(mode: RecordingMode): Promise<void> {
    try {
      await this.audioRecordingService.start(mode);
      recordingActions.setState("recording");
    } catch (error) {
      // Handle error
      recordingActions.setState("error");
      recordingActions.setError(error.message);

      // Show user feedback
      await this.notificationService.error(
        `Recording failed: ${error.message}`,
      );

      // Re-throw for IPC layer
      throw error;
    }
  }
}

// Service Definition - Error-Propagation automatisch
export const recordingService = defineService("recording", {
  async start(mode: RecordingMode) {
    // Exceptions werden automatisch an Renderer propagiert
    await container.get("recordingOrchestrator").startRecording(mode);
  },
});

// Renderer - Direkter Import und Error Handling
import { recordingService } from "@/shared/services/recordingService";

async function startRecording() {
  try {
    await recordingService.start("mic");
    // Success - Store Update kommt automatisch via Store Actions + Auto-Sync
  } catch (error) {
    // Error wurde vom Orchestrator geworfen und automatisch übertragen
    console.error("Recording failed:", error.message);
  }
}
```

---

### 🌉 Bridge Services Übersicht

Alle Orchestrators werden via defineService() exposed:

**recordingService.ts** (`shared/services/`):

- `start(mode)` → RecordingOrchestrator.startRecording() → Store Actions
- `stop()` → RecordingOrchestrator.stopRecording() → Store Actions
- `pause()` → RecordingOrchestrator.pauseRecording() → Store Actions
- `resume()` → RecordingOrchestrator.resumeRecording() → Store Actions
- `cancel()` → RecordingOrchestrator.cancelRecording() → Store Actions
- Events: `audioLevel` (optional, für Visualizer)

**transcriptionService.ts** (`shared/services/`):

- `transcribe(recordingId)` → TranscriptionOrchestrator.transcribeRecording() → Store Actions
- `getQueueStatus()` → TranscriptionOrchestrator.getQueueStatus()
- Events: `transcriptionProgress` (optional, für Progress Bar)

**settingsService.ts** (`shared/services/`):

- `save(settings)` → SettingsService.save() → Store Actions
- `reset()` → SettingsService.reset() → Store Actions
- `validate(settings)` → SettingsService.validate()
- `export()` → SettingsService.export()
- `import(json)` → SettingsService.import()

**historyService.ts** (`shared/services/`):

- `getAll()` → HistoryService.getAll()
- `search(query)` → HistoryService.search()
- `filter(filters)` → HistoryService.filter()
- `delete(id)` → HistoryService.deleteRecording() → Store Actions
- `copyToClipboard(id)` → ClipboardService.copy()

**uiService.ts** (`shared/services/`):

- `showWindow(type)` → WindowService.show() → Store Actions
- `hideWindow(type)` → WindowService.hide() → Store Actions
- `registerShortcut(key, action)` → ShortcutService.register()
- `showNotification(type, message)` → NotificationService[type]()

**Wichtig**:

- Services delegieren an Orchestrators - KEINE Business Logic!
- State-Updates via **Store Actions** im Orchestrator
- Store Sync automatisch via nanostore-ipc-bridge
- Events OPTIONAL für Real-time Updates ohne State

---

### 🔄 AppLifecycleManager

Zentrale Koordination von Startup, Shutdown, Health Checks:

```typescript
// app/AppLifecycleManager.ts
class AppLifecycleManager {
  constructor(private container: ServiceContainer) {}

  async startup(): Promise<void> {
    console.log("🚀 Starting WhisperFlow...");

    // 1. Validate Dependencies
    const dependencyService =
      this.container.get<DependencyService>("dependencyService");
    const ffmpegStatus = await dependencyService.checkFFmpeg();

    if (ffmpegStatus.status === "missing") {
      console.warn("⚠️ FFmpeg not found - recording will not work");
    }

    // 2. Load Settings
    const settingsService =
      this.container.get<SettingsService>("settingsService");
    await settingsService.load();

    // 3. Initialize Services
    this.container.initializeAll();

    // 4. Initialize Stores & IPC Bridge
    await this.initializeStoresAndBridge();

    // 5. Services sind bereits definiert in shared/services/
    // defineService() macht sie automatisch verfügbar

    // 6. Initialize Tray
    const trayService = this.container.get<TrayService>("trayService");
    trayService.initialize();

    // 7. Register Shortcuts
    const shortcutService =
      this.container.get<ShortcutService>("shortcutService");
    const settings = settingsStore.get();
    shortcutService.register(settings.shortcuts);

    // 8. Start Auto-Cleanup (daily)
    this.startAutoCleanup();

    console.log("✅ WhisperFlow started successfully");
  }

  async shutdown(): Promise<void> {
    console.log("👋 Shutting down WhisperFlow...");

    // Stop any running recordings
    const recordingOrchestrator = this.container.get("recordingOrchestrator");
    await recordingOrchestrator.cancelRecording();

    // Save settings
    const settingsService = this.container.get("settingsService");
    await settingsService.save(settingsStore.get());

    console.log("✅ WhisperFlow shut down cleanly");
  }

  private startAutoCleanup(): void {
    const historyOrchestrator = this.container.get("historyOrchestrator");

    // Run daily at 3 AM
    setInterval(
      async () => {
        console.log("🧹 Running auto-cleanup...");
        await historyOrchestrator.performAutoCleanup();
      },
      24 * 60 * 60 * 1000,
    );
  }
}
```

---

## ✅ Architektur-Vorteile

### ✅ Klare Trennung der Verantwortlichkeiten

- **Application Layer**: High-level Workflows
- **Domain Layer**: Business Logic
- **Infrastructure Layer**: Technical Details

### ✅ Testbarkeit

- Services mit Interfaces → einfach zu mocken
- Dependency Injection → Austauschbare Dependencies

**Testing-Strategie: Ausschließlich manuelle Tests.**

Keine automatisierten Tests (kein Vitest, kein Playwright). Alle Verifikation erfolgt manuell:

| Bereich                | Manuelle Test-Szenarien                                  |
| ---------------------- | -------------------------------------------------------- |
| Recording-Workflow     | Start/Stop/Cancel für alle drei Modi (Mic, Output, Dual) |
| HUD-States             | Recording → Processing → Success/Error visuell prüfen    |
| Shortcut-Verhalten     | Globale Shortcuts in verschiedenen Apps testen           |
| Settings-Persistenz    | Einstellungen setzen, App neu starten, Werte prüfen      |
| Dependency-Checks      | FFmpeg + BlackHole installed/not-installed Szenarien     |
| Onboarding / First Run | Kein API-Key → Gate → Key eingeben → Ready-State         |
| Transkription          | Aufnahme → Whisper API → Clipboard-Output prüfen         |
| Multi-Window           | HUD + Snackbar + Settings gleichzeitig prüfen            |

Explizit **keine** automatisierten Unit Tests, E2E Tests oder CI-Test-Pipelines.

### ✅ Wartbarkeit

- Domain-Gruppierung → klare Struktur
- Orchestrators → komplexe Logik an einem Ort
- Service Container → zentrale Instanz-Verwaltung

### ✅ Skalierbarkeit

- Neue Features = neue Services in passender Domain
- Neue Workflows = neue Orchestrators
- Neue Stores = neue Actions

### ✅ Error Handling

- Exceptions werfen auf Service-Level
- Orchestrator fängt und behandelt
- Konsistente Error-Propagation

### ✅ Store Independence

```typescript
// Main Process — Global uncaught exceptions
process.on("uncaughtException", (err) => {
  log.error("Uncaught Exception:", err);
  // Graceful shutdown versuchen, dann Fehlermeldung zeigen
});
process.on("unhandledRejection", (reason) => {
  log.error("Unhandled Rejection:", reason);
});
```

```tsx
// Renderer — React ErrorBoundary
<ErrorBoundary fallback={<ErrorScreen message={error.message} />}>
  <App />
</ErrorBoundary>
```

- **Logging**: `electron-log` für strukturiertes Logging in Main + Renderer (schreibt in `~/Library/Logs/WhisperFlow/`)
- **Crash Reporting (optional Tier 2)**: `@sentry/electron` — initialisiert separat in Main, Preload und Renderer
- **Service-Level**: Services werfen typisierte Errors (`WhisperAPIError`, `FFmpegError`, `RecordingError`), Orchestrator fängt und behandelt

---

### ✅ Auto-Updates

**electron-updater** für automatische Updates über GitHub Releases:

```typescript
// main/index.ts
import { autoUpdater } from "electron-updater";

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on("update-available", () => {
  // Benutzer informieren
});
autoUpdater.on("update-downloaded", () => {
  // Neustart-Prompt zeigen
});
```

- **Voraussetzung**: `zip`-Target in electron-builder (zusätzlich zu `dmg`) — bereits in Build-Config enthalten
- **Hosting**: GitHub Releases (kostenlos für Open Source / kleine Apps)
- **macOS**: Code-Signing + Notarization Pflicht für Auto-Updates

---

### ✅ CI/CD macOS Signing + Notarization

Vollständig automatisierbar in **GitHub Actions** (`macos-latest`):

| Secret             | Zweck                                              |
| ------------------ | -------------------------------------------------- |
| `CSC_LINK`         | Base64-kodiertes `.p12` Developer ID Zertifikat    |
| `CSC_KEY_PASSWORD` | Zertifikat-Passwort                                |
| `APPLE_API_KEY_ID` | Apple API Key ID (Notarization)                    |
| `APPLE_API_KEY`    | Apple API Key `.p8` Datei (Base64)                 |
| `APPLE_API_ISSUER` | Apple Issuer UUID                                  |
| `GH_TOKEN`         | GitHub Token für Release-Upload (electron-updater) |

> **Warum API Key statt Apple ID?** API Keys können jederzeit widerrufen werden, rotieren nicht mit dem Account-Passwort und sind für CI/CD sicherer als `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD`.

---

## 🔌 EXTERNE DEPENDENCIES

### Runtime Dependencies

- **FFmpeg** (Required): Audio Recording & Conversion für alle Modi
- **BlackHole** (Optional, macOS only): System Audio Capture für Output- und Dual-Modus
- **OpenAI API** (Required): Whisper Transcription, Optional GPT Post-Processing
- **@janhendry/nanostore-ipc-bridge**: State Sync Main ↔ Renderer

### NPM Dependencies (Auswahl)

```json
{
  "openai": "^4.20.0", // OpenAI API Client
  "electron-store": "^8.1.0", // Persistent Settings
  "ffmpeg-static": "^5.3.0", // Gebündelte FFmpeg-Binary (macOS ARM64/x64, Windows x64)
  "nanostores": "^0.11.4", // State Management
  "@nanostores/react": "^1.0.0", // React Integration
  "react": "^19.1.0", // UI Framework
  "framer-motion": "^12.23.12", // Animations
  "zod": "^3.25.76", // Validation
  "tailwindcss": "^3.4.0" // Styling
  "janhendry/nanostore-ipc-bridge": "^0.1.0-alpha" // Main ↔ Renderer Sync — Alpha, vom Projektautor gepflegt
}
```

### Dev Dependencies (Auswahl)

```json
{
  "electron": "^37.2.3",
  "electron-builder": "^25.1.8",
  "electron-vite": "^5.0.0", // Build-Tool: Main + Preload (Rollup) + Renderer (Vite) in einer Config
  "vite": "^7.0.5", // Intern von electron-vite gemanagt
  "typescript": "^5.8.3",
  "@biomejs/biome": "^2.2.0"
}
```

---

## 🏗️ ARCHITEKTUR-HIGHLIGHTS

### Electron Multi-Process

```
Main Process (Node.js)
├── Services (Audio, API, Storage, Clipboard, etc.)
├── Stores (NanoStores)
└── Window Management

Renderer Process (React)
├── UI Components
├── Hooks & State

Preload Scripts (pro Fenstertyp — Least-Privilege)
├── index.ts     → Settings Window (voller API-Zugriff)
├── hud.ts       → HUD (nur Status-Events)
└── snackbar.ts  → Snackbar (nur Notification-Events)

IPC-Architektur
├── contextIsolation: true (Pflicht seit Electron 12)
├── contextBridge.exposeInMainWorld() — einziger sicherer Weg
├── ipcRenderer.invoke / ipcMain.handle — Request-Response
└── webContents.send / ipcRenderer.on — Main→Renderer Push-Events
```

### Audio Recording Pipeline (Aktualisiert)

```
User Trigger
    ↓
Global Shortcut (Mic/Output/Dual)
    ↓
Recording State Machine (Validate)
    ↓
AudioRecorderFactory → OS-specific Recorder (macOS/Windows)
    ↓
FFmpeg Process (Recording)
    ↓
Audio Buffer (WAV)
    ↓
Conversion (WAV → WebM/Opus)
    ↓
Whisper API (Transcription + Optional Transcription-Prompt)
    ↓
[Optional] GPT API (Post-Processing mit Custom Prompt)
    ↓
Clipboard Manager (Copy to Clipboard)
    ↓
System Notification ("Transkription bereit")
    ↓
[Optional] Storage (Recording + Metadata)
    ↓
State Machine → success → idle
```

### State Synchronization

```
Renderer User Action
    ↓
Bridge Service RPC (recordingService.start())
    ↓
Main Process Service Logic
    ↓
Main Process Store Update (recordingActions.*)
    ↓
syncedAtom() Update
    ↓
nanostore-ipc-bridge (wf:ns:update + Revision #)
    ↓
All Renderer Processes (Multi-Window)
    ↓
React Hook Updates (useStore)
    ↓
UI Re-render
```

**Kritisch**: Renderer darf State NICHT direkt ändern (`allowRendererSet: false`). Alle State-Änderungen erfolgen über **defineService()** RPC-Calls → Orchestrator → **Store Actions** im Main Process.

---

## 📊 MONITORING & ANALYTICS

1. **Initialization Monitoring**: Startup Health Checks
2. **Dependency Status**: FFmpeg/BlackHole Detection
3. **Error Tracking**: Strukturierte Error-Reports
4. **Usage Statistics**: Storage, Transcriptions, etc.

---

## 📝 EDGE CASES & FEATURES

1. **Lange Aufnahmen**: Max Duration (konfigurierbar, Standard keine Begrenzung)
2. **Silence Detection**: Auto-Stop bei Stille (optional)
3. **Device Hot-plug**: Automatische Anpassung bei Gerätewechsel
4. **API Failures**: keine retry Logic, Error Messages in UI
5. **Disk Full**: Storage Limits, Auto-Cleanup
6. **Permission Denied**: Hilfestellung für User (Mikrofon-Zugriff)
7. **Concurrent Recordings**: Verhindert durch State Machine
8. **Multi-Monitor**: HUD erscheint auf aktuellem Monitor
9. **Background Mode**: App läuft auch ohne offenes Fenster
10. **FFmpeg (gebündelt via `ffmpeg-static`)**: Keine User-Installation nötig. Bei Binary-Pfad-Fehler (z.B. nach Update): klare Fehlermeldung mit Restart-Hinweis
11. **BlackHole Missing (macOS)**: Nur Mic-Modus verfügbar, Hinweis in UI

---

### Linux Support

**Grund**: Fokus auf macOS und Windows

Linux Support wird nicht implementiert, um Entwicklungszeit zu sparen und die Hauptplattformen zu priorisieren.

---

## ✅ ZUSAMMENFASSUNG

WhisperFlow 2.0 ist eine **fokussierte Voice-to-Text Lösung** mit:

### Core Features

- ✅ **3 Recording Modi** (Mic, System, Dual) für unterschiedliche Situationen
- ✅ **FFmpeg-basierte Audio-Pipeline** mit High-Quality Recording
- ✅ **Zwei-Stufen-Prompt-System**:
  - Transcription-Prompt (Glossar/Stil für Whisper)
  - Post-Processing-Prompt (Text-Transformation via LLM)
- ✅ **Clipboard-Only Output** - Keine automatische Insertion
- ✅ **Recording History** mit Search & Filter
- ✅ **System Tray + HUD** für minimale UI
- ✅ **Global Shortcuts** für alle Modi
- ✅ **macOS Support** (Tier 1 & 2) — Windows Port geplant für Tier 3 (kein Linux)
- ✅ **Dependency Management** mit Status-Anzeige
- ✅ **Modern Stack** (Electron, React 19, TypeScript, Tailwind)

### Removed Features

- ❌ Context-Awareness / Auto-Insertion
- ❌ Linux Support

### Target Users

- Developers (Dokumentation, Code-Comments)
- Business Professionals (E-Mails, Meeting-Notizen)
- Content Creators (Video-Transkription)
- Researchers (Notizen, Zusammenfassungen)
- Teams (Meeting-Transkriptionen mit Dual-Recording)

**Kernvorteil**: Schnelle, hochqualitative Transkription mit voller Kontrolle über Output und Formatierung.
