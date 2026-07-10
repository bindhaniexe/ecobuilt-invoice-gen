export class LocalStorageCorruptionError extends Error {
  constructor(public readonly storageKey: string, cause?: unknown) {
    super(`Stored data at ${storageKey} could not be read.`);
    this.name = "LocalStorageCorruptionError";
    this.cause = cause;
  }
}
