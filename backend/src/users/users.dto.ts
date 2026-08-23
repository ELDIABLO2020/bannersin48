import { IsBoolean, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class AddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsString()
  @Length(3, 200, { message: "Street address is required." })
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @Length(2, 80, { message: "City is required." })
  city!: string;

  @IsString()
  @Length(2, 2, { message: "Use the two-letter state code." })
  state!: string;

  @IsString()
  @Length(5, 10, { message: "Enter a valid ZIP code." })
  zip!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;
}

