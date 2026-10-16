// Device keys (D01 cihaz_anahtarlari): the kinds a phone's key may be. The attendance
// envelope and the second anchor text name the same kinds in their own spellings, and
// map them here.
export const DEVICE_KEY_KINDS = ['android_p256', 'app_attest', 'secure_enclave'] as const;

export type DeviceKeyKind = (typeof DEVICE_KEY_KINDS)[number];
