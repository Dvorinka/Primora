// Stable app id. A port is not an identity — localhost:3000 can serve
// something else tomorrow. Dots and hyphens are allowed; URLs are not.
export const APP_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
