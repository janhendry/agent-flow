import assert from "node:assert/strict";
import test from "node:test";
import { registerIpcHandlers } from "./ipc-handlers";
import { IpcChannel } from "./ipc-types";

type Handler = (_event: unknown, payload?: unknown) => Promise<unknown>;

test("registerIpcHandlers registriert alle benoetigten Kanaele", () => {
	const handlers = new Map<string, Handler>();

	registerIpcHandlers({
		ipcMain: {
			handle: (channel, handler) => {
				handlers.set(channel, handler as Handler);
				return undefined;
			},
		},
		bridge: {
			startRecording: async () => ({ ok: true, data: undefined }),
			stopRecording: async () => ({ ok: true, data: "file.wav" }),
			transcribe: async () => ({ ok: true, data: "text" }),
			loadConfig: async () => ({
				ok: true,
				data: { mode: "mic", micIndex: 0, micName: "Mikrofon", outputDir: "tmp" },
			}),
			saveConfig: async () => ({ ok: true, data: undefined }),
			getApiKey: async () => ({ ok: true, data: "sk" }),
			setApiKey: async () => ({ ok: true, data: undefined }),
			checkFfmpeg: async () => ({ ok: true, data: true }),
			listDevices: async () => ({ ok: true, data: [] }),
			setAudioLevelCallback: () => undefined,
		} as unknown as Parameters<typeof registerIpcHandlers>[0]["bridge"],
		stateMachine: {
			transition: () => undefined,
			getState: () => "idle",
		} as unknown as Parameters<typeof registerIpcHandlers>[0]["stateMachine"],
		getWindowSender: () => undefined,
	});

	assert.equal(handlers.has(IpcChannel.RECORD_START), true);
	assert.equal(handlers.has(IpcChannel.RECORD_STOP), true);
	assert.equal(handlers.has(IpcChannel.TRANSCRIBE), true);
	assert.equal(handlers.has(IpcChannel.CONFIG_LOAD), true);
	assert.equal(handlers.has(IpcChannel.CONFIG_SAVE), true);
	assert.equal(handlers.has(IpcChannel.SECRET_GET_API_KEY), true);
	assert.equal(handlers.has(IpcChannel.SECRET_SET_API_KEY), true);
	assert.equal(handlers.has(IpcChannel.DIAGNOSE_CHECK_FFMPEG), true);
	assert.equal(handlers.has(IpcChannel.DIAGNOSE_LIST_DEVICES), true);
});

test("RECORD_START-Handler delegiert an Bridge mit korrektem Modus", async () => {
	const handlers = new Map<string, Handler>();
	const calls: { mode?: string; transitionedTo?: string } = {};

	registerIpcHandlers({
		ipcMain: {
			handle: (channel, handler) => {
				handlers.set(channel, handler as Handler);
				return undefined;
			},
		},
		bridge: {
			startRecording: async (mode: "mic" | "system" | "both") => {
				calls.mode = mode;
				return { ok: true, data: undefined };
			},
			stopRecording: async () => ({ ok: true, data: "file.wav" }),
			transcribe: async () => ({ ok: true, data: "text" }),
			loadConfig: async () => ({
				ok: true,
				data: { mode: "mic", micIndex: 0, micName: "Mikrofon", outputDir: "tmp" },
			}),
			saveConfig: async () => ({ ok: true, data: undefined }),
			getApiKey: async () => ({ ok: true, data: "sk" }),
			setApiKey: async () => ({ ok: true, data: undefined }),
			checkFfmpeg: async () => ({ ok: true, data: true }),
			listDevices: async () => ({ ok: true, data: [] }),
			setAudioLevelCallback: () => undefined,
		} as unknown as Parameters<typeof registerIpcHandlers>[0]["bridge"],
		stateMachine: {
			transition: (to: "idle" | "recording" | "transcribing" | "success" | "error") => {
				calls.transitionedTo = to;
			},
			getState: () => "idle",
		} as unknown as Parameters<typeof registerIpcHandlers>[0]["stateMachine"],
		getWindowSender: () => undefined,
	});

	const handler = handlers.get(IpcChannel.RECORD_START);
	assert.ok(handler);
	const result = await handler({}, { mode: "both" });
	assert.deepEqual(result, { ok: true, data: undefined });
	assert.equal(calls.mode, "both");
	assert.equal(calls.transitionedTo, "recording");
});
