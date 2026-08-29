export const UNSAFE_CUSTOMER_CONTENT: ReadonlyArray<RegExp> = [
  /\bstubbed\b/i,
  /\bmock backend\b/i,
  /\bphase\s+(?:1\.5|2|3)\b/i,
  /\bdemo (?:password|credentials|account)\b/i,
  /\bplaceholder proof\b/i,
  /\brepresentative placeholders?\b/i,
  /\breal feedback from verified customers\b/i,
];

export function findUnsafeCustomerContent(value: string): string[] {
  return UNSAFE_CUSTOMER_CONTENT
    .filter((pattern) => pattern.test(value))
    .map((pattern) => pattern.toString());
}
