# Whisper POC – Initialisierungsleitfaden (Foundation)

## Ziel

Diese Foundation definiert den reproduzierbaren Startpunkt für die Core-first-Weiterentwicklung auf Basis von `whisper-poc`.

## Starter-Vorgabe

- Offizieller Ausgangsstand: bestehende `whisper-poc`-Codebasis
- Kein alternatives Scaffolding in Story 1.1

## Reproduzierbarer Ablauf

1. `npm install`
2. Optional: `.env.example` nach `.env.local` kopieren und Werte setzen
3. `npm run verify`

## Architektur-Grenzen (für Folge-Stories)

- Zielbild: klare Trennung zwischen Core-Logik und CLI-Adaptern
- In Story 1.1 werden dafür nur Baselines und Leitplanken gesetzt
- Feature-Implementierung folgt in nachgelagerten Stories

### Minimal belegbare Struktur (Foundation)

- `src/core/ports/secret-store.port.ts` definiert den Core-Port für Secret-Verwaltung.
- `src/adapters/cli/secret-store.adapter.ts` implementiert den CLI-Adapter.
- Integration ist bereits in CLI/TUI-Aufrufen verdrahtet (Setup/Transcribe/Config-Screen).

Damit ist die Core/Adapter-Grenze in Story 1.1 praktisch nachweisbar vorbereitet.

## Qualitätsgates

- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Kombiniert: `npm run verify`

## Security- und Konfigurationsregeln

- Keine Secrets im Repo (`.env*` ignoriert, `.env.example` erlaubt)
- CI bezieht Secrets aus Secret-Store, nicht aus Repo-Dateien
- Lokale Konfiguration bleibt lokal (`.env.local`)

### Secret-Store-Pfad (keychain-ready)

- Aktuelle Foundation-Implementierung nutzt einen klaren Adapterpfad über `SecretStorePort`.
- Der CLI-Adapter nutzt lokal eine dedizierte Secret-Datei außerhalb des Repos (`~/.whisper-poc/secrets.json`).
- Geplanter Upgrade-Pfad: Austausch des CLI-Adapters durch OS-Keychain/safeStorage-Adapter ohne Änderung des Core-Ports.
