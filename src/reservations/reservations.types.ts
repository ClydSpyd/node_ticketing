export type Reservation = {
  id: number;
  eventId: number;
  status: ReservationStatus;
  expiresAt: string;
};

export type GACategory = {
  id: number;
  eventId: number;
  capacity: number;
};

export type ReservationStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "PENDING_PAYMENT"
  | "PENDING_RECONCILIATION"
  | "COMPLETED"
  | "FAILED";
