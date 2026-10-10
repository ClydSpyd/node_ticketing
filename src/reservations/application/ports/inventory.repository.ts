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

  /**
   * @param eventId The ID of the event for which to acquire seats.
   * @param seatIds The IDs of the seats to acquire.
   * @returns The IDs of the successfully acquired seats.
   *
   * Acquires the specified seats for exclusive modification
   * within the current transaction.
   *
   * Guarantees:
   * - Concurrent acquisitions of the same seats are serialized.
   * - Exclusive access lasts until the transaction ends.
   * - Other seats can be acquired independently.
   *
   * Must be called within an active transaction.
   */
  acquireEventSeats(eventId: number, seatIds: number[]): Promise<number[]>;

  /**
   * @param seatIds The IDs of the seats to check.
   * @returns True if all specified seats are available, false otherwise.
   *
   * Checks the availability of the specified seats.
   *
   * Only considers reservations that are currently active and not expired.
   */
  checkSeatAvailability(seatIds: number[]): Promise<boolean>;
}
