import { useEffect, useState } from "react";
import type {
  AppState,
  AppStatePayload,
  AudioLevelPayload,
} from "../ipc-types";

export function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [audioLevel, setAudioLevel] = useState<AudioLevelPayload>({
    mic: 0,
    sys: 0,
  });
  const [transcription, setTranscription] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const api = (globalThis as unknown as Window).electronAPI;
    if (!api) return;

    const unsubState = api.onStateChange((payload: AppStatePayload) => {
      setAppState(payload.state);
      if (payload.transcription) {
        setTranscription(payload.transcription);
      }
      if (payload.error) {
        setErrorMessage(payload.error);
      }
      if (payload.state === "idle") {
        setTranscription(null);
        setErrorMessage(null);
      }
    });

    const unsubLevel = api.onAudioLevel((level: AudioLevelPayload) => {
      setAudioLevel(level);
    });

    return () => {
      unsubState();
      unsubLevel();
    };
  }, []);

  return (
    <div style={containerStyle}>
      <div style={pillStyle}>
        <StateIndicator state={appState} />
        {appState === "recording" && (
          <span style={levelStyle}>🎙 {Math.round(audioLevel.mic * 100)}%</span>
        )}
        {appState === "transcribing" && (
          <span style={textStyle}>Transkribiere…</span>
        )}
        {appState === "success" && transcription && (
          <span style={textStyle}>✅ Kopiert</span>
        )}
        {appState === "error" && (
          <span style={errorStyle}>❌ {errorMessage ?? "Fehler"}</span>
        )}
        {appState === "idle" && (
          <span style={textStyle}>⌨ Ctrl+Shift+Space</span>
        )}
      </div>
    </div>
  );
}

function StateIndicator({ state }: Readonly<{ state: AppState }>) {
  const colors: Record<AppState, string> = {
    idle: "#666",
    recording: "#ff4444",
    transcribing: "#ffaa00",
    success: "#44cc44",
    error: "#ff4444",
  };

  return (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: colors[state],
        marginRight: 8,
        animation: state === "recording" ? "pulse 1s infinite" : undefined,
      }}
    />
  );
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  userSelect: "none",
};

const pillStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "8px 16px",
  borderRadius: 48,
  background: "rgba(30, 30, 30, 0.85)",
  backdropFilter: "blur(10px)",
  color: "#fff",
  fontSize: 13,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  gap: 4,
};

const textStyle: React.CSSProperties = {
  opacity: 0.8,
  fontSize: 12,
};

const levelStyle: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontSize: 12,
};

const errorStyle: React.CSSProperties = {
  color: "#ff6666",
  fontSize: 12,
  maxWidth: 180,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
