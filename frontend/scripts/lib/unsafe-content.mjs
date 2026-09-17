/** Copy that must never reach a customer-visible string. Enforced at build by validate-public-content.mjs. */
export const UNSAFE_CUSTOMER_CONTENT = [
  /\bstubbed\b/i,
  /\bmock backend\b/i,
  /\bphase\s+(?:1\.5|2|3)\b/i,
  /\bdemo (?:password|credentials|account)\b/i,
  /\bplaceholder proof\b/i,
  /\brepresentative placeholders?\b/i,
  /\breal feedback from verified customers\b/i,
];

/** @param {string} value @returns {string[]} the patterns `value` violates */
export function findUnsafeCustomerContent(value) {
  return UNSAFE_CUSTOMER_CONTENT.filter((pattern) => pattern.test(value)).map((pattern) => pattern.toString());
}
