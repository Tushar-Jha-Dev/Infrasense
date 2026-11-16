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

function Logo({ variant = "full", height = 42, className = "" }) {
  const config = LOGO_CONFIG[variant] || LOGO_CONFIG.full;
  const numHeight =
    typeof height === "number" ? height : parseInt(height, 10) || 42;

  const lightWidth = Math.round(
    numHeight * (config.lightNaturalWidth / config.lightNaturalHeight)
  );
  const darkWidth = config.dark
    ? Math.round(
        numHeight * (config.darkNaturalWidth / config.darkNaturalHeight)
      )
    : lightWidth;

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
        src={config.light}
        className="logo-light"
        alt="InfraSense"
        width={lightWidth}
        height={numHeight}
        onError={handleImgError}
      />
      {config.dark && (
        <img
          src={config.dark}
          className="logo-dark"
          alt=""
          aria-hidden="true"
          width={darkWidth}
          height={numHeight}
          onError={handleImgError}
        />
      )}
    </span>
  );
}

export default Logo;
