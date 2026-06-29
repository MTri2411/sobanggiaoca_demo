import {
  Caregiver,
  Elderly,
  ShiftHistoryEntry,
  ShiftName,
  ShiftVitalRecord,
  VisitRecord,
  Vitals,
} from '@/types';
import { deriveFluctuation } from '@/utils/helpers';
import { resolveElderRecordState } from '@/utils/elderFilters';
import seed from '@/data/seedData.json';

interface SeedShiftVitalRecord {
  id: string;
  time: string;
  recordedBy: string;
  bp: string;
  pulse: number;
  spo2: number;
  temp?: number;
  respiration?: number;
  bloodSugar?: number;
  note?: string;
}

interface SeedShiftHistoryEntry {
  id: string;
  daysAgo: number;
  shift: ShiftName;
  recordedBy: string;
  bp: string;
  pulse: number;
  spo2: number;
  temp?: number;
  observation: string;
  handoverAction?: string;
}

interface SeedVisitRecord {
  id: string;
  daysAgo?: number;
  doctor: string;
  result: string;
  treatment: string;
}

interface SeedElder {
  id: string;
  caregiverId: string;
  name: string;
  age: number;
  gender: 'Nam' | 'Nữ';
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  height: number;
  weight: number;
  chronicDiseases: string[];
  room: string;
  bed: string;
  area: string;
  avatar: string;
  status: Elderly['status'];
  shiftVitalRecords: SeedShiftVitalRecord[];
  shiftHistory: SeedShiftHistoryEntry[];
  visitHistory: SeedVisitRecord[];
  todayVisits: SeedVisitRecord[];
}

interface SeedData {
  facilityName: string;
  caregivers: Caregiver[];
  elders: SeedElder[];
}

const seedData = seed as SeedData;

const elderById = new Map<string, SeedElder>(seedData.elders.map((e) => [e.id, e]));

/** Thứ tự ca trong ngày: Đêm muộn nhất → đứng trước khi sắp xếp "mới nhất lên đầu". */
const SHIFT_RANK: Record<ShiftName, number> = {
  'Ca đêm': 3,
  'Ca chiều': 2,
  'Ca sáng': 1,
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function dateFromDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatDate(d);
}

export function getCaregivers(): Caregiver[] {
  return seedData.caregivers;
}

export function getFacilityName(): string {
  return seedData.facilityName;
}

/**
 * Ghi nhận trong ca — suy ra cờ biến động từ chỉ số, sắp xếp mới nhất (giờ muộn nhất) lên đầu.
 */
export function getShiftVitalRecords(elderId: string): ShiftVitalRecord[] {
  const elder = elderById.get(elderId);
  if (!elder) return [];

  return elder.shiftVitalRecords
    .map((r) => ({
      id: r.id,
      time: r.time,
      recordedBy: r.recordedBy,
      bp: r.bp,
      pulse: r.pulse,
      spo2: r.spo2,
      temp: r.temp,
      respiration: r.respiration,
      bloodSugar: r.bloodSugar,
      note: r.note,
      hasFluctuation: deriveFluctuation(r),
    }))
    .sort((a, b) => b.time.localeCompare(a.time));
}

/**
 * Lịch sử ghi nhận — đổi offset ngày thành ngày hiển thị, suy cờ biến động,
 * sắp xếp mới nhất lên đầu (ngày gần nhất, trong ngày thì ca muộn hơn đứng trước).
 */
export function getShiftHistory(elderId: string): ShiftHistoryEntry[] {
  const elder = elderById.get(elderId);
  if (!elder) return [];

  return elder.shiftHistory
    .map((e) => ({
      id: e.id,
      date: dateFromDaysAgo(e.daysAgo),
      shift: e.shift,
      recordedBy: e.recordedBy,
      bp: e.bp,
      pulse: e.pulse,
      spo2: e.spo2,
      temp: e.temp,
      observation: e.observation,
      handoverAction: e.handoverAction,
      hasFluctuation: deriveFluctuation(e),
      _daysAgo: e.daysAgo,
    }))
    .sort((a, b) => {
      if (a._daysAgo !== b._daysAgo) return a._daysAgo - b._daysAgo;
      return SHIFT_RANK[b.shift] - SHIFT_RANK[a.shift];
    })
    .map(({ _daysAgo, ...entry }) => {
      void _daysAgo;
      return entry;
    });
}

