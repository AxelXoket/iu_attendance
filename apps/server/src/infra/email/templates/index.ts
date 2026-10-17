// The e-mail templates (D14, Sablon metinleri), one per type: plain text with no code in
// the subject. A product e-mail has a template in each language and ends with the fixed
// warning sentence as its last paragraph; an operations e-mail is Turkish only and any
// link in it is written as [adres]. The product name is a setting the sender passes in.
// The templates stand by type in PRODUCT_TEMPLATES and OPERATIONS_TEMPLATES; the sender
// calls renderEmail, which picks a type's template for it.

import type { Language } from '@iu-attendance/core/shared/language';
import { checkLinks } from '../link-check.ts';
import type { EmailData, EmailType, OperationsEmailType, ProductEmailType } from '../types.ts';
import { applicationApprovedTemplate } from './application-approved.ts';
import { applicationCodeTemplate } from './application-code.ts';
import { applicationDeletionCodeTemplate } from './application-deletion-code.ts';
import { approvalPendingTemplate } from './approval-pending.ts';
import { operationsSummaryTemplate } from './operations-summary.ts';
import { operationsWarningTemplate } from './operations-warning.ts';
import { signInCodeTemplate } from './sign-in-code.ts';
import { signInNotificationTemplate } from './sign-in-notification.ts';

export type RenderedEmail = { readonly subject: string; readonly text: string };

/**
 * An e-mail with the count of the links in it, which the sender logs, never the links. An
 * operations e-mail has written each as [adres]; a product e-mail keeps its text, and the
 * sender refuses one whose count is above 0 (IS_KUYRUGU_EPOSTA_BAGLANTI).
 */
export type CountedEmail = RenderedEmail & { readonly linkCount: number };

export type ProductTemplate<T extends ProductEmailType> = {
  readonly [L in Language]: (data: EmailData[T], productName: string) => RenderedEmail;
};

export type OperationsTemplate<T extends OperationsEmailType> = (
  data: EmailData[T],
  productName: string,
) => CountedEmail;

export const PRODUCT_TEMPLATES: { readonly [T in ProductEmailType]: ProductTemplate<T> } =
  Object.freeze({
    sign_in_code: signInCodeTemplate,
    application_code: applicationCodeTemplate,
    application_deletion_code: applicationDeletionCodeTemplate,
    approval_pending: approvalPendingTemplate,
    sign_in_notification: signInNotificationTemplate,
    application_approved: applicationApprovedTemplate,
  });

export const OPERATIONS_TEMPLATES: {
  readonly [T in OperationsEmailType]: OperationsTemplate<T>;
} = Object.freeze({
  operations_warning: operationsWarningTemplate,
  operations_summary: operationsSummaryTemplate,
});

type Renderer<T extends EmailType> = (
  data: EmailData[T],
  productName: string,
  language: Language,
) => CountedEmail;

// The texts and data of a product e-mail hold no link, but the product name is a setting:
// one that holds a link reaches the count and so the sender's refusal.
const product =
  <T extends ProductEmailType>(template: ProductTemplate<T>): Renderer<T> =>
  (data, productName, language) => {
    const email = template[language](data, productName);
    const linkCount = checkLinks(email.subject).linkCount + checkLinks(email.text).linkCount;
    return { ...email, linkCount };
  };

// One entry per type, so a type's data meets a template of its own shape with no cast;
// templates.test.ts checks that it is the type's own template.
const RENDERERS: { readonly [T in EmailType]: Renderer<T> } = Object.freeze({
  sign_in_code: product(signInCodeTemplate),
  application_code: product(applicationCodeTemplate),
  application_deletion_code: product(applicationDeletionCodeTemplate),
  approval_pending: product(approvalPendingTemplate),
  sign_in_notification: product(signInNotificationTemplate),
  application_approved: product(applicationApprovedTemplate),
  operations_warning: operationsWarningTemplate,
  operations_summary: operationsSummaryTemplate,
});

/**
 * The e-mail of any type: a product type in the given language, an operations type in
 * Turkish whatever the language. RangeError for a type outside the list.
 */
export function renderEmail<T extends EmailType>(
  type: T,
  data: EmailData[T],
  options: { readonly productName: string; readonly language: Language },
): CountedEmail {
  if (!Object.hasOwn(RENDERERS, type)) throw new RangeError(`unknown e-mail type ${String(type)}`);
  return RENDERERS[type](data, options.productName, options.language);
}
