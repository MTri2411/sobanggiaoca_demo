import { Vitals } from '../types';

/**
 * Lấy thời gian hiện tại định dạng HH:MM theo chuẩn Việt Nam
 */
export const getCurrentTime = (): string => {
  return new Date().toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Tách huyết áp chuỗi (ví dụ "120/80") thành mảng [sys, dia]
 */
export const splitBloodPressure = (bp: string): [string, string] => {
  if (!bp) return ['', ''];
  const parts = bp.split('/');
  return [parts[0] || '', parts[1] || ''];
};

/**
 * Kiểm tra xem nhiệt độ có bị sốt (nhiệt độ >= 37.5) hay không
 */
export const isHighTemp = (temp: number): boolean => {
  return temp >= 37.5;
};

/**
 * Mức độ nghiêm trọng của chỉ số sinh tồn dùng để tô màu/gắn thẻ biến động.
 * - 'normal'   : trong ngưỡng bình thường
 * - 'warning'  : lệch nhẹ, cần theo dõi (vàng/cam)
 * - 'critical' : bất thường rõ rệt, cần can thiệp (đỏ)
 */
export type VitalSeverity = 'normal' | 'warning' | 'critical';

export const getVitalSeverity = (vitals: Partial<Vitals> | null | undefined): VitalSeverity => {
  if (!vitals) return 'normal';

  let severity: VitalSeverity = 'normal';
  const escalate = (level: VitalSeverity) => {
    if (level === 'critical') severity = 'critical';
    else if (level === 'warning' && severity !== 'critical') severity = 'warning';
  };

  // Nhiệt độ (sốt)
  if (vitals.temp !== undefined) {
    if (vitals.temp >= 38.5) escalate('critical');
    else if (vitals.temp >= 37.5) escalate('warning');
  }

  // SpO2
  if (vitals.spo2 !== undefined) {
    if (vitals.spo2 < 92) escalate('critical');
    else if (vitals.spo2 < 95) escalate('warning');
  }

  // Huyết áp
  if (vitals.bp) {
    const [sysStr, diaStr] = vitals.bp.split('/');
    const sys = parseInt(sysStr, 10);
    const dia = parseInt(diaStr, 10);
    if (!isNaN(sys)) {
      if (sys >= 160 || sys < 90) escalate('critical');
      else if (sys > 140) escalate('warning');
    }
    if (!isNaN(dia)) {
      if (dia >= 100 || dia < 60) escalate('critical');
      else if (dia > 90) escalate('warning');
    }
  }

  // Mạch
  if (vitals.pulse !== undefined) {
    if (vitals.pulse > 110 || vitals.pulse < 50) escalate('critical');
    else if (vitals.pulse > 100 || vitals.pulse < 60) escalate('warning');
  }

  return severity;
};

/**
 * Suy ra cờ "biến động sức khỏe" từ chỉ số sinh tồn (bất kỳ mức warning/critical nào).
 */
export const deriveFluctuation = (vitals: Partial<Vitals> | null | undefined): boolean => {
  return getVitalSeverity(vitals) !== 'normal';
};

/**
 * Phạm vi hợp lệ (ngưỡng cứng) cho từng chỉ số sinh tồn.
 * Ngoài ngưỡng này coi như nhập sai và sẽ bị từ chối.
 */
export const VITAL_RANGES = {
  spo2: { min: 50, max: 100, label: 'SpO₂', unit: '%' },
  pulse: { min: 30, max: 220, label: 'Mạch', unit: 'bpm' },
  bpSys: { min: 60, max: 260, label: 'Huyết áp tâm thu', unit: 'mmHg' },
  bpDia: { min: 30, max: 180, label: 'Huyết áp tâm trương', unit: 'mmHg' },
  temp: { min: 34, max: 43, label: 'Nhiệt độ', unit: '°C' },
  respiration: { min: 8, max: 40, label: 'Nhịp thở', unit: '/phút' },
  bloodSugar: { min: 20, max: 600, label: 'Đường huyết', unit: 'mg/dL' },
} as const;

export type VitalFormField =
  | 'spo2'
  | 'pulse'
  | 'bpSys'
  | 'bpDia'
  | 'temp'
  | 'bloodSugar'
  | 'respiration'
  | 'recordTime'
  | 'observation'
  | 'handoverAction';

export interface VitalsFormValues {
  bpSys: string;
  bpDia: string;
  spo2: string;
  pulse: string;
  temp: string;
  bloodSugar: string;
  respiration: string;
  recordTime: string;
  observation: string;
  handoverAction: string;
}

export type VitalsFormErrors = Partial<Record<VitalFormField, string>>;

/**
 * Chuyển chuỗi nhập tay thành số, trả về null nếu rỗng/không hợp lệ.
 */
export const parseVitalNumber = (value: string): number | null => {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
};

function validateRange(
  value: string,
  range: { min: number; max: number; label: string; unit: string },
  required: boolean
): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return required ? `Vui lòng nhập ${range.label.toLowerCase()}` : undefined;
  }
  const num = parseVitalNumber(trimmed);
  if (num === null) {
    return `${range.label} không hợp lệ`;
  }
  if (num < range.min || num > range.max) {
    return `${range.label} phải trong khoảng ${range.min}–${range.max} ${range.unit}`;
  }
  return undefined;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validate toàn bộ form chỉ số sinh tồn.
 * - requireAll = true (có biến động): bắt buộc đủ 5 chỉ số sinh tồn + 2 ô ghi chú.
 * - requireAll = false (ca ổn định): bắt buộc SpO₂, Mạch, Huyết áp; còn lại tùy chọn.
 * Đường huyết luôn tùy chọn nhưng nếu nhập thì phải trong ngưỡng.
 */
