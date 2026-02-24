import { ChildProcess } from "child_process";
import fs from "fs";
import { Box, render, Text, useApp, useInput } from "ink";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – ink-select-input default export
import SelectInput from "ink-select-input";
import os from "os";
import path from "path";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AudioDevice, Config, RecordingMode } from "./types.js";
import {
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

// ── Typen ──────────────────────────────────────────────────────────────────

interface SelectItem {
  label: string;
  value: string;
}

type Screen =
  | { id: "loading" }
  | { id: "menu" }
  | { id: "recording" }
  | { id: "naming"; rawFile: string; startTime: Date; durationSec: number }
  | { id: "summary"; filePath: string; durationSec: number; error?: string }
  | { id: "filepick"; action: "play" | "transcribe" }
  | { id: "playing"; filePath: string }
  | { id: "transcript"; filePath: string }
  | { id: "config" };

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

// ── Inline-Texteingabe ─────────────────────────────────────────────────────

interface InlineTextInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  password?: boolean;
}

function InlineTextInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  password,
}: InlineTextInputProps) {
  useInput((char, key) => {
    if (key.return) {
      onSubmit?.();
      return;
    }
    if (key.escape) {
      onCancel?.();
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    if (char && !key.ctrl && !key.meta) onChange(value + char);
  });
  const display = password ? "•".repeat(value.length) : value;
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
  onNavigate: (
    target: "record" | "play" | "transcribe" | "config" | "exit",
  ) => void;
}

function MenuScreen({ data, onNavigate }: MenuScreenProps) {
  const { exit } = useApp();

  const modeLabel: Record<RecordingMode, string> = {
    mic: "Nur Mikrofon",
    system: "Nur System-Audio",
    both: "Mikrofon + System-Audio",
  };

  const items: SelectItem[] = [
    { label: "🎙  Aufnahme starten", value: "record" },
    { label: "▶   Audio abspielen", value: "play" },
    { label: "📝  Transkribieren", value: "transcribe" },
    { label: "⚙   Einstellungen", value: "config" },
    { label: "🚪  Beenden", value: "exit" },
  ];

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
          <Text color="white">
            {modeLabel[data.config.mode as RecordingMode]}
          </Text>
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
          else
            onNavigate(
              item.value as "record" | "play" | "transcribe" | "config",
            );
        }}
      />
    </Box>
  );
}

// ── Screen: Aufnahme ──────────────────────────────────────────────────────

interface RecordingScreenProps {
  data: SharedData;
  onDone: (result: {
    success: boolean;
    rawFile: string;
    startTime: Date;
    durationSec: number;
    error?: string;
  }) => void;
}

