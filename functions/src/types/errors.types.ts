export class DatabaseError extends Error {
  constructor(message: string, public readonly operation: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TaskCreationError extends Error {
  constructor(message: string, public readonly taskDetails?: unknown) {
    super(message);
    this.name = "TaskCreationError";
  }
}

export class PriceDataError extends Error {
  constructor(message: string, public readonly source?: string) {
    super(message);
    this.name = "PriceDataError";
  }
}
