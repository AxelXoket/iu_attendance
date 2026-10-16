// Canonical JSON for digests, one text per value: object keys sorted by UTF-16 code units
// at every depth, arrays in their order, nulls kept as null, numbers only as safe integers,
// no whitespace. Anything that is not JSON (undefined, an array hole, a function, a Date or
// another non-plain object, a number that is not a safe integer) throws; `at` names the
// value in the error. topMember, when given, maps each member of the top-level object
// before it is written, in key order.
export function canonicalJson(
  value: unknown,
  at: string,
  topMember?: (key: string, member: unknown) => unknown,
): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`digest value ${at} must be a safe integer`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = Array.from(value, (item: unknown, index) =>
      canonicalJson(item, `${at}[${index}]`),
    );
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      const object = value as { readonly [key: string]: unknown };
      const members = Object.keys(object)
        .sort()
        .map((key) => {
          const member = topMember === undefined ? object[key] : topMember(key, object[key]);
          return `${JSON.stringify(key)}:${canonicalJson(member, `${at}.${key}`)}`;
        });
      return `{${members.join(',')}}`;
    }
  }
  throw new Error(`digest value ${at} is not JSON`);
}
