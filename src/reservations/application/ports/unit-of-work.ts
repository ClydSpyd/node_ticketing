import type { InventoryRepository } from "./inventory.repository.ts";
import type { ReservationRepository } from "./reservation.repository.ts";

export interface TransactionContext {
  inventory: InventoryRepository;
  reservations: ReservationRepository;
}

export interface UnitOfWork {
  run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
