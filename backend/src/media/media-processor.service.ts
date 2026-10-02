import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export type ProcessedImage = { buffer: Buffer; mimeType: string };
export type ProcessedVideo = {
  buffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  poster?: Buffer;
};

const VIDEO_TIMEOUT_MS = 180_000;
const MAX_VIDEO_WIDTH = 1280;
const POSTER_WIDTH = 720;
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 82;

type FfmpegResult = { path: string } | null;

/**
 * Best-effort media optimization applied before the file is stored in R2.
 *
 * Videos (kept on R2, never moved elsewhere) are re-encoded with H.264 and the
 * `+faststart` flag so the browser can start playing before the whole file is
 * downloaded; a lossless remux fallback guarantees faststart even when a full
 * re-encode is not possible. Images are downscaled and recompressed in place.
 *
 * Every method is fail-safe: when the tool is missing or fails, it returns
 * `null` and the caller keeps the original bytes so an upload never breaks.
 */
@Injectable()
export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  async optimizeImage(buffer: Buffer, mimeType: string): Promise<ProcessedImage | null> {
    try {
      const loaded = (await import('sharp')) as any;
      const sharp = loaded.default ?? loaded;
      let pipeline = sharp(buffer, { failOn: 'none' }).rotate();
      const metadata = await pipeline.metadata();
      if (metadata.width && metadata.width > IMAGE_MAX_WIDTH) {
        pipeline = pipeline.resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true });
      }
      if (mimeType === 'image/png') pipeline = pipeline.png({ compressionLevel: 9, palette: true });
      else if (mimeType === 'image/webp') pipeline = pipeline.webp({ quality: IMAGE_QUALITY });
      else pipeline = pipeline.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true });
      const optimized = await pipeline.toBuffer();
      if (!optimized.length || optimized.length >= buffer.length) return null;
      return { buffer: optimized, mimeType };
    } catch (error) {
      this.logger.warn(`No se pudo optimizar la imagen: ${(error as Error).message}`);
      return null;
    }
  }

  async optimizeVideo(buffer: Buffer): Promise<ProcessedVideo | null> {
    let directory: string | undefined;
    try {
      directory = await mkdtemp(join(tmpdir(), 'cartia-video-'));
      const input = join(directory, 'input.mp4');
      const output = join(directory, 'output.mp4');
      await writeFile(input, buffer);

      const encoded = await this.runFfmpeg(
        [
          '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
          '-vf', `scale='min(${MAX_VIDEO_WIDTH},iw)':-2`,
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '96k',
          '-movflags', '+faststart',
          '-max_muxing_queue_size', '1024',
          output,
        ],
        output,
      );

      // Full re-encode failed: remux losslessly so at least faststart is guaranteed.
      const result: FfmpegResult = encoded ?? (await this.runFfmpeg(
        ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-c', 'copy', '-movflags', '+faststart', output],
        output,
      ));
      if (!result) return null;

      const optimized = await readFile(output);
      if (!optimized.length) return null;
      const probe = await this.probe(output);
      const poster = await this.capturePoster(output, join(directory, 'poster.jpg'));
      return { buffer: optimized, mimeType: 'video/mp4', ...probe, poster: poster ?? undefined };
    } catch (error) {
      this.logger.warn(`No se pudo optimizar el video: ${(error as Error).message}`);
      return null;
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Grabs a single JPEG frame to use as the dish cover when it has no photo.
   * Tries one second in (nicer composition) and falls back to the first frame
   * for very short clips. Returns null when ffmpeg cannot read a frame.
   */
  private async capturePoster(video: string, target: string): Promise<Buffer | null> {
    for (const seek of ['1', '0']) {
      const done = await this.runFfmpeg(
        [
          '-hide_banner', '-loglevel', 'error', '-y',
          '-ss', seek, '-i', video,
          '-frames:v', '1',
          '-vf', `scale='min(${POSTER_WIDTH},iw)':-2`,
          '-q:v', '3',
          target,
        ],
        target,
      );
      if (!done) continue;
      const poster = await readFile(target).catch(() => null);
      if (poster?.length) return poster;
    }
    return null;
  }

  private runFfmpeg(args: string[], expectedOutput: string): Promise<FfmpegResult> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: FfmpegResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      let child;
      try {
        child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
      } catch {
        resolve(null);
        return;
      }
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        this.logger.warn('La optimización de video excedió el tiempo máximo; se usa el archivo original.');
        finish(null);
      }, VIDEO_TIMEOUT_MS);
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-2_000);
      });
      child.on('error', () => finish(null));
      child.on('close', (code) => {
        if (code === 0) finish({ path: expectedOutput });
        else {
          if (stderr) this.logger.warn(`ffmpeg terminó con código ${code}: ${stderr.trim()}`);
          finish(null);
        }
      });
    });
  }

  private async probe(file: string): Promise<Pick<ProcessedVideo, 'width' | 'height' | 'durationSeconds'>> {
    try {
      const raw = await this.runCapture([
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height:format=duration',
        '-of', 'json',
        file,
      ]);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as { streams?: { width?: number; height?: number }[]; format?: { duration?: string } };
      const stream = parsed.streams?.[0] ?? {};
      const duration = Number(parsed.format?.duration);
      return {
        width: typeof stream.width === 'number' ? stream.width : undefined,
        height: typeof stream.height === 'number' ? stream.height : undefined,
        durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : undefined,
      };
    } catch {
      return {};
    }
  }

  private runCapture(args: string[]): Promise<string | null> {
    return new Promise((resolve) => {
      let child;
      try {
        child = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
      } catch {
        resolve(null);
        return;
      }
      let stdout = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.on('error', () => resolve(null));
      child.on('close', (code) => resolve(code === 0 ? stdout : null));
    });
  }
}
