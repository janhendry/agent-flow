import { ChildProcess, spawnSync } from "node:child_process";
import fs from "node:fs";
import { Box, render, Text, useApp, useInput } from "ink";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – ink-select-input default export
import SelectInput from "ink-select-input";
import os from "node:os";
import path from "node:path";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getInteractiveMainMenuItems,
  type InteractiveMenuTarget,
} from "./commands/interactive-menu.js";
import { resolvePostRecordingScreen } from "./commands/interactive-flow.js";
import { resolveRecordModePreflightDecision } from "./commands/interactive-record-mode.js";
import {
  deriveAudioLevelFromFfmpegOutput,
  createDualLevelParser,
  renderAudioLevelBars,
} from "./commands/interactive-audio-level.js";
import { resolveTranscribeUiCommand } from "./commands/interactive-transcribe-ui.js";
import { toActionableTranscribeErrorHint } from "./commands/interactive-transcribe-error-hints.js";
import { buildDiagnoseReport } from "./commands/diagnose.js";
import {
  buildSetupTransitionFromTranscript,
  completeConfigRecovery,
  type ConfigReturnTarget,
} from "./commands/interactive-recovery-flow.js";
import { AudioDevice, Config, RecordingMode } from "./types.js";
import { createCliSecretStore } from "./adapters/cli/secret-store.adapter.js";
import {
  buildSystemAudioMissingHint,
  buildFfmpegArgs,
  checkFfmpeg,
  findSystemAudioDevice,
  getPlatformInfo,
  listAudioDevices,
  playAudio,
  startRecording,
} from "./utils/audio.js";
import { configExists, loadConfig, saveConfig } from "./utils/config.js";
import { transcribeFile } from "./utils/whisper.js";
import { applyInteractivePostProcessing } from "./commands/interactive-postprocess.js";
import {
  cleanupInteractiveHistoryArtifacts,
  deleteInteractiveHistoryEntry,
  listInteractiveHistory,
  readInteractiveHistoryContent,
} from "./commands/interactive-history.js";

// ── Typen ──────────────────────────────────────────────────────────────────

interface SelectItem {
  label: string;
  value: string;
}

type Screen =
  | { id: "loading" }
  | { id: "menu" }
  | { id: "record-mode" }
  | { id: "recording" }
  | { id: "naming"; rawFile: string; startTime: Date; durationSec: number }
  | { id: "summary"; filePath: string; durationSec: number; error?: string }
  | { id: "filepick"; action: "play" | "transcribe" }
  | { id: "playing"; filePath: string }
  | { id: "transcript"; filePath: string; origin: "record-flow" | "filepick" }
  | { id: "capabilities" }
  | { id: "history" }
  | { id: "history-detail"; filePath: string }
  | { id: "config" };

interface InteractiveCapabilityOptions {
  llmEnabled: boolean;
  glossaryText: string;
}

type RecordWorkflowIntent = "record-and-transcribe" | "record-only";

export type AppExitReason = "exit" | "open-setup";

interface SharedData {
  config: Config;
  micDevice: AudioDevice;
  systemDevice: AudioDevice | undefined;
  hasConfig: boolean;
}

const DEFAULT_CONFIG: Config = {
  mode: "mic",
  micIndex: 0,
  micName: "Standard",
  outputDir: path.join(os.homedir(), "Desktop", "whisper-recordings"),
};

const cliSecretStore = createCliSecretStore();

// ── Hilfsfunktionen ────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Timestamp "2026-02-23_14-30-45" für Dateinamen */
function fileTimestamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

function useSpinner(): string {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 80);
    return () => clearInterval(t);
  }, []);
  return frames[frame];
}

function copyTextToClipboard(input: string): void {
  if (process.platform === "darwin") {
    const result = spawnSync("pbcopy", [], {
      input,
      encoding: "utf-8",
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || "pbcopy fehlgeschlagen");
    }
    return;
  }

  if (process.platform === "win32") {
    const result = spawnSync("clip", [], {
      input,
      encoding: "utf-8",
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || "clip fehlgeschlagen");
    }
    return;
  }

  const result = spawnSync("xclip", ["-selection", "clipboard"], {
    input,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "xclip fehlgeschlagen");
  }
}

// ── Inline-Texteingabe ─────────────────────────────────────────────────────

interface InlineTextInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  /** `password` und `multiline` schließen sich gegenseitig aus. Nie beide gleichzeitig setzen. */
  password?: boolean;
  /** `multiline` und `password` schließen sich gegenseitig aus. Nie beide gleichzeitig setzen.
   * Im Multiline-Modus: Enter = neue Zeile, Esc = Submit (onSubmit). onCancel wird nicht aufgerufen. */
  multiline?: boolean;
}

function InlineTextInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  password,
  multiline,
}: Readonly<InlineTextInputProps>) {
  useInput((char, key) => {
    if (key.return) {
      if (multiline) {
        onChange(value + "\n");
      } else {
        onSubmit?.();
      }
      return;
    }
    if (key.escape) {
      if (multiline) {
        onSubmit?.();
      } else {
        onCancel?.();
      }
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    if (char && !key.ctrl && !key.meta) onChange(value + char);
  });
  const display = password ? "•".repeat(value.length) : value;
  if (multiline) {
    const lines = display ? display.split("\n") : [];
    return (
      <Box flexDirection="column">
        {lines.length === 0 && (
          <Text>
            <Text color="gray">{placeholder ?? ""}</Text>
            <Text backgroundColor="cyan" color="black">
              {" "}
            </Text>
          </Text>
        )}
        {lines.map((line, i) => (
          <Text key={`line-${i}`}>
            <Text color="white">{line}</Text>
            {i === lines.length - 1 && (
              <Text backgroundColor="cyan" color="black">
                {" "}
              </Text>
            )}
          </Text>
        ))}
      </Box>
    );
  }
  return (
    <Text>
      {value ? (
        <Text color="white">{display}</Text>
      ) : (
        <Text color="gray">{placeholder ?? ""}</Text>
      )}
      <Text backgroundColor="cyan" color="black">
        {" "}
      </Text>
    </Text>
  );
}

// ── Screen: Loading ────────────────────────────────────────────────────────

function LoadingScreen() {
  const spinner = useSpinner();
  return (
    <Box padding={1}>
      <Text color="cyan">{spinner} Initialisiere…</Text>
    </Box>
  );
}

// ── Screen: Menü ───────────────────────────────────────────────────────────

interface MenuScreenProps {
  data: SharedData;
  onNavigate: (target: InteractiveMenuTarget) => void;
}

function MenuScreen({ data, onNavigate }: Readonly<MenuScreenProps>) {
  const { exit } = useApp();

  const modeLabel: Record<RecordingMode, string> = {
    mic: "Nur Mikrofon",
    system: "Nur System-Audio",
    both: "Mikrofon + System-Audio",
  };

  const items: SelectItem[] = getInteractiveMainMenuItems();

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        borderStyle="round"
        borderColor="cyan"
        flexDirection="column"
        paddingX={2}
        paddingY={0}
        marginBottom={1}
      >
        <Text bold color="cyan">
          {" "}
          Whisper POC
        </Text>
        <Text> </Text>
        <Text>
          {"  "}
          <Text color="gray">Modus: </Text>
          <Text color="white">{modeLabel[data.config.mode]}</Text>
        </Text>
        <Text>
          {"  "}
          <Text color="gray">Ordner: </Text>
          <Text color="white" dimColor>
            {data.config.outputDir}
          </Text>
        </Text>
        {!data.hasConfig && (
          <Text>
            {"  "}
            <Text color="yellow">
              ⚠ Kein Setup – Standard-Modus. Einstellungen öffnen zum
              Konfigurieren
            </Text>
          </Text>
        )}
      </Box>

      <SelectInput
        items={items}
        onSelect={(item: SelectItem) => {
          if (item.value === "exit") exit();
          else onNavigate(item.value as InteractiveMenuTarget);
        }}
      />
    </Box>
  );
}

