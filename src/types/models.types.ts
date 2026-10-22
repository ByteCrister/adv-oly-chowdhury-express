import { Types, Document } from "mongoose";
import { AssetResourceType, AssetDeliveryType, AssetType, AssetStatus } from "../constants/asset.const";
import { AssetOwnerType, AssetPurpose } from "../constants/asset-reference.const";
import { AuditAction, AuditEntityType } from "../constants/audit-log.const";

export interface IAssetDocument extends Document {
  _id: Types.ObjectId;
  fileHash: string;
  assetType: AssetType;
  mimeType: string;
  status: AssetStatus;
  cloudinaryAssetId: string;
  publicId: string;
  resourceType: AssetResourceType;
  deliveryType: AssetDeliveryType;
  format?: string | null;
  originalFilename?: string | null;
  displayName?: string | null;
  secureUrl: string;
  version?: number | null;
  bytes: number;
  width?: number | null;
  height?: number | null;
  pages?: number | null;
  etag?: string | null;
  assetFolder?: string | null;
  uploadedBy?: Types.ObjectId | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssetReferenceDocument extends Document {
  _id: Types.ObjectId;
  assetId: Types.ObjectId;
  uploadedBy?: Types.ObjectId | null;
  originalFileName?: string | null;
  description?: string | null;
  ownerType: AssetOwnerType;
  ownerId?: Types.ObjectId | null;
  purpose?: AssetPurpose | null;
  caption?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLogDocument extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: Types.ObjectId;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface ICaseDocument extends Document {
  _id: Types.ObjectId;
  internalReference: string;
  caseNumber?: string | null;
  filingYear?: number | null;
  title: string;
  caseType: string;
  caseCategory?: string | null;
  courtId: Types.ObjectId;
  clientId: Types.ObjectId;
  filingDate?: Date | null;
  caseStatus: string;
  priority: string;
  description?: string | null;
  legalIssues?: string | null;
  opposingCounsel?: string | null;
  opposingParties?: string[];
  nextHearingDate?: Date | null;
  closedAt?: Date | null;
  closureReason?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseDocumentRecord extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  assetReferenceId: Types.ObjectId;
  documentType: string;
  title: string;
  documentDate?: Date | null;
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientDocumentRecord extends Document {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  assetReferenceId: Types.ObjectId;
  documentType: string;
  title: string;
  documentDate?: Date | null;
  expiryDate?: Date | null;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseEventDocument extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  eventType: string;
  title: string;
  description?: string | null;
  eventDate: Date;
  assetReferenceId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseExpenseDocument extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  expenseDate: Date;
  category: string;
  description?: string | null;
  amount: number;
  currency: string;
  receiptAssetReferenceId?: Types.ObjectId | null;
  recordedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICasePartyDocument extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  clientId?: Types.ObjectId | null;
  name: string;
  partyType: string;
  role: string;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientDocument extends Document {
  _id: Types.ObjectId;
  clientNumber: string;
  clientType: string;
  status: string;
  name: string;
  organizationName?: string | null;
  fatherOrSpouseName?: string | null;
  motherName?: string | null;
  dateOfBirth?: Date | null;
  nationalId?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  address?: string | null;
  permanentAddress?: string | null;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientPaymentDocument extends Document {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  caseId?: Types.ObjectId | null;
  paymentDate: Date;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentType: string;
  referenceNumber?: string | null;
  receiptAssetreferenceId?: Types.ObjectId | null;
  moneyReceiptNumber?: string | null;
  notes?: string | null;
  receivedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourtDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  courtType: string;
  district: string;
  division?: string;
  roomOrHall?: string | null;
  address?: string | null;
  presidingJudgeTitle?: string | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHearingDocument extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  courtId?: Types.ObjectId | null;
  hearingDate: Date;
  startTime?: string | null;
  hearingType?: string | null;
  purpose?: string | null;
  outcome?: string | null;
  nextDate?: Date | null;
  status: string;
  adjournmentReason?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string | null;
  caseId?: Types.ObjectId | null;
  clientId?: Types.ObjectId | null;
  dueAt?: Date | null;
  priority: string;
  status: string;
  completedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  preferredName?: string;
  title?: string;
  subtitle?: string;
  tagline?: string | null;
  email: string;
  passwordHash?: string | null;
  status: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  barCouncilId?: string | null;
  barAssociationMemberNo?: string | null;
  taxesBarMemberNo?: string | null;
  phone?: string;
  alternatePhone?: string | null;
  whatsappNumber?: string;
  profileAssetReferenceId?: Types.ObjectId | null;
  signatureAssetId?: Types.ObjectId | null;
  signatureAssetReferenceId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
