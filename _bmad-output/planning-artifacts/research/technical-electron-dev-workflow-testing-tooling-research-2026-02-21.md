# Technische Recherche: Entwicklungs-Workflow, Testing & Tooling für Electron + React + TypeScript + Vite (WhisperFlow)

**Datum:** 21. Februar 2026  
**Projekt:** WhisperFlow – macOS Voice-to-Text Desktop App  
**Stack:** Electron + React + TypeScript + Vite (electron-vite)  
**Scope:** Development Workflow, Testing, ESLint/Prettier, Env Variables, Native Modules, Auto-Updates, Error Handling, CI/CD Signing

---

## Übersicht der Themen

1. [Development Workflow mit electron-vite (HMR)](#1-development-workflow-mit-electron-vite-hmr)
2. [Testing Electron Apps (2025/2026)](#2-testing-electron-apps-20252026)
3. [ESLint + Prettier Setup (2025)](#3-eslint--prettier-setup-2025)
4. [Environment Variables in electron-vite](#4-environment-variables-in-electron-vite)
5. [Native Modules (node-gyp) in Electron](#5-native-modules-node-gyp-in-electron)
6. [Auto-Updates mit electron-updater](#6-auto-updates-mit-electron-updater)
7. [Error Handling und Crash Reporting](#7-error-handling-und-crash-reporting)
8. [App Signing Workflow CI/CD (GitHub Actions)](#8-app-signing-workflow-cicd-github-actions)

---

## 1. Development Workflow mit electron-vite (HMR)

### HMR im Renderer-Prozess

electron-vite nutzt den eingebauten Vite-Dev-Server für den Renderer-Prozess. HMR (Hot Module Replacement) funktioniert dabei **identisch wie in einer normalen Vite/React-App** – React-Komponenten werden ohne Reload im Browser-Kontext des BrowserWindow aktualisiert.

Der kritische Unterschied zu einer Web-App: Der Renderer lädt im Dev-Modus eine **lokale URL** statt einer HTML-Datei. Electron-vite setzt dafür die Umgebungsvariable `ELECTRON_RENDERER_URL` automatisch:

```typescript
// src/main/index.ts
function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
    },
  });

  // Dev: lädt lokale Vite-URL (HMR-fähig)
  // Prod: lädt bundled HTML-Datei
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
```

### Hot Reloading für Main Process & Preload

Der **Main Process** und **Preload Scripts** können kein echtes HMR nutzen (Node.js-Kontext, kein Browser). Stattdessen bietet electron-vite **Hot Reloading** via Rollup Watcher:

- Wenn Main-Prozess-Dateien geändert werden: Rollup rebuildet → Electron-App startet neu
- Wenn Preload-Scripts geändert werden: Rollup rebuildet → Renderer-Fenster reloaded (kein voller Neustart)

**Aktivierung:** CLI-Option `--watch` (empfohlen) oder `build.watch: {}` in der Config:

```json
// package.json
{
  "scripts": {
    "dev": "electron-vite dev --watch"
  }
}
```

> **Caveat (offiziell dokumentiert):** Hot Reloading is "not always beneficial" und "the timing of reloading is uncontrollable". Die `--watch`-Option macht es möglich, Hot Reloading flexibel ein- und auszuschalten. **Empfehlung:** `--watch` nur bei aktiver Main-Process-Entwicklung aktivieren, sonst weglassen.

### Dev vs. Build Commands

| Command                     | Modus         | Verhalten                                                                        |
| --------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `electron-vite dev`         | `development` | Startet Vite Dev Server + Electron; Renderer via URL; kein Bundling für Renderer |
| `electron-vite dev --watch` | `development` | Wie oben + Hot Reloading für Main/Preload                                        |
| `electron-vite build`       | `production`  | Bundled alle drei Prozesse (main, preload, renderer) nach `dist/`                |
| `electron-vite preview`     | `production`  | Startet gebaute App zur Vorschau                                                 |

### Projektstruktur (Konvention)

electron-vite erwartet (und findet automatisch) folgende Eintrittspunkte:

```
src/
  main/index.ts         → Main Process
  preload/index.ts      → Preload Script
  renderer/index.html   → Renderer (React)
```

**Wichtiger Hinweis zu ESM:** Electron unterstützt ESM ab v28. electron-vite 2.0+ unterstützt `"type": "module"` im `package.json`. Mit ESM entfällt `__dirname`; stattdessen `import.meta.dirname` oder `fileURLToPath(new URL(..., import.meta.url))` verwenden.

**Quellen:**

- https://electron-vite.org/guide/dev (Konfidenz: Sehr hoch – offizielle Dokumentation)
- https://electron-vite.org/guide/hmr-and-hot-reloading (Konfidenz: Sehr hoch – offizielle Dokumentation)

---

## 2. Testing Electron Apps (2025/2026)

### 2a. Unit Testing mit Vitest

**Empfehlung 2025/2026:** Vitest ist der standard Unit-Test-Runner für Vite-basierte Projekte und funktioniert nahtlos mit electron-vite – er verwendet die gleiche Vite-Config.

- **Vitest Version:** 4.x (Stand Feb 2026, erfordert Vite >=6.0.0 und Node >=20.0.0)
- **Kein spezielles electron-vitest-Paket nötig** für reine Unit Tests (Business-Logik, Utils, Hooks)
- Vitest liest automatisch `vite.config.ts` (oder `vitest.config.ts`) aus

```typescript
// vitest.config.ts (oder in electron.vite.config.ts eingebettet)
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node", // für Main-Process-Tests
    // oder: environment: 'jsdom' / 'happy-dom' für React-Renderer-Tests
  },
});
```

**Unterschied zu Standard-Vitest für Electron:**

- Main-Process-Tests laufen in `environment: 'node'`; Renderer-Tests in `jsdom` oder `happy-dom`
- Electron-spezifische APIs (`ipcMain`, `app`, `BrowserWindow`) müssen gemockt werden – keine Electron-Binaries werden beim Unit-Test geladen
- `electron` als Modul muss vollständig gemockt werden:

```typescript
// __mocks__/electron.ts
export const app = {
  getPath: vi.fn(() => "/tmp/test"),
  getVersion: vi.fn(() => "1.0.0"),
  isPackaged: false,
};
export const ipcMain = {
  on: vi.fn(),
  handle: vi.fn(),
  removeHandler: vi.fn(),
};
export const BrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  webContents: { send: vi.fn() },
}));
```

In `vitest.config.ts`:

```typescript
test: {
  alias: {
    electron: new URL("./__mocks__/electron.ts", import.meta.url).pathname;
  }
}
```

### 2b. IPC-Channel Testing

**Ansatz für IPC-Unit-Tests:**

```typescript
// Beispiel: Test für ein IPC-Handler-Modul
import { describe, it, expect, vi, beforeEach } from "vitest";

// electron mocken (wie oben)
vi.mock("electron", () => ({
  ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { registerAudioHandlers } from "../src/main/ipc/audioHandlers";

describe("Audio IPC Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register start-recording handler", () => {
    const { ipcMain } = await import("electron");
    registerAudioHandlers();
    expect(ipcMain.handle).toHaveBeenCalledWith(
      "audio:start-recording",
      expect.any(Function),
    );
  });
});
```

**Für Preload-Script-Tests:** Weil Preload-Scripts `contextBridge` und `ipcRenderer` nutzen, empfiehlt sich das Testen über `@electron-toolkit/preload`-Mocks oder direktes Testen der exponierten API-Signaturen.

### 2c. E2E Testing mit Playwright

**Empfehlung 2025/2026:** Playwright (via `playwright` Paket mit `_electron`-Namespace) bleibt die empfohlene Lösung für E2E-Tests. Playwright v1.42+ (Stand 2025: v1.50+).

```bash
npm install --save-dev playwright @playwright/test
```

```typescript
// tests/e2e/app.spec.ts
import { test, expect, _electron as electron } from "playwright";
import type { ElectronApplication } from "playwright";

let app: ElectronApplication;

test.beforeAll(async () => {
  app = await electron.launch({
    args: ["dist/main/index.js"], // Gebaudete App oder electron-Eintrittspunkt
    // executablePath: 'path/to/electron'  // optional, wenn Electron in node_modules
  });
});

test.afterAll(async () => {
  await app.close();
});

test("should display main window", async () => {
  const window = await app.firstWindow();
  const title = await window.title();
  expect(title).toBe("WhisperFlow");
});

test("should navigate to settings", async () => {
  const window = await app.firstWindow();
  await window.click('[data-testid="settings-button"]');
  await expect(window.locator('[data-testid="settings-panel"]')).toBeVisible();
});

// Main-Process-Code von Playwright evaluieren (Electron-Context):
test("should have correct app version", async () => {
  const version = await app.evaluate(async ({ app }) => app.getVersion());
  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
});
```

**Unterstützte Electron-Versionen (Playwright):** v12.2.0+, v13.4.0+, v14+

**Bekannte Caveats:**

- Playwright's Electron Support ist als "experimental" markiert, aber in der Praxis stabil und weit verbreitet
- `nodeCliInspect`-Fuse muss auf `true` bleiben (nicht auf `false` setzen)
- E2E-Tests sollten gegen **gebundene** App laufen (`dist/`), nicht im Dev-Server-Modus
- Für Dev-Modus-Tests: Separate Electron-Instanz starten, nicht `electron-vite dev`

**Playwright-Config für Electron:**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  // kein webServer nötig für Electron!
  timeout: 30_000,
});
```

**Quellen:**

- https://playwright.dev/docs/api/class-electron (Konfidenz: Sehr hoch – offizielle Dokumentation)
- https://vitest.dev/guide/ (Konfidenz: Sehr hoch – offizielle Dokumentation)

---

## 3. ESLint + Prettier Setup (2025)

### Flat Config (ESLint 9+)

Ab ESLint 9 ist das **Flat Config Format** (`eslint.config.mjs`) der Standard. Kein `.eslintrc` mehr. Das electron-vite-Template generiert bereits `eslint.config.mjs`.

**Empfohlenes Setup für Electron + React + TypeScript:**

```bash
npm install --save-dev \
  eslint \
  @eslint/js \
  typescript-eslint \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y \
  prettier \
  eslint-config-prettier \
  eslint-plugin-prettier
```

```javascript
// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Globale Ignores
  {
    ignores: ["dist/**", "out/**", "node_modules/**", "*.d.ts"],
  },

  // Basis JavaScript-Regeln
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    ...js.configs.recommended,
  },

  // TypeScript
  ...tseslint.configs.recommended,

  // React (nur für Renderer)
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 17+ JSX Transform
    },
  },

  // Node.js-Umgebung für Main Process (nicht browser globals)
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
  },

  // Prettier letzte Position (überschreibt formatting rules)
  prettierConfig,
]);
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**Hinweis zu `eslint-plugin-electron`:** Das Paket `eslint-plugin-electron` auf npm ist **6 Jahre alt** (v7.0.0, Stand 2026) und nicht aktiv gepflegt. Es bietet Regeln für veraltete/entfernte Electron-APIs. **Nicht empfohlen für neue Projekte** – TypeScript-Typisierung von Electron macht es weitgehend überflüssig.

