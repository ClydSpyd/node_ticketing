import { ReservationStatus } from "../reservations.types.js";

// possible transition paths
// ACTIVE
//   ├── EXPIRED
//   └── PENDING_PAYMENT
//           ├── COMPLETED
//           ├── FAILED
//           └── PENDING_RECONCILIATION
//                     ├── COMPLETED
//                     └── FAILED

const allowedTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  ACTIVE: ["EXPIRED", "PENDING_PAYMENT"],
  EXPIRED: [],
  PENDING_PAYMENT: ["COMPLETED", "FAILED", "PENDING_RECONCILIATION"],
  PENDING_RECONCILIATION: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export function canTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  const lookupEntry = allowedTransitions[from];
  return lookupEntry.includes(to);
}
