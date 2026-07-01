import { mkdir, writeFile, readFile, unlink, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";

export type StoredObject = {
  storagePath: string;
  sha256: string;
  sizeBytes: number;
};

export interface StorageDriver {
  put(key: string, body: Buffer, mime: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  signedUrl?(key: string, expiresSeconds: number): Promise<string>;
}

// -------- Local FS driver --------
class LocalDriver implements StorageDriver {
  constructor(private root: string) {}
  // Callers pass either a bare key ("hr/3e/<id>-name.pdf") or a stored
  // storagePath that already includes the root (absolute, or relative when
  // STORAGE_LOCAL_PATH is relative) — don't prepend the root twice.
  private resolve(key: string): string {
    if (key.startsWith("/")) return key;
    const normRoot = this.root.replace(/^\.\//, "");
    if (key.startsWith(normRoot + "/") || key.startsWith(this.root + "/")) return key;
    return join(this.root, key);
  }
  async put(key: string, body: Buffer): Promise<StoredObject> {
    const full = join(this.root, key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body);
    return {
      storagePath: full,
      sha256: createHash("sha256").update(body).digest("hex"),
      sizeBytes: body.length,
    };
  }
  async get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }
  async delete(key: string): Promise<void> {
    try { await unlink(this.resolve(key)); } catch { /* ignore */ }
  }
}

// -------- S3 driver --------
class S3Driver implements StorageDriver {
  private client: S3Client;
  constructor(private bucket: string, region: string) {
    this.client = new S3Client({ region });
  }
  async put(key: string, body: Buffer, mime: string): Promise<StoredObject> {
    const sha256 = createHash("sha256").update(body).digest("hex");
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: body, ContentType: mime,
      Metadata: { sha256 },
    }));
    return { storagePath: `s3://${this.bucket}/${key}`, sha256, sizeBytes: body.length };
  }
  async get(key: string): Promise<Buffer> {
    const resp = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const chunk of resp.Body as AsyncIterable<Buffer>) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  async signedUrl(key: string, expiresSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresSeconds });
  }
}

function build(): StorageDriver {
  if (env.STORAGE_DRIVER === "s3") {
    if (!env.AWS_S3_BUCKET) throw new Error("AWS_S3_BUCKET required when STORAGE_DRIVER=s3");
    return new S3Driver(env.AWS_S3_BUCKET, env.AWS_REGION);
  }
  return new LocalDriver(env.STORAGE_LOCAL_PATH);
}

export const storage: StorageDriver = build();

export function fileKey(scope: string, id: string, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${scope}/${id.slice(0, 2)}/${id}-${safe}`;
}
