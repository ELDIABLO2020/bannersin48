import { Type } from "class-transformer";
import { IsOptional, IsString, Length, MaxLength, ValidateIf, ValidateNested } from "class-validator";
import { QuoteRequestDto } from "../pricing/quote-request.dto";

/** Product and material codes are admin-defined (CreateProductDto allows 60). */
const CODE_MAX_LENGTH = 60;

/**
 * A saved design is a builder configuration snapshot: the same shape the quote
 * endpoint prices (`material`, `dimensions`, `finishing`, `quantity`), so a
 * saved design can be re-quoted at today's rates with no translation.
 * `config.productId` is ignored; the top-level product wins.
 */
export class CreateDesignDto {
  @IsString()
  @Length(1, 80, { message: "Give the design a name." })
  name!: string;

  @IsString()
  @MaxLength(CODE_MAX_LENGTH)
  productId!: string;

  @ValidateNested()
  @Type(() => QuoteRequestDto)
  config!: QuoteRequestDto;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  artworkFileId?: string;
}

/** Rename, replace the configuration, or attach/detach artwork (`null` detaches). */
export class UpdateDesignDto {
  @IsOptional()
  @IsString()
  @Length(1, 80, { message: "Give the design a name." })
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuoteRequestDto)
  config?: QuoteRequestDto;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(64)
  artworkFileId?: string | null;
}
