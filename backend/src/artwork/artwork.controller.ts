import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { ArtworkService } from "./artwork.service";
import { FolderNameDto } from "./artwork.dto";

/**
 * Artwork upload + library. Upload accepts multipart/form-data with a `file`
 * field; the server sniffs magic bytes and ignores the declared Content-Type.
 */
@Controller("artwork")
@UseGuards(JwtAuthGuard)
export class ArtworkController {
  constructor(private readonly artwork: ArtworkService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: AuthedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
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
   * Guarded download (owner or staff). Also usable as an <img src> target via
   * `?access_token=<access JWT>` since image tags cannot send headers.
   */
  @Get(":id/download")
  async download(
    @CurrentUser() user: AuthedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, mime, filename } = await this.artwork.download(user.id, user.role, id);
    const inlineTypes = ["image/jpeg", "image/png", "application/pdf"];
    const disposition = inlineTypes.includes(mime) ? "inline" : "attachment";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return new StreamableFile(file);
  }
}
