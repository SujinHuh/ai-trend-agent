import type { ActionLevel, ConfirmationStatus } from "../domain/types.js";

export function applyTrustGate(input: {
  desiredActionLevel: ActionLevel;
  confirmationStatus: ConfirmationStatus;
  importanceScore: number;
}): ActionLevel {
  if (input.confirmationStatus === "needs_confirmation") {
    return "needs_confirmation";
  }

  if (input.confirmationStatus === "conflicting" || input.confirmationStatus === "excluded") {
    return "watch_later";
  }

  if (input.desiredActionLevel === "do_now" && input.importanceScore < 80) {
    return "do_next";
  }

  return input.desiredActionLevel;
}

export function actionLevelFromScore(input: {
  importanceScore: number;
  confirmationStatus: ConfirmationStatus;
}): ActionLevel {
  if (input.confirmationStatus === "needs_confirmation") {
    return "needs_confirmation";
  }

  if (input.importanceScore >= 80) {
    return "do_now";
  }

  if (input.importanceScore >= 60) {
    return "do_next";
  }

  return "watch_later";
}
