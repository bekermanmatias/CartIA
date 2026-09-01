import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export type StoredObject = { key: string; url: string };

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const configuredEndpoint = (process.env.S3_ENDPOINT ?? '').replace(/\/$/, '');
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    this.bucket = process.env.S3_BUCKET ?? '';
    this.publicUrl = (process.env.S3_PUBLIC_URL ?? '').replace(/\/$/, '');

    const endpoint = configuredEndpoint.endsWith(`/${this.bucket}`)
      ? configuredEndpoint.slice(0, -(this.bucket.length + 1))
      : configuredEndpoint;
    if (process.env.MEDIA_STORAGE !== 's3' || !endpoint || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicUrl) {
      throw new Error('Falta configurar MEDIA_STORAGE=s3 y las variables S3_* para usar Cloudflare R2.');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(input: { key: string; body: Buffer; mimeType: string }): Promise<StoredObject> {
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return { key: input.key, url: `${this.publicUrl}/${input.key}` };
    } catch (error) {
      throw new InternalServerErrorException('No se pudo guardar el archivo en R2.', { cause: error });
    }
  }

  async remove(key?: string | null): Promise<void> {
    if (!key) return;
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      // A failed cleanup must not hide a successful replacement already saved in the database.
    }
  }
}
