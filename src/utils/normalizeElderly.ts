import { Elderly } from '@/types';
import { CAREGIVERS } from '@/data/mockData';

/** Ép cờ biến động tuân thủ ràng buộc khi nạp dữ liệu đã lưu. */
function enforceElderFlagConstraints(elder: Elderly): Elderly {
  const vitalsMeasuredInShift = Boolean(elder.vitalsMeasuredInShift);
  const hasFluctuation = vitalsMeasuredInShift && elder.hasFluctuation;
  const recentFluctuationHistory =
    elder.status === 'stable' &&
    !vitalsMeasuredInShift &&
    Boolean(elder.recentFluctuationHistory);

  let status = elder.status;
  if (status === 'need_attention' && !hasFluctuation) {
    status = vitalsMeasuredInShift ? 'logged' : 'stable';
  }

  return {
    ...elder,
    status,
    hasFluctuation,
    recentFluctuationHistory,
    vitalsMeasuredInShift,
  };
}

export function normalizeElderly(
  elder: Partial<Elderly> & { id: string },
  caregiverName?: string
): Elderly {
  return enforceElderFlagConstraints({
    id: elder.id,
    name: elder.name ?? '—',
    age: elder.age ?? 0,
    gender: elder.gender ?? 'Nam',
    dateOfBirth: elder.dateOfBirth ?? '—',
    address: elder.address ?? elder.area ?? '—',
    emergencyContact: elder.emergencyContact ?? '—',
    height: elder.height ?? 160,
    weight: elder.weight ?? 55,
    chronicDiseases: elder.chronicDiseases ?? [],
    caregiverName: elder.caregiverName ?? caregiverName ?? '—',
    room: elder.room ?? '—',
    bed: elder.bed ?? '—',
    avatar: elder.avatar ?? '',
    status: elder.status ?? 'stable',
    lastVitals: elder.lastVitals,
    vitalsMeasuredInShift: elder.vitalsMeasuredInShift ?? false,
    shiftVitalRecords: elder.shiftVitalRecords ?? [],
    observation: elder.observation,
    handoverAction: elder.handoverAction,
    area: elder.area ?? '—',
    hasFluctuation: elder.hasFluctuation ?? false,
    recentFluctuationHistory: elder.recentFluctuationHistory ?? false,
  });
}

export function normalizeResidentsData(
  data: Record<string, Partial<Elderly>[]>
): Record<string, Elderly[]> {
  const result: Record<string, Elderly[]> = {};

  for (const [cgId, list] of Object.entries(data)) {
    const caregiver = CAREGIVERS.find((c) => c.id === cgId);
    result[cgId] = (list ?? [])
      .filter((elder): elder is Partial<Elderly> & { id: string } => Boolean(elder?.id))
      .map((elder) => normalizeElderly(elder, caregiver?.name));
  }

  return result;
}
