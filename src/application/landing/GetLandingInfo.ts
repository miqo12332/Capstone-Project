import type { LandingRepository } from "./LandingRepository";
import type { LandingInfo } from "../../shared/types";

export class GetLandingInfo {
  private repo: LandingRepository;

  constructor(repo: LandingRepository) {
    this.repo = repo;
  }

  async execute(): Promise<LandingInfo> {
    return this.repo.getInfo();
  }
}