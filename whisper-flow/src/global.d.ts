import type { ElectronAPI } from "./ipc-types";

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
