import { describe, expect, it } from "bun:test";
import { buildPodcastWizardSteps } from "./PodcastWizardStepper";

describe("podcast wizard stepper", () => {
  it("keeps every step enabled and exposes completion status", () => {
    const steps = buildPodcastWizardSteps({
      information: false,
      script: true,
      voice: false,
      review: false,
    });

    expect(steps.map((step) => step.disabled)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(steps[1]?.statusLabel).toBe("Hoàn thành");
    expect(steps[0]?.statusLabel).toBe("Chưa hoàn thành");
  });
});
