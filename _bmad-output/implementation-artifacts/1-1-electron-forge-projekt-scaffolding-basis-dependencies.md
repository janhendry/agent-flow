# Story 1.1: Electron Forge Projekt-Scaffolding & Basis-Dependencies

Status: ready-for-dev

## Story

As a Entwickler,
I want ein vollständig konfiguriertes Electron-Forge-Projekt mit allen Basis-Dependencies und der vorgegebenen Verzeichnisstruktur,
so that ich sofort mit der Feature-Entwicklung beginnen kann ohne Build- oder Struktur-Entscheidungen treffen zu müssen.

## Acceptance Criteria (BDD)

1. **Given** ein leeres Projektverzeichnis **When** das Projekt mit `npx create-electron-app@latest whisper-flow --template=vite-typescript` initialisiert wird und alle Dependencies installiert werden **Then** startet `npm run dev` eine Electron-App ohne Fehler

2. **Given** package.json existiert **Then** folgende Dependencies sind installiert:
   - `nanostores`, `@nanostores/react`, `@janhendry/nanostore-ipc-bridge`
   - `electron-store`
   - `ffmpeg-static`
   - `openai`
   - `zod`
   - `electron-log`
   - `tailwindcss`, `@radix-ui/react-*` (mindestens themes/colors/icons), `framer-motion`
   - `vitest` (devDependency)
   - React 19 + TypeScript 5.x

3. **Given** das Projekt ist initialisiert **Then** folgende Verzeichnisstruktur existiert:

   ```
   shared/types/
   shared/stores/
   shared/stores/actions/
   shared/services/
   src/main/lib/
   src/main/lib/adapters/
   src/preload/
   src/renderer/components/
   src/renderer/screens/
   src/renderer/hooks/
   src/renderer/utils/
   src/__tests__/
   ```

4. **Given** Vite- und TypeScript-Config existieren **Then** der `@shared` Alias ist in `vite.main.config.ts`, `vite.renderer.config.ts` und `tsconfig.json` konfiguriert und resolves zu `shared/`

5. **Given** forge.config.ts existiert **Then** `asarUnpack` für `ffmpeg-static` ist konfiguriert, sodass die Binary außerhalb des ASAR-Archivs liegt

6. **Given** das Projekt ist für macOS Distribution vorbereitet **Then** `entitlements.mac.plist` existiert mit: `allow-unsigned-executable-memory`, `disable-library-validation`, `audio-input`, `audio-output`

## Tasks / Subtasks

