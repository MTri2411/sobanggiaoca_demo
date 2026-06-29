import { Caregiver, Elderly } from '../types';
import {
  buildResidentsByCaregiver,
  getCaregivers,
  getFacilityName,
} from '../utils/loadSeedData';

export const SHIFTS = ['Sáng', 'Chiều', 'Đêm'] as const;
export const AREAS = ['Khu A', 'Khu B', 'Khu C'] as const;

export const FACILITY_NAME = getFacilityName();

export const CAREGIVERS: Caregiver[] = getCaregivers();

export const MOCK_ELDERLY: Record<string, Elderly[]> = buildResidentsByCaregiver();
