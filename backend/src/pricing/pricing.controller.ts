import { Controller, Post, Body } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { QuoteRequestDto } from "./quote-request.dto";

@Controller("pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post("quote")
  quote(@Body() dto: QuoteRequestDto) {
    return this.pricing.quote(dto);
  }
}