**TypeScript für eslint.config:**
Ab Node 22.13+ kann `eslint.config.ts` nativ genutzt werden (mit `--experimental-strip-types`), alternativ `jiti` installieren. Für Stabilität: `.mjs`-Format empfohlen.

**Quellen:**

- https://eslint.org/docs/latest/use/configure/configuration-files (Konfidenz: Sehr hoch)
- electron-vite TypeScript Guide (Konfidenz: Hoch)

---

## 4. Environment Variables in electron-vite

### Prefix-basiertes Scoping

electron-vite verwendet **unterschiedliche Präfixe** um Env-Variablen prozess-spezifisch zu machen:

```bash
# .env (Projekt-Root)
KEY=123                    # Nicht verfügbar (kein Präfix)
MAIN_VITE_KEY=123          # Nur Main Process: import.meta.env.MAIN_VITE_KEY
PRELOAD_VITE_KEY=123       # Nur Preload Script: import.meta.env.PRELOAD_VITE_KEY
RENDERER_VITE_KEY=123      # Nur Renderer: import.meta.env.RENDERER_VITE_KEY
VITE_KEY=123               # Alle Prozesse: import.meta.env.VITE_KEY
```

### .env Datei-Hierarchie (analog zu Vite)

```
.env                    → Immer geladen
.env.local              → Immer geladen, gitignored
.env.development        → Nur im dev-Modus
.env.development.local  → Nur im dev-Modus, gitignored
.env.production         → Nur im build/preview-Modus
.env.production.local   → Nur im build/preview-Modus, gitignored
```

