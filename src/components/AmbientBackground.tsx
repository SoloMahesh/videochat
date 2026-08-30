import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Flat page background + the theme toggle, mounted once per page.
 * Soft Extrusion surfaces are flat neutral tints, not glowing gradient
 * blobs — elevation comes from the shadow pairs on individual cards,
 * not from background decoration.
 */
export function AmbientBackground() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-paper" />
      <ThemeToggle />
    </>
  );
}
