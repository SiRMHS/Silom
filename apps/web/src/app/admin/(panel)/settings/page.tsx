import { db } from "@rahyad/db";
import SettingsForm, { type SettingRow } from "@/components/admin/SettingsForm";

const GROUP_ORDER = [
  "GENERAL",
  "SEO",
  "MANIFESTO",
  "SERVICES",
  "WORK",
  "TEAM",
  "LOGOS",
  "CONTACT",
  "FOOTER",
  "BOOT",
  "PROJECTS",
  "MAGAZINE",
  "A11Y",
];

export default async function Page() {
  const settings = await db.setting.findMany({ orderBy: [{ group: "asc" }, { order: "asc" }] });

  const byGroup = new Map<string, SettingRow[]>();
  for (const s of settings) {
    const list = byGroup.get(s.group) ?? [];
    list.push({
      key: s.key,
      value: s.value,
      label: s.label,
      hint: s.hint,
      kind: s.kind,
      group: s.group,
    });
    byGroup.set(s.group, list);
  }

  const groups = GROUP_ORDER.filter((g) => byGroup.has(g)).map(
    (g) => [g, byGroup.get(g)!] as [string, SettingRow[]],
  );

  return <SettingsForm groups={groups} />;
}
