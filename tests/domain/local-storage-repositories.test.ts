import { describe, expect, it } from "vitest";

import { LocalStorageCorruptionError } from "@/domain/storage/errors";
import { createLocalStorageCustomerRepository } from "@/domain/storage/local-storage-repositories";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("local storage repositories", () => {
  it("creates, updates, searches, and deletes customers", async () => {
    const repo = createLocalStorageCustomerRepository(new MemoryStorage());

    const created = await repo.create({
      name: "Acme Textiles",
      address: "Pune",
      gstNumber: "27ABCDE1234F1Z5",
      phone: "9999999999",
      email: "billing@acme.test",
    });

    await repo.update(created.id, { phone: "8888888888" });

    expect(await repo.search("acme")).toHaveLength(1);
    expect((await repo.getById(created.id))?.phone).toBe("8888888888");

    await repo.delete(created.id);

    expect(await repo.list()).toHaveLength(0);
  });

  it("throws a recoverable error for corrupt stored records", async () => {
    const storage = new MemoryStorage();
    storage.setItem("invoice-gen:v1:customers", "{not-json");
    const repo = createLocalStorageCustomerRepository(storage);

    await expect(repo.list()).rejects.toBeInstanceOf(LocalStorageCorruptionError);

    await repo.reset();

    expect(await repo.list()).toEqual([]);
  });
});
