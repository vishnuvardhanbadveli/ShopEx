import { describe, expect, it } from "vitest";
import { recoverOrderState } from "./orderRecovery";

describe("persisted order recovery", () => {
  it("keeps an unconfirmed created order resumable after refresh", () => {
    expect(recoverOrderState("created")).toEqual({ paymentState: "idle", stage: "approval", resumeAvailable: true });
  });

  it("waits through webhook delay after verification without asserting success", () => {
    expect(recoverOrderState("verified")).toEqual({ paymentState: "verified", stage: "approval", resumeAvailable: false });
  });

  it("renders captured and failed webhook outcomes truthfully", () => {
    expect(recoverOrderState("captured")).toEqual({ paymentState: "captured", stage: "confirmation", resumeAvailable: false });
    expect(recoverOrderState("failed")).toEqual({ paymentState: "failed", stage: "approval", resumeAvailable: false });
  });
});
