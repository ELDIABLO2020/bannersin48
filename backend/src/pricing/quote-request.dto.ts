import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  MAX_GROMMET_POINTS,
  grommetPresetSchema,
  grommetSpacingSchema,
  polePocketPlacementSchema,
  ropePlacementSchema,
} from "@bannersin48/shared";

/** Product and material codes are admin-defined (CreateProductDto / CreateMaterialDto allow 60). */
const CODE_MAX_LENGTH = 60;
/** 11 ft 11 in: the largest dimension DimensionsDto can express. */
const MAX_EDGE_IN = 143;

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

export class GrommetPointDto {
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(MAX_EDGE_IN)
  xIn!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(MAX_EDGE_IN)
  yIn!: number;
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

  @IsOptional() @IsIn(polePocketPlacementSchema.options)
  polePocketPlacement?: string;

  @IsOptional() @IsInt() @Min(1) @Max(4)
  polePocketDepthIn?: number;

  @IsOptional() @IsBoolean()
  rope?: boolean;

  @IsOptional() @IsIn(ropePlacementSchema.options)
  ropePlacement?: string;

  @IsOptional() @IsIn(grommetPresetSchema.options)
  grommetPreset?: string;

  @IsOptional() @IsIn(grommetSpacingSchema.options)
  grommetSpacing?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GROMMET_POINTS)
  @ValidateNested({ each: true })
  @Type(() => GrommetPointDto)
  grommetPoints?: GrommetPointDto[];

  @IsOptional() @IsBoolean()
  webbing?: boolean;
}

export class QuoteRequestDto {
  @IsOptional() @IsString() @MaxLength(CODE_MAX_LENGTH)
  productId?: string;

  @IsString() @MaxLength(CODE_MAX_LENGTH)
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
