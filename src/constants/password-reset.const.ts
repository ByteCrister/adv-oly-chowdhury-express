/**
 * Password Reset Domain Constants
 */

/**
 * Lifecycle status of a password reset request document.
 *
 * - `active`     - OTP issued, awaiting user verification.
 * - `verified`   - OTP successfully verified; reset token issued.
 * - `consumed`   - Password was changed; one-time authorization spent.
 * - `expired`    - OTP or reset token window elapsed, or max attempts exceeded.
 * - `superseded` - A newer request was initiated, rendering this one invalid.
 */
export const PASSWORD_RESET_STATUSES = {
  ACTIVE: "active",
  VERIFIED: "verified",
  CONSUMED: "consumed",
  EXPIRED: "expired",
  SUPERSEDED: "superseded",
} as const;

export const PASSWORD_RESET_STATUS_LIST = Object.values(PASSWORD_RESET_STATUSES);
export type PasswordResetStatus =
  (typeof PASSWORD_RESET_STATUSES)[keyof typeof PASSWORD_RESET_STATUSES];

/**
 * Email delivery status for the OTP dispatch attempt tracked per request.
 *
 * - `pending` - Email queued but not yet dispatched.
 * - `sent`    - SMTP transmission succeeded.
 * - `failed`  - All delivery attempts exhausted without success.
 */
export const PASSWORD_RESET_DELIVERY_STATUSES = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
} as const;

export const PASSWORD_RESET_DELIVERY_STATUS_LIST = Object.values(
  PASSWORD_RESET_DELIVERY_STATUSES
);
export type PasswordResetDeliveryStatus =
  (typeof PASSWORD_RESET_DELIVERY_STATUSES)[keyof typeof PASSWORD_RESET_DELIVERY_STATUSES];

/** Maximum OTP entry attempts before a request is expired. */
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

/** OTP validity window in milliseconds (10 minutes). */
export const PASSWORD_RESET_OTP_EXPIRATION_MS = 10 * 60 * 1000;

/** Reset authorisation token validity window in milliseconds (15 minutes). */
export const PASSWORD_RESET_TOKEN_EXPIRATION_MS = 15 * 60 * 1000;
