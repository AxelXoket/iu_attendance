import { nonEmpty } from '@iu-attendance/core/shared/list';
import { z } from 'zod';

// Signed content inside a JSON body (D13-B32): an opaque text carried as is, the kind of
// its signature and the signature, plus the fields a module adds. The server verifies the
// signature over the text's bytes and only then parses the text, so no layer that
// rewrites the body can break it; there is no raw body capture and no canonical JSON. The
// inner form of the text and the signature's encoding are the module's (the sync module
// uses base64url for both). A signed kind needs a signature; an unsigned kind (staff,
// whose request the session already proves) has null.

export function signedTextSchema<
  const Signed extends readonly [string, ...string[]],
  const Unsigned extends readonly string[] = [],
  const Extra extends z.ZodRawShape = Record<never, never>,
>(options: {
  textMax: number;
  signatureMax: number;
  signedKinds: Signed;
  unsignedKinds?: Unsigned;
  extra?: Extra;
}) {
  const signed: readonly string[] = options.signedKinds;
  const kinds = nonEmpty<Signed[number] | Unsigned[number]>([
    ...options.signedKinds,
    ...(options.unsignedKinds ?? []),
  ]);
  if (new Set(kinds).size !== kinds.length) {
    throw new Error(`Signature kinds must be unique: ${kinds.join(', ')}`);
  }
  return z
    .object({
      text: z.string().min(1).max(options.textMax),
      signatureKind: z.enum(kinds),
      signature: z.string().min(1).max(options.signatureMax).nullable(),
      ...(options.extra ?? ({} as Extra)),
    })
    .refine(
      (value) => {
        // The extra fields make the inferred type opaque here; these two are always present.
        const { signatureKind, signature } = value as { signatureKind: string; signature: unknown };
        return signed.includes(signatureKind) === (signature !== null);
      },
      { message: 'A signed kind carries a signature, an unsigned kind none', path: ['signature'] },
    );
}
