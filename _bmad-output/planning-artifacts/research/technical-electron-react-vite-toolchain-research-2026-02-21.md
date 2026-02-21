# Technische Recherche: Electron + React + TypeScript + Vite Toolchain (2025/2026)

**Projekt:** WhisperFlow – macOS Voice-to-Text App  
**Datum:** 21. Februar 2026  
**Status:** Abgeschlossen  
**Konfidenz-Legende:** 🟢 Hoch | 🟡 Mittel | 🔴 Niedrig

---

## Thema 1: electron-vite vs. vite-plugin-electron

### Empfehlung: `electron-vite` (alex8088) 🟢

**Fazit:** `electron-vite` ist klar der bevorzugte Ansatz für neue Projekte in 2025/2026. Es ist deutlich aktiver gepflegt, hat mehr Nutzer und bietet einen vollständigeren Feature-Satz.

### Vergleich

| Merkmal                     | `electron-vite`                                                                   | `vite-plugin-electron`                               |
| --------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **GitHub Stars**            | 5.200 ⭐                                                                          | 857 ⭐                                               |
| **npm Weekly Downloads**    | ~66.569                                                                           | ~34.269                                              |
| **Letztes npm Release**     | v5.0.0 (Dez 2025, vor 2 Monaten)                                                  | v0.29.0 (vor 1 Jahr)                                 |
| **Letzter GitHub Commit**   | vor 5 Tagen                                                                       | vor 1 Monat (v0.29.1)                                |
| **Used by (GitHub)**        | 11.300+ Repos                                                                     | nicht angegeben                                      |
| **Maintainer**              | alex8088 (dediziert)                                                              | community                                            |
| **Vite-Konfiguration**      | Eigene `electron.vite.config.ts` – separate Sektionen für main, preload, renderer | Als Plugin in bestehende `vite.config.ts` integriert |
| **HMR/Hot Reload**          | ✅ Vollständig (Renderer HMR + Main/Preload Hot Reload)                           | ✅ Vorhanden                                         |
| **Bytecode-Schutz**         | ✅ V8 Bytecode Kompilierung (Source Protection)                                   | ❌ Nicht enthalten                                   |
| **Multi-threading Support** | ✅ Via Import-Suffixe                                                             | ❌                                                   |
| **Isolierter Build**        | ✅ (neu in v5)                                                                    | ❌                                                   |
| **CLI Scaffolding**         | ✅ `npm create @quick-start/electron@latest`                                      | ❌                                                   |
| **Ansatz**                  | Eigenständiges Build-Tool rund um Vite                                            | Vite-Plugin (leichtgewichtiger)                      |

### Wann welches wählen?

- **`electron-vite`**: Für alle neuen Projekte – vollständigste Lösung, aktiv gepflegt, beste DX.
- **`vite-plugin-electron`**: Nur wenn ein minimalistischer „Plugin-in-existing-Vite-config"-Ansatz gewünscht ist, oder wenn man Nuxt/andere Frameworks als Basis nutzt.

### Quellen

