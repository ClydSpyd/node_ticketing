export class CategoryNotFoundError extends Error {
  constructor() {
    super("CATEGORY_NOT_FOUND");
    this.name = "CategoryNotFoundError";
  }
}

export class InsufficientInventoryError extends Error {
  constructor() {
    super("INSUFFICIENT_INVENTORY");
    this.name = "InsufficientInventoryError";
  }
}

export class SeatsNotFoundError extends Error {
  constructor() {
    super("SEATS_NOT_FOUND");
    this.name = "SeatsNotFoundError";
  }
}

export const ReservationNotFoundError = class extends Error {
  constructor() {
    super("RESERVATION_NOT_FOUND");
    this.name = "ReservationNotFoundError";
  }
};

export const StateTransitionNotPermittedError = class extends Error {
  constructor() {
    super("STATE_TRANSITION_NOT_PERMITTED");
    this.name = "StateTransitionNotPermittedError";
  }
};

export const ReservationExpiredError = class extends Error {
  constructor() {
    super("RESERVATION_EXPIRED");
    this.name = "ReservationExpiredError";
  }
};
