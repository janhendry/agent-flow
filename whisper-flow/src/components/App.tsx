import { useEffect, useMemo, useState } from "react";
import type {
  AppState,
  AppStatePayload,
  AudioLevelPayload,
} from "../ipc-types";

const METER_BARS = 22;
const METER_KEYS = Array.from(
  { length: METER_BARS },
  (_, index) => `bar-${index}`,
);

export function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [audioLevel, setAudioLevel] = useState<AudioLevelPayload>({
    mic: 0,
    sys: 0,
  });
  const [isDualMode, setIsDualMode] = useState(false);

  useEffect(() => {
    const api = (globalThis as unknown as Window).electronAPI;
    if (!api) return;

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

    return () => {
      unsubState();
      unsubLevel();
    };
  }, []);

  const hudClassName = useMemo(() => {
    if (appState === "recording") return "hud-pill hud-recording";
    if (appState === "transcribing") return "hud-pill hud-transcribing";
    if (appState === "success") return "hud-pill hud-success";
    if (appState === "error") return "hud-pill hud-error";
    return "hud-pill";
  }, [appState]);

  if (appState === "idle") {
    return <div className="hud-root" aria-hidden="true" />;
  }

  return (
    <div className="hud-root">
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
