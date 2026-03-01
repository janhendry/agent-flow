import assert from "node:assert/strict";
import test from "node:test";
import {
	deriveAudioLevelFromFfmpegOutput,
	renderAudioLevelBars,
} from "./interactive-audio-level.js";

test("audio level: erkennt RMS-dB-Wert und normalisiert", () => {
	const level = deriveAudioLevelFromFfmpegOutput(
		"[Parsed_astats_0] RMS level dB: -30.0",
		0,
	);
	assert.ok(level > 0.45 && level < 0.55);
});

test("audio level: erkennt lavfi-astats-metadata", () => {
	const level = deriveAudioLevelFromFfmpegOutput(
		"lavfi.astats.Overall.RMS_level=-18.0",
		0,
	);
	assert.ok(level > 0.65 && level < 0.75);
});

test("audio level: ohne valides Pegelsignal nur Decay", () => {
	const level = deriveAudioLevelFromFfmpegOutput(
		"size=  128kB time=00:00:05.12 bitrate= 204.8kbits/s speed=1.0x",
		0.8,
	);
	assert.ok(level < 0.8 && level > 0.7);
});

test("audio bars: rendert erwartete Breite", () => {
	const bars = renderAudioLevelBars(0.5, 10);
	assert.equal(bars.length, 10);
});
