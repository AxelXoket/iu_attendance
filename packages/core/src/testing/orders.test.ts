import { describe, expect, it } from 'vitest';
import { ordersOf, permutations } from './orders.ts';

describe('orders', () => {
  it('lists every order once', () => {
    expect(ordersOf(0)).toEqual([[]]);
    const three = permutations(['a', 'b', 'c']).map((order) => order.join(''));
    expect(three.sort()).toEqual(['abc', 'acb', 'bac', 'bca', 'cab', 'cba']);
    expect(new Set(ordersOf(5).map((order) => order.join())).size).toBe(120);
    // The second call gives the same lists.
    expect(ordersOf(5)).toBe(ordersOf(5));
  });
});
