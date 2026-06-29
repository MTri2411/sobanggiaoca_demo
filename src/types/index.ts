export interface Vitals {
  time?: string;
  bp: string;
  spo2: number;
  pulse: number;
  temp: number;
  bloodSugar?: number;
  respiration: number;
}

export interface Elderly {
  id: string;
  name: string;
  age: number;
  gender: 'Nam' | 'Nữ';
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  height: number;
  weight: number;
  chronicDiseases: string[];
  caregiverName: string;
  room: string;
  bed: string;
  avatar: string;
  status: 'stable' | 'need_attention' | 'logged';
  lastVitals?: Vitals;
  vitalsMeasuredInShift?: boolean;
  /** Các lần đo được chăm sóc viên nhập trong ca (ngoài dữ liệu seed). */
  shiftVitalRecords?: ShiftVitalRecord[];
  observation?: string;
  handoverAction?: string;
  area: string;
  hasFluctuation: boolean;
  /** Biến động sức khỏe ghi nhận ở ca trước — cần theo dõi đặc biệt khi bàn giao sang ca mới. */
  recentFluctuationHistory?: boolean;
}

export type ShiftName = 'Ca sáng' | 'Ca chiều' | 'Ca đêm';

export interface ShiftVitalRecord {
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
  hasFluctuation: boolean;
}

export interface ShiftHistoryEntry {
  id: string;
  date: string;
  shift: ShiftName;
  recordedBy: string;
  bp: string;
  pulse: number;
  spo2: number;
  temp?: number;
  observation: string;
  handoverAction?: string;
  hasFluctuation: boolean;
}

export interface HealthRecord {
  id: string;
  date: string;
  recordedBy: string;
  bp: string;
  pulse: number;
  note: string;
}

export interface VisitRecord {
  id: string;
  date: string;
  doctor: string;
  result: string;
  treatment: string;
}

export interface Caregiver {
  id: string;
  name: string;
  avatar: string;
  facility: string;
  area: string;
  shift: 'Sáng' | 'Chiều' | 'Đêm';
  phone: string;
}
