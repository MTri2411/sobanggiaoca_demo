import { Elderly, Vitals } from '@/types';
import { deriveFluctuation } from '@/utils/helpers';

export type StatusFilter =
  | 'all'
  | 'shift_fluctuation'
  | 'prior_fluctuation'
  | 'stable_perception'
  | 'pending';

/**
 * Suy trạng thái ghi nhận và cờ biến động từ dữ liệu thực tế.
 * - Biến động ca trực: phải có ghi nhận chỉ số trong ca + biến động.
 * - Biến động ca trước: chưa ghi nhận ca này + lịch sử ca trước có biến động.
 */
export function resolveElderRecordState(params: {
  vitalsMeasuredInShift: boolean;
  lastVitals?: Vitals;
  manualFluctuation?: boolean;
  historyHasFluctuation?: boolean;
  recentHistoryFluctuation?: boolean;
}): Pick<Elderly, 'status' | 'hasFluctuation' | 'recentFluctuationHistory' | 'vitalsMeasuredInShift'> {
  const {
    vitalsMeasuredInShift,
    lastVitals,
    manualFluctuation = false,
    historyHasFluctuation = false,
    recentHistoryFluctuation = false,
  } = params;

  const hasFluctuation =
    vitalsMeasuredInShift &&
    (deriveFluctuation(lastVitals) || manualFluctuation);

  const recentFluctuationHistory =
    !vitalsMeasuredInShift &&
    historyHasFluctuation &&
    recentHistoryFluctuation;

  let status: Elderly['status'];
  if (!vitalsMeasuredInShift) {
    status = 'stable';
  } else if (hasFluctuation) {
    status = 'need_attention';
  } else {
    status = 'logged';
  }

  return {
    status,
    hasFluctuation,
    recentFluctuationHistory,
    vitalsMeasuredInShift,
  };
}

/** Biến động trong ca trực — bắt buộc đã ghi nhận chỉ số trong ca. */
export function isShiftFluctuation(elder: Elderly): boolean {
  return (
    elder.status !== 'stable' &&
    elder.hasFluctuation &&
    Boolean(elder.vitalsMeasuredInShift)
  );
}

/** Biến động từ ca trước — chưa ghi nhận ca này, có lịch sử biến động ca liền trước. */
export function isPriorFluctuation(elder: Elderly): boolean {
  return (
    elder.status === 'stable' &&
    !elder.vitalsMeasuredInShift &&
    Boolean(elder.recentFluctuationHistory)
  );
}

export function isStablePerception(elder: Elderly): boolean {
  return (
    elder.status !== 'stable' &&
    !elder.hasFluctuation &&
    !elder.recentFluctuationHistory
  );
}

export function isPendingRecord(elder: Elderly): boolean {
  return elder.status === 'stable';
}

export function isLoggedInShift(elder: Elderly): boolean {
  return elder.status !== 'stable';
}

/** Thứ tự ưu tiên hiển thị khi xem tất cả — biến động lên trước để dễ theo dõi. */
function getElderDisplayPriority(elder: Elderly): number {
  if (isShiftFluctuation(elder)) return 0;
  if (isPriorFluctuation(elder)) return 1;
  if (isStablePerception(elder)) return 2;
  return 3;
}

export function sortResidentsByPriority(residents: Elderly[]): Elderly[] {
  return [...residents].sort(
    (a, b) => getElderDisplayPriority(a) - getElderDisplayPriority(b)
  );
}

export function filterResidents(residents: Elderly[], filter: StatusFilter): Elderly[] {
  switch (filter) {
    case 'all':
      return sortResidentsByPriority(residents);
    case 'shift_fluctuation':
      return residents.filter(isShiftFluctuation);
    case 'prior_fluctuation':
      return residents.filter(isPriorFluctuation);
    case 'stable_perception':
      return residents.filter(isStablePerception);
    case 'pending':
      return residents.filter(isPendingRecord);
    default:
      return residents;
  }
}

export function countByFilter(residents: Elderly[], filter: StatusFilter): number {
  return filterResidents(residents, filter).length;
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function searchResidents(residents: Elderly[], query: string): Elderly[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return residents;

  return residents.filter((resident) => {
    const name = normalizeSearchText(resident.name);
    const bed = normalizeSearchText(resident.bed);
    return name.includes(normalizedQuery) || bed.includes(normalizedQuery);
  });
}
