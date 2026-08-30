import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

/** Skip validation when the field is absent or an empty string (the frontend schema sends ""). */
const NotEmpty = (o: object, v: unknown) => v !== undefined && v !== null && v !== "";

export class ValidateAddressDto {
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

  @IsString() @Matches(/^[A-Za-z]{2}$/)
  region!: string;

  @IsString() @Matches(/^\d{5}(?:-\d{4})?$/)
  postalCode!: string;

  @IsIn(["US"])
  country!: "US";

  @ValidateIf(NotEmpty) @IsString() @MaxLength(32)
  phone?: string;

  @ValidateIf(NotEmpty) @IsEmail()
  email?: string;
}
