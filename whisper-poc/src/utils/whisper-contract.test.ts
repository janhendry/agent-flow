import assert from "node:assert/strict";
import test from "node:test";
import {
	buildWhisperFfmpegArgs,
	requiresWhisperConversion,
} from "./whisper.js";

test("whisper: webm benötigt keine Konvertierung", () => {
	assert.equal(requiresWhisperConversion("/tmp/sample.webm"), false);
});

test("whisper: wav benötigt Konvertierung", () => {
	assert.equal(requiresWhisperConversion("/tmp/sample.wav"), true);
});

test("whisper: ffmpeg-args setzen Opus/WebM-Vertrag korrekt", () => {
	const args = buildWhisperFfmpegArgs("/tmp/input.wav", "/tmp/output.webm");
	const vbrIndex = args.indexOf("-vbr");
	const compressionLevelIndex = args.indexOf("-compression_level");

	assert.deepEqual(args.slice(0, 4), ["-y", "-i", "/tmp/input.wav", "-vn"]);
	assert.ok(args.includes("libopus"));
	assert.ok(args.includes("48k"));
	assert.notEqual(vbrIndex, -1);
	assert.equal(args[vbrIndex + 1], "on");
	assert.notEqual(compressionLevelIndex, -1);
	assert.equal(args[compressionLevelIndex + 1], "10");
	assert.ok(args.includes("voip"));
	assert.deepEqual(args.slice(-2), ["webm", "/tmp/output.webm"]);
});
