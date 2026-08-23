import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class DimensionsDto {
  @IsInt() @Min(0) @Max(11)
  widthFt!: number;

  @IsInt() @Min(0) @Max(11)
  widthIn!: number;

  @IsInt() @Min(0) @Max(11)
  heightFt!: number;

  @IsInt() @Min(0) @Max(11)
  heightIn!: number;
}

export class FinishingDto {
  @IsOptional() @IsBoolean()
  welding?: boolean;

  @IsOptional() @IsBoolean()
  grommets?: boolean;

  @IsOptional() @IsBoolean()
  windSlits?: boolean;

  @IsOptional() @IsBoolean()
  polePockets?: boolean;

  @IsOptional() @IsString()
  polePocketPlacement?: string;

  @IsOptional() @IsInt() @Min(1) @Max(4)
  polePocketDepthIn?: number;

  @IsOptional() @IsBoolean()
  rope?: boolean;

  @IsOptional() @IsString()
  ropePlacement?: string;

  @IsOptional() @IsString()
  grommetPreset?: string;

  @IsOptional() @IsString()
  grommetSpacing?: string;

  @IsOptional()
  grommetPoints?: Array<{ xIn: number; yIn: number }>;

  @IsOptional() @IsBoolean()
  webbing?: boolean;
}

export class QuoteRequestDto {
  @IsOptional() @IsString()
  productId?: string;

  @IsString()
  material!: string;

  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions!: DimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FinishingDto)
  finishing?: FinishingDto;

  @IsInt() @Min(1) @Max(10, { message: "Quantity must be between 1 and 10." })
  quantity!: number;
}
