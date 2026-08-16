/**
 * Panel icon set — a thin, named mapping over lucide-react (already a
 * dependency, used by the site header too).
 *
 * Everything goes through <Icon name="…" /> so the whole panel shares one
 * size (16px) and stroke (1.6), which is what makes an icon set read as a set
 * rather than as clip-art. Call sites never import lucide directly.
 */
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  FolderOpen,
  Image,
  Inbox,
  Layers,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Newspaper,
  Quote,
  ShieldUser,
  Terminal,
  Type,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutGrid,
  text: Type,
  headline: Zap,
  stats: ChartColumn,
  services: Layers,
  team: Users,
  testimonials: Quote,
  partners: Building2,
  projects: FolderOpen,
  posts: Newspaper,
  comments: MessageSquare,
  navigation: Compass,
  boot: Terminal,
  media: Image,
  messages: Inbox,
  users: ShieldUser,
  external: ExternalLink,
  logout: LogOut,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  moveUp: ArrowUp,
  moveDown: ArrowDown,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const Glyph = ICONS[name];
  return <Glyph className="ad-icon" size={size} strokeWidth={1.6} aria-hidden focusable="false" />;
}

/** Reordering uses arrows; chevrons are reserved for open/close disclosure. */
export function MoveUpIcon({ size = 14 }: { size?: number }) {
  return <Icon name="moveUp" size={size} />;
}

export function MoveDownIcon({ size = 14 }: { size?: number }) {
  return <Icon name="moveDown" size={size} />;
}