// ── Screen: Aufnahme ──────────────────────────────────────────────────────

interface RecordingScreenProps {
  data: SharedData;
  recordingMode: RecordingMode;
  onDone: (result: {
    success: boolean;
    rawFile: string;
    startTime: Date;
    durationSec: number;
    error?: string;
  }) => void;
}

function RecordingScreen({
  data,
  recordingMode,
  onDone,
}: Readonly<RecordingScreenProps>) {
  const [elapsed, setElapsed] = useState(0);
  const [inputArmed, setInputArmed] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [sysLevel, setSysLevel] = useState(0);
  const dualParserRef = useRef(
    recordingMode === "both" ? createDualLevelParser() : null,
  );
  const startTimeRef = useRef<Date>(new Date());
  const [rawFile] = useState(() => {
    const ts = fileTimestamp(new Date());
    return path.join(data.config.outputDir, `tmp_${ts}.wav`);
  });
  const procRef = useRef<ChildProcess | null>(null);
  const stoppedRef = useRef(false);
  const cancelledRef = useRef(false);
  const doneCalledRef = useRef(false);
  const stderrLinesRef = useRef<string[]>([]);

  const stop = (mode: "stop" | "cancel") => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    cancelledRef.current = mode === "cancel";
    const proc = procRef.current;
    if (proc) {
      proc.stdin?.write("q");
      setTimeout(() => {
        try {
          proc.kill("SIGTERM");
        } catch (error) {
          process.stderr.write(
            `[interactive:recording:warn] kill failed: ${(error as Error).message}\n`,
          );
        }
      }, 400);
    }
  };

  useEffect(() => {
    const dir = path.dirname(rawFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let args: string[];
    try {
      args = buildFfmpegArgs(
        recordingMode,
        data.micDevice,
        data.systemDevice,
        rawFile,
      );
    } catch (e) {
      onDone({
        success: false,
        rawFile,
        startTime: startTimeRef.current,
        durationSec: 0,
        error: (e as Error).message,
      });
      return;
    }

    startTimeRef.current = new Date();
    const proc = startRecording(args);
    procRef.current = proc;

    proc.stderr?.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      if (dualParserRef.current) {
        const { mic, sys } = dualParserRef.current.parse(text);
        setMicLevel(mic);
        setSysLevel(sys);
      } else {
        setAudioLevel((previous) =>
          deriveAudioLevelFromFfmpegOutput(text, previous),
        );
      }
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return;
      stderrLinesRef.current.push(...lines);
      if (stderrLinesRef.current.length > 24) {
        stderrLinesRef.current = stderrLinesRef.current.slice(-24);
      }
    });

    proc.on("close", () => {
      if (doneCalledRef.current) return;
      doneCalledRef.current = true;
      const durationSec = (Date.now() - startTimeRef.current.getTime()) / 1000;
      if (cancelledRef.current) {
        if (fs.existsSync(rawFile)) {
          try {
            fs.rmSync(rawFile, { force: true });
          } catch (error) {
            process.stderr.write(
              `[interactive:recording:warn] cleanup failed: ${(error as Error).message}\n`,
            );
          }
        }
        onDone({
          success: false,
          rawFile,
          startTime: startTimeRef.current,
          durationSec,
          error: "Aufnahme abgebrochen.",
        });
        return;
      }
      const success = fs.existsSync(rawFile) && fs.statSync(rawFile).size > 0;
      const noisyLine = (line: string): boolean =>
        /^(ffmpeg version|built with|configuration:|lib[a-z]+)/i.test(line);
      const relevant = stderrLinesRef.current.filter(
        (line) => line && !noisyLine(line),
      );
      const specificErrorPatterns = [
        /error /i,
        /failed/i,
        /could not/i,
        /cannot/i,
        /invalid/i,
        /not found/i,
        /no such file/i,
        /permission denied/i,
        /device or resource busy/i,
        /error opening input/i,
        /immediate exit requested/i,
      ];
      const reversedRelevant = [...relevant].reverse();
      const hint =
        reversedRelevant.find((line) =>
          specificErrorPatterns.some((rx) => rx.test(line)),
        ) ?? relevant.at(-1);
      onDone({
        success,
        rawFile,
        startTime: startTimeRef.current,
        durationSec,
        error: success
          ? undefined
          : (hint ??
            "Keine Audiodaten aufgenommen. Prüfe Mikrofon-Zugriff in Windows, exklusiven Gerätezugriff und ffmpeg-Gerätenamen."),
      });
    });

    return () => {
      if (!stoppedRef.current) stop("cancel");
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setInputArmed(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (dualParserRef.current) {
        setMicLevel((level) => Math.max(0, level - 0.04));
        setSysLevel((level) => Math.max(0, level - 0.04));
      } else {
        setAudioLevel((level) => Math.max(0, level - 0.04));
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  useInput((char, key) => {
    if (!inputArmed) return;
    if (key.return) {
      stop("stop");
      return;
    }
    if (key.escape || char?.toLowerCase() === "q") {
      stop("cancel");
    }
  });

  const modeLabel: Record<RecordingMode, string> = {
    mic: "🎙  Nur Mikrofon",
    system: "🔊  Nur System-Audio",
    both: "🎚  Mikrofon + System-Audio",
  };

  return (
    <Box padding={1}>
      <Box
        borderStyle="round"
        borderColor="red"
        flexDirection="column"
        paddingX={2}
        paddingY={1}
        width={58}
      >
        <Text>
          <Text color="red" bold>
            ● AUFNAHME LÄUFT
          </Text>
        </Text>
        <Text> </Text>
        <Text>
          <Text color="gray">Modus: </Text>
          <Text color="cyan">{modeLabel[recordingMode]}</Text>
        </Text>
        <Text>
          <Text color="gray">Temp: </Text>
          <Text color="white" dimColor>
            {path.basename(rawFile)}
          </Text>
        </Text>
        <Text>
          <Text color="gray">Dauer: </Text>
          <Text color="yellow" bold>
            {formatDuration(elapsed)}
          </Text>
        </Text>
        {recordingMode === "both" ? (
          <>
            <Text>
              <Text color="gray">Pegel Mic: </Text>
              <Text color="green">{renderAudioLevelBars(micLevel, 24)}</Text>
            </Text>
            <Text>
              <Text color="gray">Pegel Sys: </Text>
              <Text color="cyan">{renderAudioLevelBars(sysLevel, 24)}</Text>
            </Text>
          </>
        ) : (
          <Text>
            <Text color="gray">Pegel: </Text>
            <Text color="green">{renderAudioLevelBars(audioLevel, 24)}</Text>
          </Text>
        )}
        <Text> </Text>
        <Text>
          <Text color="gray">Enter </Text>
          <Text color="white">→ Stop</Text>
          <Text color="gray"> · Esc </Text>
          <Text color="white">
            {inputArmed ? "→ Cancel" : "→ Eingabe aktiviert …"}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}

// ── Screen: Benennen ──────────────────────────────────────────────────────

interface NamingScreenProps {
  rawFile: string;
  startTime: Date;
  durationSec: number;
  outputDir: string;
  onDone: (finalPath: string, durationSec: number) => void;
}

function NamingScreen({
  rawFile,
  startTime,
  durationSec,
  outputDir,
  onDone,
}: Readonly<NamingScreenProps>) {
  const [name, setName] = useState("");
  const ts = fileTimestamp(startTime);

  const previewName = useMemo(() => {
    const slug = name
      .trim()
      .replaceAll(/\s+/g, "_")
      .replaceAll(/[/\\:*?"<>|]/g, "");
    return slug ? `${ts}_${slug}.wav` : `${ts}.wav`;
  }, [name, ts]);

  const commit = () => {
    const newPath = path.join(outputDir, previewName);
    try {
      if (fs.existsSync(rawFile)) fs.renameSync(rawFile, newPath);
    } catch (error) {
      process.stderr.write(
        `[interactive:naming:warn] rename failed: ${(error as Error).message}\n`,
      );
    }
    const finalPath = fs.existsSync(newPath) ? newPath : rawFile;
    onDone(finalPath, durationSec);
  };

  useInput((char, key) => {
    if (key.return) {
      commit();
      return;
    }
    if (key.escape) {
      commit();
      return;
    }
    if (key.backspace || key.delete) {
      setName((n) => n.slice(0, -1));
      return;
    }
    if (char && !key.ctrl && !key.meta) setName((n) => n + char);
  });

  return (
    <Box padding={1} flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="green"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={62}
      >
        <Text color="green" bold>
          💾 Aufnahme benennen
        </Text>
        <Text> </Text>
        <Text>
          <Text color="gray">Dauer: </Text>
          <Text color="white">{formatDuration(durationSec)}</Text>
        </Text>
        <Text>
          <Text color="gray">Zeitstempel: </Text>
          <Text color="yellow">{ts}</Text>
        </Text>
        <Text> </Text>
        <Text>
          <Text color="gray">Name (opt.): </Text>
          <InlineTextInput
            value={name}
            onChange={setName}
            placeholder="Leer lassen für nur Timestamp"
            onSubmit={commit}
            onCancel={commit}
          />
        </Text>
        <Text> </Text>
        <Text>
          <Text color="gray">Dateiname: </Text>
          <Text color="cyan">{previewName}</Text>
        </Text>
        <Text> </Text>
        <Text color="gray">Enter → Speichern · Esc → ohne Namen speichern</Text>
      </Box>
    </Box>
  );
}

// ── Screen: Zusammenfassung ────────────────────────────────────────────────

interface SummaryScreenProps {
  filePath: string;
  durationSec: number;
  error?: string;
  onBack: () => void;
}

function SummaryScreen({
  filePath,
  durationSec,
  error,
  onBack,
}: Readonly<SummaryScreenProps>) {
  const [remaining, setRemaining] = useState(3);
  const doneRef = useRef(false);

  const triggerBack = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setTimeout(() => onBack(), 0);
  };

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          triggerBack();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onBack]);

  useInput(() => triggerBack());

  const size =
    !error && fs.existsSync(filePath)
      ? formatSize(fs.statSync(filePath).size)
      : null;

  return (
    <Box padding={1} flexDirection="column">
      {error ? (
        <Box
          borderStyle="round"
          borderColor="red"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
        >
          <Text color="red" bold>
            ❌ Aufnahme fehlgeschlagen
          </Text>
          <Text> </Text>
          <Text color="gray">{error}</Text>
        </Box>
      ) : (
        <Box
          borderStyle="round"
          borderColor="green"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
        >
          <Text color="green" bold>
            ✅ Aufnahme gespeichert
          </Text>
          <Text> </Text>
          <Text>
            <Text color="gray">Datei: </Text>
            <Text color="white">{path.basename(filePath)}</Text>
          </Text>
          <Text>
            <Text color="gray">Dauer: </Text>
            <Text color="white">{formatDuration(durationSec)}</Text>
          </Text>
          {size && (
            <Text>
              <Text color="gray">Größe: </Text>
              <Text color="white">{size}</Text>
            </Text>
          )}
        </Box>
      )}
      <Text> </Text>
      <Text color="gray">
        Zurück in <Text color="yellow">{remaining}s</Text> – oder beliebige
        Taste
      </Text>
    </Box>
  );
}

// ── Screen: Dateiauswahl (Fuzzy-Suche) ────────────────────────────────────

interface FilePickScreenProps {
  action: "play" | "transcribe";
  outputDir: string;
  onPick: (filePath: string) => void;
  onBack: () => void;
}

function FilePickScreen({
  action,
  outputDir,
  onPick,
  onBack,
}: Readonly<FilePickScreenProps>) {
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState(0);

  const allFiles = useMemo(() => {
    if (!fs.existsSync(outputDir)) return [];
    return fs
      .readdirSync(outputDir)
      .filter((f) => /\.(wav|mp3|m4a|ogg|flac)$/i.test(f))
      .map((f) => {
        const full = path.join(outputDir, f);
        const stat = fs.statSync(full);
        return { name: f, path: full, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  }, [outputDir]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return q
      ? allFiles.filter((f) => f.name.toLowerCase().includes(q))
      : allFiles;
  }, [allFiles, filter]);

  // Cursor zurücksetzen wenn Filter sich ändert
  useEffect(() => setCursor(0), [filter]);

  useInput((char, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
      return;
    }
    if (key.return) {
      if (filtered[cursor]) onPick(filtered[cursor].path);
      return;
    }
    if (key.backspace || key.delete) {
      setFilter((f) => f.slice(0, -1));
      return;
    }
    if (char && !key.ctrl && !key.meta) {
      setFilter((f) => f + char);
    }
  });

  const title = action === "play" ? "▶  Audio abspielen" : "📝  Transkribieren";
  const color = action === "play" ? "cyan" : "yellow";
  const PAGE = 14;
  // sicherstellen dass der cursor-row im sichtbaren Bereich ist
  const offset = Math.max(0, cursor - PAGE + 1);
  const visible = filtered.slice(offset, offset + PAGE);

  return (
    <Box padding={1} flexDirection="column">
      <Box
        borderStyle="round"
        borderColor={color}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={68}
      >
        <Text color={color} bold>
          {title}
        </Text>
        <Text> </Text>
        <Text>
          <Text color="gray">🔍 Filter: </Text>
          <InlineTextInput
            value={filter}
            onChange={setFilter}
            placeholder="Tippen zum Filtern…"
          />
        </Text>
        <Text> </Text>
        {allFiles.length === 0 && (
          <Text color="gray">Keine Aufnahmen in {outputDir}</Text>
        )}
        {allFiles.length > 0 && filtered.length === 0 && (
          <Text color="gray">Keine Treffer für „{filter}"</Text>
        )}
        {visible.map((f, i) => {
          const globalIdx = offset + i;
          const active = globalIdx === cursor;
          return (
            <Box key={f.path} flexDirection="row">
              <Text color={active ? color : "white"}>
                {active ? "❯ " : "  "}
                {f.name}
                <Text color="gray"> {formatSize(f.size)}</Text>
              </Text>
            </Box>
          );
        })}
        {filtered.length > PAGE && (
          <Text color="gray"> … {filtered.length} Dateien gesamt</Text>
        )}
        <Text> </Text>
        <Text color="gray">↑↓ Navigation · Enter auswählen · Esc zurück</Text>
      </Box>
    </Box>
  );
}

// ── Screen: Abspielen ──────────────────────────────────────────────────────

interface PlayingScreenProps {
  filePath: string;
  onDone: () => void;
}

function PlayingScreen({ filePath, onDone }: Readonly<PlayingScreenProps>) {
  const spinner = useSpinner();
  const procRef = useRef<ChildProcess | null>(null);

  useEffect(() => {
    const proc = playAudio(filePath);
    procRef.current = proc;
    proc.on("close", () => onDone());
    return () => {
      try {
        procRef.current?.kill();
      } catch (error) {
        process.stderr.write(
          `[interactive:playback:warn] stop failed: ${(error as Error).message}\n`,
        );
      }
    };
  }, []);

  useInput(() => {
    try {
      procRef.current?.kill();
    } catch (error) {
      process.stderr.write(
        `[interactive:playback:warn] cancel failed: ${(error as Error).message}\n`,
      );
    }
    onDone();
  });

  return (
    <Box padding={1}>
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text color="cyan">{spinner} Spiele ab…</Text>
        <Text> </Text>
        <Text>
          <Text color="gray">Datei: </Text>
          <Text color="white">{path.basename(filePath)}</Text>
        </Text>
        <Text> </Text>
        <Text color="gray">Beliebige Taste → Abbrechen</Text>
      </Box>
    </Box>
  );
}

// ── Screen: Transkription ─────────────────────────────────────────────────

interface TranscriptScreenProps {
  filePath: string;
  data: SharedData;
  origin: "record-flow" | "filepick";
  capabilityOptions: InteractiveCapabilityOptions;
  onOpenSetup: () => void;
  onDone: () => void;
}

function TranscriptScreen({
  filePath,
  data,
  origin,
  capabilityOptions,
  onOpenSetup,
  onDone,
}: Readonly<TranscriptScreenProps>) {
  const spinner = useSpinner();
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [phase, setPhase] = useState<
    "uploading" | "transcribing" | "finalizing"
  >("uploading");
  const [progress, setProgress] = useState(8);
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorActionHint, setErrorActionHint] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [retryToken, setRetryToken] = useState(0);
  const doneRef = useRef(false);
  const outPath = useMemo(
    () => filePath.replace(/\.(wav|mp3|m4a|ogg|flac)$/i, ".txt"),
    [filePath],
  );

  const triggerDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setTimeout(() => onDone(), 0);
  };

  useEffect(() => {
    doneRef.current = false;
    setState("loading");
    setPhase("uploading");
    setProgress(8);
    setShowDetails(false);
    setNotice(undefined);
    setErrorActionHint("");

    const progressTimer = setInterval(() => {
      setProgress((current) => {
        if (current < 35) {
          setPhase("uploading");
        } else if (current < 85) {
          setPhase("transcribing");
        } else {
          setPhase("finalizing");
        }
        return Math.min(95, current + 3);
      });
    }, 180);

    const apiKey = cliSecretStore.getApiKey() ?? process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      clearInterval(progressTimer);
      const raw =
        "Kein OpenAI API-Key. Einstellungen öffnen oder OPENAI_API_KEY setzen.";
      const hint = toActionableTranscribeErrorHint(raw);
      setErrorMsg(hint.message);
      setErrorActionHint(hint.action);
      setErrorDetails(
        "Kein API-Key im Secret-Store oder in OPENAI_API_KEY gefunden.",
      );
      setState("error");
      return;
    }
    transcribeFile(filePath, apiKey, "de", data.config.baseUrl)
      .then(async (result) => {
        clearInterval(progressTimer);
        setProgress(100);
        setPhase("finalizing");
        const postProcessed = await applyInteractivePostProcessing(result, {
          llmEnabled: capabilityOptions.llmEnabled,
          glossaryText: capabilityOptions.glossaryText,
          apiKey,
          baseUrl: data.config.baseUrl,
          llmModel: data.config.llmModel,
        });
        const finalText = postProcessed.text;
        try {
          fs.writeFileSync(outPath, finalText, "utf-8");
        } catch (error) {
          const raw = `Transkript konnte nicht gespeichert werden: ${(error as Error).message}`;
          const hint = toActionableTranscribeErrorHint(raw);
          setErrorMsg(hint.message);
          setErrorActionHint(hint.action);
          setErrorDetails((error as Error).stack ?? raw);
          setState("error");
          return;
        }
        setText(finalText);
        if (postProcessed.usedLlm) {
          setNotice("LLM-Post-Processing angewendet.");
        }
        if (postProcessed.warnings.length > 0) {
          setNotice(postProcessed.warnings[0]);
        }
        setState("done");
      })
      .catch((e: Error) => {
        clearInterval(progressTimer);
        const raw = e.message;
        const hint = toActionableTranscribeErrorHint(raw);
        setErrorMsg(hint.message);
        setErrorActionHint(hint.action);
        setErrorDetails(e.stack ?? raw);
        setState("error");
      });

    return () => clearInterval(progressTimer);
  }, [
    retryToken,
    capabilityOptions.glossaryText,
    capabilityOptions.llmEnabled,
    data.config.baseUrl,
    filePath,
    outPath,
  ]);

  useInput((char, key) => {
    const input = key.escape ? "esc" : (char ?? "");
    const command = resolveTranscribeUiCommand(
      { mode: state, showDetails },
      input,
    );

    if (command.type === "none") return;

    if (command.type === "back") {
      triggerDone();
      return;
    }

    if (command.type === "retry") {
      setRetryToken((value) => value + 1);
      return;
    }

    if (command.type === "toggle-details") {
      setShowDetails((value) => !value);
      return;
    }

    if (command.type === "open-setup") {
      onOpenSetup();
      return;
    }

    if (command.type === "copy") {
      try {
        copyTextToClipboard(text);
        setNotice("Transkript in Zwischenablage kopiert.");
      } catch (error) {
        setNotice(`Clipboard fehlgeschlagen: ${(error as Error).message}`);
      }
      return;
    }

    if (command.type === "save") {
      try {
        fs.writeFileSync(outPath, text, "utf-8");
        setNotice(`Transkript gespeichert: ${path.basename(outPath)}`);
      } catch (error) {
        setNotice(`Speichern fehlgeschlagen: ${(error as Error).message}`);
      }
    }
  });

  const progressBar = useMemo(() => {
    const width = 24;
    const active = Math.round((progress / 100) * width);
    return `${"█".repeat(active)}${"░".repeat(width - active)}`;
  }, [progress]);

  if (state === "loading") {
    return (
      <Box padding={1}>
        <Box
          borderStyle="round"
          borderColor="yellow"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
        >
          <Text color="yellow">{spinner} Transkribiere…</Text>
          <Text> </Text>
          <Text>
            <Text color="gray">Status: </Text>
            <Text color="white" bold>
              {phase.toUpperCase()}
            </Text>
          </Text>
          <Text>
            <Text color="gray">Progress: </Text>
            <Text color="cyan">
              [{progressBar}] {progress}%
            </Text>
          </Text>
          <Text color="gray">{path.basename(filePath)}</Text>
        </Box>
      </Box>
    );
  }

  if (state === "error") {
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="red"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
        >
          <Text color="red" bold>
            ❌ Transkription fehlgeschlagen
          </Text>
          <Text> </Text>
          <Text color="gray">{errorMsg}</Text>
          <Text color="yellow">{errorActionHint}</Text>
          {showDetails && (
            <>
              <Text> </Text>
              <Text color="gray">Details:</Text>
              <Text color="gray" dimColor>
                {errorDetails}
              </Text>
            </>
          )}
        </Box>
        <Text> </Text>
        <Text color="gray">[r] Retry [d] Details [k] Setup [q] Zurück</Text>
      </Box>
    );
  }

  const lines = text.split("\n");
  const preview = lines.slice(0, 40).join("\n");
  const truncated = lines.length > 40;
  const txtFile = path.basename(
    filePath.replace(/\.(wav|mp3|m4a|ogg|flac)$/i, ".txt"),
  );

  return (
    <Box padding={1} flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="green"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text color="green" bold>
          ✅ Transkription erfolgreich
        </Text>
        <Text> </Text>
        <Text>{preview}</Text>
        {truncated && (
          <Text color="gray">
            … ({lines.length - 40} weitere Zeilen in .txt)
          </Text>
        )}
        <Text> </Text>
        <Text color="gray">
          Gespeichert: <Text color="white">{txtFile}</Text>
        </Text>
        {origin === "record-flow" && (
          <Text color="gray">Flow: Aufnahme → Transkription abgeschlossen</Text>
        )}
      </Box>
      <Text> </Text>
      {notice && <Text color="cyan">{notice}</Text>}
      <Text color="gray">[c] Copy [s] Save [q] Zurück</Text>
    </Box>
  );
}

