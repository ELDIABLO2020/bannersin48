import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { DeliveryService } from "./delivery.service";

@Controller("delivery")
@Public()
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get("next-cutoff")
  nextCutoff() {
    return this.delivery.estimate();
  }
}
