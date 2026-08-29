import { Controller, Get } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get("next-cutoff")
  nextCutoff() {
    return this.delivery.estimate();
  }
}
