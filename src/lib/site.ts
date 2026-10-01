/**
 * Single source of truth for public-facing company + product facts.
 *
 * These values previously drifted across the landing page, the help centre and
 * the legal pages (an old `*.vercel.app` URL and a support address that
 * contradicted the privacy policy both shipped to production). Import them
 * instead of retyping literals.
 */

export const SITE_URL = "https://aide.omixsystems.store";

export const COMPANY_NAME = "Omix Digital Solutions";
export const COMPANY_URL = "https://omixsystems.store";

/** Canonical support address. Matches the privacy policy and terms of service. */
export const SUPPORT_EMAIL = "omixsystems@gmail.com";
export const SUPPORT_PHONE = "+254 768 213 649";
export const SUPPORT_PHONE_HREF = "tel:+254768213649";

/** Routes users can install Aide from, keyed by platform. */
export const DOWNLOADS_PATH = "/downloads";
