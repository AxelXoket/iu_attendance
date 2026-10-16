// A list that holds one item at least, as z.enum and the code lists want it. An empty list
// throws, so the type never hides a list that lost its last item.
export function nonEmpty<T>(items: readonly T[]): [T, ...T[]] {
  const [first, ...rest] = items;
  if (items.length === 0) throw new RangeError('A list with one item at least');
  return [first as T, ...rest];
}
