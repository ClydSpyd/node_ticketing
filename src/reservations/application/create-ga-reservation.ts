import {
  CategoryNotFoundError,
  InsufficientInventoryError,
} from "../reservations.error.js";
import type { Reservation } from "../reservations.types.js";
import type { UnitOfWork } from "./ports/unit-of-work.js";

type CreateGAReservationInput = {
  categoryId: number;
  quantity: number;
};

export const createGAReservation = async (
  input: CreateGAReservationInput,
  unitOfWork: UnitOfWork,
): Promise<Reservation> => {
  const { categoryId, quantity } = input;
  return unitOfWork.run(async ({ inventory, reservations }) => {

    const category = await inventory.acquireGACategory(categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }

    const reservedQuantity = await inventory.getReservedGAQuantity(categoryId);
    const availableCapacity = category.capacity - reservedQuantity;

    if (availableCapacity < quantity) {
      throw new InsufficientInventoryError();
    }

    const reservation = await reservations.create(category.eventId);
    await reservations.reserveGA(reservation.id, categoryId, quantity);

    return reservation;
  });
};
