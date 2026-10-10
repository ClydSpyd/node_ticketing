export type Reservation = {
  id: number;
  eventId: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
};

export type GACategory = {
  id: number;
  eventId: number;
  capacity: number;
};
