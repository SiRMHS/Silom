/**
 * The shape of every generic collection screen in the admin panel.
 *
 * Client-safe on purpose — `CollectionEditor` renders from these definitions.
 * The sanitiser lives behind `@rahyad/core/admin/sanitize` instead, because it
 * is server-only and must never be pulled into the browser bundle.
 */

export { COLLECTIONS, MODEL_KEYS } from "./schema";
export type { CollectionDef, FieldDef, FieldType, ModelKey } from "./schema";
