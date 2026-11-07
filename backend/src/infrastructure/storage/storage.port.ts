export interface ObjectStorage {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
}
