import {
  InsufficientInventoryError,
  SeatsNotFoundError,
} from "../reservations.error.js";
import {EventNotFoundError} from '../../events/events.error.js';
import type { Reservation } from "../reservations.types.js";
import type { UnitOfWork } from "./ports/unit-of-work.js";

type CreateSeatReservationInput = {
  eventId: number;
  seatIds: number[];
};

export const createSeatReservation = async (
  input: CreateSeatReservationInput,
  unitOfWork: UnitOfWork,
): Promise<Reservation> => {
  const { eventId, seatIds } = input;

  return unitOfWork.run(async ({ events, inventory, reservations }) => {
    // check if the event exists
    const event = await events.findById(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    //lock seat rows
    const seatsResult = await inventory.acquireEventSeats(eventId, seatIds);

    // check if all requested seats exist for this event
    if (seatsResult.length !== seatIds.length) {
      throw new SeatsNotFoundError();
    }

    // check if any of the requested seats are already reserved
    const reservedResult = await inventory.checkSeatAvailability(seatIds);
    if (!reservedResult) {
      throw new InsufficientInventoryError();
    }

    // insert the reservation
    const reservation = await reservations.create(eventId);

    await reservations.reserveSeats(reservation.id, seatIds);

    // return the created reservation
    return reservation;
  });
};
