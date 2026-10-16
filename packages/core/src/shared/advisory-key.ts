// An advisory lock key (D12): '<module>:<rule>:<internal ids>', exclusive as a plain
// string or shared in its object form. The database contract holds the layers and
// re-exports this type; core builds keys with it.
export type AdvisoryKey = string | { readonly key: string; readonly mode: 'shared' };
