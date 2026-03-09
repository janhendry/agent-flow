import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import test from "node:test";
import { CoreBridge } from "./core-bridge";

type FakeSecretStore = {
	providerName: () => string;
	getApiKey: () => string | undefined;
	setApiKey: (_key: string) => void;
	clearApiKey: () => void;
};

function createFakeProcess(): ChildProcess {
	const emitter = new EventEmitter() as unknown as ChildProcess;
	const writes: string[] = [];
	emitter.stderr = new EventEmitter() as ChildProcess["stderr"];
	emitter.stdin = {
		write: (chunk: string | Uint8Array) => {
			writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
			return true;
		},
		end: () => undefined,
	} as unknown as ChildProcess["stdin"];
	emitter.kill = () => true;
	(emitter as unknown as { __writes: string[] }).__writes = writes;
	return emitter;
}

test("CoreBridge.startRecording delegiert an Audio-Utils", async () => {
	const fakeProc = createFakeProcess();
	const calls: { mode?: string; outputPath?: string; args?: string[] } = {};
	const secretStore: FakeSecretStore = {
		providerName: () => "test",
		getApiKey: () => "sk-test",
		setApiKey: () => undefined,
		clearApiKey: () => undefined,
	};

	const bridge = new CoreBridge({
		createSecretStore: () => secretStore,
		listAudioDevices: async () => [{ index: 0, name: "Mikrofon" }],
		findSystemAudioDevice: () => ({ index: 1, name: "System" }),
		buildFfmpegArgs: (mode, _mic, _sys, outputPath) => {
			calls.mode = mode;
			calls.outputPath = outputPath;
			return ["-i", "input", outputPath];
		},
		startRecording: (args) => {
			calls.args = args;
			return fakeProc;
		},
		checkFfmpeg: async () => true,
		configExists: () => true,
		loadConfig: () => ({ mode: "mic", micIndex: 0, micName: "Mikrofon", outputDir: "tmp" }),
		saveConfig: () => undefined,
		transcribeFile: async () => "ok",
		mkdirSync: () => undefined,
		tmpDir: () => "/tmp",
		nowIso: () => "2026-03-09T12:00:00.000Z",
	});

	const result = await bridge.startRecording("mic");
	assert.equal(result.ok, true);
	assert.equal(calls.mode, "mic");
	assert.match(calls.outputPath ?? "", /recording-2026-03-09T12-00-00\.wav$/);
	assert.deepEqual(calls.args, ["-i", "input", calls.outputPath ?? ""]);
});

test("CoreBridge.transcribe liefert Fehler wenn kein API-Key vorhanden", async () => {
	const secretStore: FakeSecretStore = {
		providerName: () => "test",
		getApiKey: () => undefined,
		setApiKey: () => undefined,
		clearApiKey: () => undefined,
	};

	const bridge = new CoreBridge({
		createSecretStore: () => secretStore,
		listAudioDevices: async () => [],
		findSystemAudioDevice: () => undefined,
		buildFfmpegArgs: () => [],
		startRecording: () => createFakeProcess(),
		checkFfmpeg: async () => true,
		configExists: () => false,
		loadConfig: () => ({ mode: "mic", micIndex: 0, micName: "Mikrofon", outputDir: "tmp" }),
		saveConfig: () => undefined,
		transcribeFile: async () => "",
		mkdirSync: () => undefined,
		tmpDir: () => "/tmp",
		nowIso: () => "2026-03-09T12:00:00.000Z",
	});

	const result = await bridge.transcribe("audio.wav", "de");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.equal(result.error.code, "NO_API_KEY");
	}
});

test("CoreBridge.transcribe mappt Laufzeitfehler auf strukturierten IPC-Fehler", async () => {
	const secretStore: FakeSecretStore = {
		providerName: () => "test",
		getApiKey: () => "sk-test",
		setApiKey: () => undefined,
		clearApiKey: () => undefined,
	};

	const bridge = new CoreBridge({
		createSecretStore: () => secretStore,
		listAudioDevices: async () => [],
		findSystemAudioDevice: () => undefined,
		buildFfmpegArgs: () => [],
		startRecording: () => createFakeProcess(),
		checkFfmpeg: async () => true,
		configExists: () => true,
		loadConfig: () => ({ mode: "mic", micIndex: 0, micName: "Mikrofon", outputDir: "tmp" }),
		saveConfig: () => undefined,
		transcribeFile: async () => {
			throw new Error("limit");
		},
		mkdirSync: () => undefined,
		tmpDir: () => "/tmp",
		nowIso: () => "2026-03-09T12:00:00.000Z",
	});

	const result = await bridge.transcribe("audio.wav", "de");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.equal(result.error.code, "TRANSCRIBE_FAILED");
		assert.equal(result.error.message, "limit");
	}
});
