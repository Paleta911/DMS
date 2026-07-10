import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureFlagsProvider, useFeatureFlag } from "./FeatureFlagsProvider";

// Verifies env-driven flag parsing controls availability checks as expected.
function Probe() {
  const notificationsEnabled = useFeatureFlag("notifications");
  const analyticsEnabled = useFeatureFlag("admin-analytics");
  return (
    <div>
      <span>
        {notificationsEnabled ? "notifications:on" : "notifications:off"}
      </span>
      <span>{analyticsEnabled ? "analytics:on" : "analytics:off"}</span>
    </div>
  );
}

describe("FeatureFlagsProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa las flags configuradas por entorno", () => {
    vi.stubEnv("VITE_FEATURE_FLAGS", "notifications");

    render(
      <FeatureFlagsProvider>
        <Probe />
      </FeatureFlagsProvider>,
    );

    expect(screen.getByText("notifications:on")).toBeInTheDocument();
    expect(screen.getByText("analytics:off")).toBeInTheDocument();
  });
});
