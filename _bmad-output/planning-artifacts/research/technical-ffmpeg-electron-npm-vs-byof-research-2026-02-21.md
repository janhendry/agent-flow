---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: "research"
lastStep: 6
research_type: "technical"
research_topic: "FFmpeg Electron Integration - npm-basiert vs. Bring Your Own FFmpeg (BYOF)"
research_goals: "Bewertung der optimalen FFmpeg-Integrationsstrategie für WhisperFlow (Electron-Desktop-App, macOS Tier 1): Developer Experience, Deployment-Komplexität, Lizenzierung, Wartbarkeit und Nutzer-Onboarding"
user_name: "Yoda"
date: "2026-02-21"
web_research_enabled: true
source_verification: true
---

# FFmpeg-Distribution für Electron-Desktop-Apps: npm-Bundle vs. Bring Your Own FFmpeg — Technische Entscheidungsanalyse für WhisperFlow

## Executive Summary

WhisperFlow benötigt FFmpeg für die WAV → WebM/Opus-Audio-Pipeline. Die zentrale Architekturentscheidung lautet: **FFmpeg automatisch via npm bundeln** oder **BYOF (Bring Your Own FFmpeg) voraussetzen**. Diese Recherche analysiert beide Strategien und leitet eine klare Empfehlung für den MVP ab.

**Kernbefund:** Die klare Entscheidung für WhisperFlow lautet: **`ffmpeg-static` via npm + electron-builder `extraResources`**. Das Package ist aktiv gepflegt, unterstützt macOS ARM64/x64, und ist der Community-Standard für FFmpeg in Electron-Apps. Die GPL-Lizenz ist für WhisperFlow akzeptiert.

**Kritische Fakten (Stand Feb 2026):**

- `ffmpeg-static` v5.3.0 — **aktiv gepflegt** (Nov 2025), FFmpeg 6.1.1, macOS ARM64 + x64 ✅
- `ffmpeg-static` ist **GPL-3.0-or-later** lizenziert → für WhisperFlow **akzeptiert**
- `@ffmpeg-installer/ffmpeg` — LGPL, aber **kein macOS ARM64 Support**, 5 Jahre kein Update ❌
- Alle fertig verfügbaren Static Builds (evermeet.cx, osxexperts.net) sind ebenfalls GPL-Builds
- `ffmpeg-static-electron` ist deprecated, 234 MB groß, FFmpeg 3.1 (2018) ❌
- `fluent-ffmpeg` ist **deprecated seit Mai 2025** ❌
- BYOF erzeugt erhebliche Onboarding-Friction auf macOS (Homebrew-Abhängigkeit, PATH-Probleme)

**Entscheidung (final):**

| Tier           | Strategie                                           | Begründung                                                              |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| **Tier 1 MVP** | `ffmpeg-static` als `dependency` + `extraResources` | Aktiv, macOS ARM64/x64, Zero-Friction, kein manuelles Binary-Management |
| **Tier 2**     | BYOF als optionaler Override in Settings            | Power-User-Flexibilität                                                 |

---

## Inhaltsverzeichnis