### TypeScript-Typsicherheit

```typescript
// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Main Process
  readonly MAIN_VITE_WHISPER_MODEL_PATH: string;
  readonly MAIN_VITE_LOG_LEVEL: string;
  // Renderer
  readonly RENDERER_VITE_API_BASE_URL: string;
  // Gemeinsam
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Caveat: Node.js `process.env` vs. `import.meta.env`

- Im **Main Process**: Beide `process.env.*` und `import.meta.env.*` verfügbar; electron-vite ersetzt `import.meta.env.*` zur Build-Zeit via `define`
- Im **Renderer**: Nur `import.meta.env.*` (kein `process.env` im Browser-Kontext)
- **Secrets:** Nie Secrets mit `RENDERER_VITE_` oder `VITE_` prefixen – diese werden ins Renderer-Bundle eingebettet und sind im DevTools inspizierbar

### Modes

```json
// package.json
{
  "scripts": {
    "dev": "electron-vite dev", // mode: development
    "dev:staging": "electron-vite dev --mode staging", // mode: staging → .env.staging
    "build": "electron-vite build", // mode: production
    "build:beta": "electron-vite build --mode beta" // mode: beta → .env.beta
  }
}
```

**Quelle:**

- https://electron-vite.org/guide/env-and-mode (Konfidenz: Sehr hoch – offizielle Dokumentation)

---

## 5. Native Modules (node-gyp) in Electron

### Das Problem

Electron bundelt seine eigene Node.js-Version mit abweichendem ABI. Native Addons (`.node`-Dateien) die gegen System-Node.js kompiliert wurden, funktionieren nicht in Electron ohne Recompilierung.

### Empfohlene Lösung: `@electron/rebuild`

Das offizielle Tool `@electron/rebuild` ermittelt automatisch die Electron-Version und rekompiliert native Module gegen Electrons Node.js-Headers:

```bash
npm install --save-dev @electron/rebuild
```

```json
// package.json
{
  "scripts": {
    "postinstall": "electron-rebuild",
    "rebuild": "electron-rebuild"
  }
}
```

Oder direkt via CLI:

```bash
./node_modules/.bin/electron-rebuild
```

### Integration mit electron-vite

electron-vite bundelt **keine** nativen Module (`.node`-Dateien können nicht durch Rollup gebundelt werden). Native Module müssen als externe Dependencies behandelt werden:

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // Native Addons manuell extern halten
        external: ["better-sqlite3", "sharp", "native-audio-addon"],
      },
    },
  },
});
```

