import { useIsDarkTheme } from "../../hooks/useIsDarkTheme.js";
import "./Logo.css";

const LOGO_CONFIG = {
  full: {
    light: "/logo-full.png",
    dark: "/logo-full-dark.png",
    lightNaturalWidth: 960,
    lightNaturalHeight: 253,
    darkNaturalWidth: 960,
    darkNaturalHeight: 252,
  },
  mark: {
    light: "/logo-mark.png",
    dark: "/logo-mark-dark.png",
    lightNaturalWidth: 480,
    lightNaturalHeight: 463,
    darkNaturalWidth: 480,
    darkNaturalHeight: 436,
  },
};

function Logo({ variant = "full", height = 40, className = "" }) {
  const isDark = useIsDarkTheme();
  const config = LOGO_CONFIG[variant] || LOGO_CONFIG.full;
  const numHeight =
    typeof height === "number" ? height : parseInt(height, 10) || 40;

  const shouldUseDark = isDark && Boolean(config.dark);
  const src = shouldUseDark ? config.dark : config.light;

  const widthRatio = shouldUseDark
    ? config.darkNaturalWidth / config.darkNaturalHeight
    : config.lightNaturalWidth / config.lightNaturalHeight;
  const numWidth = Math.round(numHeight * widthRatio);

  const handleImgError = (e) => {
    const img = e.currentTarget;
    if (!img.dataset.fallbackTried) {
      img.dataset.fallbackTried = "true";
      if (img.src.includes("/brand/")) {
        img.src = img.src.replace("/brand/", "/");
      } else {
        const url = new URL(img.src);
        img.src = `${url.origin}/brand${url.pathname}`;
      }
    }
  };

  return (
    <span
      className={`ui-logo ui-logo-${variant} ${className}`.trim()}
      style={{ height: numHeight }}
    >
      <img
        src={src}
        alt="InfraSense"
        width={numWidth}
        height={numHeight}
        onError={handleImgError}
      />
    </span>
  );
}

export default Logo;
