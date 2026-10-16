// Device statuses (D01 cihazlar.durum): the identity tables' CHECK list and the device
// field of the answers come from this list, and the verification rule reads it; core never
// imports contracts, so the list lives here and the identity contract re-exports it.
export const DEVICE_STATUSES = ['active', 'change_pending', 'closed'] as const;

export type DeviceStatus = (typeof DEVICE_STATUSES)[number];