export const validateVitalsForm = (
  values: VitalsFormValues,
  options: { requireAll: boolean }
): VitalsFormErrors => {
  const { requireAll } = options;
  const errors: VitalsFormErrors = {};

  const spo2Err = validateRange(values.spo2, VITAL_RANGES.spo2, true);
  if (spo2Err) errors.spo2 = spo2Err;

  const pulseErr = validateRange(values.pulse, VITAL_RANGES.pulse, true);
  if (pulseErr) errors.pulse = pulseErr;

  const sysErr = validateRange(values.bpSys, VITAL_RANGES.bpSys, true);
  if (sysErr) errors.bpSys = sysErr;

  const diaErr = validateRange(values.bpDia, VITAL_RANGES.bpDia, true);
  if (diaErr) errors.bpDia = diaErr;

  // Tâm thu phải lớn hơn tâm trương khi cả hai hợp lệ.
  if (!sysErr && !diaErr) {
    const sys = parseVitalNumber(values.bpSys);
    const dia = parseVitalNumber(values.bpDia);
    if (sys !== null && dia !== null && sys <= dia) {
      errors.bpSys = 'Huyết áp tâm thu phải lớn hơn tâm trương';
    }
  }

  const tempErr = validateRange(values.temp, VITAL_RANGES.temp, requireAll);
  if (tempErr) errors.temp = tempErr;

  const respErr = validateRange(values.respiration, VITAL_RANGES.respiration, requireAll);
  if (respErr) errors.respiration = respErr;

  // Đường huyết luôn tùy chọn.
  const sugarErr = validateRange(values.bloodSugar, VITAL_RANGES.bloodSugar, false);
  if (sugarErr) errors.bloodSugar = sugarErr;

  if (!TIME_PATTERN.test(values.recordTime.trim())) {
    errors.recordTime = 'Vui lòng chọn giờ ghi nhận hợp lệ';
  }

  if (requireAll) {
    if (values.observation.trim() === '') {
      errors.observation = 'Vui lòng ghi nhận tình trạng khi có biến động';
    }
    if (values.handoverAction.trim() === '') {
      errors.handoverAction = 'Vui lòng nhập hướng xử lý / bàn giao khi có biến động';
    }
  }

  return errors;
};