- [ ] **Task 1: Projekt-Scaffolding** (AC: #1)
  - [ ] 1.1 `npx create-electron-app@latest whisper-flow --template=vite-typescript` ausführen
  - [ ] 1.2 Generierte Boilerplate verifizieren (`npm run dev` startet fehlerfrei)
  - [ ] 1.3 Git initialisieren, `.gitignore` prüfen/erweitern

- [ ] **Task 2: Dependencies installieren** (AC: #2)
  - [ ] 2.1 Runtime-Dependencies: `npm install nanostores @nanostores/react @janhendry/nanostore-ipc-bridge electron-store ffmpeg-static openai zod electron-log framer-motion`
  - [ ] 2.2 React 19: `npm install react@19 react-dom@19` + `@types/react@19 @types/react-dom@19` (devDep)
  - [ ] 2.3 Tailwind CSS: `npm install -D tailwindcss @tailwindcss/vite` + Konfiguration gemäß Tailwind v4 (CSS-first Config, kein tailwind.config.js)
  - [ ] 2.4 Radix UI: `npm install @radix-ui/themes @radix-ui/react-icons` (weitere Primitives on-demand in späteren Stories)
  - [ ] 2.5 Vitest: `npm install -D vitest` + `vitest.config.ts` mit `@shared` Alias
  - [ ] 2.6 `npm run dev` — verifizieren dass alles noch startet

- [ ] **Task 3: Verzeichnisstruktur erstellen** (AC: #3)
  - [ ] 3.1 `shared/` Ordner auf Root-Ebene (parallel zu `src/`) anlegen
  - [ ] 3.2 Alle Unterordner gemäß Struktur erstellen
  - [ ] 3.3 Placeholder-Dateien (leere `index.ts` Barrel-Exports) in jedem Ordner
  - [ ] 3.4 `.gitkeep` in leeren Ordnern die noch keine Dateien haben

- [ ] **Task 4: `@shared` Alias konfigurieren** (AC: #4)
  - [ ] 4.1 `tsconfig.json`: `"paths": { "@shared/*": ["shared/*"] }` + `"baseUrl": "."`
  - [ ] 4.2 `vite.main.config.ts`: `resolve.alias` → `@shared` → `path.resolve(__dirname, 'shared')`
  - [ ] 4.3 `vite.renderer.config.ts`: gleicher Alias
  - [ ] 4.4 `vite.preload.config.ts`: gleicher Alias (falls vorhanden)
  - [ ] 4.5 Verifizieren: `import {} from '@shared/types'` kompiliert in Main UND Renderer

- [ ] **Task 5: forge.config.ts — asarUnpack & Maker** (AC: #5)
  - [ ] 5.1 `packagerConfig.asar = true` setzen
  - [ ] 5.2 `packagerConfig.extraResource` oder `asarUnpack: ['**/node_modules/ffmpeg-static/**']` konfigurieren
  - [ ] 5.3 macOS Maker konfigurieren: `@electron-forge/maker-dmg`, `@electron-forge/maker-zip`
  - [ ] 5.4 `packagerConfig.osxSign` und `packagerConfig.osxNotarize` als Platzhalter vorbereiten (Env-Variablen)

- [ ] **Task 6: entitlements.mac.plist** (AC: #6)
  - [ ] 6.1 Datei erstellen im Projekt-Root
  - [ ] 6.2 Entitlements setzen:
    - `com.apple.security.cs.allow-unsigned-executable-memory` → true
    - `com.apple.security.cs.disable-library-validation` → true (KRITISCH für ffmpeg-static)
    - `com.apple.security.device.audio-input` → true
    - `com.apple.security.device.audio-output` → true
  - [ ] 6.3 In `forge.config.ts` → `packagerConfig.osxSign.entitlements` referenzieren

- [ ] **Task 7: Smoke Test & Cleanup** (AC: #1)
  - [ ] 7.1 `npm run dev` — App startet, Electron-Fenster sichtbar
  - [ ] 7.2 `npx vitest run` — keine Fehler (leerer Test-Run)
  - [ ] 7.3 `npm run package` — Build läuft durch ohne Fehler
  - [ ] 7.4 Unnötigen Boilerplate-Code aus Template entfernen (Default-HTML etc.)

## Dev Notes

### Architektur-Compliance — KRITISCHE Regeln

Diese Regeln gelten ab Story 1.1 und müssen von **jeder** nachfolgenden Story eingehalten werden:

| Regel                   | Beschreibung                                                            |
| ----------------------- | ----------------------------------------------------------------------- |
| **Shared-Ordner**       | `shared/` liegt auf Root-Ebene (NICHT in `src/`!) — via `@shared` Alias |
| **Kein Default-Export** | React-Komponenten + alle Module: nur Named Exports                      |
| **async/await**         | Immer `async/await` — kein `.then()`, keine Callbacks                   |
| **TypeScript strict**   | `strict: true` in tsconfig — keine `any` Types                          |
| **Store Prefix**        | Alle NanoStores mit `$` Prefix: `$recordingState`, `$hudVisible`        |
| **Actions Only**        | Store-Mutations ausschließlich über Actions — nie direkt `store.set()`  |
| **IPC Consts**          | IPC Channel-Namen als TypeScript `const` — keine Magic Strings          |
| **Error Pattern**       | Typed `AppError` Objekte — nie rohe `Error` oder Strings über IPC       |

### Starter-Template Entscheidung

**Electron Forge mit `vite-typescript` Template** — NICHT `electron-vite CLI`. Diese Entscheidung wurde in der Architekturphase getroffen weil:

- Nativ integrierte Build-Pipeline (Vite Plugin)
- Code Signing + Notarization + Auto-Update out-of-the-box
- Publishing (DMG, ZIP) nativ integriert
- Kein separates `electron-builder` Setup nötig

### Initialisierungs-Command

```bash
npx create-electron-app@latest whisper-flow --template=vite-typescript
```

> **WICHTIG:** Das Template generiert `src/main/`, `src/preload/`, `src/renderer/` — diese Struktur beibehalten. `shared/` wird ZUSÄTZLICH auf Root-Ebene angelegt.

### Dependencies — Exakte Packages

**Runtime:**

```
nanostores @nanostores/react @janhendry/nanostore-ipc-bridge
electron-store ffmpeg-static openai zod electron-log
framer-motion
react@19 react-dom@19
```

**Dev:**

```
vitest
tailwindcss @tailwindcss/vite
@radix-ui/themes @radix-ui/react-icons
@types/react@19 @types/react-dom@19
```

> **Hinweis zu Tailwind CSS:** Verwende Tailwind v4 mit CSS-first Konfiguration (kein `tailwind.config.js`). Import via `@import "tailwindcss"` in der globalen CSS-Datei. Vite-Plugin: `@tailwindcss/vite`.

> **Hinweis zu Radix UI:** In dieser Story nur `@radix-ui/themes` + `@radix-ui/react-icons` installieren. Weitere Primitives (Dialog, Switch, Select etc.) werden on-demand in späteren Stories hinzugefügt.

### `@shared` Alias — Konfiguration

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"]
    }
  }
}
```

**vite.main.config.ts / vite.renderer.config.ts:**

```typescript
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  // ... rest of config
});
```

### forge.config.ts — FFmpeg asarUnpack

```typescript
// forge.config.ts
const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: ["./node_modules/ffmpeg-static/ffmpeg"],
    // ALTERNATIV: asarUnpack: ['**/node_modules/ffmpeg-static/**'],
    osxSign: {}, // Platzhalter — Details in späteren Stories
    osxNotarize: undefined, // Env-basiert in CI/CD
  },
  // ...
};
```

> **Warum extraResource/asarUnpack?** `ffmpeg-static` liefert eine native Binary. `child_process.spawn()` kann keine Dateien innerhalb eines ASAR-Archivs ausführen. Die Binary muss auf dem echten Dateisystem liegen.

### entitlements.mac.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.device.audio-output</key>
    <true/>
  </dict>
</plist>
```

