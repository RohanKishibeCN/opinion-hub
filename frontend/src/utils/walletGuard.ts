export type WalletGuardIssue = {
  message: string;
  source?: string;
};

const KEYWORDS = [
  "window.ethereum",
  "backpack",
  "contentscript.js",
  "injected.js",
  "chrome version cannot read properties of null (reading '1')"
];

const MAX_LOGS = 2;
let logCount = 0;

const shouldLog = () => {
  if (logCount >= MAX_LOGS) return false;
  logCount += 1;
  return true;
};

const matchesKeyword = (text: string) => {
  const lower = text.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k));
};

const logIssue = (msg: string) => {
  if (!shouldLog()) return;
  const prefix = "[wallet-guard]";
  if (import.meta.env.MODE === "production") {
    console.info(prefix, msg);
  } else {
    console.warn(prefix, msg);
  }
};

export const installWalletGuard = (onIssue?: (issue: WalletGuardIssue) => void) => {
  if (typeof window === "undefined") return () => {};

  const errorHandler = (event: ErrorEvent) => {
    const text = `${event.message || ""} ${event.filename || ""}`;
    if (!matchesKeyword(text)) return;
    logIssue(`captured wallet script error: ${event.message || "unknown"} (${event.filename || "unknown"})`);
    onIssue?.({ message: event.message || "Wallet extension error", source: event.filename });
    event.preventDefault();
  };

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    const reason = typeof event.reason === "string" ? event.reason : event.reason?.message || "";
    if (!reason || !matchesKeyword(reason)) return;
    logIssue(`captured wallet rejection: ${reason}`);
    onIssue?.({ message: reason || "Wallet extension rejection" });
    event.preventDefault();
  };

  window.addEventListener("error", errorHandler, true);
  window.addEventListener("unhandledrejection", rejectionHandler);

  return () => {
    window.removeEventListener("error", errorHandler, true);
    window.removeEventListener("unhandledrejection", rejectionHandler);
  };
};
