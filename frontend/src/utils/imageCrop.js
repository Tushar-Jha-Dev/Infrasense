const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const TARGET_SIZE = 256;
const MAX_DATA_URL_LENGTH = 70000;

const CHART_COLORS = [
  "var(--chart-1, #0F5E5C)",
  "var(--chart-2, #2B6A8F)",
  "var(--chart-3, #B7791F)",
  "var(--chart-4, #2F7D5B)",
  "var(--chart-5, #8A6A1F)",
  "var(--chart-6, #4A6572)",
];

/**
 * Validates, crops to a centred square, and resizes an image file to 256x256 JPEG data URL.
 * @param {File} file
 * @returns {Promise<string>} Base64 data URL string
 */
export async function processProfileImage(file) {
  if (!file) {
    throw new Error("No file selected");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Please select a JPEG, PNG, or WebP image");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image file size must be under 5 MB");
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Unable to create canvas context"));
        return;
      }

      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - minDim) / 2;
      const sy = (img.naturalHeight - minDim) / 2;

      ctx.drawImage(
        img,
        sx,
        sy,
        minDim,
        minDim,
        0,
        0,
        TARGET_SIZE,
        TARGET_SIZE
      );

      // Export JPEG at 0.8 quality
      let quality = 0.8;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      // If needed to ensure it fits within backend 70000 character limit
      while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        reject(
          new Error("Processed image is too large. Please select a simpler image.")
        );
        return;
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image file"));
    };

    img.src = objectUrl;
  });
}

/**
 * Extracts up to two initials from a user's name.
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Picks a deterministic --chart-* token color based on the user's name.
 * @param {string} name
 * @returns {string} CSS color string
 */
export function getAvatarColor(name) {
  if (!name || typeof name !== "string") return CHART_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CHART_COLORS.length;
  return CHART_COLORS[index];
}
