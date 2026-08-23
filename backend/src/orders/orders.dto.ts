import { Type } from "class-transformer";
import { Equals } from "class-validator";
import {
  ArrayMinSize,
  IsBoolean,
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

  @IsOptional() @IsString()
  artworkId?: string;
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

  @IsIn(["US", "CA"])
  country!: string;

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

  @IsOptional() @ValidateNested() @Type(() => ShipToDto)
  shipTo?: ShipToDto;

  @IsOptional() @IsBoolean()
  shipToUnverified?: boolean;

  /** Payment is deferred (§0); kept for payload compatibility with the frontend. */
  @IsOptional() @IsString()
  paymentMethod?: string;

  @IsDefined({ message: "Acknowledgements are required." })
  @ValidateNested()
  @Type(() => AcknowledgementsDto)
  acknowledgements!: AcknowledgementsDto;
}
