import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { RateLimit } from "../common/throttling";
import { CurrentUser } from "../common/current-user.decorator";
import { OptionalJwtAuthGuard } from "../common/optional-jwt-auth.guard";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { PricingService } from "./pricing.service";
import { QuoteRequestDto } from "./quote-request.dto";

@Controller("pricing")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  /** Anonymous callers get an unowned quote; signed-in callers' quotes carry their user id. */
  @Post("quote")
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @RateLimit("quote")
  quote(@Body() dto: QuoteRequestDto, @CurrentUser() user?: AuthedUser) {
    return this.pricing.quote(dto, user?.id);
  }
}
