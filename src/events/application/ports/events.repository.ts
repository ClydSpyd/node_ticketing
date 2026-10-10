import type { Event } from "../../events.types.js";

export interface EventRepository {
  findById(id: number): Promise<Event | null>;
}
