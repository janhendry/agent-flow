# whisper-flow

Electron-Desktop-App für Audio-Transkription. Adapter auf die Core-Use-Cases aus `whisper-poc`.

## ⚠️ KEINE UNIT-TESTS IN DIESEM PROJEKT

**In `whisper-flow` gibt es KEINE Unit-Tests und das ist Absicht.**

- Electron-Tests sind komplex und bringen hier keinen Mehrwert.
- Die gesamte Business-Logik lebt in `whisper-poc/` und wird dort getestet.
- `whisper-flow` ist ein reiner Adapter (IPC → Core-Bridge → Core-Use-Cases).
- Qualitätssicherung läuft über **Typecheck + Biome Lint + manuellen Smoke-Test**.

**Keine Test-Dateien (`.test.ts`, `.spec.ts`) anlegen!**

## Scripts

```bash
npm run start       # Electron-App im Dev-Modus starten
npm run typecheck   # TypeScript Typecheck (tsc --noEmit)
npm run lint        # Biome Linting
npm run lint:fix    # Biome Auto-Fix
npm run verify      # Typecheck + Lint + Package (Qualitätsgate)
npm run package     # Electron-App paketieren
```

## Architektur

```
whisper-flow/src/
├── main.ts            # Electron Main-Prozess, IPC-Handler, Shortcut, State-Machine
├── preload.ts         # contextBridge → typisierte electronAPI
├── renderer.ts        # React-App Einstiegspunkt
├── core-bridge.ts     # Adapter: delegiert an whisper-poc Core-Funktionen
├── ipc-types.ts       # Typdefinitionen für IPC-Kanäle
├── state-machine.ts   # App-State-Automat (idle→recording→transcribing→success→error)
├── global.d.ts        # window.electronAPI Typ-Deklaration
└── components/
    └── App.tsx         # HUD-Pill React-Komponente
```
