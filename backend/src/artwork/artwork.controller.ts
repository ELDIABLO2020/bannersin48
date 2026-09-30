import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import type { Response } from "express";
import { ARTWORK_MAX_BYTES_DEFAULT } from "@bannersin48/shared";
import { CurrentUser } from "../common/current-user.decorator";
import { Public } from "../common/public.decorator";
import { RateLimit } from "../common/throttling";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { singleFileUpload } from "../storage/upload-slots";
import type { UploadedTempFile } from "../storage/upload-storage";
import { ArtworkService } from "./artwork.service";
import { DownloadUrlRequestDto, FolderNameDto } from "./artwork.dto";
import { DownloadUrlService, type DownloadUrlQuery } from "./download-url.service";

/**
 * Artwork upload + library. Upload accepts multipart/form-data with a `file`
 * field; it is streamed to disk, and the server sniffs magic bytes and ignores
 * the declared Content-Type.
 */
@Controller("artwork")
export class ArtworkController {
  constructor(
    private readonly artwork: ArtworkService,
    private readonly urls: DownloadUrlService,
  ) {}

  @Post("upload")
  @RateLimit("upload")
  @UseInterceptors(...singleFileUpload("file", ARTWORK_MAX_BYTES_DEFAULT))
  async upload(
    @CurrentUser() user: AuthedUser,
    @UploadedFile() file: UploadedTempFile | undefined,
    @Query("folderId") folderId?: string,
  ) {
    if (!file) {
      throw new BadRequestException({ code: "NO_FILE", message: "No file provided." });
    }
    return this.artwork.upload(user.id, file, folderId || undefined);
  }

  @Get("folders")
  listFolders(@CurrentUser() user: AuthedUser) {
    return this.artwork.listFolders(user.id);
  }

  @Post("folders")
  createFolder(@CurrentUser() user: AuthedUser, @Body() body: FolderNameDto) {
    return this.artwork.createFolder(user.id, body.name);
  }

  @Patch("folders/:id")
  renameFolder(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() body: FolderNameDto) {
    return this.artwork.renameFolder(user.id, id, body.name);
  }

  @Delete("folders/:id")
  deleteFolder(@CurrentUser() user: AuthedUser, @Param("id") id: string) {
    return this.artwork.deleteFolder(user.id, id);
  }

  @Get("library")
  library(@CurrentUser() user: AuthedUser, @Query("folderId") folderId?: string) {
    return this.artwork.library(user.id, folderId || undefined);
  }

  /**
   * Mints a 5-minute signed URL for an artwork file or shipment label. Access
   * rules (owner, STAFF/ADMIN, or the customer of the label's order) apply here.
   */
  @Post(":id/download-url")
  downloadUrl(@CurrentUser() user: AuthedUser, @Param("id") id: string, @Body() body: DownloadUrlRequestDto) {
    return this.artwork.createDownloadUrl(user, id, body.purpose ?? "download");
  }

  /**
   * The signed link itself. No bearer token: the HMAC signature is the
   * authorisation. Served so a browser never renders it as a document.
   */
  @Get(":id/file")
  @Public()
  @RateLimit("download")
  async file(
    @Param("id") id: string,
    @Query() query: DownloadUrlQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const purpose = this.urls.verify(id, query);
    const { stream, size, mime, filename, inline } = await this.artwork.openSigned(id, purpose);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Cache-Control", "private, max-age=300");
    return new StreamableFile(stream, {
      type: mime,
      length: size,
      disposition: contentDisposition(inline ? "inline" : "attachment", filename),
    });
  }
}

/** RFC 6266: ASCII fallback plus the exact UTF-8 name. */
export function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\%;]/g, "_").slice(0, 150) || "file";
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
