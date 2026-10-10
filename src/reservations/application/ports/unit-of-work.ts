import type { InventoryRepository } from "./inventory.repository.js";
import type { ReservationRepository } from "./reservation.repository.js";

export interface TransactionContext {
  inventory: InventoryRepository;
  reservations: ReservationRepository;
}

export interface UnitOfWork {
  run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