Da `dependencies` im Main Process ohnehin extern bleiben (electron-vite Standard-Verhalten), genügt es meist, native Module in `dependencies` (nicht `devDependencies`) zu listen.

### Prebuilt Binaries

Viele populäre native Module (z.B. `better-sqlite3`, `sharp`) bieten **prebuilt Binaries** via `prebuild` oder `node-pre-gyp`. Wenn Electron-spezifische Binaries verfügbar sind, entfällt das lokale Kompilieren:

```bash
# Wenn prebuild-Binaries für Electron vorhanden sind:
npm install better-sqlite3  # lädt automatisch das richtige Binary
```

Wenn nicht, `@electron/rebuild` ausführen.

### WhisperFlow-spezifisch

Für macOS Audio-Aufnahme sind möglicherweise benötigt:

- `node-mac-permissions` (Mikrofon-Berechtigungen) – hat prebuilt Binaries
- Whisper.cpp Node.js Bindings – `@xenova/transformers` (pure JS/WASM, kein native Addon nötig) oder `nodejs-whisper` (native, braucht rebuild)

**Empfehlung:** WASM-basierte Whisper-Implementierung bevorzugen (kein native Addon), falls Performance ausreicht.

**Quellen:**

- https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules (Konfidenz: Sehr hoch)
- https://electron-vite.org/guide/dependency-handling (Konfidenz: Sehr hoch)

