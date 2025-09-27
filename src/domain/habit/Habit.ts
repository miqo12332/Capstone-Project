import type { ID } from "../../shared/types";

export interface Habit {
  id: ID;
  name: string;
  microStep: string;
  createdAt: Date;
}