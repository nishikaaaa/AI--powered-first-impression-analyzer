import { ObjectId, type Db } from "mongodb";
import type { ContentType } from "../../../domain/content/content-type.js";
import type { Content, ContentVersion } from "../../../domain/resume/content.js";
import type { StructuredInstagramPost } from "../../../domain/instagram/structured-instagram-post.js";
import type { StructuredLinkedInProfile } from "../../../domain/linkedin/structured-linkedin-profile.js";
import type { StructuredResume } from "../../../domain/resume/structured-resume.js";

type ContentDoc = {
  _id: ObjectId;
  userId: string;
  contentType?: ContentType;
  createdAt: Date;
  updatedAt: Date;
};

type ContentVersionDoc = {
  _id: ObjectId;
  contentId: ObjectId;
  kind: "normalized" | "structured";
  parentContentVersionId?: ObjectId;
  schemaVersion?: string;
  structureSpecId?: string;
  structureSpecVersion?: number;
  normalizedText?: string;
  structuredResume?: StructuredResume;
  structuredLinkedInProfile?: StructuredLinkedInProfile;
  structuredInstagramPost?: StructuredInstagramPost;
  sourceFile?: ContentVersion["sourceFile"];
  sourceFiles?: ContentVersion["sourceFiles"];
  sourcePaste?: ContentVersion["sourcePaste"];
  createdAt: Date;
};

export class ContentRepository {
  constructor(private readonly db: Db) {}

  private contents() {
    return this.db.collection<ContentDoc>("contents");
  }

  private versions() {
    return this.db.collection<ContentVersionDoc>("content_versions");
  }

  async createContent(
    userId: string,
    contentType: ContentType = "resume",
  ): Promise<Content> {
    const now = new Date();
    const res = await this.contents().insertOne({
      userId,
      contentType,
      createdAt: now,
      updatedAt: now,
    } as ContentDoc);
    return {
      id: res.insertedId.toHexString(),
      userId,
      contentType,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getContent(id: string): Promise<Content | null> {
    const doc = await this.contents().findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      contentType: doc.contentType ?? "resume",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async insertVersion(
    input: Omit<ContentVersion, "id" | "createdAt">,
  ): Promise<ContentVersion> {
    const now = new Date();
    const doc: ContentVersionDoc = {
      _id: new ObjectId(),
      contentId: new ObjectId(input.contentId),
      kind: input.kind,
      parentContentVersionId: input.parentContentVersionId
        ? new ObjectId(input.parentContentVersionId)
        : undefined,
      schemaVersion: input.schemaVersion,
      structureSpecId: input.structureSpecId,
      structureSpecVersion: input.structureSpecVersion,
      normalizedText: input.normalizedText,
      structuredResume: input.structuredResume,
      structuredLinkedInProfile: input.structuredLinkedInProfile,
      structuredInstagramPost: input.structuredInstagramPost,
      sourceFile: input.sourceFile,
      sourceFiles: input.sourceFiles,
      sourcePaste: input.sourcePaste,
      createdAt: now,
    };
    await this.versions().insertOne(doc);
    return {
      ...input,
      id: doc._id.toHexString(),
      createdAt: now,
    };
  }

  async getVersion(id: string, userId: string): Promise<ContentVersion | null> {
    const doc = await this.versions().findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    const content = await this.contents().findOne({ _id: doc.contentId });
    if (!content || content.userId !== userId) return null;
    return this.toVersion(doc);
  }

  async getVersionById(id: string): Promise<ContentVersion | null> {
    const doc = await this.versions().findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.toVersion(doc);
  }

  /** #7 — reuse normalized version for the same file checksum on retry. */
  async findNormalizedByChecksum(
    contentId: string,
    checksumSha256: string,
  ): Promise<ContentVersion | null> {
    const doc = await this.versions().findOne({
      contentId: new ObjectId(contentId),
      kind: "normalized",
      "sourceFile.checksumSha256": checksumSha256,
    });
    if (!doc) return null;
    return this.toVersion(doc);
  }

  /** Reuse normalized paste for the same checksum on retry. */
  async findNormalizedByPasteChecksum(
    contentId: string,
    checksumSha256: string,
  ): Promise<ContentVersion | null> {
    const doc = await this.versions().findOne({
      contentId: new ObjectId(contentId),
      kind: "normalized",
      "sourcePaste.checksumSha256": checksumSha256,
    });
    if (!doc) return null;
    return this.toVersion(doc);
  }

  /** #7 — reuse structured version for the same normalized parent on retry. */
  async findStructuredByParent(
    contentId: string,
    parentContentVersionId: string,
  ): Promise<ContentVersion | null> {
    const doc = await this.versions().findOne({
      contentId: new ObjectId(contentId),
      kind: "structured",
      parentContentVersionId: new ObjectId(parentContentVersionId),
    });
    if (!doc) return null;
    return this.toVersion(doc);
  }

  private toVersion(doc: ContentVersionDoc): ContentVersion {
    return {
      id: doc._id.toHexString(),
      contentId: doc.contentId.toHexString(),
      kind: doc.kind,
      parentContentVersionId: doc.parentContentVersionId?.toHexString(),
      schemaVersion: doc.schemaVersion,
      structureSpecId: doc.structureSpecId,
      structureSpecVersion: doc.structureSpecVersion,
      normalizedText: doc.normalizedText,
      structuredResume: doc.structuredResume,
      structuredLinkedInProfile: doc.structuredLinkedInProfile,
      structuredInstagramPost: doc.structuredInstagramPost,
      sourceFile: doc.sourceFile,
      sourceFiles: doc.sourceFiles,
      sourcePaste: doc.sourcePaste,
      createdAt: doc.createdAt,
    };
  }
}
