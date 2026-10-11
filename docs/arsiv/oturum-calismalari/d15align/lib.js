'use strict';
// Helpers for exact, counted edits. Every replace must hit exactly once unless n is given.
function rep(obj, key, a, b, n = 1) {
  const s = obj[key];
  if (typeof s !== 'string') throw new Error(`rep: ${key} is not a string`);
  const got = s.split(a).length - 1;
  if (got !== n) throw new Error(`rep: '${String(a).slice(0, 70)}' found ${got} times in ${key}, want ${n}`);
  obj[key] = s.split(a).join(b);
}
function find(arr, key, val) {
  const i = arr.findIndex((x) => x[key] === val);
  if (i < 0) throw new Error(`find: ${key}=${val} missing`);
  return arr[i];
}
function idx(arr, key, val) {
  const i = arr.findIndex((x) => x[key] === val);
  if (i < 0) throw new Error(`idx: ${key}=${val} missing`);
  return i;
}
function strIdx(arr, needle) {
  const hits = arr.map((s, i) => (s.includes(needle) ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1) throw new Error(`strIdx: '${needle.slice(0, 60)}' hits ${hits.length}`);
  return hits[0];
}
module.exports = { rep, find, idx, strIdx };
