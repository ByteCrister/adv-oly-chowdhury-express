import { cloudinary } from "../config/cloudinary";
import { AssetResourceType } from "../constants/asset.const";

export interface CloudinaryDestroyResult {
  result: string;
}

/**
 * Permanently removes an asset from Cloudinary CDN storage.
 * Invalidates CDN cached copies to ensure immediate cleanup.
 *
 * @param publicId - Cloudinary public identifier
 * @param resourceType - 'image' | 'video' | 'raw' | 'auto'
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: AssetResourceType | "auto" = "auto"
): Promise<CloudinaryDestroyResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType, invalidate: true },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve((result as CloudinaryDestroyResult) || { result: "unknown" });
      }
    );
  });
}
