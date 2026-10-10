import type { Reservation } from "../../reservations.types.js";
/**
 * Persistence operations for reservations.
 *
 * Transaction contract:
 * - All methods operate within the transaction provided by the caller.
 * - create() and reserveGA() must participate in the same transaction.
 * - The repository does not commit or roll back transactions.
 * - The caller is responsible for transaction lifecycle.
 */

export interface ReservationRepository {
  /**
   * @param eventId The ID of the event for which to create the reservation.
   * @returns The newly created reservation.
   *
   * Creates a new reservation for the given event ID.
   */
  create(eventId: number): Promise<Reservation>;


  /**
   * @param reservationId The ID of the reservation to update.
   * @param categoryId The ID of the GA category to reserve.
   * @param quantity The quantity to reserve.
   * @returns A promise that resolves when the reservation is successfully updated.
   *
   * Reserves the specified quantity of a GA category for the given reservation.
   */
  reserveGA(
    reservationId: number,
    categoryId: number,
    quantity: number,
  ): Promise<void>;
}
