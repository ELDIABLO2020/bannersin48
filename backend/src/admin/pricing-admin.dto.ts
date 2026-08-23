import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateProductDto {
  @IsString() @MinLength(2) @MaxLength(60)
  code!: string;

  @IsString() @MinLength(2) @MaxLength(80)
  slug!: string;

  @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @IsOptional() @IsIn(["CUSTOM", "FIXED"])
  sizeMode?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(600)
  minWidthIn?: number;

  @IsOptional() @IsInt() @Min(0) @Max(600)
  minHeightIn?: number;

  @IsOptional() @IsInt() @Min(1) @Max(600)
  shortSideMaxIn?: number;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  maxBillableFt?: number;

  @IsOptional() @IsInt() @Min(1)
  productionHours?: number;

  @IsOptional() @IsInt()
  sort?: number;

  @IsOptional() @IsObject()
  displayConfig?: Record<string, unknown>;
}

export class CreateMaterialDto {
  @IsString() @MinLength(2) @MaxLength(60)
  code!: string;

  @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @IsNumber() @Min(0) @Max(10000)
  ratePerSqft!: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100000)
  flatPriceUsd?: number;

  @IsOptional() @IsNumber() @Min(0.1) @Max(10)
  doubleSideMultiplier?: number;
}

export class UpdateMaterialDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(10000)
  ratePerSqft?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100000)
  flatPriceUsd?: number;

  @IsOptional() @IsNumber() @Min(0.1) @Max(10)
  doubleSideMultiplier?: number;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpsertFinishingOptionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  products?: string[];

  /** FREE | PER_SQFT | PER_FT | PER_EDGE | FLAT */
  @IsOptional() @IsString()
  priceModel?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(100000)
  amount?: number;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class CreateFinishingOptionDto {
  @IsString() @MinLength(2) @MaxLength(60)
  code!: string;

  @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  products?: string[];

  @IsIn(["FREE", "PER_SQFT", "PER_FT", "PER_EDGE", "FLAT"])
  priceModel!: string;

  @IsNumber() @Min(0) @Max(100000)
  amount!: number;
}

export class UpsertVolumeTierDto {
  @IsOptional() @IsString()
  productId?: string | null;

  @IsOptional() @IsString()
  materialCode?: string | null;

  @IsNumber() @Min(0) @Max(100000)
  minBillableSqft!: number;

  /** { materialCode: discountedRatePerSqft } */
  @IsObject()
  rates!: Record<string, number>;

  @IsOptional() @IsString() @MaxLength(500)
  warningCopy?: string;
}
