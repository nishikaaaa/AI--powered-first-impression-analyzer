import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { ObjectStorage } from "./storage.port.js";

export class S3ObjectStorage implements ObjectStorage {
  private client: S3Client;

  constructor(
    private readonly bucket: string,
    region: string,
  ) {
    this.client = new S3Client({ region });
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

  async getObject(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty S3 object");
    return Buffer.from(bytes);
  }
}
