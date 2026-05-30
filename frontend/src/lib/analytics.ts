import { sendGAEvent } from "@next/third-parties/google";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

/** Call after login/register to attach an anonymous user ID to all subsequent events. */
export function identifyUser(userId: number, role: string) {
  gtag("set", { user_id: String(userId) });
  gtag("set", "user_properties", { user_role: role });
}

/** Call on logout to detach the user ID. */
export function clearUser() {
  gtag("set", { user_id: undefined });
  gtag("set", "user_properties", { user_role: undefined });
}

export function trackLogin(role: string) {
  sendGAEvent("event", "login", { method: "email", user_role: role });
}

export function trackOAuthLogin(role: string) {
  sendGAEvent("event", "login", { method: "google", user_role: role });
}

export function trackRegister(role: "applicant" | "company") {
  sendGAEvent("event", "sign_up", { method: "email", user_role: role });
}

export function trackLogout() {
  sendGAEvent("event", "logout", {});
}

export function trackJobView(jobId: number, jobTitle: string, isExternal: boolean) {
  sendGAEvent("event", "job_view", {
    job_id: jobId,
    job_title: jobTitle,
    is_external: isExternal,
  });
}

export function trackJobApply(jobId: number, jobTitle: string) {
  sendGAEvent("event", "job_apply", { job_id: jobId, job_title: jobTitle });
}

export function trackJobLike(jobId: number, jobTitle: string, liked: boolean) {
  sendGAEvent("event", liked ? "job_like" : "job_unlike", {
    job_id: jobId,
    job_title: jobTitle,
  });
}

export function trackExternalJobClick(jobId: number, jobTitle: string) {
  sendGAEvent("event", "external_job_click", {
    job_id: jobId,
    job_title: jobTitle,
  });
}

export function trackCVParse(fieldsFilled: number) {
  sendGAEvent("event", "cv_auto_import", { fields_filled: fieldsFilled });
}

export function trackLanguageSwitch(language: string) {
  sendGAEvent("event", "language_switch", { language });
}

export function trackJobSearch(query: string, resultCount?: number) {
  sendGAEvent("event", "job_search", {
    search_term: query,
    result_count: resultCount ?? -1,
  });
}
