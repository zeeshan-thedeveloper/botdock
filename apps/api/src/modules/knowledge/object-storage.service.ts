import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>('MINIO_BUCKET');
    this.client = new S3Client({
      endpoint: configService.getOrThrow<string>('MINIO_ENDPOINT'),
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }
}
