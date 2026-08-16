-- The "آژانس" dock entry pointed at an #about anchor on the home page. The
-- magazine replaces it with a real route.
--
-- Guarded on the old label and href together, so an installation where someone
-- has already renamed or repointed that link in the panel is left untouched.
UPDATE "DockLink"
SET "label"   = 'مجله',
    "href"    = '/magazine',
    "txLabel" = 'مجله',
    "txColor" = '#1d4ed8'
WHERE "href" = '#about'
  AND "label" = 'آژانس';
