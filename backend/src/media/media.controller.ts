import { Body, Controller, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { requireCsrf, requireUserId } from '../common/security';
import { MediaService } from './media.service';

const imageUpload = FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const logoUpload = FileInterceptor('logo', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const videoUpload = FileInterceptor('video', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

@Controller('api/v1')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('images/upload')
  @UseInterceptors(imageUpload)
  image(@Req() request: Request, @UploadedFile() file: Express.Multer.File | undefined, @Body() body: { dishId?: string }) {
    requireCsrf(request);
    return this.media.uploadImage(requireUserId(request), request.session.activeLocationId, body.dishId ?? '', file!);
  }

  @Post('videos/upload')
  @UseInterceptors(videoUpload)
  video(@Req() request: Request, @UploadedFile() file: Express.Multer.File | undefined, @Body() body: { dishId?: string; duration?: string; width?: string; height?: string }) {
    requireCsrf(request);
    return this.media.uploadVideo(requireUserId(request), request.session.activeLocationId, body.dishId ?? '', file!, body);
  }

  @Post('media/remove')
  remove(@Req() request: Request, @Body() body: { dishId?: string; kind?: 'IMAGE' | 'VIDEO' }) {
    requireCsrf(request);
    return this.media.removeDishMedia(requireUserId(request), request.session.activeLocationId, body.dishId ?? '', body.kind);
  }

  @Post('logo/upload')
  @UseInterceptors(logoUpload)
  logo(@Req() request: Request, @UploadedFile() file: Express.Multer.File | undefined) {
    requireCsrf(request);
    return this.media.uploadLogo(requireUserId(request), request.session.activeLocationId, file!);
  }
}
