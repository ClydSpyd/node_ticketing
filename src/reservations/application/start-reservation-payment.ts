import type { UnitOfWork } from "./ports/unit-of-work.js";
import {
  ReservationNotFoundError,
  StateTransitionNotPermittedError,
  ReservationExpiredError,
} from "../reservations.error.js";
import { canTransition } from "../domain/reservation-state.js";
type StartReservationPaymentInput = {
  reservationId: number;
};

export async function startReservationPayment(
  input: StartReservationPaymentInput,
  unitOfWork: UnitOfWork,
): Promise<void> {
  return unitOfWork.run(async ({ reservations }) => {
    // retrieve reservation
    const reservation = await reservations.findByIdForUpdate(
      input.reservationId,
    );

    // throw an error if it doesn't exist
    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    // check that its current status can transition to PENDING_PAYMENT
    const canTransitionToPendingPayment = canTransition(
      reservation.status,
      "PENDING_PAYMENT",
    );

    // throw an error if it cannot
    if (!canTransitionToPendingPayment) {
      throw new StateTransitionNotPermittedError();
    }

    // verify that its checkout window hasn't expired (expiresAt)
    if (reservation.expiresAt.getTime() <= Date.now()) {
      throw new ReservationExpiredError();
    }

    // update its status to PENDING_PAYMENT and set the payment deadline
    await reservations.startPayment(reservation.id);
  });
}
