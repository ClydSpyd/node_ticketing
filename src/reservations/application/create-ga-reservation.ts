import { Reservation } from "../reservations.types.js";
import { db } from "../../db.js";
import { PostgresReservationRepository } from "../infrastructure/postgress/postgres-reservation.repository.js";
import { PostgresInventoryRepository } from "../infrastructure/postgress/postrgres-inventory.repository.js";

type CreateGAReservationInput = {
  categoryId: number;
  quantity: number;
};

type CreateGAReservationError = "CATEGORY_NOT_FOUND" | "INSUFFICIENT_INVENTORY";

type CreateGAReservationResult =
  | { success: true; reservation: Reservation }
  | { success: false; error: CreateGAReservationError };

export const createGAReservation = async (
  input: CreateGAReservationInput,
): Promise<CreateGAReservationResult> => {
  const { categoryId, quantity } = input;
  const client = await db.connect();
  const inventoryRepository = new PostgresInventoryRepository(client);
  const reservationRepository = new PostgresReservationRepository(client);

  try {
    await client.query("BEGIN");

    const category = await inventoryRepository.acquireGACategory(categoryId);

    if (!category) {
      await client.query("ROLLBACK");
      return { success: false, error: "CATEGORY_NOT_FOUND" };
    }

    const reservedQuantity =
      await inventoryRepository.getReservedGAQuantity(categoryId);

    const availableCapacity = category.capacity - reservedQuantity;

    if (availableCapacity < quantity) {
      await client.query("ROLLBACK");
      return { success: false, error: "INSUFFICIENT_INVENTORY" };
    }

    const reservation = await reservationRepository.create(category.eventId);

    await reservationRepository.reserveGA(reservation.id, categoryId, quantity);

    await client.query("COMMIT");
    return { success: true, reservation };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
