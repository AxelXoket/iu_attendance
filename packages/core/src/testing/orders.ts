// Test helper, never shipped: every order of a short list, for properties that a result
// does not depend on the order of its input. The orders of n items are worked out once.

const ordersByLength = new Map<number, readonly (readonly number[])[]>();

/** Every order of n items, as lists of indexes: n! of them. */
export function ordersOf(n: number): readonly (readonly number[])[] {
  const known = ordersByLength.get(n);
  if (known !== undefined) return known;
  const all =
    n === 0
      ? [[]]
      : ordersOf(n - 1).flatMap((order) =>
          Array.from({ length: n }, (_, slot) => [
            ...order.slice(0, slot),
            n - 1,
            ...order.slice(slot),
          ]),
        );
  ordersByLength.set(n, all);
  return all;
}

/** Every order of the items themselves. */
export function permutations<T>(items: readonly T[]): T[][] {
  return ordersOf(items.length).map((order) => order.map((index) => items[index] as T));
}
