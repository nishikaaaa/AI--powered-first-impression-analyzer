/**
 * OpenAI structured outputs (strict: true) rules:
 * - Every object: additionalProperties: false
 * - Every key in properties MUST appear in required (no optional keys)
 * - Use "" for absent strings and [] for absent lists; normalize after parse
 * - No free-form maps (additionalProperties: true); use arrays of { key, value } or fixed keys
 */

export const OPENAI_EMPTY = "";