1. [Technische Einleitung und Kontext](#1-technische-einleitung-und-kontext)
2. [Technology Stack Analysis — npm-Packages im Vergleich](#2-technology-stack-analysis--npm-packages-im-vergleich)
3. [Integration Patterns — Electron-spezifische Herausforderungen](#3-integration-patterns--electron-spezifische-herausforderungen)
4. [Architektur-Entscheidungsanalyse: npm vs. BYOF](#4-architektur-entscheidungsanalyse-npm-vs-byof)
5. [Lizenz- und Compliance-Analyse](#5-lizenz--und-compliance-analyse)
6. [Implementierungs-Strategie und Empfehlung](#6-implementierungs-strategie-und-empfehlung)
7. [Quellen](#7-quellen)

---

## 1. Technische Einleitung und Kontext

### Projekthintergrund

**WhisperFlow** ist eine Electron-Desktop-App für macOS (Tier 1) mit einer rein audio-basierten Pipeline: Mikrofon-Aufnahme → WAV → FFmpeg → WebM/Opus → OpenAI Whisper API → Clipboard. FFmpeg ist dabei der kritische Konvertierungsschritt, ohne den die App nicht funktionsfähig ist.

Das MVP.md bestätigt zwei relevante Scope-Entscheidungen:

- **Tier 1:** „FFmpeg-Basis-Pipeline (WAV → WebM/Opus)" — FFmpeg ist essentiell
- **Tier 1:** „FFmpeg Dependency Check + Fehlerhinweis" — ein Fallback-Szenario ist bereits geplant

Der Dependency Check im Tier 1 deutet darauf hin, dass ursprünglich ein BYOF-Ansatz in Betracht gezogen wurde. Diese Recherche klärt, ob das die beste Strategie ist.

### Forschungsmethodik

- NPM-Paket-Analyse (offizielle npm-Registry, Paketdoku, Versionshistorien)
- FFmpeg-Lizenz-Dokumentation (ffmpeg.org/legal.html)
- Electron-Builder-Dokumentation und Community-Patterns
- Abgleich mit vorhandener WhisperFlow-Recherche (FFmpeg Pipeline, 2026-02-21)

---

## 2. Technology Stack Analysis — npm-Packages im Vergleich

### 2.1 `ffmpeg-static` (empfohlenes Hauptpaket)

**Quelle:** [npmjs.com/package/ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)

| Eigenschaft            | Wert                                                  |
| ---------------------- | ----------------------------------------------------- |
| Version                | 5.3.0 (veröffentlicht Nov 2025)                       |
| FFmpeg-Version         | **6.1.1** (aktuell)                                   |
| Lizenz                 | **GPL-3.0-or-later** ⚠️                               |
| Weekly Downloads       | ~147.000                                              |
| Plattform-Support      | macOS x64 + ARM64, Linux x64/x86/ARM, Windows x64/x86 |
| Paket-Größe (unpacked) | 48 kB (Wrapper) + Download der Binaries               |
| Aktiv gepflegt         | ✅ Ja                                                 |

**Wie es funktioniert:**

Das Paket lädt beim `npm install` die plattformspezifische FFmpeg-Binary von GitHub Releases herunter. Es liefert nur den Pfad zur Binary:

```js
const pathToFfmpeg = require("ffmpeg-static");
// → '/path/to/node_modules/ffmpeg-static/ffmpeg'
```

**Electron-spezifisches Problem (Asar):**
Wenn Electron-Builder mit `asar: true` packaged, werden Dateien in einem virtuellen Archiv abgelegt. Binaries können aber nicht aus `.asar` ausgeführt werden. Die Lösung ist `asarUnpack`:

```json
// electron-builder.json
{
  "extraResources": [
    { "from": "node_modules/ffmpeg-static/ffmpeg", "to": "ffmpeg" }
  ]
}
```

Oder via `asarUnpack`:

```json
{ "asarUnpack": ["node_modules/ffmpeg-static/ffmpeg"] }
```

Pfad-Auflösung im Main Process:

```js
const ffmpegPath = app.isPackaged
  ? path.join(process.resourcesPath, "ffmpeg")
  : require("ffmpeg-static");
```

**Kritischer Hinweis der npm-Doku zu Cross-Platform-Packaging:**

> "Because `ffmpeg-static` will download a binary specific to the OS/platform, you need to purge `node_modules` before (re-)packaging your app for a different OS/platform."

Das bedeutet: für macOS ARM64 vs. x64 müssen separate Build-Durchläufe gemacht werden.

---

### 2.2 `@ffmpeg-installer/ffmpeg`

**Quelle:** [npmjs.com/package/@ffmpeg-installer/ffmpeg](https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg)

| Eigenschaft      | Wert                          |
| ---------------- | ----------------------------- |
| Version          | 1.1.0                         |
| FFmpeg-Version   | **~2018 Builds** ⚠️ alt       |
| Lizenz           | **LGPL-2.1** ✅               |
| Weekly Downloads | ~319.000                      |
| Aktiv gepflegt   | ❌ Nein (5 Jahre kein Update) |

**Verwendung:**

```js
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
// Electron Asar Fix:
const fixedPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
```

**Bewertung:** Lizenz ist ideal (LGPL), aber die veralteten FFmpeg-Builds (~2018) können Kompatibilitätsprobleme mit modernen Opus-Features verursachen. Für Whisper-API-Kompatibilität (WebM/Opus) ist ein neuerer Built empfohlen. **Nicht empfohlen.**

---

### 2.3 `ffmpeg-static-electron`

| Eigenschaft    | Wert                                                    |
| -------------- | ------------------------------------------------------- |
| Version        | 2.0.3                                                   |
| FFmpeg-Version | 3.1 (2018) ❌                                           |
| Unpacked Size  | **234 MB** (alle Plattformen gebundelt) ❌              |
| Lizenz         | BSD-3-Clause (Wrapper), FFmpeg-Lizenz gilt für Binaries |
| Aktiv gepflegt | ❌ Deprecated                                           |

**Bewertung:** Deprecated, riesig, veraltet. Nicht verwenden.

---

### 2.4 Package-Vergleich: Übersicht

| Paket                      | FFmpeg-Version | Lizenz   | macOS ARM64 | Aktiv          | Empfehlung                 |
| -------------------------- | -------------- | -------- | ----------- | -------------- | -------------------------- |
| **`ffmpeg-static`**        | 6.1.1 ✅       | GPL-3.0  | ✅          | ✅ Nov 2025    | ✅ **Empfohlen**           |
| `@ffmpeg-installer/ffmpeg` | ~2018 ❌       | LGPL-2.1 | ❌ Kaputt   | ❌ 5 Jahre alt | ❌ Nicht verwenden         |
| `ffmpeg-static-electron`   | 3.1 ❌         | Mixed    | ❌          | ❌ Deprecated  | ❌ Nicht verwenden         |
| Manueller LGPL-Build       | 7.x ✅         | LGPL-2.1 | ✅          | —              | Nur bei Lizenz-Anforderung |

---

## 3. Integration Patterns — Electron-spezifische Herausforderungen

### 3.1 Das Asar-Problem

Electron-Builder packaged Node.js-Apps standardmäßig in ein `.asar`-Archiv. FFmpeg-Binaries müssen **außerhalb** dieses Archivs liegen, da Betriebssystem-Prozesse keine Dateien aus virtuellen Archiven ausführen können.

**Pattern 1: `extraResources` (empfohlen)**

```json
// electron-builder.json
{
  "mac": {
    "extraResources": [
      {
        "from": "resources/ffmpeg-mac-arm64",
        "to": "ffmpeg",
        "filter": ["**/*"]
      }
    ]
  }
}
```

**Pattern 2: `asarUnpack`**

```json
{
  "asarUnpack": ["resources/ffmpeg/**"]
}
```

**Pfad-Auflösung (robustes Pattern):**

```typescript
import { app } from "electron";
import path from "path";

function getFfmpegPath(): string {
  if (app.isPackaged) {
    // Produk­tion: Binary liegt in resources/
    return path.join(process.resourcesPath, "ffmpeg");
  }
  // Development: Lokaler Pfad oder ffmpeg-static
  return process.env.FFMPEG_PATH ?? "ffmpeg"; // Fallback: System PATH
}
```

### 3.2 BYOF Integration Pattern

Wenn der User sein eigenes FFmpeg mitbringt (z.B. via Homebrew):

```typescript
// Settings-Store (z.B. electron-store)
const customFfmpegPath = store.get("ffmpegPath", null);

function getFfmpegPath(): string {
  if (customFfmpegPath && fs.existsSync(customFfmpegPath)) {
    return customFfmpegPath;
  }
  // Fallback: Gebundelte Binary
  return getBundledFfmpegPath();
}
```

**BYOF-Probleme auf macOS:**

- Homebrew FFmpeg liegt in `/opt/homebrew/bin/ffmpeg` (Apple Silicon) oder `/usr/local/bin/ffmpeg` (Intel)
- Electron-Apps erhalten **nicht automatisch den User-PATH** — `process.env.PATH` ist in Electron-Apps oft eingeschränkt
- Gelöst durch: Full-Path-Requirement oder explizite PATH-Erweiterung im Main Process

### 3.3 FFmpeg-Existenz-Check Pattern (Tier 1 Feature)

Unabhängig von der Distribution-Strategie sollte beim App-Start geprüft werden:

```typescript
import { spawn } from "child_process";

async function checkFfmpegAvailable(ffmpegPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ["-version"]);
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0 || code === 1));
  });
}

// Beim App-Start:
const ffmpegOk = await checkFfmpegAvailable(getFfmpegPath());
if (!ffmpegOk) {
  // → Onboarding-Dialog mit Installationsanleitung anzeigen
  showFfmpegMissingDialog();
}
```

---

## 4. Architektur-Entscheidungsanalyse: npm vs. BYOF

### 4.1 Vollständig npm-basiert (Bundle-Ansatz)

**Wie:** `ffmpeg-static` via npm installieren + in electron-builder `extraResources` packagen.

**✅ Vorteile:**

- Zero-Friction-Onboarding: App funktioniert sofort nach Installation
- Keine externen Abhängigkeiten für User
- Kontrollierte FFmpeg-Version (keine Versions-Inkompatibilitäten)
- Standard-Pattern für professionelle Desktop-Apps (VS Code, Discord, Figma nutzen ähnliche Strategien)
- Einfaches CI/CD: `npm install` → `electron-builder`

**❌ Nachteile:**

- **GPL-3.0-Lizenzrisiko** bei `ffmpeg-static` (wenn Closed-Source)
- Erhöhte App-Größe: +50-80 MB für macOS-Binary
- Plattform-spezifische Build-Durchläufe nötig (ARM64 vs. x64)
- Nutzer kann FFmpeg-Version nicht selbst wählen
- Bei macOS Code-Signing: Binary muss notarisiert/signiert werden

### 4.2 BYOF (Bring Your Own FFmpeg)

**Wie:** App setzt voraus, dass FFmpeg auf dem System installiert ist. Bei Fehler: Hinweis mit Installationsanleitung.

**✅ Vorteile:**

- Keine Lizenzprobleme (User hat eigene FFmpeg-Installation)
- Kleinere App-Größe
- User hat Kontrolle über Version und Build-Flags
- Einfacher für fortgeschrittene User (Homebrew-User auf macOS)

**❌ Nachteile:**

- **Erhebliche Onboarding-Friction** für durchschnittliche macOS-User:
  - Homebrew muss installiert sein
  - `brew install ffmpeg` (~300 MB Download)
  - PATH nicht automatisch in Electron-Apps verfügbar
- Support-Aufwand: User-Probleme durch inkompatible FFmpeg-Versionen
- App ist nicht self-contained
- MVP-Ziel "einfach und sofort funktionsfähig" wird verletzt

### 4.3 Finale Entscheidung: `ffmpeg-static` + optionales BYOF

**Wie:** `ffmpeg-static` als npm-Dependency + electron-builder `extraResources`. BYOF als optionaler Override in Tier 2.

**Vorteile:**

- GPL-Lizenz für WhisperFlow akzeptiert → kein Mehraufwand für manuelles Binary-Management
- Zero-Friction für normale User — App funktioniert sofort nach Installation
- Flexibilität für Power-User via BYOF-Override in Tier 2
- "FFmpeg Dependency Check" aus MVP.md = Health-Check der gebundelten Binary

---

## 5. Lizenz- und Compliance-Analyse

**Quelle:** [ffmpeg.org/legal.html](https://ffmpeg.org/legal.html)

### 5.1 Lizenz-Grundlagen

FFmpeg ist primär unter **LGPL v2.1+** lizenziert. Bestimmte optionale Komponenten (z.B. `libx264`, `libx265`) fallen unter die **GPL v2+**. Wenn diese aktiviert sind, gilt GPL für die gesamte Build.

**Für WhisperFlow relevant:**

- Die WAV → WebM/Opus-Pipeline benötigt NUR: `libopus` (LGPL), `libvorbis` (LGPL-kompatibel)
- **Kein GPL-pflichtiger Codec wird benötigt**
- Eine LGPL-only-Build ist für den Use Case vollständig ausreichend

### 5.2 `ffmpeg-static` Lizenz — Entscheidung

`ffmpeg-static` v5.3.0 ist als `GPL-3.0-or-later` auf npm gelistet, weil die vorkompilierten Binaries mit GPL-Optionen gebaut wurden (u.a. `libx264`, `libx265`).

**Entscheidung für WhisperFlow:** GPL wird akzeptiert. WhisperFlow ist kein kommerzielles Closed-Source-Produkt, das Lizenz-Compliance-Aufwand rechtfertigen würde.

### 5.3 Alternativen falls LGPL jemals nötig

Sollte in Zukunft eine LGPL-konforme Binary benötigt werden:

- **evermeet.cx** liefert nur macOS x64 Intel und hat explizit angekündigt, **kein Apple Silicon** zu unterstützen → nicht ausreichend
- **osxexperts.net** hat ARM64 + x64, aber deren Builds sind ebenfalls GPL (enthalten `--enable-libx264`)
- **Einzige echte Option:** Selbst eine LGPL-only-Binary mit `--enable-libopus` kompilieren (kein `--enable-gpl`) — hoher Einmalaufwand, löst das Problem dauerhaft

> **Für den MVP gilt:** `ffmpeg-static` direkt via npm installieren. Kein manuelles Binary-Management.

---

## 6. Implementierungs-Strategie und Empfehlung

### 6.1 Klare Empfehlung: `ffmpeg-static` via npm

**Für WhisperFlow MVP (Tier 1 — macOS):**

```
Strategie: ffmpeg-static als npm dependency + electron-builder extraResources
```

**Begründung:**

1. **Simplizität:** `npm install ffmpeg-static` — kein manuelles Binary-Download/Management
2. **macOS ARM64 + x64:** Wird automatisch erkannt und heruntergeladen
3. **User Experience:** Keine externe Installation nötig → App funktioniert sofort
4. **Aktiv gepflegt:** Version 5.3.0 (Nov 2025), FFmpeg 6.1.1
5. **Dependency Check** aus MVP.md = Health-Check der gebundelten Binary

### 6.2 Implementierungsplan

**Schritt 1: Installation**

```bash
npm install ffmpeg-static
```

`ffmpeg-static` lädt beim `npm install` automatisch die passende Binary für die aktuelle Plattform herunter — macOS ARM64 von osxexperts.net, macOS x64 von evermeet.cx.

**Schritt 2: electron-builder Konfiguration**

```json
// package.json (Build-Config)
{
  "build": {
    "extraResources": [
      {
        "from": "node_modules/ffmpeg-static/ffmpeg",
        "to": "ffmpeg"
      }
    ],
    "afterSign": "scripts/notarize.js"
  }
}
```

> **Wichtig:** Für macOS ARM64 und x64 müssen separate Build-Durchläufe gemacht werden (`node_modules` vorher löschen), da `ffmpeg-static` nur die Binary für die aktuelle Entwicklungsplattform herunterlädt.

**Schritt 3: Pfad-Service (Main Process)**

```typescript
// src/main/services/ffmpeg-path.service.ts
import { app } from "electron";
import path from "path";
import fs from "fs";

export function getFfmpegPath(): string {
  // 1. User-Override (BYOF, Tier 2)
  const override = getStoredFfmpegPath();
  if (override && fs.existsSync(override)) return override;

  // 2. Gebundelte Binary (Produktion)
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "ffmpeg");
  }

  // 3. Development: ffmpeg-static oder System-PATH
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}
```

**Schritt 4: Dependency Check (Tier 1 Feature aus MVP.md)**

```typescript
// src/main/services/ffmpeg-check.service.ts
import { spawn } from "child_process";
import { getFfmpegPath } from "./ffmpeg-path.service";

export interface FfmpegCheckResult {
  available: boolean;
  version?: string;
  path: string;
}

export async function checkFfmpeg(): Promise<FfmpegCheckResult> {
  const ffmpegPath = getFfmpegPath();

  return new Promise((resolve) => {
    let versionOutput = "";
    const proc = spawn(ffmpegPath, ["-version"]);

    proc.stdout?.on("data", (data) => {
      versionOutput += data;
    });

    proc.on("error", () => resolve({ available: false, path: ffmpegPath }));
    proc.on("close", (code) => {
      const versionMatch = versionOutput.match(/ffmpeg version (\S+)/);
      resolve({
        available: code === 0 || code === 1,
        version: versionMatch?.[1],
        path: ffmpegPath,
      });
    });
  });
}
```

**Schritt 5: Development-Workflow**

Für die Entwicklung: `ffmpeg-static` als `devDependency` (nicht als `dependency`) ist akzeptabel, da es nur im Dev-Modus verwendet wird und nie in die gebundelte App landet:

```json
{
  "devDependencies": {
    "ffmpeg-static": "^5.3.0"
  }
}
```

```typescript
// In Development: ffmpeg-static nutzen
if (!app.isPackaged) {
  const devFfmpeg = require("ffmpeg-static");
  process.env.FFMPEG_PATH = devFfmpeg;
}
```

### 6.3 Tier 2: BYOF als optionaler Override

In Tier 2 kann im Settings-Panel ein "Eigenen FFmpeg-Pfad verwenden"-Toggle ergänzt werden:

```typescript
// Settings UI
<SettingRow
  label="FFmpeg-Pfad"
  description="Standard: Eingebettete Version. Für eigene FFmpeg-Installation."
>
  <PathInput
    value={settings.ffmpegPath ?? ''}
    placeholder="Standard (eingebettet)"
    onChange={handleFfmpegPathChange}
    onBrowse={() => openFileDialog({ filters: [{ name: 'ffmpeg', extensions: [''] }] })}
  />
</SettingRow>
```

**Warum Tier 2 und nicht Tier 1:**

- BYOF erhöht Support-Komplexität (Versions-Inkompatibilitäten, PATH-Probleme)
- Für den MVP-Nutzer ist Zero-Friction-Onboarding wichtiger
- Das BYOF-Feature ist ein "Nice-to-have" für Power-User

### 6.4 Entscheidungsmatrix: Finale Bewertung

| Kriterium             | **`ffmpeg-static` (Wahl)** ✅ | Manueller LGPL-Build | BYOF               |
| --------------------- | ----------------------------- | -------------------- | ------------------ |
| **Lizenz**            | GPL — akzeptiert              | LGPL                 | Kein Problem       |
| **macOS ARM64**       | ✅                            | ✅ (selbst bauen)    | Variable           |
| **Onboarding**        | ✅ Zero-Friction              | ✅ Zero-Friction     | ❌ Homebrew nötig  |
| **FFmpeg-Version**    | 6.1.1 ✅                      | 7.x möglich          | Variable           |
| **Wartungsaufwand**   | ✅ Niedrig (`npm update`)     | Mittel (manuell)     | Hoch (Support)     |
| **CI/CD-Komplexität** | ✅ Niedrig                    | Mittel               | Niedrig            |
| **Setup-Aufwand**     | ✅ Minimal                    | Hoch (einmalig)      | Keiner             |
| **MVP-Eignung**       | ✅ **Optimal**                | Bedingt              | ❌ Nicht empfohlen |

---

## 7. Quellen

| Quelle                               | URL                                                                         | Abgerufen  |
| ------------------------------------ | --------------------------------------------------------------------------- | ---------- |
| `ffmpeg-static` npm                  | https://www.npmjs.com/package/ffmpeg-static                                 | 2026-02-21 |
| `@ffmpeg-installer/ffmpeg` npm       | https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg                      | 2026-02-21 |
| `fluent-ffmpeg` npm                  | https://www.npmjs.com/package/fluent-ffmpeg                                 | 2026-02-21 |
| `ffmpeg-static-electron` npm         | https://www.npmjs.com/package/ffmpeg-static-electron                        | 2026-02-21 |
| FFmpeg Legal/Lizenz                  | https://ffmpeg.org/legal.html                                               | 2026-02-21 |
| WhisperFlow MVP.md                   | project-root/MVP.md                                                         | 2026-02-21 |
| Vorherige Recherche: FFmpeg Pipeline | `technical-ffmpeg-webm-opus-pipeline-best-practices-research-2026-02-21.md` | 2026-02-21 |

---

_Recherche durchgeführt von: Yoda | 2026-02-21 | WhisperFlow / agent-flow_
