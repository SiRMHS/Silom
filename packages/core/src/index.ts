/**
 * Content and domain logic shared by anything that renders the site.
 *
 * Nothing here imports from `next` — the package is a plain server-side
 * library, so the Next app stays a presentation layer over it.
 *
 * This entrypoint reaches the database and is therefore server-only. Client
 * components that need the settings map import `@rahyad/core/strings`.
 */

export {
  getHomeContent,
  getProjectsContent,
  getContactContent,
  getTeamContent,
  getAllProjects,
  getProjectBySlug,
  getStrings,
  getDockLinks,
  getFooterWords,
} from "./content";

export type {
  ContactContent,
  HomeContent,
  ProjectService,
  ProjectsContent,
  Section,
  SiteProject,
  SiteTeamMember,
  SiteTestimonial,
  TeamContent,
} from "./content";

export {
  getServiceCards,
  getServicesContent,
  getServiceSlugs,
  getServiceBySlug,
} from "./services";

export type { ServiceCard, ServiceFilm, ServicesContent, SiteService } from "./services";

export {
  getMagazineContent,
  getPosts,
  getPostBySlug,
  getPostComments,
  getAdjacentPosts,
} from "./magazine";

export type { MagazineContent, Post, PostComment, PostCover, PostSummary } from "./magazine";

export { toFaqs } from "./faq";
export type { Faq } from "./faq";

// Re-exported for server code that already holds a settings map; client
// components must take these from `@rahyad/core/strings` instead.
export { pick } from "./strings";
export type { SiteStrings } from "./strings";

export { readImageSize } from "./image-size";
export type { ImageSize } from "./image-size";
