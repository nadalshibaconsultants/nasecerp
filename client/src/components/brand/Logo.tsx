/**
 * Brand logo:
 *   1. If client/public/logo.png exists → use it (your real NASEC PNG)
 *   2. Else client/public/logo.svg (the bundled wordmark fallback)
 *   3. Else inline "nasec" text
 *
 * For dark backgrounds, `variant="dark"` inverts the colour (works for black-on-transparent PNG).
 */
import { useEffect, useState } from "react";

const LOGO_PNG = "/logo.png";
const LOGO_SVG = "/logo.svg";

type Props = {
  variant?: "light" | "dark";
  size?: number;
  className?: string;
};

export default function Logo({ variant = "light", size = 28, className = "" }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const r1 = await fetch(LOGO_PNG, { method: "HEAD" });
        if (!cancelled && r1.ok && (r1.headers.get("content-type") || "").includes("image")) { setSrc(LOGO_PNG); return; }
      } catch { /* noop */ }
      try {
        const r2 = await fetch(LOGO_SVG, { method: "HEAD" });
        if (!cancelled && r2.ok) { setSrc(LOGO_SVG); return; }
      } catch { /* noop */ }
      if (!cancelled) setSrc(null);
    }
    probe();
    return () => { cancelled = true; };
  }, []);

  if (src) {
    const invert = variant === "dark" ? "invert" : "";
    return <img src={src} alt="NASEC" style={{ height: size, width: "auto" }} className={`object-contain ${invert} ${className}`} />;
  }
  return (
    <span
      className={`font-extrabold tracking-tight ${variant === "dark" ? "text-white" : "text-black"} ${className}`}
      style={{ fontSize: size * 0.85, lineHeight: 1, letterSpacing: "-0.02em" }}
    >
      nasec
    </span>
  );
}
