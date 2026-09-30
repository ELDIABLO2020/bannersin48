import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../common/public.decorator";

@Controller("health")
@Public()
@SkipThrottle()
export class HealthController {
  @Get()
  check(): { status: string; service: string; timestamp: string } {
    return { status: "ok", service: "bannersin48-api", timestamp: new Date().toISOString() };
  }
}
