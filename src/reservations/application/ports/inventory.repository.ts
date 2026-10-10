import { GACategory } from "../../reservations.types.js";

export interface InventoryRepository {
  /**
   * @param categoryId The ID of the GA category to acquire.
   * @returns The acquired GA category, or null if it does not exist.
   * 
   * Acquires a GA category for exclusive modification
   * within the current transaction.
   *
   * Guarantees:
   * - Concurrent acquisitions of the same category
   *   are serialized.
   * - Exclusive access lasts until the transaction ends.
   * - Other categories can be acquired independently.
   *
   * Must be called within an active transaction.
   */
  acquireGACategory(categoryId: number): Promise<GACategory | null>;

  /**
   * @param categoryId The ID of the GA category to check.
   * @returns The total reserved quantity for the specified GA category.
   * 
   * Retrieves the total reserved quantity for a GA category.
   *
   * Only considers reservations that are currently active and not expired.
   */
  getReservedGAQuantity(categoryId: number): Promise<number>;
}
