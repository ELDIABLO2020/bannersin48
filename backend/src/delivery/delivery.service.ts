import { Injectable } from "@nestjs/common";
import { computeNextCutoff, type DeliveryResponse } from "@bannersin48/shared";

export type DeliveryEstimate = DeliveryResponse;

/** Next 9:00 PM ET order cutoff and guaranteed delivery date (shared cutoff cycles). */
@Injectable()
export class DeliveryService {
  estimate(now: Date = new Date()): DeliveryEstimate {
    return computeNextCutoff(now);
  }
}
