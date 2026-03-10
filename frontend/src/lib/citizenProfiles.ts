/**
 * Mock citizen profile loader.
 * Loads pre-built personas from mock_citizens.json and maps them
 * into both CvData (career tab) and ProfileData (civic tab).
 */
import type { CvData, ProfileData, CitizenCivicData } from "./types";

export type { CitizenCivicData };

export interface CitizenProfile {
  id: string;
  persona: string;
  tagline: string;
  avatarInitials: string;
  avatarColor: string;
  profile: CitizenCivicData;
  cv: CvData;
  goals: string[];
  barriers: string[];
}

interface RawCitizen {
  id: string;
  persona: string;
  tagline: string;
  avatar_initials: string;
  avatar_color: string;
  profile: Record<string, unknown>;
  cv: Record<string, unknown>;
  goals: string[];
  barriers: string[];
}

function parseRawCitizen(raw: RawCitizen): CitizenProfile {
  const p = raw.profile;
  return {
    id: raw.id,
    persona: raw.persona,
    tagline: raw.tagline,
    avatarInitials: raw.avatar_initials,
    avatarColor: raw.avatar_color,
    profile: {
      zip: p.zip as string,
      neighborhood: p.neighborhood as string,
      householdSize: p.householdSize as number,
      income: p.income as number,
      incomeSource: p.incomeSource as string,
      benefits: p.benefits as string[],
      children: p.children as number,
      childrenAges: p.childrenAges as number[],
      housingType: p.housingType as string,
      monthlyRent: p.monthlyRent as number,
      hasVehicle: p.hasVehicle as boolean,
      primaryTransport: p.primaryTransport as string,
      internetAccess: p.internetAccess as string,
      languagesSpoken: p.languagesSpoken as string[],
      veteranStatus: p.veteranStatus as boolean,
      disabilityStatus: p.disabilityStatus as boolean,
      citizenshipStatus: p.citizenshipStatus as string,
      maritalStatus: p.maritalStatus as string,
      age: p.age as number,
      gender: p.gender as string,
      race: p.race as string,
      healthInsurance: p.healthInsurance as string,
      needsChildcare: p.needsChildcare as boolean,
      needsLegalHelp: p.needsLegalHelp as boolean,
      needsHousingHelp: p.needsHousingHelp as boolean,
      needsUtilityHelp: p.needsUtilityHelp as boolean,
    },
    cv: raw.cv as unknown as CvData,
    goals: raw.goals,
    barriers: raw.barriers,
  };
}

let cached: CitizenProfile[] | null = null;

export async function fetchCitizenProfiles(): Promise<CitizenProfile[]> {
  if (cached) return cached;
  const response = await fetch("/data/mock_citizens.json");
  if (!response.ok) return [];
  const data = await response.json();
  cached = (data.citizens as RawCitizen[]).map(parseRawCitizen);
  return cached;
}

export function extractProfileData(citizen: CitizenProfile): ProfileData {
  return {
    zip: citizen.profile.zip,
    householdSize: citizen.profile.householdSize,
    income: citizen.profile.income,
    benefits: citizen.profile.benefits,
    children: citizen.profile.children,
  };
}
