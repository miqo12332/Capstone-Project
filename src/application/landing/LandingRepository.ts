import type { LandingInfo } from "../../shared/types";

export interface LandingRepository {
  getInfo(): Promise<LandingInfo>;
}