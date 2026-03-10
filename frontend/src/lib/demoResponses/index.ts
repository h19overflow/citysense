import type { ChatMessage } from "../types";
import { getBenefitsCliffResponse, getMedicaidLossResponse, getBenefitsEligibilityResponse, getSingleParentJobsResponse, getBridgeProgramsResponse } from "./benefitsResponses";
import { getCareerLadderResponse, getHealthClinicsResponse } from "./careerResponses";
import { getReentryResponse, getApplicationHelpResponse, getNewToMontgomeryResponse } from "./communityResponses";
import { getDefaultResponse } from "./defaultResponse";

function isJobOffer(lower: string): boolean {
  return lower.includes("job") || lower.includes("$15") || lower.includes("amazon") || lower.includes("take this") || lower.includes("should i take") || lower.includes("offer");
}

function isMedicaidLoss(lower: string): boolean {
  return lower.includes("medicaid") || lower.includes("lost my") || lower.includes("coverage") || lower.includes("insurance");
}

function isCareerGrowth(lower: string): boolean {
  return lower.includes("plant") || lower.includes("earn more") || lower.includes("career") || lower.includes("promotion") || lower.includes("skills") || lower.includes("better job") || lower.includes("want more") || lower.includes("ladder") || lower.includes("find better");
}

function isReentry(lower: string): boolean {
  return lower.includes("reentry") || lower.includes("record") || lower.includes("conviction") || lower.includes("rebuild") || lower.includes("got out") || lower.includes("rebuilding") || lower.includes("returning") || lower.includes("released");
}

function isBenefitsCheck(lower: string): boolean {
  return lower.includes("benefits") || lower.includes("check my") || lower.includes("eligible") || lower.includes("snap") || lower.includes("qualify");
}

function isSingleParent(lower: string): boolean {
  return lower.includes("single") || lower.includes("parent") || lower.includes("childcare") || lower.includes("kids") || lower.includes("income");
}

function isHealthQuery(lower: string): boolean {
  return lower.includes("health") || lower.includes("clinic") || lower.includes("doctor") || lower.includes("dental");
}

function isApplicationHelp(lower: string): boolean {
  return lower.includes("form") || lower.includes("help with") || lower.includes("apply") || lower.includes("document");
}

function isNewToMontgomery(lower: string): boolean {
  return lower.includes("new to montgomery") || lower.includes("moved") || lower.includes("new to");
}

function isBridgePrograms(lower: string): boolean {
  return lower.includes("bridge") || lower.includes("negotiate") || lower.includes("walk me through") || lower.includes("transition");
}

export function getDemoResponse(userMessage: string): ChatMessage {
  const lower = userMessage.toLowerCase();

  if (isJobOffer(lower)) return getBenefitsCliffResponse();
  if (isMedicaidLoss(lower)) return getMedicaidLossResponse();
  if (isCareerGrowth(lower)) return getCareerLadderResponse();
  if (isReentry(lower)) return getReentryResponse();
  if (isBenefitsCheck(lower)) return getBenefitsEligibilityResponse();
  if (isSingleParent(lower)) return getSingleParentJobsResponse();
  if (isHealthQuery(lower)) return getHealthClinicsResponse();
  if (isApplicationHelp(lower)) return getApplicationHelpResponse();
  if (isNewToMontgomery(lower)) return getNewToMontgomeryResponse();
  if (isBridgePrograms(lower)) return getBridgeProgramsResponse();

  return getDefaultResponse();
}
