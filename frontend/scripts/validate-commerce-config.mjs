import { parseCommerceMode, validateCommerceEnvironment } from "./lib/commerce-rules.mjs";

let errors;
try {
  errors = validateCommerceEnvironment(process.env);
} catch (error) {
  errors = [error.message];
}

if (errors.length > 0) {
  console.error("Commerce configuration is unsafe:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(`Commerce configuration valid (${parseCommerceMode(process.env.NEXT_PUBLIC_COMMERCE_MODE)}).`);
