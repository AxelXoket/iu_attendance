// A secret setting (D15): the database and SMTP passwords, the review fixed code, the
// heartbeat addresses. If it slips into JSON, a log line or an error message it writes
// [gizli]; only reveal() gives the value, which a private field keeps out of every
// listing of the object.

export const SECRET_PLACEHOLDER = '[gizli]';

export class SecretValue {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /** The value itself, for the one place that uses it. */
  reveal(): string {
    return this.#value;
  }

  toJSON(): typeof SECRET_PLACEHOLDER {
    return SECRET_PLACEHOLDER;
  }

  toString(): typeof SECRET_PLACEHOLDER {
    return SECRET_PLACEHOLDER;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): typeof SECRET_PLACEHOLDER {
    return SECRET_PLACEHOLDER;
  }
}