- [https://github.com/alex8088/electron-vite](https://github.com/alex8088/electron-vite)
- [https://www.npmjs.com/package/electron-vite](https://www.npmjs.com/package/electron-vite)
- [https://github.com/electron-vite/vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)
- [https://www.npmjs.com/package/vite-plugin-electron](https://www.npmjs.com/package/vite-plugin-electron)

---

## Thema 2: Scaffolding / Boilerplate-Optionen

### Empfehlung: `npm create @quick-start/electron@latest` (electron-vite CLI) 🟢

### Vergleich der Optionen

#### Option A: electron-vite CLI (`npm create @quick-start/electron`) ✅ **Empfohlen**

```bash
npm create @quick-start/electron@latest
# Oder mit spezifischem Template:
npm create @quick-start/electron@latest my-app -- --template react-ts
```

**Vorteile:**

- Erzeugt sofort lauffähiges Projekt mit React + TypeScript + Vite
- Korrekte Konfiguration für main, preload, renderer out-of-the-box
- `electron.vite.config.ts` bereits konfiguriert
- Separate `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Optional: electron-updater Plugin, Download-Mirror-Proxy
- Aktiv gepflegt, aktuell (v5.0.0, Dez 2025)

**Verfügbare Templates:**
| Template | Beschreibung |
|---|---|
| `vanilla` / `vanilla-ts` | Ohne Framework / mit TypeScript |
| `vue` / `vue-ts` | Vue 3 |
| **`react` / `react-ts`** | **React (unser Ziel)** |
| `svelte` / `svelte-ts` | Svelte |
| `solid` / `solid-ts` | SolidJS |

#### Option B: Electron Forge (`npx create-electron-app@latest --template=vite-typescript`)

```bash
npx create-electron-app@latest my-app --template=vite-typescript
```

**Vorteile:**

- Offiziell von electronjs.org empfohlen/dokumentiert
- Integriertes Build-System (Forge), Code-Signing, Publishing
- Vier Templates: `webpack`, `webpack-typescript`, `vite`, **`vite-typescript`**

**Nachteile:**

- Komplexere Konfiguration (`forge.config.js`)
- Forge-eigene Build-Pipeline (kein electron-builder)
- Mehr Overhead für einfache Projekte
- electron-vite ist als separate Dev-Dependency nicht enthalten

#### Option C: electron-react-boilerplate ⚠️ Nicht empfohlen

- 24.2k Stars (historisch populär)
- **Letztes Release: v4.6.0 vom Mai 2022** – über 3 Jahre alt!
- Nutzt **Webpack**, nicht Vite
- Keine aktiven Releases mehr

**Quellen:**

- [https://electron-vite.org/guide/](https://electron-vite.org/guide/)
- [https://github.com/alex8088/quick-start/tree/master/packages/create-electron](https://github.com/alex8088/quick-start/tree/master/packages/create-electron)
- [https://www.electronforge.io/](https://www.electronforge.io/)
- [https://github.com/electron-react-boilerplate/electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)

---

## Thema 3: electron-vite im Detail

### Was ist electron-vite?

`electron-vite` ist ein vollständiges Build-Tool (nicht nur ein Plugin) für Electron-Anwendungen, das auf Vite aufbaut. Es wurde konzipiert, um die typischen Herausforderungen bei der Electron-Entwicklung (Dual-Environment: Node.js + Browser) transparent zu lösen.

**Aktuelle Version:** v5.0.0 (7. Dezember 2025)  
**Website:** [https://electron-vite.org](https://electron-vite.org)  
**Anforderungen:** Node.js 20.19+ oder 22.12+, Vite 5.0+

### Kernfeatures (v5.0.0)

1. **Isolierter Build** (`build.isolatedEntries`) – NEU in v5: Automatische Isolierung von Multi-Entry-Builds, effizienter Tree-Shaking, reduzierte Chunk-Generierung
2. **Vite HMR** für Renderer-Prozess + **Hot Reloading** für Main-Prozess und Preload-Scripts
3. **V8 Bytecode Kompilierung** für Source-Code-Schutz (inkl. neuer String-Obfuskation in v5)
4. **Multi-Threading-Support** via Import-Suffixe (`?worker`, `?modulePath`)
5. **Asset Handling** optimiert für Main-Prozess
6. **Zentrale Konfiguration** für alle drei Prozesse in einer Datei

### CLI-Verwendung

```bash
# Entwicklung
electron-vite dev          # Dev-Server + Electron starten

# Build
electron-vite build        # Produktion Build

# Preview
electron-vite preview      # Produktions-Build vorschauen
```

### Konfigurationsdatei (`electron.vite.config.ts`)

```typescript
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
  },
});
```

### Generierte Projektstruktur

```
my-app/
├── build/                    # App-Icons (icon.icns, icon.ico, icon.png)
├── resources/                # Build-Ressourcen
├── src/
│   ├── main/                 # Electron Main Process
│   │   └── index.ts
│   ├── preload/              # Preload Scripts
│   │   └── index.ts
│   └── renderer/             # React/Vite Frontend
│       ├── src/
│       │   ├── assets/
│       │   ├── components/
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── index.html
├── electron.vite.config.ts
├── electron-builder.yml      # oder package.json "build" section
├── package.json
├── tsconfig.json             # Basis
├── tsconfig.node.json        # Main + Preload
└── tsconfig.web.json         # Renderer
```

**Quellen:**

- [https://electron-vite.org/guide/](https://electron-vite.org/guide/)
- [https://electron-vite.org/blog/](https://electron-vite.org/blog/) (v5.0 Blog-Post)

---

## Thema 4: Vite-Versionskompatibilität

### Empfehlung: Vite 5.x (via electron-vite) 🟢

### Aktuelle Situation

|            | Details                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Vite 5** | Stabil, von electron-vite v5 mindestens vorausgesetzt (`Vite 5.0+`)                                        |
| **Vite 6** | Stabil seit 26. November 2024 (Major Release mit Breaking Changes)                                         |
| **Vite 7** | electron-vite nutzt intern bereits Vite 7 (GitHub: "update Vite to v7" vor 8 Monaten im `bin`-Verzeichnis) |

### Wichtig zu wissen

- **electron-vite bündelt Vite intern** und stellt es als eigene Abstraktion bereit. Das bedeutet: Als User installiert man `electron-vite` als devDependency, und es bringt die richtige Vite-Version selbst mit.
- Die `electron.vite.config.ts` nutzt Vite-Konfigurationsoptionen direkt – man arbeitet mit Vite, auch wenn electron-vite die Version intern managed.
- Die offizielle Doku sagt: `Requires Vite version 5.0+` (das ist die Mindest-Peer-Requirement für eigene Vite-Plugins o.ä.)

### Vite 6 Breaking Changes (relevant für Electron)

- Neue Default-Werte für `resolve.conditions`
- JSON Stringify-Verhalten geändert
- Sass nutzt nun modern API by default
- Node.js 21 Support entfernt (18, 20, 22+ supported)
- Neue experimentelle **Environment API** (für Framework-Autoren, nicht für App-Dev relevant)

### Empfehlung für WhisperFlow

Verwende `npm create @quick-start/electron@latest` – electron-vite v5 wählt die optimale Vite-Version automatisch. Kein manuelles Vite-Version-Management nötig.

**Quellen:**

- [https://electron-vite.org/guide/](https://electron-vite.org/guide/) (Anforderungen)
- [https://vite.dev/blog/announcing-vite6](https://vite.dev/blog/announcing-vite6)

---

## Thema 5: TypeScript-Konfiguration für Electron

### Empfehlung: Drei separate tsconfig-Dateien 🟢

Die von electron-vite generierte Projektstruktur enthält standardmäßig **drei TypeScript-Konfigurationsdateien**:

### Struktur

#### `tsconfig.json` (Basis / IDE-Referenz)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

#### `tsconfig.node.json` (Main Process + Preload)

```json
{
  "extends": "@tsconfig/node-lts/tsconfig.json",
  "include": ["electron.vite.config.*", "src/main/**/*", "src/preload/**/*"],
  "compilerOptions": {
    "composite": true,
    "types": ["electron-vite/node"],
    "lib": ["ES2022"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "skipLibCheck": true
  }
}
```

**Wichtig:** Main-Prozess läuft in Node.js-Umgebung → keine DOM-Typen, korrekte Node.js-Module.

#### `tsconfig.web.json` (Renderer Process)

```json
{
  "extends": "@tsconfig/vite-react/tsconfig.json",
  "include": ["src/renderer/**/*"],
  "compilerOptions": {
    "composite": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "resolveJsonModule": true,
    "skipLibCheck": true
  }
}
```

**Wichtig:** Renderer läuft in Chromium → DOM-Typen enthalten, JSX-Support.

### Best Practices

1. **Klare Trennung** von Node.js-Typen (main/preload) und Browser-Typen (renderer)
2. **`electron-vite/node`** in `compilerOptions.types` für Main/Preload Type-Checking
3. **Kein `isolatedModules: true`** notwendig (electron-vite handled das intern)
4. **Decorators**: Bei Bedarf `swcPlugin()` aus electron-vite nutzen (z.B. für TypeORM)
5. **Path Aliases**: In `electron.vite.config.ts` und `tsconfig` synchron halten

### Quellen

- [https://electron-vite.org/guide/typescript](https://electron-vite.org/guide/typescript)

---

## Thema 6: React 18 vs. React 19

### Empfehlung: React 19 ✅ (keine bekannten Electron-Probleme) 🟢

### Aktuelle Versionen

|                             | Details                      |
| --------------------------- | ---------------------------- |
| **React 19**                | Stabil seit 5. Dezember 2024 |
| **Electron stable**         | v40.6.0 (Feb 2026)           |
| **Electron beta**           | v41.0.0-beta.4               |
| **Chromium in Electron 40** | ~144.x                       |

### Neue Features in React 19 (relevant für Electron/Desktop)

| Feature                                     | Relevanz für WhisperFlow                            |
| ------------------------------------------- | --------------------------------------------------- |
| **Actions** (`useTransition` für async)     | ✅ Nützlich für Whisper-Verarbeitung (Audio → Text) |
| **`useActionState`**                        | ✅ State-Management für Audio-Verarbeitungs-States  |
| **`useOptimistic`**                         | ✅ Optimistische UI-Updates                         |
| **`ref` als prop** (kein `forwardRef` mehr) | ✅ Cleaner Code                                     |
| **`<Context>` als Provider**                | ✅ Vereinfachte Context-Nutzung                     |
| **Ref Cleanup Functions**                   | ✅ Besseres Ressource-Management                    |
| **Server Components**                       | ❌ Nicht relevant für Electron                      |
| **Server Actions**                          | ❌ Nicht relevant für Electron                      |

### Electron-Kompatibilität

- **Keine bekannten Breaking Changes** zwischen React 19 und Electron
- Electron's Renderer-Prozess ist ein vollständiger Chromium-Browser → React läuft wie in einer normalen Web-App
- `react-dom/client` `createRoot` API (seit React 18) weiterhin die Standard-Methode
- React 19 hat **keinen speziellen Electron-Support nötig** – läuft out-of-the-box

### Migration von React 18 → 19

Falls man von React 18 kommt:

- `forwardRef` wird weiterhin unterstützt (nur deprecated)
- `createContext` gibt `<Context>` direkt zurück (kein `.Provider` nötig)
- Upgrade Guide: [https://react.dev/blog/2024/04/25/react-19-upgrade-guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

### Empfehlung

Für ein neues Projekt in 2026: **Direkt React 19 starten**. Kein Grund für React 18.

**Quellen:**

- [https://react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19)
- [https://github.com/electron/electron/releases](https://github.com/electron/electron/releases) (aktuelle Releases)

---

## Thema 7: electron-builder vs. Electron Forge

### Empfehlung: electron-builder (für WhisperFlow) 🟢

### Vergleich

| Merkmal                           | `electron-builder`                                       | `Electron Forge`                          |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| **GitHub Stars**                  | 14.500 ⭐                                                | ~7k ⭐ (Forge + Packager)                 |
| **Used by**                       | 175.000+ Repos                                           | signifikant weniger                       |
| **Letztes Release**               | v26.8.1 (vor 5 Tagen) – sehr aktiv                       | v7.x                                      |
| **Offizielle Empfehlung**         | electronjs.org Tutorial                                  | ✅ Offiziell im Tutorial                  |
| **Konfiguration**                 | `electron-builder.yml` oder `package.json["build"]`      | `forge.config.js`                         |
| **macOS DMG**                     | ✅ Native DMG, PKG, MAS                                  | ✅                                        |
| **Auto-Update**                   | ✅ `electron-updater` (built-in)                         | ✅ (Forge-eigenes System)                 |
| **Code-Signing macOS**            | ✅ Umfangreich konfigurierbar                            | ✅                                        |
| **Notarisierung**                 | ✅ `notarytool` Support                                  | ✅                                        |
| **Ziel-Formate macOS**            | dmg, pkg, mas, zip                                       | dmg, zip                                  |
| **Ziel-Formate Windows**          | nsis, msi, portable, appx, squirrel                      | squirrel, nsis                            |
| **Ziel-Formate Linux**            | AppImage, deb, rpm, snap, pacman                         | deb, rpm, AppImage                        |
| **Integration mit electron-vite** | ✅ electron-vite Template enthält `electron-builder.yml` | Teilweise (Forge hat eigene Vite-Plugins) |
| **Lernkurve**                     | Mittel                                                   | Mittel                                    |
| **Bekannte Nutzer**               | Signal, VS Code (teilweise), viele productive apps       | –                                         |

### electron-builder: Typische macOS-Konfiguration (`electron-builder.yml`)

```yaml
appId: com.whisperflow.app
productName: WhisperFlow
directories:
  buildResources: build
files:
  - "!**/.vscode/*"
  - "!src/*"
  - "!electron.vite.config.{js,ts,mjs,cjs}"
  - "!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,CONTRIBUTING.md}"
  - "!{.env,.env.*,.npmrc,pnpm-lock.yaml}"
  - "!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}"
asarUnpack:
  - resources/**
mac:
  entitlementsInherit: build/entitlements.mac.plist
  extendInfo:
    - NSDocumentsFolderUsageDescription: Allow access to Documents
    - NSDownloadsFolderUsageDescription: Allow downloads
  notarize: false # Konfigurierbar für CI
  category: public.app-category.productivity
  icon: build/icon.icns
dmg:
  artifactName: ${name}-${version}.${ext}

publish:
  provider: generic
  url: https://example.com/auto-updates
```

### Wann was wählen?

- **electron-builder** → Wenn maximale Kontrolle über Packaging, viele Distributionsformate, electron-vite als Build-Tool gewünscht (Default-Template nutzt electron-builder bereits)
- **Electron Forge** → Wenn tight Integration mit dem offiziellen Electron-Ökosystem gewünscht, oder wenn kein electron-vite genutzt wird

### Quellen

- [https://github.com/electron-userland/electron-builder](https://github.com/electron-userland/electron-builder)
- [https://www.electron.build/](https://www.electron.build/)
- [https://www.electronforge.io/](https://www.electronforge.io/)
- [https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)

---

## Thema 8: Empfohlene Projektstruktur

### Standard-Struktur (electron-vite `react-ts` Template)

```
whisper-flow/
├── build/                          # Icons & Build-Ressourcen
│   ├── icon.icns                   # macOS App-Icon
│   ├── icon.ico                    # Windows App-Icon
│   ├── icon.png                    # Linux App-Icon
│   └── entitlements.mac.plist      # macOS Berechtigungen
│
├── resources/                      # Statische App-Ressourcen (Runtime)
│                                   # z.B. Whisper WASM-Modelle
│
├── src/
│   ├── main/                       # Electron Main Process (Node.js)
│   │   └── index.ts                # App-Lifecycle, BrowserWindow
│   │
│   ├── preload/                    # Preload Script (Bridge)
│   │   └── index.ts                # contextBridge API Exposition
│   │
│   └── renderer/                   # React Frontend (Chromium/Browser)
│       ├── src/
│       │   ├── assets/             # Bilder, Fonts, etc.
│       │   ├── components/         # React-Komponenten
│       │   ├── store/              # State Management (Zustand o.ä.)
│       │   ├── hooks/              # Custom Hooks
│       │   ├── types/              # TypeScript Typen
│       │   ├── App.tsx             # Root-Komponente
│       │   └── main.tsx            # ReactDOM.createRoot
│       └── index.html              # HTML Entry Point
│
├── electron.vite.config.ts         # Build-Konfiguration (main/preload/renderer)
├── electron-builder.yml            # Packaging-Konfiguration
├── package.json                    # Scripts: dev, build, preview, package
│
├── tsconfig.json                   # Basis tsconfig (nur References)
├── tsconfig.node.json              # Main + Preload TypeScript Config
└── tsconfig.web.json               # Renderer TypeScript Config
```

### Schlüssel-`package.json`-Scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview",
    "package:mac": "npm run build && electron-builder --mac",
    "package:all": "npm run build && electron-builder --mac --win --linux"
  }
}
```

### `main` Entry in `package.json`

```json
{
  "main": "./out/main/index.js"
}
```

### Empfohlene Abhängigkeiten für WhisperFlow

```json
{
  "devDependencies": {
    "@electron-toolkit/eslint-config-react": "*",
    "@electron-toolkit/tsconfig": "*",
    "@vitejs/plugin-react": "*",
    "electron": "^40.x",
    "electron-builder": "^26.x",
    "electron-vite": "^5.x",
    "typescript": "^5.x",
    "vite": "^5.x || ^6.x"
  },
  "dependencies": {
    "@electron-toolkit/preload": "*",
    "@electron-toolkit/utils": "*",
    "react": "^19.x",
    "react-dom": "^19.x"
  }
}
```

---

## Gesamtempfehlung: Empfohlener Stack für WhisperFlow

| Bereich         | Empfehlung                                                    | Version | Konfidenz |
| --------------- | ------------------------------------------------------------- | ------- | --------- |
| **Scaffolding** | `npm create @quick-start/electron@latest` (react-ts Template) | –       | 🟢 Hoch   |
| **Build Tool**  | `electron-vite`                                               | v5.x    | 🟢 Hoch   |
| **Vite**        | Intern von electron-vite gemanagt (v5+)                       | 5.x+    | 🟢 Hoch   |
| **React**       | React 19                                                      | ^19.0   | 🟢 Hoch   |
| **TypeScript**  | TypeScript mit 3 separaten tsconfigs                          | ^5.x    | 🟢 Hoch   |
| **Packaging**   | electron-builder                                              | ^26.x   | 🟢 Hoch   |
| **Electron**    | Electron (stable)                                             | ^40.x   | 🟢 Hoch   |

### Schnellstart-Befehl

```bash
npm create @quick-start/electron@latest whisper-flow -- --template react-ts
cd whisper-flow
npm install
npm run dev
```

---

## Offene Fragen / Weitere Recherche empfohlen

1. **Audio-Aufnahme in Electron**: Web Audio API vs. native Node.js Modules vs. `desktopCapturer` – für Microphone Input
2. **Whisper-Integration**: `whisper.cpp` via WASM vs. `openai-node` API vs. lokale Binary via `child_process` / `utilityProcess`
3. **macOS-spezifische Berechtigungen**: `NSMicrophoneUsageDescription` in `entitlements.mac.plist`
4. **Auto-Updater**: `electron-updater` Konfiguration und Update-Server-Strategie
5. **Code-Signing für macOS**: Apple Developer Account, Notarisierung via `notarytool`

---

_Erstellt von: Technical Researcher_  
_Basis: Direkte Web-Recherche auf offiziellen Repos, npm, GitHub und Dokumentationsseiten_  
_Alle Statistiken Stand: 21. Februar 2026_