---

## 6. Auto-Updates mit electron-updater

### electron-updater vs. Electron Built-in autoUpdater

`electron-updater` (Teil von `electron-builder`) bietet gegenüber dem eingebauten Electron `autoUpdater` folgende Vorteile:

- Linux-Support
- Code-Signatur-Validierung auf Windows
- Download-Progress-Events
- Staged Rollouts
- Unterstützte Provider: **GitHub Releases**, Amazon S3, DigitalOcean Spaces, generischer HTTP-Server

### Setup (2 Zeilen Integration)

```bash
npm install electron-updater
npm install --save-dev electron-builder
```

```typescript
// src/main/index.ts (ESM-Import für electron-builder 26+)
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
// Hinweis: Named import { autoUpdater } from 'electron-updater' schlägt mit ESM fehl!
// Workaround: Default-Import + Destructuring (siehe electron-builder docs)

autoUpdater.checkForUpdatesAndNotify();
```

### electron-builder Konfiguration (package.json)

```json
{
  "build": {
    "appId": "com.whisperflow.app",
    "productName": "WhisperFlow",
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.utilities"
    },
    "publish": [
      {
        "provider": "github",
        "owner": "username",
        "repo": "whisperflow"
      }
    ]
  }
}
```

> **Wichtig:** macOS erfordert Code Signing für Auto-Updates. `zip`-Target ist für macOS Squirrel.Mac erforderlich, damit `latest-mac.yml` generiert wird. Default-Target `dmg + zip` ist korrekt.

### GitHub Releases Auto-Update Flow

1. electron-builder baut und publiziert: `latest-mac.yml` + DMG + ZIP → GitHub Release Assets
2. `autoUpdater.checkForUpdatesAndNotify()` prüft `latest-mac.yml` auf dem GitHub-Release
3. Bei neuer Version: Download + Notify
4. `autoUpdater.quitAndInstall()` nach User-Bestätigung

### Update-Events

```typescript
import electronUpdater from "electron-updater";
import log from "electron-log";

const { autoUpdater } = electronUpdater;

// Debugging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

autoUpdater.on("update-available", (info) => {
  dialog.showMessageBox({ message: `Update ${info.version} verfügbar` });
});

autoUpdater.on("update-downloaded", (info) => {
  const result = dialog.showMessageBoxSync({
    message: `Update ${info.version} heruntergeladen. Jetzt installieren?`,
    buttons: ["Jetzt", "Später"],
  });
  if (result === 0) autoUpdater.quitAndInstall();
});

autoUpdater.on("error", (err) => {
  log.error("Auto-updater error:", err);
});
```

### dev-Modus Testing

Für Testing ohne Packaging:

```typescript
autoUpdater.forceDevUpdateConfig = true;
// + dev-app-update.yml im Projekt-Root (matches publish config)
```

**Quellen:**

- https://www.electron.build/auto-update (Konfidenz: Sehr hoch – offizielle Dokumentation)

---

## 7. Error Handling und Crash Reporting

### 7a. Main Process Fehlerbehandlung

```typescript
// src/main/index.ts
import { app } from "electron";
import log from "electron-log";

// Unhandled Promise Rejections (Node.js)
process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Nicht crashen lassen – loggen und weiterlaufen (oder graceful shutdown)
});

// Uncaught Exceptions (synchron)
process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception:", error);
  // Electron-App sollte hier beendet werden – undefinierter Zustand
  app.exit(1);
});

// Electron-App Error Events
app.on("render-process-gone", (event, webContents, details) => {
  log.error("Render process crashed:", details.reason, details.exitCode);
  // Fenster neu starten: webContents.reload() oder neues BrowserWindow
});

app.on("child-process-gone", (event, details) => {
  log.warn("Child process gone:", details.type, details.reason);
});
```

### 7b. Renderer Fehlerbehandlung

```typescript
// src/renderer/src/main.tsx (React Entry)
import React from 'react'
import ReactDOM from 'react-dom/client'

// React Error Boundary (empfohlen)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React Error:', error, info)
    // An Main senden:
    window.electron.ipcRenderer.send('renderer-error', {
      message: error.message,
      stack: error.stack
    })
  }

  render() {
    if (this.state.hasError) {
      return <div>Fehler aufgetreten. App neu starten.</div>
    }
    return this.props.children
  }
}
```