/**
 * Lịch sử thăm khám — đổi offset ngày thành ngày hiển thị, sắp xếp mới nhất lên đầu.
 */
export function getVisitHistory(elderId: string): VisitRecord[] {
  const elder = elderById.get(elderId);
  if (!elder) return [];

  return elder.visitHistory
    .map((v) => ({
      id: v.id,
      date: dateFromDaysAgo(v.daysAgo ?? 0),
      doctor: v.doctor,
      result: v.result,
      treatment: v.treatment,
      _daysAgo: v.daysAgo ?? 0,
    }))
    .sort((a, b) => a._daysAgo - b._daysAgo)
    .map(({ _daysAgo, ...rest }) => {
      void _daysAgo;
      return rest;
    });
}

/**
 * Thăm khám bác sĩ trong ca hôm nay.
 */
export function getTodayVisits(elderId: string): VisitRecord[] {
  const elder = elderById.get(elderId);
  if (!elder) return [];

  const today = formatDate(new Date());
  return elder.todayVisits.map((v) => ({
    id: v.id,
    date: today,
    doctor: v.doctor,
    result: v.result,
    treatment: v.treatment,
  }));
}

function toVitals(record: SeedShiftVitalRecord): Vitals {
  return {
    time: record.time,
    bp: record.bp,
    spo2: record.spo2,
    pulse: record.pulse,
    temp: record.temp ?? 36.5,
    respiration: record.respiration ?? 18,
    bloodSugar: record.bloodSugar,
  };
}

function buildElderly(elder: SeedElder, caregiverName: string): Elderly {
  const sortedShiftVitals = getShiftVitalRecords(elder.id);
  const latest = sortedShiftVitals[0];
  const sortedHistory = getShiftHistory(elder.id);

  const recordState = resolveElderRecordState({
    vitalsMeasuredInShift: sortedShiftVitals.length > 0,
    lastVitals: latest ? toVitals(latest) : undefined,
    historyHasFluctuation: sortedHistory.some((entry) => entry.hasFluctuation),
    recentHistoryFluctuation: Boolean(sortedHistory[0]?.hasFluctuation),
  });

  const observation = latest ? latest.note ?? undefined : undefined;
  const handoverAction = latest
    ? recordState.hasFluctuation
      ? 'Theo dõi sát chỉ số, báo bác sĩ nếu có thay đổi.'
      : 'Theo dõi sinh hoạt thông thường.'
    : undefined;

  return {
    id: elder.id,
    name: elder.name,
    age: elder.age,
    gender: elder.gender,
    dateOfBirth: elder.dateOfBirth,
    address: elder.address,
    emergencyContact: elder.emergencyContact,
    height: elder.height,
    weight: elder.weight,
    chronicDiseases: elder.chronicDiseases,
    caregiverName,
    room: elder.room,
    bed: elder.bed,
    avatar: elder.avatar,
    status: recordState.status,
    lastVitals: latest ? toVitals(latest) : undefined,
    vitalsMeasuredInShift: recordState.vitalsMeasuredInShift,
    observation,
    handoverAction,
    area: elder.area,
    hasFluctuation: recordState.hasFluctuation,
    recentFluctuationHistory: recordState.recentFluctuationHistory,
  };
}

/**
 * Dựng danh sách người cao tuổi theo từng chăm sóc viên, suy ra mọi cờ trạng thái từ dữ liệu nền.
 */
export function buildResidentsByCaregiver(): Record<string, Elderly[]> {
  const caregiverNameById = new Map(seedData.caregivers.map((c) => [c.id, c.name]));
  const result: Record<string, Elderly[]> = {};

  for (const caregiver of seedData.caregivers) {
    result[caregiver.id] = [];
  }

  for (const elder of seedData.elders) {
    const caregiverName = caregiverNameById.get(elder.caregiverId) ?? '—';
    if (!result[elder.caregiverId]) result[elder.caregiverId] = [];
    result[elder.caregiverId].push(buildElderly(elder, caregiverName));
  }

  return result;
}