> **KRITISCH:** `disable-library-validation` ist PFLICHT — ohne dieses Entitlement verweigert macOS Hardened Runtime die Ausführung der ffmpeg-static Binary via `child_process.spawn()`.

### Ziel-Projektstruktur nach Story 1.1

```
whisper-flow/
├── package.json
├── forge.config.ts
├── vite.main.config.ts
├── vite.preload.config.ts
├── vite.renderer.config.ts
├── tsconfig.json
├── vitest.config.ts
├── entitlements.mac.plist
├── shared/                          ← NEU (Root-Ebene!)
│   ├── types/
│   │   └── index.ts                 ← Leerer Barrel-Export
│   ├── stores/
│   │   ├── index.ts
│   │   └── actions/
│   │       └── index.ts
│   └── services/
│       └── index.ts
├── src/
│   ├── main/
│   │   ├── index.ts                 ← Vom Template generiert
│   │   └── lib/
│   │       └── adapters/
│   ├── preload/
│   │   └── index.ts                 ← Vom Template generiert
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css                ← Tailwind: @import "tailwindcss"
│   │   ├── components/
│   │   ├── screens/
│   │   ├── hooks/
│   │   └── utils/
│   └── __tests__/
└── .gitignore
```

### Was diese Story NICHT macht

- ❌ Kein NanoStore-IPC-Setup (→ Story 1.2)
- ❌ Keine Shared Types definieren (→ Story 1.2)
- ❌ Kein Window Manager (→ Story 1.3)
- ❌ Kein System Tray (→ Story 1.4)
- ❌ Keine Business-Logik — nur Scaffolding + Dependencies + Struktur

### Bekannte Stolperfallen

1. **React 19 + Electron Forge Template:** Das Template liefert möglicherweise React 18. React explizit auf v19 upgraden UND `@types/react@19` installieren.
2. **Tailwind v4 vs v3:** Tailwind v4 nutzt CSS-first Config — KEIN `tailwind.config.js`. Sicherstellen dass das Vite-Plugin `@tailwindcss/vite` verwendet wird, nicht `tailwindcss` als PostCSS-Plugin.
3. **ffmpeg-static Plattform:** `ffmpeg-static` installiert die Binary für die aktuelle Plattform. Auf macOS ARM64 wird die ARM64-Binary installiert. In CI (GitHub Actions) muss ggf. die richtige Plattform konfiguriert werden.
4. **@shared Alias in Tests:** `vitest.config.ts` muss denselben `@shared` Alias haben wie die Vite-Configs.

### Project Structure Notes

- `shared/` auf Root-Ebene ist eine bewusste Architektur-Entscheidung: Main Process UND Renderer können denselben Code importieren via `@shared`
- Die Ordnerstruktur spiegelt die Architektur: Types/Stores/Services in `shared/`, Node-only in `src/main/lib/`, React in `src/renderer/`
- `src/__tests__/` ist der zentrale Ort für Vitest-Tests

### References

- [Architecture: Starter Template Evaluation](../_bmad-output/planning-artifacts/architecture.md#starter-template-evaluation) — Warum Electron Forge
- [Architecture: Project Structure](../_bmad-output/planning-artifacts/architecture.md#complete-project-directory-structure) — Vollständige Zielstruktur
- [Architecture: Distribution & Build](../_bmad-output/planning-artifacts/architecture.md#distribution--build) — Forge, Signing, asarUnpack
- [Architecture: Implementation Patterns](../_bmad-output/planning-artifacts/architecture.md#implementation-patterns--consistency-rules) — Coding-Konventionen
- [Epic 1 Overview](../_bmad-output/planning-artifacts/epics.md#epic-1-app-foundation--system-tray) — Epic-Kontext

## Dev Agent Record

### Agent Model Used

(wird vom Dev Agent ausgefüllt)

### Debug Log References

### Completion Notes List

### Change Log

### File List
