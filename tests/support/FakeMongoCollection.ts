import type {
  MongoCollectionLike,
  MongoFilter,
  MongoUpdate,
  TempModerationMongoDocument,
} from "../../src/Services/temp-moderation/adapters/MongoTempModerationRepository.js";

export interface RecordedMongoOperation {
  filter: MongoFilter;
  update: MongoUpdate;
}

function cloneValue<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]),
    ) as T;
  }
  return value;
}

function isOperatorObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    Object.keys(value).some((key) => key.startsWith("$"))
  );
}

function equalValues(actual: unknown, expected: unknown): boolean {
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  return actual === expected;
}

function compareValues(actual: unknown, expected: unknown): number | null {
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() - expected.getTime();
  }
  if (typeof actual === "number" && typeof expected === "number") {
    return actual - expected;
  }
  return null;
}

function matchesCondition(
  actual: unknown,
  exists: boolean,
  condition: unknown,
): boolean {
  if (!isOperatorObject(condition)) {
    if (condition === null && !exists) return true;
    return exists && equalValues(actual, condition);
  }

  for (const [operator, operand] of Object.entries(condition)) {
    if (operator === "$exists") {
      if (exists !== Boolean(operand)) return false;
      continue;
    }
    if (operator === "$eq") {
      if (
        operand === null
          ? exists && actual !== null
          : !equalValues(actual, operand)
      ) {
        return false;
      }
      continue;
    }
    if (operator === "$lte" || operator === "$lt") {
      if (!exists || actual === null) return false;
      const comparison = compareValues(actual, operand);
      if (comparison === null) return false;
      if (operator === "$lte" ? comparison > 0 : comparison >= 0) return false;
      continue;
    }
    throw new Error(`Unsupported fake Mongo operator: ${operator}`);
  }

  return true;
}

function matchesFilter(
  document: TempModerationMongoDocument,
  filter: MongoFilter,
): boolean {
  for (const [field, condition] of Object.entries(filter)) {
    if (field === "$and") {
      if (
        !Array.isArray(condition) ||
        !condition.every((entry) =>
          matchesFilter(document, entry as MongoFilter),
        )
      ) {
        return false;
      }
      continue;
    }
    if (field === "$or") {
      if (
        !Array.isArray(condition) ||
        !condition.some((entry) =>
          matchesFilter(document, entry as MongoFilter),
        )
      ) {
        return false;
      }
      continue;
    }

    const exists = Object.prototype.hasOwnProperty.call(document, field);
    const actual = (document as unknown as Record<string, unknown>)[field];
    if (!matchesCondition(actual, exists, condition)) return false;
  }

  return true;
}

function applyUpdate<TDocument extends TempModerationMongoDocument>(
  document: TDocument,
  update: MongoUpdate,
): TDocument {
  const next = cloneValue(document) as TDocument;
  const target = next as unknown as Record<string, unknown>;

  for (const [field, value] of Object.entries(update.$set ?? {})) {
    target[field] = cloneValue(value);
  }
  for (const [field, value] of Object.entries(update.$inc ?? {})) {
    target[field] = Number(target[field] ?? 0) + value;
  }
  for (const field of Object.keys(update.$unset ?? {})) {
    delete target[field];
  }

  return next;
}

/**
 * Supports only operators emitted by MongoTempModerationRepository. It verifies
 * query construction in-process; it is not a substitute for Mongo server tests.
 */
export class FakeMongoCollection<
  TDocument extends TempModerationMongoDocument,
> implements MongoCollectionLike<TDocument> {
  readonly findOneAndUpdateCalls: RecordedMongoOperation[] = [];
  readonly updateOneCalls: RecordedMongoOperation[] = [];
  private readonly documents = new Map<string, TDocument>();

  constructor(documents: TDocument[] = []) {
    for (const document of documents) {
      this.documents.set(String(document._id), cloneValue(document));
    }
  }

  async findOneAndUpdate(
    filter: MongoFilter,
    update: MongoUpdate,
    _options: { returnDocument: "after"; includeResultMetadata: false },
  ): Promise<TDocument | null> {
    this.findOneAndUpdateCalls.push({
      filter: cloneValue(filter),
      update: cloneValue(update),
    });
    const document = [...this.documents.values()].find((candidate) =>
      matchesFilter(candidate, filter),
    );
    if (!document) return null;

    const updated = applyUpdate(document, update);
    this.documents.set(String(updated._id), updated);
    return cloneValue(updated);
  }

  async updateOne(
    filter: MongoFilter,
    update: MongoUpdate,
  ): Promise<{ matchedCount: number }> {
    this.updateOneCalls.push({
      filter: cloneValue(filter),
      update: cloneValue(update),
    });
    const document = [...this.documents.values()].find((candidate) =>
      matchesFilter(candidate, filter),
    );
    if (!document) return { matchedCount: 0 };

    const updated = applyUpdate(document, update);
    this.documents.set(String(updated._id), updated);
    return { matchedCount: 1 };
  }

  inspect(id: string): TDocument | null {
    const document = this.documents.get(id);
    return document ? cloneValue(document) : null;
  }
}
