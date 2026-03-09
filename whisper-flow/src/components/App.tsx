import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppSettings,
  AppState,
  AppStatePayload,
  AudioLevelPayload,
  RecordingMode,
  SettingsCommand,
  SettingsValidationResult,
  ShortcutStatus,
  ThemeMode,
} from "../ipc-types";
import { SETTINGS_TABS, type SettingsTab } from "../settings";

const METER_BARS = 22;
const METER_KEYS = Array.from(
  { length: METER_BARS },
  (_, index) => `bar-${index}`,
);

const SHORTCUT_LABELS: Record<keyof AppSettings["shortcuts"], string> = {
  recordingToggle: "Aufnahme Start/Stop",
  profileOverlayToggle: "Profil-Overlay",
  historyOverlayToggle: "History-Overlay",
};

export function App() {
  const api = (globalThis as unknown as Window).electronAPI;
  const [appState, setAppState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [savedSettings, setSavedSettings] = useState<AppSettings | null>(null);
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [validation, setValidation] = useState<SettingsValidationResult | null>(
    null,
  );
  const [statusText, setStatusText] = useState("");
  const [audioDevices, setAudioDevices] = useState<
    Array<{ index: number; name: string }>
  >([]);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [capturing, setCapturing] = useState<
    keyof AppSettings["shortcuts"] | null
  >(null);
  const [audioLevel, setAudioLevel] = useState<AudioLevelPayload>({
    mic: 0,
    sys: 0,
  });
  const [isDualMode, setIsDualMode] = useState(false);
  const [shortcutStatuses, setShortcutStatuses] = useState<ShortcutStatus[]>(
    [],
  );
  const captureInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!api) return;

    api.settings.load().then((result) => {
      if (result.ok) {
        setSavedSettings(result.data);
        setDraftSettings(result.data);
        setTheme(result.data.display.theme);
      }
    });

    api.shortcuts.getAll().then((result) => {
      if (result.ok) {
        setShortcutStatuses(result.data);
      }
    });

    api.diagnose.listDevices().then((result) => {
      if (result.ok) {
        setAudioDevices(result.data);
      }
    });

    const unsubState = api.onStateChange((payload: AppStatePayload) => {
      setAppState(payload.state);
      if (payload.state !== "recording") {
        setAudioLevel({ mic: 0, sys: 0 });
        setIsDualMode(false);
      }
    });

    const unsubLevel = api.onAudioLevel((level: AudioLevelPayload) => {
      setAudioLevel(level);
      if (level.mic > 0.01 && level.sys > 0.01) {
        setIsDualMode(true);
      }
    });

    const unsubTheme = api.onThemeChanged((nextTheme: ThemeMode) => {
      setTheme(nextTheme);
    });

    return () => {
      unsubState();
      unsubLevel();
      unsubTheme();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!capturing) {
      return;
    }
    captureInputRef.current?.focus();
  }, [capturing]);

  const hudClassName = useMemo(() => {
    if (appState === "recording") return "hud-pill hud-recording";
    if (appState === "transcribing") return "hud-pill hud-transcribing";
    if (appState === "success") return "hud-pill hud-success";
    if (appState === "error") return "hud-pill hud-error";
    return "hud-pill";
  }, [appState]);

  const dirty = useMemo(() => {
    if (!savedSettings || !draftSettings) return false;
    return JSON.stringify(savedSettings) !== JSON.stringify(draftSettings);
  }, [savedSettings, draftSettings]);

  function updateDraft(next: AppSettings) {
    setDraftSettings(next);
    setValidation(null);
    setStatusText("");
  }

  const handleSave = useCallback(async () => {
    const currentApi = (globalThis as unknown as Window).electronAPI;

    if (!currentApi || !draftSettings) return;
    const validationResult = await currentApi.settings.validate(draftSettings);
    if (!validationResult.ok) {
      setStatusText(validationResult.error.message);
      return;
    }
    setValidation(validationResult.data);
    if (!validationResult.data.valid) {
      setStatusText("Bitte Validierungsfehler korrigieren.");
      return;
    }

    const result = await currentApi.settings.save(draftSettings);
    if (result.ok) {
      setSavedSettings(result.data);
      setDraftSettings(result.data);
      setTheme(result.data.display.theme);
      setStatusText("Einstellungen gespeichert.");
    } else {
      setStatusText(result.error.message);
    }
  }, [draftSettings]);

  useEffect(() => {
    const currentApi = (globalThis as unknown as Window).electronAPI;
    if (!currentApi) {
      return;
    }

    const unsub = currentApi.onSettingsCommand((command: SettingsCommand) => {
      if (!draftSettings) {
        return;
      }
      if (capturing) {
        return;
      }
      if (command === "discard" && savedSettings) {
        setDraftSettings(savedSettings);
        setStatusText("Aenderungen verworfen.");
      }
      if (command === "save") {
        void handleSave();
      }
    });

    return () => {
      unsub();
    };
  }, [capturing, draftSettings, savedSettings, handleSave]);

  function handleShortcutCaptureKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (!capturing || !draftSettings || !api) {
      return;
    }

    event.preventDefault();

    if (event.key === "Escape") {
      setCapturing(null);
      return;
    }

    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push("CommandOrControl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    if (!["Control", "Meta", "Alt", "Shift"].includes(key)) {
      parts.push(key === " " ? "Space" : key);
    }
    if (parts.length < 2) {
      return;
    }

    const nextShortcuts = {
      ...draftSettings.shortcuts,
      [capturing]: parts.join("+"),
    };

    void api.shortcuts.set({ shortcuts: nextShortcuts }).then((result) => {
      if (!result.ok) {
        setStatusText(result.error.message);
        return;
      }

      setDraftSettings((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          shortcuts: result.data.shortcuts,
        };
      });
      setSavedSettings((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          shortcuts: result.data.shortcuts,
        };
      });
      setShortcutStatuses(result.data.statuses);

      const failed = result.data.statuses.filter((item) => !item.registered);
      if (failed.length > 0) {
        setStatusText(
          `Shortcut gespeichert, aber nicht vollstaendig registriert: ${failed
            .map((item) => SHORTCUT_LABELS[item.action])
            .join(", ")}`,
        );
        return;
      }

      setStatusText("Shortcut gespeichert und registriert.");
    });

    setCapturing(null);
  }

  function renderShortcutStatus(key: keyof AppSettings["shortcuts"]) {
    const status = shortcutStatuses.find((item) => item.action === key);
    if (!status) {
      return <span className="shortcut-status">Keine Statusdaten.</span>;
    }

    if (status.registered) {
      return (
        <span className="shortcut-status shortcut-status-ok">Registriert</span>
      );
    }

    return (
      <span className="shortcut-status shortcut-status-error">
        Nicht registriert{status.error ? `: ${status.error}` : ""}
      </span>
    );
  }

  if (!draftSettings || !savedSettings) {
    return <div className="settings-loading">Lade Einstellungen...</div>;
  }

  return (
    <div className="settings-shell">
      <aside className="settings-sidebar" aria-label="Settings Tabs">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab}
            className={`settings-tab${activeTab === tab ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </aside>

      <main className="settings-content">
        <header className="settings-header">
          <h1>{activeTab}</h1>
          <div className="settings-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setDraftSettings(savedSettings);
                setStatusText("Aenderungen verworfen.");
              }}
              disabled={!dirty}
            >
              Verwerfen (Esc)
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => void handleSave()}
            >
              Speichern (Ctrl+S)
            </button>
          </div>
        </header>

        <section className="settings-panel">
          {activeTab === "General" && (
            <label className="field">
              Sprache
              <select
                value={draftSettings.general.language}
                onChange={(event) =>
                  updateDraft({
                    ...draftSettings,
                    general: {
                      ...draftSettings.general,
                      language: event.target
                        .value as AppSettings["general"]["language"],
                    },
                  })
                }
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
          )}

          {activeTab === "Shortcuts" && (
            <div className="field-list">
              {(
                Object.entries(draftSettings.shortcuts) as Array<
                  [keyof AppSettings["shortcuts"], string]
                >
              ).map(([key, value]) => (
                <div key={key} className="field inline">
                  <span>{SHORTCUT_LABELS[key]}</span>
                  {capturing === key ? (
                    <input
                      ref={captureInputRef}
                      readOnly
                      value="Taste druecken..."
                      onKeyDown={handleShortcutCaptureKeyDown}
                    />
                  ) : (
                    <code>{value}</code>
                  )}
                  <button type="button" onClick={() => setCapturing(key)}>
                    Capture
                  </button>
                  {renderShortcutStatus(key)}
                </div>
              ))}
              {capturing && (
                <p
                  className="shortcut-capture-hint"
                  role="status"
                  aria-live="polite"
                >
                  Aufnahme aktiv. Taste druecken oder <kbd>Esc</kbd> zum
                  Abbrechen.
                </p>
              )}
            </div>
          )}

          {activeTab === "Profile" && (
            <ProfileEditor
              draftSettings={draftSettings}
              onChange={updateDraft}
            />
          )}

          {activeTab === "System Prompts" && (
            <ListEditor
              title="System Prompts"
              items={draftSettings.systemPrompts}
              onChange={(next) =>
                updateDraft({ ...draftSettings, systemPrompts: next })
              }
            />
          )}

          {activeTab === "Glossare" && (
            <ListEditor
              title="Glossare"
              items={draftSettings.glossaries}
              onChange={(next) =>
                updateDraft({ ...draftSettings, glossaries: next })
              }
            />
          )}

          {activeTab === "API Key" && (
            <div className="field-list">
              <label className="field">
                API Key
                <input
                  type="password"
                  placeholder="sk-..."
                  onChange={async (event) => {
                    const value = event.target.value;
                    await api.secretStore.setApiKey(value);
                    updateDraft({
                      ...draftSettings,
                      api: {
                        ...draftSettings.api,
                        hasApiKey: value.trim().length > 0,
                      },
                    });
                  }}
                />
              </label>
              <button
                type="button"
                onClick={async () => {
                  const check = await api.diagnose.checkFfmpeg();
                  setStatusText(
                    check.ok
                      ? "API-Key gespeichert. Basis-Diagnose erfolgreich."
                      : check.error.message,
                  );
                }}
              >
                Verbindung testen
              </button>
            </div>
          )}

          {activeTab === "Audio" && (
            <div className="field-list">
              <label className="field">
                Recording Mode
                <select
                  value={draftSettings.audio.mode}
                  onChange={(event) =>
                    updateDraft({
                      ...draftSettings,
                      audio: {
                        ...draftSettings.audio,
                        mode: event.target.value as RecordingMode,
                      },
                    })
                  }
                >
                  <option value="mic">Mic</option>
                  <option value="system">System</option>
                  <option value="both">Dual</option>
                </select>
              </label>
              <label className="field">
                Mikrofon
                <select
                  value={draftSettings.audio.micDeviceIndex}
                  onChange={(event) =>
                    updateDraft({
                      ...draftSettings,
                      audio: {
                        ...draftSettings.audio,
                        micDeviceIndex: Number(event.target.value),
                      },
                    })
                  }
                >
                  {audioDevices.map((device) => (
                    <option key={device.index} value={device.index}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Auto-Stop (Sek.)
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={draftSettings.audio.autoStopSeconds}
                  onChange={(event) =>
                    updateDraft({
                      ...draftSettings,
                      audio: {
                        ...draftSettings.audio,
                        autoStopSeconds: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>
              <div className="field inline">
                <button
                  type="button"
                  onClick={() =>
                    void api.audioTest.start(
                      draftSettings.audio.mode,
                      draftSettings.audio.autoStopSeconds,
                    )
                  }
                >
                  Audio-Test starten
                </button>
                <button type="button" onClick={() => void api.audioTest.stop()}>
                  Audio-Test stoppen
                </button>
              </div>
              <AudioMeter
                mic={audioLevel.mic}
                sys={audioLevel.sys}
                dual={draftSettings.audio.mode === "both" || isDualMode}
              />
            </div>
          )}

          {activeTab === "Display" && (
            <div className="field-list">
              <label className="field">
                Theme
                <select
                  value={draftSettings.display.theme}
                  onChange={(event) =>
                    updateDraft({
                      ...draftSettings,
                      display: {
                        ...draftSettings.display,
                        theme: event.target.value as ThemeMode,
                      },
                    })
                  }
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              {[
                "hudOverlayPosition",
                "historyOverlayPosition",
                "transcriptOverlayPosition",
              ].map((key) => (
                <label className="field" key={key}>
                  {key}
                  <select
                    value={
                      draftSettings.display[
                        key as keyof AppSettings["display"]
                      ] as string
                    }
                    onChange={(event) =>
                      updateDraft({
                        ...draftSettings,
                        display: {
                          ...draftSettings.display,
                          [key]: event.target.value,
                        },
                      })
                    }
                  >
                    {[
                      "top-left",
                      "top-center",
                      "top-right",
                      "bottom-left",
                      "bottom-center",
                      "bottom-right",
                    ].map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          {activeTab === "About" && (
            <div className="field-list">
              <p>Version: 1.0.0</p>
              <button
                type="button"
                onClick={async () => {
                  const result = await api.app.checkUpdates();
                  setStatusText(
                    result.ok ? result.data.message : result.error.message,
                  );
                }}
              >
                Update-Check
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open("https://opensource.org/licenses/MIT")
                }
              >
                Lizenz (MIT)
              </button>
              <button
                type="button"
                className="danger"
                onClick={async () => {
                  const result = await api.app.restartSetup();
                  if (result.ok) {
                    const reloaded = await api.settings.load();
                    if (reloaded.ok) {
                      setSavedSettings(reloaded.data);
                      setDraftSettings(reloaded.data);
                    }
                    setStatusText("Setup zurueckgesetzt.");
                  }
                }}
              >
                Setup neu starten
              </button>
            </div>
          )}
        </section>

        <footer className="settings-footer">
          <span>{statusText}</span>
          {validation && !validation.valid && (
            <span className="error-copy">{validation.issues[0]?.message}</span>
          )}
        </footer>

        {appState !== "idle" && (
          <div className="hud-preview">
            <div className={hudClassName}>
              {appState === "recording" && (
                <AudioMeter
                  mic={audioLevel.mic}
                  sys={audioLevel.sys}
                  dual={isDualMode}
                />
              )}
              {appState === "transcribing" && <TranscribingDots />}
              {appState === "success" && <SuccessCheck />}
              {appState === "error" && <ErrorBadge />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ProfileEditor({
  draftSettings,
  onChange,
}: Readonly<{
  draftSettings: AppSettings;
  onChange: (next: AppSettings) => void;
}>) {
  const activeProfile =
    draftSettings.profiles.find(
      (profile) => profile.id === draftSettings.activeProfileId,
    ) ?? draftSettings.profiles[0];

  if (!activeProfile) {
    return null;
  }

  const updateProfile = (patch: Partial<typeof activeProfile>) => {
    onChange({
      ...draftSettings,
      profiles: draftSettings.profiles.map((profile) =>
        profile.id === activeProfile.id ? { ...profile, ...patch } : profile,
      ),
    });
  };

  return (
    <div className="field-list">
      <div className="field inline">
        <label>
          Aktiv
          <select
            value={draftSettings.activeProfileId}
            onChange={(event) =>
              onChange({
                ...draftSettings,
                activeProfileId: event.target.value,
              })
            }
          >
            {draftSettings.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const id = `profile-${Date.now()}`;
            const copy = {
              ...activeProfile,
              id,
              name: `${activeProfile.name} (Kopie)`,
            };
            onChange({
              ...draftSettings,
              profiles: [...draftSettings.profiles, copy],
              activeProfileId: id,
            });
          }}
        >
          Duplizieren
        </button>
        <button
          type="button"
          onClick={() => {
            if (draftSettings.profiles.length <= 1) {
              return;
            }
            const remaining = draftSettings.profiles.filter(
              (profile) => profile.id !== activeProfile.id,
            );
            onChange({
              ...draftSettings,
              profiles: remaining,
              activeProfileId: remaining[0].id,
            });
          }}
          disabled={draftSettings.profiles.length <= 1}
        >
          Loeschen
        </button>
      </div>
      <label className="field">
        Name
        <input
          value={activeProfile.name}
          onChange={(event) => updateProfile({ name: event.target.value })}
        />
      </label>
      <label className="field">
        Recording Mode
        <select
          value={activeProfile.recordingMode}
          onChange={(event) =>
            updateProfile({
              recordingMode: event.target.value as RecordingMode,
            })
          }
        >
          <option value="mic">Mic</option>
          <option value="system">System</option>
          <option value="both">Dual</option>
        </select>
      </label>
      <label className="field">
        Whisper-Modell
        <input
          value={activeProfile.whisperModel}
          onChange={(event) =>
            updateProfile({ whisperModel: event.target.value })
          }
        />
      </label>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={activeProfile.llmEnabled}
          onChange={(event) =>
            updateProfile({ llmEnabled: event.target.checked })
          }
        />
        LLM aktivieren
      </label>
      <label className="field">
        LLM-Modell
        <input
          value={activeProfile.llmModel ?? ""}
          onChange={(event) => updateProfile({ llmModel: event.target.value })}
        />
      </label>
    </div>
  );
}

function ListEditor({
  title,
  items,
  onChange,
}: Readonly<{
  title: string;
  items: Array<{ id: string; name: string; text: string }>;
  onChange: (next: Array<{ id: string; name: string; text: string }>) => void;
}>) {
  return (
    <div className="field-list">
      {items.map((item) => (
        <div className="field-list-card" key={item.id}>
          <input
            value={item.name}
            onChange={(event) =>
              onChange(
                items.map((entry) =>
                  entry.id === item.id
                    ? { ...entry, name: event.target.value }
                    : entry,
                ),
              )
            }
            aria-label={`${title} Name`}
          />
          <textarea
            value={item.text}
            onChange={(event) =>
              onChange(
                items.map((entry) =>
                  entry.id === item.id
                    ? { ...entry, text: event.target.value }
                    : entry,
                ),
              )
            }
            rows={5}
            aria-label={`${title} Text`}
          />
          <button
            type="button"
            onClick={() =>
              onChange(items.filter((entry) => entry.id !== item.id))
            }
            disabled={items.length <= 1}
          >
            Entfernen
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...items,
            {
              id: `${title.toLowerCase()}-${Date.now()}`,
              name: `${title} ${items.length + 1}`,
              text: "",
            },
          ])
        }
      >
        {title} hinzufuegen
      </button>
    </div>
  );
}

function AudioMeter({
  mic,
  sys,
  dual,
}: Readonly<{ mic: number; sys: number; dual: boolean }>) {
  if (dual) {
    return (
      <div className="meter-dual">
        <MeterRow level={mic} tone="mic" />
        <MeterRow level={sys} tone="sys" />
      </div>
    );
  }

  const level = mic > 0.01 ? mic : sys;
  return (
    <div className="meter-single">
      <MeterRow level={level} tone="mic" />
    </div>
  );
}

function MeterRow({
  level,
  tone,
}: Readonly<{ level: number; tone: "mic" | "sys" }>) {
  const activeCount = Math.max(
    1,
    Math.round(Math.min(1, Math.max(0, level)) * METER_BARS),
  );
  const rowClass =
    tone === "mic" ? "meter-row meter-row-mic" : "meter-row meter-row-sys";

  return (
    <div className={rowClass}>
      {METER_KEYS.map((key, index) => {
        const isActive = index < activeCount;
        return (
          <span
            className={`meter-bar${isActive ? " is-active" : ""}`}
            key={`${tone}-${key}`}
          />
        );
      })}
    </div>
  );
}

function TranscribingDots() {
  return (
    <div className="transcribing-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function SuccessCheck() {
  return (
    <div className="success-mark" aria-hidden="true">
      <svg viewBox="0 0 20 20" role="img" aria-hidden="true">
        <path d="M4.75 10.5L8.5 14.25L15.25 6.75" />
      </svg>
    </div>
  );
}

function ErrorBadge() {
  return (
    <div className="error-copy" aria-live="polite">
      <span className="error-icon" aria-hidden="true">
        !
      </span>
      <span>Fehler. Erneut per Shortcut starten.</span>
    </div>
  );
}
