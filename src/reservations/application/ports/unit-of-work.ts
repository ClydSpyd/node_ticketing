import type { InventoryRepository } from "./inventory.repository.js";
import type { ReservationRepository } from "./reservation.repository.js";
import type { EventRepository } from "../../../events/application/ports/events.repository.js";

export interface TransactionContext {
  inventory: InventoryRepository;
  reservations: ReservationRepository;
  events: EventRepository;
}

export interface UnitOfWork {
  run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
