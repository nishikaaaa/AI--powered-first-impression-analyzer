import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ObjectStorage } from "./storage.port.js";

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly baseDir: string) {}

  private full(key: string): string {
    return path.join(this.baseDir, key);
  }

  async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    const file = this.full(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async getObject(key: string): Promise<Buffer> {
    return readFile(this.full(key));
  }
}