### 7c. Sentry für Electron (Crash Reporting)

**`@sentry/electron`** ist die empfohlene Lösung für Indie-Apps. Kostenloser Plan verfügbar (5.000 Errors/Monat).

```bash
npm install @sentry/electron
```

```typescript
// src/main/index.ts (Main Process)
import * as Sentry from "@sentry/electron/main";

Sentry.init({
  dsn: "https://YOUR_KEY@sentry.io/YOUR_PROJECT",
  // Sentry fängt automatisch: uncaughtException, unhandledRejection, Crashes
});
```

```typescript
// src/preload/index.ts (Preload – bei contextIsolation: true)
import * as Sentry from "@sentry/electron/renderer";
Sentry.init();
```

```typescript
// src/renderer/src/main.tsx (Renderer + React)
import { init } from "@sentry/electron/renderer";
import { init as reactInit } from "@sentry/react";

init(
  {
    dsn: "https://YOUR_KEY@sentry.io/YOUR_PROJECT",
  },
  reactInit, // React SDK kombinieren
);
```

**Was Sentry automatisch erfasst:**

- Uncaught Exceptions im Main Process
- Unhandled Rejections
- Renderer-Crashes (via `render-process-gone`)
- Native Crashes (Minidump-basiert)
- Renderer-JavaScript-Fehler

**Leichtgewichtige Alternative:** `electron-log` (kein externes Service, nur lokales Logging):

```bash
npm install electron-log
```

Für Indie-Apps ohne externen Service: `electron-log` für lokales Logging + manuelles Sentry nur für schwerwiegende Crashes.

**Quellen:**

- https://docs.sentry.io/platforms/javascript/guides/electron/ (Konfidenz: Sehr hoch – offizielle Sentry-Dokumentation)

---

## 8. App Signing Workflow CI/CD (GitHub Actions)

### macOS Signing & Notarisierung – Voraussetzungen

1. **Apple Developer Program** Mitgliedschaft (~99 USD/Jahr)
2. **Developer ID Application** Zertifikat in Apple Keychain
3. **App-specific Password** für Apple ID (für Notarisierung)

### electron-builder: Required Secrets (GitHub Actions)

| Secret                        | Beschreibung                                                  |
| ----------------------------- | ------------------------------------------------------------- |
| `CSC_LINK`                    | Base64-kodiertes `.p12` Zertifikat (Developer ID Application) |
| `CSC_KEY_PASSWORD`            | Passwort für das `.p12` Zertifikat                            |
| `APPLE_ID`                    | Apple ID E-Mail (für Notarisierung)                           |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-spezifisches Passwort (kein Apple-Login-Passwort!)        |
| `APPLE_TEAM_ID`               | Apple Developer Team ID (10 Zeichen, z.B. `ABCDE12345`)       |
| `GH_TOKEN`                    | GitHub Personal Access Token (für `electron-builder publish`) |

### Zertifikat exportieren und kodieren

```bash
# Aus Keychain exportieren: Schlüsselbund-Zugriff → "DeveloperID Application" → Exportieren als .p12
# Base64 encodieren:
base64 -i DeveloperIDApplication.p12 -o cert_base64.txt
# Inhalt von cert_base64.txt als GitHub Secret CSC_LINK setzen
```

### GitHub Actions Workflow

```yaml
# .github/workflows/release.yml
name: Build and Release

on:
  push:
    tags:
      - "v*"

jobs:
  build-macos:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build Electron app
        env:
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          npm run build
          npx electron-builder --mac --publish always

  # Optionale Windows/Linux Jobs
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npm run build && npx electron-builder --win --publish always
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

### electron-builder Notarisierungskonfiguration

```json
// package.json (build config)
{
  "build": {
    "mac": {
      "notarize": {
        "teamId": "ABCDE12345"
      },
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    }
  }
}
```

```xml
<!-- build/entitlements.mac.plist (Mikrofon-Berechtigung für WhisperFlow) -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.device.audio-input</key>
  <true/>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
