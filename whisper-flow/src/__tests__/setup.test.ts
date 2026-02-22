import { describe, expect, it } from "vitest";

describe("Project Setup", () => {
	it("should have vitest configured correctly", () => {
		expect(true).toBe(true);
	});

	it("should resolve @shared alias", async () => {
		const types = await import("@shared/types");
		expect(types).toBeDefined();
	});
});
