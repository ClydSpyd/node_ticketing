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