</dict>
</plist>
```

> **Wichtiger Hinweis (2025):** `com.apple.security.device.audio-input` ist für WhisperFlow (Mikrofon-Zugriff) **zwingend erforderlich** in den Entitlements.

### Signing deaktivieren (lokale Entwicklung)

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
# oder in electron-builder config:
# "mac": { "identity": null }
```

### Zusammenfassung: Was ist automatisierbar?

| Schritt                      | Automatisierbar in GitHub Actions                              |
| ---------------------------- | -------------------------------------------------------------- |
| Code Signing (Developer ID)  | ✅ Ja (CSC_LINK + CSC_KEY_PASSWORD)                            |
| Notarisierung (Apple Notary) | ✅ Ja (APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID) |
| DMG + ZIP bauen              | ✅ Ja                                                          |
| GitHub Release hochladen     | ✅ Ja (GH_TOKEN)                                               |
| TestFlight / MAS             | ❌ Nein (extra Tools nötig)                                    |

**Quellen:**

- https://www.electron.build/code-signing (Konfidenz: Sehr hoch)
- https://www.electron.build/code-signing-mac (Konfidenz: Sehr hoch)
- https://www.electronjs.org/docs/latest/tutorial/code-signing (Konfidenz: Sehr hoch)

---

## Zusammenfassung: Empfohlener Tech-Stack

| Bereich              | Tool/Ansatz                                            | Konfidenz                            |
| -------------------- | ------------------------------------------------------ | ------------------------------------ |
| Dev HMR (Renderer)   | electron-vite nativer Vite Dev Server                  | ⭐⭐⭐⭐⭐                           |
| Hot Reloading (Main) | `electron-vite dev --watch`                            | ⭐⭐⭐⭐⭐                           |
| Unit Tests           | Vitest (environment: node/jsdom je Prozess)            | ⭐⭐⭐⭐⭐                           |
| E2E Tests            | Playwright `_electron`                                 | ⭐⭐⭐⭐ (experimental, aber stabil) |
| IPC Unit Tests       | vi.mock('electron') + manuelle Handler-Tests           | ⭐⭐⭐⭐                             |
| Linting              | ESLint 9 Flat Config + typescript-eslint + react-hooks | ⭐⭐⭐⭐⭐                           |
| Formatting           | Prettier + eslint-config-prettier                      | ⭐⭐⭐⭐⭐                           |
| Env Variables        | electron-vite Built-in Prefix-System                   | ⭐⭐⭐⭐⭐                           |
| Native Modules       | @electron/rebuild + externalize in config              | ⭐⭐⭐⭐⭐                           |
| Auto-Updates         | electron-updater + electron-builder                    | ⭐⭐⭐⭐⭐                           |
| Update Provider      | GitHub Releases (kostenlos für public/private)         | ⭐⭐⭐⭐⭐                           |
| Error Handling       | process.on('uncaughtException') + Error Boundary       | ⭐⭐⭐⭐⭐                           |
| Crash Reporting      | @sentry/electron (Free Tier)                           | ⭐⭐⭐⭐                             |
| Lokales Logging      | electron-log                                           | ⭐⭐⭐⭐⭐                           |
| macOS Signing CI     | GitHub Actions + CSC_LINK + Notarize                   | ⭐⭐⭐⭐⭐                           |

---

## Offene Fragen / Risiken

1. **Playwright Electron als "experimental":** Trotz stabiler Nutzung in der Praxis kann die API sich ändern. Alternativ: `spectron` (deprecated), `WebdriverIO + electron service` (aktiver Maintainer 2025).
2. **ESM Migration:** Falls WhisperFlow `"type": "module"` nutzt, müssen alle `__dirname`-Referenzen umgeschrieben werden. electron-vite bietet Kompatibilitätslayer, aber beim Upgrade aufpassen.
3. **Native Whisper-Integration:** Die Entscheidung WASM vs. native Addon hat erhebliche Auswirkungen auf Build-Komplexität und Performance. Separate Recherche empfohlen.
4. **Apple Notarisierung und Hardened Runtime:** Whisper.cpp und Audio-Bibliotheken benötigen möglicherweise `com.apple.security.cs.disable-library-validation` Entitlement, was den Notarisierungsprozess erschweren kann.
