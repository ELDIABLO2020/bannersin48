import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { DOWNLOAD_PURPOSES, type DownloadPurpose } from "./download-url.service";

export class FolderNameDto {
  @IsString() @MinLength(1) @MaxLength(80)
  name!: string;
}

export class DownloadUrlRequestDto {
  /** `preview` lets raster images render inline (<img>); default `download` is always an attachment. */
  @IsOptional() @IsIn(DOWNLOAD_PURPOSES)
  purpose?: DownloadPurpose;
}
