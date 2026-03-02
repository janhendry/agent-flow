import fs from "node:fs";
import path from "node:path";

export interface InteractiveHistoryEntry {
	filePath: string;
	fileName: string;
	sizeBytes: number;
	updatedAtMs: number;
}

export interface InteractiveHistoryCleanupResult {
	deletedCount: number;
	deletedFiles: string[];
}

const TRANSCRIPT_EXTENSIONS = new Set([".txt"]);
const CLEANUP_EXTENSIONS = new Set([".wav", ".webm", ".opus", ".mp3", ".m4a"]);

function readDirectoryFiles(outputDir: string): string[] {
	if (!fs.existsSync(outputDir)) {
		return [];
	}

	const entries = fs.readdirSync(outputDir, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => path.join(outputDir, entry.name));
}

export function listInteractiveHistory(outputDir: string): InteractiveHistoryEntry[] {
	return readDirectoryFiles(outputDir)
		.filter((filePath) => TRANSCRIPT_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
		.map((filePath) => {
			const stats = fs.statSync(filePath);
			return {
				filePath,
				fileName: path.basename(filePath),
				sizeBytes: stats.size,
				updatedAtMs: stats.mtimeMs,
			};
		})
		.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
}

export function readInteractiveHistoryContent(filePath: string): string {
	return fs.readFileSync(filePath, "utf-8");
}

export function deleteInteractiveHistoryEntry(filePath: string): void {
	if (!fs.existsSync(filePath)) {
		return;
	}
	fs.rmSync(filePath, { force: true });
}

export function cleanupInteractiveHistoryArtifacts(outputDir: string): InteractiveHistoryCleanupResult {
	const deletedFiles: string[] = [];

	for (const filePath of readDirectoryFiles(outputDir)) {
		const ext = path.extname(filePath).toLowerCase();
		if (!CLEANUP_EXTENSIONS.has(ext)) {
			continue;
		}

		try {
			fs.rmSync(filePath, { force: true });
			deletedFiles.push(filePath);
		} catch {
			// Cleanup ist best-effort und darf den Flow nicht abbrechen.
		}
	}

	return {
		deletedCount: deletedFiles.length,
		deletedFiles,
	};
}
