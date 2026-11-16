/**
 * HF-2 (v25.4 launch hotfix): resume text must not leave the device unless the
 * user presses Assist (Rev 6 §13). Until the Band C Assist engine ships with
 * redaction and honesty checks, every server AI call is off by default.
 * This is a feature flag, not a secret.
 */
export const ASSIST_ENABLED = import.meta.env.VITE_ASSIST_ENABLED === "true";