function RecordingScreen({ data, onDone }: RecordingScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [inputArmed, setInputArmed] = useState(false);
  const startTimeRef = useRef<Date>(new Date());
  const [rawFile] = useState(() => {
    const ts = fileTimestamp(new Date());
    return path.join(data.config.outputDir, `tmp_${ts}.wav`);
  });
  const procRef = useRef<ChildProcess | null>(null);
  const stoppedRef = useRef(false);
  const doneCalledRef = useRef(false);
  const stderrLinesRef = useRef<string[]>([]);

  const stop = () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const proc = procRef.current;
    if (proc) {
      proc.stdin?.write("q");
      setTimeout(() => {
        try {
          proc.kill("SIGTERM");
        } catch (_) {
          /* noop */
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
        data.config.mode as RecordingMode,
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
      const hint =
        [...relevant]
          .reverse()
          .find((line) => specificErrorPatterns.some((rx) => rx.test(line))) ??
        relevant[relevant.length - 1];
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
      if (!stoppedRef.current) stop();
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setInputArmed(true), 800);
    return () => clearTimeout(t);
  }, []);

  useInput((char, key) => {
    if (!inputArmed) return;
    if (key.escape || char?.toLowerCase() === "q") stop();
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
          <Text color="cyan">
            {modeLabel[data.config.mode as RecordingMode]}
          </Text>
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
        <Text> </Text>
        <Text>
          <Text color="gray">Esc oder q </Text>
          <Text color="white">
            {inputArmed ? "→ Stopp" : "→ Stopp (aktiviert …)"}
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
}: NamingScreenProps) {
  const [name, setName] = useState("");
  const ts = fileTimestamp(startTime);

  const previewName = useMemo(() => {
    const slug = name
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[/\\:*?"<>|]/g, "");
    return slug ? `${ts}_${slug}.wav` : `${ts}.wav`;
  }, [name, ts]);

  const commit = () => {
    const newPath = path.join(outputDir, previewName);
    try {
      if (fs.existsSync(rawFile)) fs.renameSync(rawFile, newPath);
    } catch (_) {
      /* keep rawFile on error */
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
}: SummaryScreenProps) {
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
}: FilePickScreenProps) {
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
      return;
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

function PlayingScreen({ filePath, onDone }: PlayingScreenProps) {
  const spinner = useSpinner();
  const procRef = useRef<ChildProcess | null>(null);

  useEffect(() => {
    const proc = playAudio(filePath);
    procRef.current = proc;
    proc.on("close", () => onDone());
    return () => {
      try {
        procRef.current?.kill();
      } catch (_) {
        /* noop */
      }
    };
  }, []);

  useInput(() => {
    try {
      procRef.current?.kill();
    } catch (_) {
      /* noop */
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
  onDone: () => void;
}

function TranscriptScreen({ filePath, data, onDone }: TranscriptScreenProps) {
  const spinner = useSpinner();
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const apiKey = data.config.apiKey ?? process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      setErrorMsg(
        "Kein OpenAI API-Key. Einstellungen öffnen oder OPENAI_API_KEY setzen.",
      );
      setState("error");
      return;
    }
    transcribeFile(filePath, apiKey, "de", data.config.baseUrl)
      .then((result) => {
        const outPath = filePath.replace(/\.(wav|mp3|m4a|ogg|flac)$/i, ".txt");
        try {
          fs.writeFileSync(outPath, result, "utf-8");
        } catch (_) {
          /* noop */
        }
        setText(result);
        setState("done");
      })
      .catch((e: Error) => {
        setErrorMsg(e.message);
        setState("error");
      });
  }, []);

  useInput(() => {
    if (state !== "loading") onDone();
  });

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
            ❌ Fehler
          </Text>
          <Text> </Text>
          <Text color="gray">{errorMsg}</Text>
        </Box>
        <Text> </Text>
        <Text color="gray">Beliebige Taste → Menü</Text>
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
          📝 Transkript
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
      </Box>
      <Text> </Text>
      <Text color="gray">Beliebige Taste → Menü</Text>
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

function ConfigScreen({ data, onDone }: ConfigScreenProps) {
  const [step, setStep] = useState<ConfigStep>("mode");
  const [draft, setDraft] = useState<Config>({ ...data.config });
  const [apiKey, setApiKey] = useState(data.config.apiKey ?? "");
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
      const final: Config = {
        ...draft,
        apiKey: apiKey.trim() || undefined,
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
            {data.config.apiKey
              ? "••••" + data.config.apiKey.slice(-4)
              : "nicht gesetzt"}
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

function App({ onRequestSetup }: AppProps) {
  const [screen, setScreen] = useState<Screen>({ id: "loading" });
  const [sharedData, setSharedData] = useState<SharedData | null>(null);

  const reloadData = async (overrideConfig?: Config) => {
    const hasConfig = configExists();
    const config =
      overrideConfig ?? (hasConfig ? loadConfig() : DEFAULT_CONFIG);
    const devices = await listAudioDevices();
    const configuredSystemDevice =
      config.systemIndex !== undefined
        ? devices.find((d) => d.index === config.systemIndex)
        : undefined;
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
      hasConfig: overrideConfig != null ? true : hasConfig,
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

  if (screen.id === "loading" || !sharedData) return <LoadingScreen />;

  if (screen.id === "menu") {
    return (
      <MenuScreen
        data={sharedData}
        onNavigate={(target) => {
          if (target === "record") setScreen({ id: "recording" });
          else if (target === "play")
            setScreen({ id: "filepick", action: "play" });
          else if (target === "transcribe")
            setScreen({ id: "filepick", action: "transcribe" });
          else if (target === "config") onRequestSetup();
        }}
      />
    );
  }

  if (screen.id === "recording") {
    return (
      <RecordingScreen
        data={sharedData}
        onDone={(result) => {
          if (!result.success) {
            setScreen({
              id: "summary",
              filePath: result.rawFile,
              durationSec: result.durationSec,
              error: result.error,
            });
          } else {
            setScreen({
              id: "naming",
              rawFile: result.rawFile,
              startTime: result.startTime,
              durationSec: result.durationSec,
            });
          }
        }}
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
              : { id: "transcript", filePath },
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
        data={sharedData}
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
          setScreen({ id: "menu" });
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
