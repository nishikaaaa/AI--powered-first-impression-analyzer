import type { Db } from "mongodb";
import type { PersonaDefinition } from "../../../domain/persona/persona-definition.js";

export class PersonaRepository {
  constructor(private readonly db: Db) {}

  private col() {
    return this.db.collection<PersonaDefinition>("personas");
  }

  async listEnabled(contentType: string): Promise<PersonaDefinition[]> {
    return this.col()
      .find({ enabled: true, contentTypes: contentType })
      .sort({ sortOrder: 1 })
      .toArray();
  }

  async getById(id: string): Promise<PersonaDefinition | null> {
    return this.col().findOne({ id });
  }

  async upsert(def: PersonaDefinition): Promise<void> {
    await this.col().updateOne({ id: def.id }, { $set: def }, { upsert: true });
  }
}