// ── Screen: Record-Mode Auswahl ──────────────────────────────────────────

interface RecordModeScreenProps {
  selectedMode: RecordingMode;
  onSelect: (mode: RecordingMode) => void;
  onBack: () => void;
}

function RecordModeScreen({
  selectedMode,
  onSelect,
  onBack,
}: Readonly<RecordModeScreenProps>) {
  const items: SelectItem[] = [
    { label: "🎙  Nur Mikrofon", value: "mic" },
    { label: "🔊  Nur System-Audio", value: "system" },
    { label: "🎚  Mikrofon + System-Audio", value: "both" },
    { label: "↩ Zurück", value: "back" },
  ];

  return (
    <Box padding={1} flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text color="cyan" bold>
          🎛 Aufnahme-Modus wählen
        </Text>
        <Text color="gray">
          Aktuell: <Text color="white">{selectedMode}</Text>
        </Text>
        <Text> </Text>
        <SelectInput
          items={items}
          onSelect={(item: SelectItem) => {
            if (item.value === "back") {
              onBack();
              return;
            }
            onSelect(item.value as RecordingMode);
          }}
        />
      </Box>
    </Box>
  );
}

// ── Screen: Capability-Optionen (LLM/Glossar) ───────────────────────────

interface CapabilityOptionsScreenProps {
  options: InteractiveCapabilityOptions;
  onSave: (next: InteractiveCapabilityOptions) => void;
  onBack: () => void;
}

