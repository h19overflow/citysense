export interface ProfileData {
  zip?: string;
  householdSize?: number;
  income?: number;
  benefits?: string[];
  children?: number;
}

export interface CitizenCivicData extends ProfileData {
  neighborhood: string;
  incomeSource: string;
  childrenAges: number[];
  housingType: string;
  monthlyRent: number;
  hasVehicle: boolean;
  primaryTransport: string;
  internetAccess: string;
  languagesSpoken: string[];
  veteranStatus: boolean;
  disabilityStatus: boolean;
  citizenshipStatus: string;
  maritalStatus: string;
  age: number;
  gender: string;
  race: string;
  healthInsurance: string;
  needsChildcare: boolean;
  needsLegalHelp: boolean;
  needsHousingHelp: boolean;
  needsUtilityHelp: boolean;
}

export interface CitizenMeta {
  id: string;
  persona: string;
  tagline: string;
  avatarInitials: string;
  avatarColor: string;
  goals: string[];
  barriers: string[];
  civicData: CitizenCivicData;
}
