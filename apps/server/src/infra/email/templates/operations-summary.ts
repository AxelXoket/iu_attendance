// The operations summary e-mail (D15's weekly summary): written as the operations warning
// is, under its own subject.

import type { OperationsTemplate } from './index.ts';
import { operationsEmail } from './operations-warning.ts';

export const operationsSummaryTemplate: OperationsTemplate<'operations_summary'> = (
  data,
  productName,
) => operationsEmail(`${productName} işletim özeti: ${data.subject}`, data.lines);
