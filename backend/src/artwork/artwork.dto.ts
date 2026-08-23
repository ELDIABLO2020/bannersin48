import { IsString, MaxLength, MinLength } from "class-validator";

export class FolderNameDto {
  @IsString() @MinLength(1) @MaxLength(80)
  name!: string;
}