function CapabilityOptionsScreen({
  options,
  onSave,
  onBack,
}: Readonly<CapabilityOptionsScreenProps>) {
  const [editingGlossary, setEditingGlossary] = useState(false);
  const [draft, setDraft] = useState<InteractiveCapabilityOptions>(options);

  const items: SelectItem[] = [
    {
      label: `🧠 LLM Post-Processing: ${draft.llmEnabled ? "AN" : "AUS"}`,
      value: "toggle-llm",
    },
    { label: "📚 Glossar-Regeln bearbeiten", value: "edit-glossary" },
    { label: "💾 Speichern und zurück", value: "save" },
    { label: "↩ Ohne Speichern zurück", value: "back" },
  ];

  if (editingGlossary) {
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          width={74}
        >
          <Text color="cyan" bold>
            📚 Glossar-Regeln
          </Text>
          <Text color="gray">
            Format je Zeile: falsch=&gt;richtig · Esc = Fertig · Enter = neue
            Zeile
          </Text>
          <Text> </Text>
          <InlineTextInput
            value={draft.glossaryText}
            onChange={(value) =>
              setDraft((current) => ({ ...current, glossaryText: value }))
            }
            onSubmit={() => setEditingGlossary(false)}
            placeholder="z.B. wiritescript=>whisper-script"
            multiline
          />
          <Text> </Text>
          <Text color="gray">
            Esc → zurück zu Optionen | Enter → neue Zeile
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={74}
      >
        <Text color="cyan" bold>
          🧠 Capability-Optionen
        </Text>
        <Text color="gray">
          LLM/Glossar werden im Transkriptions-Flow optional angewendet.
        </Text>
        <Text> </Text>
        <SelectInput
          items={items}
          onSelect={(item: SelectItem) => {
            if (item.value === "toggle-llm") {
              setDraft((current) => ({
                ...current,
                llmEnabled: !current.llmEnabled,
              }));
              return;
            }
            if (item.value === "edit-glossary") {
              setEditingGlossary(true);
              return;
            }
            if (item.value === "save") {
              onSave(draft);
              return;
            }
            onBack();
          }}
        />
      </Box>
    </Box>
  );
}

