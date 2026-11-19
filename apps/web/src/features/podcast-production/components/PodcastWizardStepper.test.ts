import { describe, expect, it } from "bun:test";
import { buildPodcastWizardSteps } from "./PodcastWizardStepper";

describe("podcast wizard stepper", () => {
  it("keeps every step enabled and exposes completion status", () => {
    const steps = buildPodcastWizardSteps({
      information: false,
      script: true,
      voice: false,
      review: false,
    }, "information");

    expect(steps.map((step) => step.disabled)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(steps[1]?.statusLabel).toBe("Hoàn thành");
    expect(steps[0]?.statusLabel).toBe("Đang thao tác");
  });

  it("shows the active step as in progress even when its content is complete", () => {
    const steps = buildPodcastWizardSteps({
      information: true,
      script: true,
      voice: false,
      review: false,
    }, "script");

    expect(steps[0]?.statusLabel).toBe("Hoàn thành");
    expect(steps[1]?.statusLabel).toBe("Đang thao tác");
    expect(steps[2]?.statusLabel).toBe("Chưa hoàn thành");
  });
});
