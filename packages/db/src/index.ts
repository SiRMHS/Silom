/**
 * The data layer's public surface.
 *
 * Everything that touches Postgres goes through here, so an app never reaches
 * into the generated client directly and the schema can move without a
 * repo-wide find-and-replace.
 */

export { db } from "./client";
export { hashPassword, verifyPassword } from "./password";

export {
  HeadlineGroup,
  RailSide,
  Role,
  SettingGroup,
  SettingKind,
  WordEmphasis,
} from "./generated/prisma/enums";

export type { Prisma } from "./generated/prisma/client";
