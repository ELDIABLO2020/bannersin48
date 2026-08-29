import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { AddressService } from "./address.service";
import { ValidateAddressDto } from "./address.dto";

@Controller("address")
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addresses: AddressService) {}

  @Post("validate")
  validate(@Body() dto: ValidateAddressDto) {
    return this.addresses.validate(dto);
  }
}
