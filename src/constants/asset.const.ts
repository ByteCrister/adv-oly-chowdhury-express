/**
 * Digital Asset Storage and Cloudinary Constants
 */

export const ASSET_RESOURCE_TYPES = {
  IMAGE: "image",
  RAW: "raw",
  VIDEO: "video",
  AUTO: "auto",
} as const;

export const ASSET_RESOURCE_TYPE_LIST = Object.values(ASSET_RESOURCE_TYPES);
export type AssetResourceType = (typeof ASSET_RESOURCE_TYPES)[keyof typeof ASSET_RESOURCE_TYPES];

export const ASSET_DELIVERY_TYPES = {
  UPLOAD: "upload",
  PRIVATE: "private",
  AUTHENTICATED: "authenticated",
} as const;

export const ASSET_DELIVERY_TYPE_LIST = Object.values(ASSET_DELIVERY_TYPES);
export type AssetDeliveryType = (typeof ASSET_DELIVERY_TYPES)[keyof typeof ASSET_DELIVERY_TYPES];

export const ASSET_TYPES = {
  IMAGE: "image",
  VIDEO: "video",
  PDF: "pdf",
  DOCX: "docx",
  OTHER: "other",
} as const;

export const ASSET_TYPE_LIST = Object.values(ASSET_TYPES);
export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

export const ASSET_STATUSES = {
  PENDING: "pending",
  READY: "ready",
  FAILED: "failed",
  DELETED: "deleted",
} as const;

export const ASSET_STATUS_LIST = Object.values(ASSET_STATUSES);
export type AssetStatus = (typeof ASSET_STATUSES)[keyof typeof ASSET_STATUSES];
