import type {
  Reservation,
  ReservationStatus,
} from "../../reservations.types.js";
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

  /**
   * @param reservationId The ID of the reservation to update.
   * @param seatIds The IDs of the seats to reserve.
   * @returns A promise that resolves when the reservation is successfully updated.
   *
   * Reserves the specified seats for the given reservation.
   */
  reserveSeats(reservationId: number, seatIds: number[]): Promise<void>;

  /**
   * Finds a reservation by its ID for update within a transaction.
   * @param id The ID of the reservation to find.
   * @returns The reservation if found, otherwise null.
   */
  findByIdForUpdate(id: number): Promise<Reservation | null>;

  /**
   * Updates the status of a reservation.
   * @param id The ID of the reservation to update.
   * @param status The new status of the reservation.
   * @returns A promise that resolves when the reservation status is successfully updated.
   *
   * Updates the status of the given reservation.
   */
  updateStatus(id: number, status: ReservationStatus): Promise<void>;

  /**
   * Starts the payment process for a reservation by updating its status to PENDING_PAYMENT
   * and setting a payment deadline.
   * @param id The ID of the reservation to update.
   * @returns A promise that resolves when the reservation status is successfully updated.
   *
   * Updates the status of the given reservation to PENDING_PAYMENT and sets the payment deadline.
   */
  startPayment(id: number): Promise<void>;
}