// ── Screen: History ───────────────────────────────────────────────────────

interface HistoryScreenProps {
  outputDir: string;
  onOpenEntry: (filePath: string) => void;
  onBack: () => void;
}

function HistoryScreen({
  outputDir,
  onOpenEntry,
  onBack,
}: Readonly<HistoryScreenProps>) {
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [refreshToken, setRefreshToken] = useState(0);
  const historyEntries = useMemo(
    () => listInteractiveHistory(outputDir),
    [outputDir, refreshToken],
  );

  const items: SelectItem[] = [
    ...historyEntries.map((entry) => ({
      label: `${entry.fileName} (${formatSize(entry.sizeBytes)})`,
      value: entry.filePath,
    })),
    { label: "🧹 Cleanup Audio-Artefakte", value: "__cleanup" },
    { label: "↩ Zurück", value: "__back" },
  ];

  return (
    <Box padding={1} flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={76}
      >
        <Text color="cyan" bold>
          🗂 History
        </Text>
        <Text color="gray">Eintrag wählen für Details/Kopieren/Löschen.</Text>
        <Text> </Text>
        {historyEntries.length === 0 && (
          <Text color="gray">Keine Transkripte gefunden.</Text>
        )}
        <SelectInput
          items={items}
          onSelect={(item: SelectItem) => {
            if (item.value === "__back") {
              onBack();
              return;
            }
            if (item.value === "__cleanup") {
              setNotice(undefined);
              const result = cleanupInteractiveHistoryArtifacts(outputDir);
              setNotice(
                `Cleanup abgeschlossen: ${result.deletedCount} Datei(en) entfernt.`,
              );
              setRefreshToken((t) => t + 1);
              return;
            }
            onOpenEntry(item.value);
          }}
        />
        {notice && (
          <>
            <Text> </Text>
            <Text color="cyan">{notice}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

// ── Screen: History-Detail ────────────────────────────────────────────────

interface HistoryDetailScreenProps {
  filePath: string;
  onBack: () => void;
}

function HistoryDetailScreen({
  filePath,
  onBack,
}: Readonly<HistoryDetailScreenProps>) {
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [deleted, setDeleted] = useState(false);
  const content = useMemo(() => {
    if (deleted) return "Eintrag gelöscht.";
    try {
      return readInteractiveHistoryContent(filePath);
    } catch (error) {
      return `Fehler beim Laden: ${(error as Error).message}`;
    }
  }, [deleted, filePath]);

  useInput((char, key) => {
    if (key.escape || char?.toLowerCase() === "q") {
      onBack();
      return;
    }

    if (char?.toLowerCase() === "c") {
      if (deleted) return;
      try {
        copyTextToClipboard(content);
        setNotice("In Zwischenablage kopiert.");
      } catch (error) {
        setNotice(`Kopieren fehlgeschlagen: ${(error as Error).message}`);
      }
      return;
    }

    if (char?.toLowerCase() === "d") {
      deleteInteractiveHistoryEntry(filePath);
      setDeleted(true);
      setNotice("Eintrag gelöscht.");
    }
  });

  const lines = content.split("\n");
  const preview = lines.slice(0, 40).join("\n");
  const truncated = lines.length > 40;

  return (
    <Box padding={1} flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text color="cyan" bold>
          📄 {path.basename(filePath)}
        </Text>
        <Text> </Text>
        <Text>{preview}</Text>
        {truncated && (
          <Text color="gray">… ({lines.length - 40} weitere Zeilen)</Text>
        )}
      </Box>
      <Text> </Text>
      {notice && <Text color="cyan">{notice}</Text>}
      <Text color="gray">[c] Copy [d] Löschen [q] Zurück</Text>
    </Box>
  );
}

// ── Screen: Einstellungen ─────────────────────────────────────────────────

type ConfigStep =
  | "mode"
  | "mic"
  | "system"
  | "apikey"
  | "baseurl"
  | "outputdir"
  | "saving";

interface ConfigScreenProps {
  data: SharedData;
  onDone: (updated: Config) => void;
}

function ConfigScreen({ data, onDone }: Readonly<ConfigScreenProps>) {
  const [step, setStep] = useState<ConfigStep>("mode");
  const [draft, setDraft] = useState<Config>({ ...data.config });
  const [apiKey, setApiKey] = useState(
    cliSecretStore.getApiKey() ?? data.config.apiKey ?? "",
  );
  const [baseUrl, setBaseUrl] = useState(data.config.baseUrl ?? "");
  const [outputDir, setOutputDir] = useState(data.config.outputDir);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const savedRef = useRef(false);

  useEffect(() => {
    let active = true;
    setDevicesLoading(true);
    listAudioDevices()
      .then((loaded) => {
        if (!active) return;
        setDevices(loaded);
      })
      .finally(() => {
        if (!active) return;
        setDevicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Speichern und beenden
  useEffect(() => {
    if (step === "saving" && !savedRef.current) {
      savedRef.current = true;
      const trimmedApiKey = apiKey.trim();
      if (trimmedApiKey) {
        cliSecretStore.setApiKey(trimmedApiKey);
      } else {
        cliSecretStore.clearApiKey();
      }
      // ...draft enthält bereits llmEnabled, glossaryText und llmModel;
      // apiKey/baseUrl/outputDir werden unten explizit überschrieben.
      const final: Config = {
        ...draft,
        apiKey: undefined,
        baseUrl: baseUrl.trim() || undefined,
        outputDir: outputDir.trim() || draft.outputDir,
      };
      saveConfig(final);
      onDone(final);
    }
  }, [step]);

  const modeItems: SelectItem[] = [
    { label: "🎙  Nur Mikrofon", value: "mic" },
    { label: "🔊  Nur System-Audio", value: "system" },
    { label: "🎚  Mikrofon + System-Audio", value: "both" },
  ];

  const micItems: SelectItem[] = [
    ...devices.map((d) => ({
      label: `[${d.index}] ${d.name}`,
      value: String(d.index),
    })),
    { label: "→ Überspringen", value: "skip" },
  ];

  const autoSystemDevice = findSystemAudioDevice(devices);
  const systemItems: SelectItem[] = [
    ...(autoSystemDevice
      ? [
          {
            label: `Auto (empfohlen): [${autoSystemDevice.index}] ${autoSystemDevice.name}`,
            value: String(autoSystemDevice.index),
          },
        ]
      : []),
    ...devices
      .filter((d) =>
        autoSystemDevice ? d.index !== autoSystemDevice.index : true,
      )
      .map((d) => ({
        label: `[${d.index}] ${d.name}`,
        value: String(d.index),
      })),
    { label: "→ Überspringen (automatisch)", value: "skip" },
  ];

  const micFallbackItems: SelectItem[] = [
    { label: "↻ Erneut suchen", value: "reload" },
    { label: "→ Ohne Auswahl weiter", value: "skip" },
  ];

  const systemFallbackItems: SelectItem[] = [
    { label: "↻ Erneut suchen", value: "reload" },
    { label: "→ Ohne Auswahl weiter (automatisch)", value: "skip" },
  ];

  // ── Schritt 1: Modus
  if (step === "mode") {
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={0}
          marginBottom={1}
        >
          <Text color="cyan" bold>
            ⚙ Einstellungen [1/6] Aufnahmemodus
          </Text>
        </Box>
        <SelectInput
          items={modeItems}
          onSelect={(item: SelectItem) => {
            const nextMode = item.value as RecordingMode;
            setDraft((d) => ({ ...d, mode: nextMode }));
            if (nextMode === "system") setStep("system");
            else setStep("mic");
          }}
        />
        <Text color="gray">
          Aktuell: <Text color="white">{data.config.mode}</Text>
        </Text>
      </Box>
    );
  }

  // ── Schritt 2: Mikrofon
  if (step === "mic") {
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={0}
          marginBottom={1}
        >
          <Text color="cyan" bold>
            ⚙ Einstellungen [2/6] Mikrofon auswählen
          </Text>
        </Box>
        {devicesLoading ? (
          <Text color="gray">Lade Geräte…</Text>
        ) : devices.length === 0 ? (
          <Box flexDirection="column">
            <Text color="yellow">
              Keine Mikrofone gefunden. Prüfe ffmpeg, Windows-Mikrofonrechte und
              deine Eingabegeräte.
            </Text>
            <Text> </Text>
            <SelectInput
              items={micFallbackItems}
              onSelect={(item: SelectItem) => {
                if (item.value === "reload") {
                  setDevicesLoading(true);
                  listAudioDevices()
                    .then(setDevices)
                    .finally(() => setDevicesLoading(false));
                  return;
                }
                setStep(draft.mode === "both" ? "system" : "apikey");
              }}
            />
          </Box>
        ) : (
          <SelectInput
            items={micItems}
            onSelect={(item: SelectItem) => {
              if (item.value !== "skip") {
                const dev = devices.find((d) => d.index === Number(item.value));
                if (dev)
                  setDraft((d) => ({
                    ...d,
                    micIndex: dev.index,
                    micName: dev.name,
                  }));
              }
              setStep(draft.mode === "both" ? "system" : "apikey");
            }}
          />
        )}
        <Text color="gray">
          Aktuell:{" "}
          <Text color="white">
            [{data.config.micIndex}] {data.config.micName}
          </Text>
        </Text>
      </Box>
    );
  }

  // ── Schritt 3: System-Audio-Quelle
  if (step === "system") {
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={0}
          marginBottom={1}
        >
          <Text color="cyan" bold>
            ⚙ Einstellungen [3/6] System-Audio auswählen
          </Text>
        </Box>
        {devicesLoading ? (
          <Text color="gray">Lade Geräte…</Text>
        ) : devices.length === 0 ? (
          <Box flexDirection="column">
            <Text color="yellow">
              Keine Audio-Geräte gefunden. Prüfe ffmpeg und deine
              Windows-Audiokonfiguration.
            </Text>
            <Text> </Text>
            <SelectInput
              items={systemFallbackItems}
              onSelect={(item: SelectItem) => {
                if (item.value === "reload") {
                  setDevicesLoading(true);
                  listAudioDevices()
                    .then(setDevices)
                    .finally(() => setDevicesLoading(false));
                  return;
                }
                setStep("apikey");
              }}
            />
          </Box>
        ) : (
          <SelectInput
            items={systemItems}
            onSelect={(item: SelectItem) => {
              if (item.value !== "skip") {
                const dev = devices.find((d) => d.index === Number(item.value));
                if (dev) {
                  setDraft((d) => ({
                    ...d,
                    systemIndex: dev.index,
                    systemName: dev.name,
                  }));
                }
              } else {
                setDraft((d) => ({
                  ...d,
                  systemIndex: undefined,
                  systemName: undefined,
                }));
              }
              setStep("apikey");
            }}
          />
        )}
        <Text color="gray">
          Aktuell:{" "}
          <Text color="white">
            {data.config.systemName && data.config.systemIndex !== undefined
              ? `[${data.config.systemIndex}] ${data.config.systemName}`
              : "automatisch"}
          </Text>
        </Text>
      </Box>
    );
  }

  // ── Schritt 4: API-Key
  if (step === "apikey") {
    const next = () => setStep("baseurl");
    const currentApiKey = cliSecretStore.getApiKey() ?? data.config.apiKey;
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          width={62}
        >
          <Text color="cyan" bold>
            ⚙ Einstellungen [4/6] OpenAI API-Key
          </Text>
          <Text> </Text>
          <Text color="gray">
            Aktuell:{" "}
            {currentApiKey ? "••••" + currentApiKey.slice(-4) : "nicht gesetzt"}
          </Text>
          <Text> </Text>
          <Text>
            <Text color="gray">API-Key: </Text>
            <InlineTextInput
              value={apiKey}
              onChange={setApiKey}
              placeholder="sk-…"
              password
              onSubmit={next}
              onCancel={next}
            />
          </Text>
          <Text> </Text>
          <Text color="gray">Enter → weiter · Esc → überspringen</Text>
        </Box>
      </Box>
    );
  }

  // ── Schritt 5: Base URL / Proxy
  if (step === "baseurl") {
    const next = () => setStep("outputdir");
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          width={68}
        >
          <Text color="cyan" bold>
            ⚙ Einstellungen [5/6] OpenAI Base URL
          </Text>
          <Text> </Text>
          <Text color="gray">
            Aktuell:{" "}
            {data.config.baseUrl
              ? data.config.baseUrl
              : "Standard (https://api.openai.com/v1)"}
          </Text>
          <Text> </Text>
          <Text>
            <Text color="gray">Base URL: </Text>
            <InlineTextInput
              value={baseUrl}
              onChange={setBaseUrl}
              placeholder="https://your-proxy.example.com/v1"
              onSubmit={next}
              onCancel={next}
            />
          </Text>
          <Text> </Text>
          <Text color="gray">Leer lassen → OpenAI-Standard verwenden</Text>
          <Text color="gray">Enter → weiter · Esc → überspringen</Text>
        </Box>
      </Box>
    );
  }

  // ── Schritt 6: Ausgabeordner
  if (step === "outputdir") {
    const save = () => setStep("saving");
    return (
      <Box padding={1} flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          width={66}
        >
          <Text color="cyan" bold>
            ⚙ Einstellungen [6/6] Ausgabeordner
          </Text>
          <Text> </Text>
          <Text color="gray">Aktuell: {data.config.outputDir}</Text>
          <Text> </Text>
          <Text>
            <Text color="gray">Ordner: </Text>
            <InlineTextInput
              value={outputDir}
              onChange={setOutputDir}
              onSubmit={save}
              onCancel={save}
            />
          </Text>
          <Text> </Text>
          <Text color="gray">
            Enter → Speichern · Esc → aktuelle Einstellung behalten
          </Text>
          <Text> </Text>
          <Text color="gray" dimColor>
            Zusammenfassung:
          </Text>
          <Text color="gray" dimColor>
            Modus: {draft.mode} · System:{" "}
            {draft.systemName && draft.systemIndex !== undefined
              ? `[${draft.systemIndex}] ${draft.systemName}`
              : "automatisch"}{" "}
            · API-Key: {apiKey.trim() ? "✓ gesetzt" : "nicht gesetzt"} · Base
            URL: {baseUrl.trim() || "Standard"}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1}>
      <Text color="cyan">Einstellungen gespeichert…</Text>
    </Box>
  );
}

// ── Haupt-App ──────────────────────────────────────────────────────────────

interface AppProps {
  onRequestSetup: () => void;
}

function App({ onRequestSetup }: Readonly<AppProps>) {
  const [screen, setScreen] = useState<Screen>({ id: "loading" });
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [sessionRecordingMode, setSessionRecordingMode] =
    useState<RecordingMode>("mic");
  const [recordWorkflowIntent, setRecordWorkflowIntent] =
    useState<RecordWorkflowIntent>("record-and-transcribe");
  const [capabilityOptions, setCapabilityOptions] =
    useState<InteractiveCapabilityOptions>({
      llmEnabled: false,
      glossaryText: "",
    });
  const capabilityInitializedRef = useRef(false);
  const [configReturnTarget, setConfigReturnTarget] =
    useState<ConfigReturnTarget>({
      id: "menu",
    });

  const reloadData = async (overrideConfig?: Config) => {
    const hasConfig = configExists();
    const config =
      overrideConfig ?? (hasConfig ? loadConfig() : DEFAULT_CONFIG);
    const devices = await listAudioDevices();
    let configuredSystemDevice: AudioDevice | undefined;
    if (typeof config.systemIndex === "number") {
      configuredSystemDevice = devices.find(
        (d) => d.index === config.systemIndex,
      );
    }
    const systemDevice =
      configuredSystemDevice ?? findSystemAudioDevice(devices);
    const micDevice = devices.find((d) => d.index === config.micIndex) ?? {
      index: config.micIndex,
      name: config.micName,
    };
    setSharedData({
      config,
      micDevice,
      systemDevice,
      hasConfig: Boolean(overrideConfig) || hasConfig,
    });
  };

  useEffect(() => {
    (async () => {
      const ok = await checkFfmpeg();
      if (!ok) {
        const { installHint } = getPlatformInfo();
        console.error(`\nffmpeg nicht gefunden. Installiere: ${installHint}\n`);
        process.exit(1);
      }
      await reloadData();
      setScreen({ id: "menu" });
    })();
  }, []);

  useEffect(() => {
    if (!sharedData) return;
    setSessionRecordingMode(sharedData.config.mode);
  }, [sharedData]);

  useEffect(() => {
    if (!sharedData || capabilityInitializedRef.current) return;
    capabilityInitializedRef.current = true;
    setCapabilityOptions({
      llmEnabled: sharedData.config.llmEnabled ?? false,
      glossaryText: sharedData.config.glossaryText ?? "",
    });
  }, [sharedData]);

  if (screen.id === "loading" || !sharedData) return <LoadingScreen />;

  if (screen.id === "menu") {
    return (
      <MenuScreen
        data={sharedData}
        onNavigate={(target) => {
          if (target === "record") {
            setRecordWorkflowIntent("record-and-transcribe");
            setScreen({ id: "record-mode" });
          } else if (target === "record-only") {
            setRecordWorkflowIntent("record-only");
            setScreen({ id: "record-mode" });
          } else if (target === "play")
            setScreen({ id: "filepick", action: "play" });
          else if (target === "transcribe")
            setScreen({ id: "filepick", action: "transcribe" });
          else if (target === "history") setScreen({ id: "history" });
          else if (target === "capabilities") setScreen({ id: "capabilities" });
          else if (target === "config") setScreen({ id: "config" });
        }}
      />
    );
  }

  if (screen.id === "record-mode") {
    return (
      <RecordModeScreen
        selectedMode={sessionRecordingMode}
        onBack={() => setScreen({ id: "menu" })}
        onSelect={(mode) => {
          setSessionRecordingMode(mode);
          const preflight = resolveRecordModePreflightDecision(
            mode,
            sharedData.systemDevice !== undefined,
          );
          if (preflight.type === "open-setup") {
            void buildDiagnoseReport()
              .then((report) => {
                process.stderr.write(
                  `[interactive:diagnose] ${JSON.stringify(report)}\n`,
                );
              })
              .catch((error: Error) => {
                process.stderr.write(
                  `[interactive:diagnose:error] ${error.message}\n`,
                );
              });
            process.stderr.write(
              `[interactive:record-mode:error] ${buildSystemAudioMissingHint()}\n`,
            );
            setConfigReturnTarget({ id: "menu" });
            setScreen({ id: "config" });
            return;
          }
          setScreen({ id: "recording" });
        }}
      />
    );
  }

  if (screen.id === "recording") {
    return (
      <RecordingScreen
        data={sharedData}
        recordingMode={sessionRecordingMode}
        onDone={(result) => {
          if (recordWorkflowIntent === "record-only" && result.success) {
            setScreen({
              id: "naming",
              rawFile: result.rawFile,
              startTime: new Date(),
              durationSec: result.durationSec,
            });
            return;
          }
          const nextScreen = resolvePostRecordingScreen({
            success: result.success,
            rawFile: result.rawFile,
            durationSec: result.durationSec,
            error: result.error,
          });
          setScreen(nextScreen);
        }}
      />
    );
  }

  if (screen.id === "capabilities") {
    return (
      <CapabilityOptionsScreen
        options={capabilityOptions}
        onSave={(next) => {
          setCapabilityOptions(next);
          const updatedConfig: Config = {
            ...sharedData.config,
            llmEnabled: next.llmEnabled,
            glossaryText: next.glossaryText,
          };
          saveConfig(updatedConfig);
          // Ref zurücksetzen, damit ein nachfolgendes sharedData-Update
          // capabilityOptions korrekt neu initialisiert.
          capabilityInitializedRef.current = false;
          void reloadData(updatedConfig);
          setScreen({ id: "menu" });
        }}
        onBack={() => setScreen({ id: "menu" })}
      />
    );
  }

  if (screen.id === "history") {
    return (
      <HistoryScreen
        outputDir={sharedData.config.outputDir}
        onOpenEntry={(filePath) =>
          setScreen({ id: "history-detail", filePath })
        }
        onBack={() => setScreen({ id: "menu" })}
      />
    );
  }

  if (screen.id === "history-detail") {
    return (
      <HistoryDetailScreen
        filePath={screen.filePath}
        onBack={() => setScreen({ id: "history" })}
      />
    );
  }

  if (screen.id === "naming") {
    return (
      <NamingScreen
        rawFile={screen.rawFile}
        startTime={screen.startTime}
        durationSec={screen.durationSec}
        outputDir={sharedData.config.outputDir}
        onDone={(finalPath, durationSec) =>
          setScreen({ id: "summary", filePath: finalPath, durationSec })
        }
      />
    );
  }

  if (screen.id === "summary") {
    return (
      <SummaryScreen
        filePath={screen.filePath}
        durationSec={screen.durationSec}
        error={screen.error}
        onBack={() => setScreen({ id: "menu" })}
      />
    );
  }

  if (screen.id === "filepick") {
    return (
      <FilePickScreen
        action={screen.action}
        outputDir={sharedData.config.outputDir}
        onPick={(filePath) =>
          setScreen(
            screen.action === "play"
              ? { id: "playing", filePath }
              : { id: "transcript", filePath, origin: "filepick" },
          )
        }
        onBack={() => setScreen({ id: "menu" })}
      />
    );
  }

  if (screen.id === "playing") {
    return (
      <PlayingScreen
        filePath={screen.filePath}
        onDone={() => setScreen({ id: "menu" })}
      />
    );
  }

  if (screen.id === "transcript") {
    return (
      <TranscriptScreen
        filePath={screen.filePath}
        origin={screen.origin}
        data={sharedData}
        capabilityOptions={capabilityOptions}
        onOpenSetup={() => {
          void buildDiagnoseReport()
            .then((report) => {
              process.stderr.write(
                `[interactive:diagnose] ${JSON.stringify(report)}\n`,
              );
            })
            .catch((error: Error) => {
              process.stderr.write(
                `[interactive:diagnose:error] ${error.message}\n`,
              );
            });
          const transition = buildSetupTransitionFromTranscript({
            filePath: screen.filePath,
            origin: screen.origin,
          });
          setConfigReturnTarget(transition.configReturnTarget);
          setScreen(transition.nextScreen);
        }}
        onDone={() => setScreen({ id: "menu" })}
      />
    );
  }

  if (screen.id === "config") {
    return (
      <ConfigScreen
        data={sharedData}
        onDone={async (updated) => {
          await reloadData(updated);
          const recovery = completeConfigRecovery(configReturnTarget);
          setScreen(recovery.nextScreen);
          setConfigReturnTarget(recovery.resetReturnTarget);
        }}
      />
    );
  }

  return null;
}

// ── Entry Point ────────────────────────────────────────────────────────────

export function startApp(): Promise<AppExitReason> {
  return new Promise((resolve) => {
    let reason: AppExitReason = "exit";
    let app: ReturnType<typeof render>;
    app = render(
      <App
        onRequestSetup={() => {
          reason = "open-setup";
          app.unmount();
        }}
      />,
    );
    app.waitUntilExit().then(() => resolve(reason));
  });
}
