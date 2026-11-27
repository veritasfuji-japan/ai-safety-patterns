// Deterministic toy models, not production authorization.
"use strict";
const fields = ["actor", "action", "target", "amount"];
function validOperation(op) {
  return op !== null && typeof op === "object" && !Array.isArray(op) &&
    fields.every(k => Object.hasOwn(op, k)) &&
    ["actor","action","target"].every(k => typeof op[k] === "string" && op[k].length > 0) &&
    Number.isSafeInteger(op.amount) && op.amount > 0;
}
const SafetyModels = {
  bound(approved, requested, improved) {
    if (!validOperation(approved) || !validOperation(requested) || typeof improved !== "boolean") return "DENY";
    return !improved || fields.every(k => approved[k] === requested[k]) ? "ALLOW" : "DENY";
  },
  revocation(order, improved) {
    if (!["revoke-first", "dispatch-first"].includes(order) || typeof improved !== "boolean") return "DENY";
    if (!improved) return "ALLOW"; // intentionally stale positive check
    return order === "dispatch-first" ? "ALLOW" : "DENY";
  },
  approval(recommended, approved, improved) {
    if ([recommended, approved, improved].some(v => typeof v !== "boolean")) return "DENY";
    return (improved ? approved : recommended || approved) ? "ALLOW" : "DENY";
  },
  outcome(report, observation, improved) {
    if (typeof report !== "boolean" || typeof improved !== "boolean" ||
        !["matching", "missing", "mismatched"].includes(observation)) return "UNKNOWN";
    if (!improved) return report ? "CONFIRMED" : "UNKNOWN";
    return observation === "matching" ? "CONFIRMED" : "UNKNOWN";
  },
  injection(content, authorized, improved) {
    if (!["injected-command","ordinary-data"].includes(content) || typeof authorized !== "boolean" || typeof improved !== "boolean") return "DENY";
    return (authorized || (!improved && content === "injected-command")) ? "ALLOW" : "DENY";
  },
  replay(valid, consumed, improved) {
    if ([valid,consumed,improved].some(v=>typeof v !== "boolean")) return "DENY";
    return valid && (!improved || !consumed) ? "ALLOW" : "DENY";
  },
  policyDrift(approvedVersion, currentVersion, approved, improved) {
    if (![approvedVersion,currentVersion].every(v=>["v1","v2"].includes(v)) || typeof approved !== "boolean" || typeof improved !== "boolean") return "DENY";
    return approved && (!improved || approvedVersion === currentVersion) ? "ALLOW" : "DENY";
  },
  trustBoundary(signatureValid, trustedIssuer, improved) {
    if ([signatureValid,trustedIssuer,improved].some(v=>typeof v !== "boolean")) return "DENY";
    return signatureValid && (!improved || trustedIssuer) ? "ALLOW" : "DENY";
  },
  effectUncertainty(state, freshAuthorization, improved) {
    if (!["unknown","applied","not-applied"].includes(state) || typeof freshAuthorization !== "boolean" || typeof improved !== "boolean") return "HOLD";
    if (state === "applied") return "STOP";
    return freshAuthorization && (!improved || state === "not-applied") ? "RETRY" : "HOLD";
  }
};
if (typeof module !== "undefined") module.exports = SafetyModels;
