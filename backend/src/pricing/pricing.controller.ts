import { Controller, Post, Body } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { RateLimit } from "../common/throttling";
import { PricingService } from "./pricing.service";
import { QuoteRequestDto } from "./quote-request.dto";

@Controller("pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post("quote")
  @Public()
  @RateLimit("quote")
  quote(@Body() dto: QuoteRequestDto) {
    return this.pricing.quote(dto);
  }
}
