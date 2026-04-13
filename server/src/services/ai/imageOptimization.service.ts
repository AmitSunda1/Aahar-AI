import sharp from "sharp";

/**
 * Image optimization service
 * Downscales images before sending to Gemini to reduce token usage
 */

export interface ImageOptimizationStats {
  originalSizeKb: number;
  optimizedSizeKb: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
}

/**
 * Optimize image for Gemini API
 * Downscales to 768x768 max dimension while maintaining aspect ratio
 * This reduces token usage significantly while preserving food recognition quality
 */
export const optimizeImageForGemini = async (
  base64Data: string,
  mimeType: string,
): Promise<{ optimizedBase64: string; stats: ImageOptimizationStats }> => {
  try {
    // Decode base64 to buffer
    const imageBuffer = Buffer.from(base64Data, "base64");
    const originalSizeKb = imageBuffer.length / 1024;

    // Determine image format from mime type
    const format = getFormatFromMimeType(mimeType);

    // Optimize: downscale to max 768x768, reduce quality
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: "inside", // Maintain aspect ratio, fit within 768x768
        withoutEnlargement: true, // Don't upscale if smaller
      })
      .webp({ quality: 70 }) // Convert to WebP for best compression
      .toBuffer();

    const optimizedSizeKb = optimizedBuffer.length / 1024;

    // Get image dimensions
    const metadata = await sharp(optimizedBuffer).metadata();
    const dimensions = {
      width: metadata.width || 768,
      height: metadata.height || 768,
    };

    // Convert back to base64
    const optimizedBase64 = optimizedBuffer.toString("base64");

    // Calculate compression stats
    const stats: ImageOptimizationStats = {
      originalSizeKb: Math.round(originalSizeKb * 100) / 100,
      optimizedSizeKb: Math.round(optimizedSizeKb * 100) / 100,
      compressionRatio: Math.round((1 - optimizedSizeKb / originalSizeKb) * 100),
      dimensions,
    };

    console.log(
      `[Image Optimization] ${stats.originalSizeKb}KB → ${stats.optimizedSizeKb}KB (${stats.compressionRatio}% reduction)`,
    );

    return {
      optimizedBase64,
      stats,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image optimization failed";
    console.error("[Image Optimization Error]", message);

    // If optimization fails, return original (don't fail the whole operation)
    console.warn("[Image Optimization] Falling back to original image");
    return {
      optimizedBase64: base64Data,
      stats: {
        originalSizeKb: (Buffer.from(base64Data, "base64").length / 1024),
        optimizedSizeKb: (Buffer.from(base64Data, "base64").length / 1024),
        compressionRatio: 0,
        dimensions: { width: 0, height: 0 },
      },
    };
  }
};

/**
 * Determine sharp format from MIME type
 */
function getFormatFromMimeType(
  mimeType: string,
): "jpeg" | "png" | "gif" | "webp" {
  const type = mimeType.toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg")) return "jpeg";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("webp")) return "webp";
  return "jpeg"; // Default fallback
}
