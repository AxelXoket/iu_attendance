// Rate classes in one definition: the rate limiter, the route table contract test,
// the OpenAPI document (x-rate-class) and the load test all read this. In every class
// the table is larger than the key universe (the distinct keys seen in a minute).
export const RATE_CLASSES = [
  {
    name: 'anonymous',
    key: 'ip',
    perMinute: 3000,
    tableSize: 50_000,
    keyUniverse: 20_000,
    hook: 'onRequest',
  },
  {
    name: 'session',
    key: 'authSession',
    perMinute: 120,
    tableSize: 200_000,
    keyUniverse: 120_000,
    hook: 'preParsing',
  },
  {
    name: 'heavy',
    key: 'authSession',
    perMinute: 20,
    tableSize: 50_000,
    keyUniverse: 10_000,
    hook: 'preParsing',
  },
  {
    name: 'upload',
    key: 'deviceElseAuthSession',
    perMinute: 30,
    tableSize: 200_000,
    keyUniverse: 70_000,
    hook: 'preHandler',
  },
  {
    name: 'clock',
    key: 'deviceElseAuthSession',
    perMinute: 30,
    tableSize: 200_000,
    keyUniverse: 70_000,
    hook: 'preParsing',
  },
  {
    name: 'projection',
    key: 'projection',
    perMinute: 60,
    tableSize: 10_000,
    keyUniverse: 3_000,
    hook: 'preParsing',
  },
] as const satisfies readonly RateClass[];

export type RateClass = {
  name: string;
  key: 'ip' | 'authSession' | 'deviceElseAuthSession' | 'projection';
  perMinute: number;
  tableSize: number;
  keyUniverse: number;
  hook: 'onRequest' | 'preParsing' | 'preHandler';
};

export type RateClassName = (typeof RATE_CLASSES)[number]['name'];
