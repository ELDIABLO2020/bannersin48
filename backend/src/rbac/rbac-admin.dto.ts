import { ArrayMaxSize, IsArray, IsIn, IsISO8601, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";
import { PERMISSION_KEYS, type PermissionKey } from "./permissions";

/** Role keys are stable slugs: lowercase, start with a letter, 2–40 chars. */
const ROLE_KEY = /^[a-z][a-z0-9_]{1,39}$/;

export class CreateRoleDto {
  @IsString() @Matches(ROLE_KEY, { message: "Key must be a lowercase slug (letters, digits, underscores), 2–40 characters." })
  key!: string;

  @IsString() @Length(2, 60)
  name!: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string | null;

  /** Custom roles are never ADMIN or CUSTOMER kind (plan §5.2). */
  @IsIn(["STAFF", "CONTENT_EDITOR"])
  legacyRole!: "STAFF" | "CONTENT_EDITOR";

  /** Catalog integrity (plan §3.6 rule 8): unknown keys are rejected here, never stored. */
  @IsArray() @ArrayMaxSize(100) @IsIn(PERMISSION_KEYS, { each: true })
  permissions!: PermissionKey[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() @Length(2, 60)
  name?: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string | null;
}

export class SetRolePermissionsDto {
  @IsArray() @ArrayMaxSize(100) @IsIn(PERMISSION_KEYS, { each: true })
  permissions!: PermissionKey[];
}

export class SetUserOverrideDto {
  @IsIn(["ALLOW", "DENY"])
  effect!: "ALLOW" | "DENY";

  @IsOptional() @IsString() @MaxLength(200)
  reason?: string | null;

  /** ISO-8601 instant; omitted or null = never expires. */
  @IsOptional() @IsISO8601({ strict: true })
  expiresAt?: string | null;
}
