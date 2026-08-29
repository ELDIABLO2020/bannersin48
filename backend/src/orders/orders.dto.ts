import { Type } from "class-transformer";
import { Equals } from "class-validator";
import {
  ArrayMinSize,
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { DimensionsDto, FinishingDto } from "../pricing/quote-request.dto";

export class OrderLineDto {
  @IsOptional() @IsString()
  productId?: string;

  @IsString()
  material!: string;

  @ValidateNested() @Type(() => DimensionsDto)
  dimensions!: DimensionsDto;

  @IsOptional() @ValidateNested() @Type(() => FinishingDto)
  finishing?: FinishingDto;

  @IsInt() @Min(1) @Max(10, { message: "Quantity must be between 1 and 10." })
  quantity!: number;

  @IsString() @MinLength(1)
  artworkId!: string;

  @IsString() @MinLength(1)
  quoteId!: string;
}

/** Liability checkbox — every acknowledgement must be true; writes proof_* columns. */
export class AcknowledgementsDto {
  @Equals(true, { message: "All acknowledgements must be confirmed." })
  artworkCorrect!: boolean;

  @Equals(true, { message: "All acknowledgements must be confirmed." })
  spellingColorsLayoutAccepted!: boolean;

  @Equals(true, { message: "All acknowledgements must be confirmed." })
  printsAsUploaded!: boolean;

  @Equals(true, { message: "All acknowledgements must be confirmed." })
  cancellationWindowUnderstood!: boolean;

  @Equals(true, { message: "All acknowledgements must be confirmed." })
  deliveryDateAndAddressConfirmed!: boolean;
}

/** Mirrors the shared addressSchema the checkout form posts. */
export class ShipToDto {
  @IsString() @MinLength(2) @MaxLength(120)
  fullName!: string;

  @IsOptional() @IsString() @MaxLength(120)
  company?: string;

  @IsString() @MinLength(2) @MaxLength(160)
  street1!: string;

  @IsOptional() @IsString() @MaxLength(160)
  street2?: string;

  @IsString() @MinLength(2) @MaxLength(80)
  city!: string;

  @IsString() @MinLength(2) @MaxLength(80)
  region!: string;

  @IsString() @MinLength(3) @MaxLength(12)
  postalCode!: string;

  @IsIn(["US"])
  country!: "US";

  @IsOptional() @IsString() @MaxLength(32)
  phone?: string;

  @IsOptional() @IsEmail()
  email?: string;
}

export class CreateOrderDto {
  @IsEmail()
  email!: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines!: OrderLineDto[];

  @IsDefined() @ValidateNested() @Type(() => ShipToDto)
  shipTo!: ShipToDto;

  @IsString() @MinLength(1)
  addressValidationToken!: string;

  @Equals(true, { message: "Unverified-address risk acknowledgement is required." })
  addressRiskAcknowledged!: boolean;

  @IsDefined({ message: "Acknowledgements are required." })
  @ValidateNested()
  @Type(() => AcknowledgementsDto)
  acknowledgements!: AcknowledgementsDto;
}
