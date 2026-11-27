// Deterministic toy models: no external calls or execution.
"use strict";
const SafetyModels = {
  bound(approved, requested, improved) {
    return !improved || ["actor","action","target","amount"].every(k => approved[k] === requested[k]) ? "ALLOW" : "DENY";
  },
  revocation(order, improved) {
    // Model a stale positive check before either event.
    if (!improved) return "ALLOW";
    return order === "revoke-first" ? "DENY" : "ALLOW";
  },
  approval(recommended, approved, improved) {
    return (improved ? approved : recommended || approved) ? "ALLOW" : "DENY";
  },
  outcome(report, observation, improved) {
    if (!improved) return report ? "CONFIRMED" : "UNKNOWN";
    return observation === "matching" ? "CONFIRMED" : "UNKNOWN";
  }
};
if (typeof module !== "undefined") module.exports = SafetyModels;
