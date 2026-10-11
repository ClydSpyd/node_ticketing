import { describe, it, expect } from "vitest";
import { canTransition } from "./reservation-state.js";
import type { ReservationStatus } from "../reservations.types.js";

describe("Reservation State", () => {
  it.each<[ReservationStatus, ReservationStatus]>([
    ["ACTIVE", "PENDING_PAYMENT"],
    ["ACTIVE", "EXPIRED"],
    ["PENDING_PAYMENT", "COMPLETED"],
    ["PENDING_PAYMENT", "FAILED"],
    ["PENDING_PAYMENT", "PENDING_RECONCILIATION"],
    ["PENDING_RECONCILIATION", "COMPLETED"],
    ["PENDING_RECONCILIATION", "FAILED"],
  ])("Allows transition %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each<[ReservationStatus, ReservationStatus]>([
    ["ACTIVE", "COMPLETED"],
    ["ACTIVE", "FAILED"],
    ["PENDING_PAYMENT", "ACTIVE"],
    ["PENDING_RECONCILIATION", "PENDING_PAYMENT"],
  ])("Rejects invalid transition %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it.each<ReservationStatus>(["EXPIRED", "COMPLETED", "FAILED"])(
    "Does not allow any transition from terminal state %s",
    (from) => {
      const statuses: ReservationStatus[] = [
        "ACTIVE",
        "EXPIRED",
        "PENDING_PAYMENT",
        "PENDING_RECONCILIATION",
        "COMPLETED",
        "FAILED",
      ];

      for (const to of statuses) {
        expect(canTransition(from, to)).toBe(false);
      }
    },
  );
});
