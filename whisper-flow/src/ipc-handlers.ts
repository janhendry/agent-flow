import type { IpcMain } from "electron";
import type { CoreBridge } from "./core-bridge";
import {
	type Config,
	IpcChannel,
	type RecordStartRequest,
	type TranscribeRequest,
} from "./ipc-types";
import type { StateMachine } from "./state-machine";

export type WindowSender = {
	send: (channel: string, payload: unknown) => void;
};

export type IpcHandlerDeps = {
	ipcMain: Pick<IpcMain, "handle">;
	bridge: CoreBridge;
	stateMachine: StateMachine;
	getWindowSender: () => WindowSender | undefined;
	writeClipboardText?: (text: string) => void;
};

export function registerIpcHandlers({
	ipcMain,
	bridge,
	stateMachine,
	getWindowSender,
	writeClipboardText,
}: IpcHandlerDeps): void {
	const clipboardWriter = writeClipboardText ?? (() => undefined);

	ipcMain.handle(IpcChannel.RECORD_START, async (_event, req: RecordStartRequest) => {
		const result = await bridge.startRecording(req.mode);
		if (result.ok) {
			stateMachine.transition("recording");
		}
		return result;
	});

	ipcMain.handle(IpcChannel.RECORD_STOP, async () => {
		const result = await bridge.stopRecording();
		if (result.ok) {
			stateMachine.transition("transcribing");
		}
		return result;
	});

	ipcMain.handle(IpcChannel.TRANSCRIBE, async (_event, req: TranscribeRequest) => {
		const result = await bridge.transcribe(req.filePath, req.language);
		if (result.ok) {
			clipboardWriter(result.data);
			stateMachine.transition("success");
			setTimeout(() => {
				if (stateMachine.getState() === "success") {
					stateMachine.transition("idle");
				}
			}, 3_000);
		} else {
			stateMachine.transition("error");
			setTimeout(() => {
				if (stateMachine.getState() === "error") {
					stateMachine.transition("idle");
				}
			}, 5_000);
		}
		return result;
	});

	ipcMain.handle(IpcChannel.CONFIG_LOAD, async () => {
		return bridge.loadConfig();
	});

	ipcMain.handle(IpcChannel.CONFIG_SAVE, async (_event, config: Config) => {
		return bridge.saveConfig(config);
	});

	ipcMain.handle(IpcChannel.SECRET_GET_API_KEY, async () => {
		return bridge.getApiKey();
	});

	ipcMain.handle(IpcChannel.SECRET_SET_API_KEY, async (_event, key: string) => {
		return bridge.setApiKey(key);
	});

	ipcMain.handle(IpcChannel.DIAGNOSE_CHECK_FFMPEG, async () => {
		return bridge.checkFfmpeg();
	});

	ipcMain.handle(IpcChannel.DIAGNOSE_LIST_DEVICES, async () => {
		return bridge.listDevices();
	});

	bridge.setAudioLevelCallback((level) => {
		getWindowSender()?.send(IpcChannel.AUDIO_LEVEL, level);
	});
}
