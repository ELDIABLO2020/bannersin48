import { Body, Controller, Post } from "@nestjs/common";
import { AddressService } from "./address.service";
import { ValidateAddressDto } from "./address.dto";

@Controller("address")
export class AddressController {
  constructor(private readonly addresses: AddressService) {}

  @Post("validate")
  validate(@Body() dto: ValidateAddressDto) {
    return this.addresses.validate(dto);
  }
}
