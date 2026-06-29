'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Elderly, Vitals } from '@/types';
import {
  getCurrentTime,
  getVitalSeverity,
  parseVitalNumber,
  splitBloodPressure,
  validateVitalsForm,
  type VitalFormField,
  type VitalsFormErrors,
  type VitalsFormValues,
} from '@/utils/helpers';
import {
  getShiftHistory,
  getShiftVitalRecords,
  getTodayVisits,
  getVisitHistory,
} from '@/utils/loadSeedData';
import {
  X,
  Check,
  Mic,
  Edit,
  FileText,
  Stethoscope,
  ClipboardList,
  History,
  ChevronLeft,
  ChevronRight,
  Wind,
  Heart,
  Activity,
  Thermometer,
  Save,
  Square,
  Droplet,
  AirVent,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

type SaveStage = 'idle' | 'confirming' | 'saving' | 'success';
type ConfirmKind = 'save' | 'discard-drawer' | 'discard-supplement' | 'disable-fluctuation';

interface FormSnapshot extends VitalsFormValues {
  hasFluctuation: boolean;
}

type DetailTab = 'shift' | 'history' | 'visits' | 'personal';
type NoteField = 'observation' | 'handover';

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const HISTORY_PAGE_SIZE = 8;
const VISITS_PAGE_SIZE = 6;

function VitalMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <span className="vital-metric-item">
      <span className="vital-metric-icon" aria-hidden>{icon}</span>
      <span className="vital-metric-label">{label}:</span>
      <strong>{value}</strong>
    </span>
  );
}

function ShiftNoteField({
  label,
  field,
  value,
  onChange,
  onBlur,
  placeholder,
  rows,
  listeningField,
  interimText,
  onMicClick,
  speechSupported,
  error,
  required,
}: {
  label: string;
  field: NoteField;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  rows: number;
  listeningField: NoteField | null;
  interimText: string;
  onMicClick: () => void;
  speechSupported: boolean;
  error?: string;
  required?: boolean;
}) {
  const isListening = listeningField === field;

  return (
    <div className={`shift-note-card${isListening ? ' is-listening' : ''}${error ? ' has-error' : ''}`}>
      <div className="shift-note-card-header">
        <span className="shift-note-card-title">
          {label}
          {required && <span className="shift-note-required" aria-hidden> *</span>}
        </span>
        <div className="shift-note-card-actions">
          <span className="shift-note-hint">
            {!speechSupported
              ? 'Trình duyệt không hỗ trợ ghi âm, vui lòng gõ tay'
              : isListening
                ? 'Đang ghi âm...'
                : 'Gõ tay hoặc ghi âm'}
          </span>
          {speechSupported && (
            <button
              type="button"
              className={`shift-note-mic-toggle${isListening ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onMicClick();
              }}
              aria-label={isListening ? 'Dừng ghi âm' : `Ghi âm ${label}`}
              aria-pressed={isListening ? 'true' : 'false'}
            >
              {isListening ? (
                <Square className="icon icon-sm" aria-hidden />
              ) : (
                <Mic className="icon icon-sm" aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>
      <div className="shift-note-editor">
        <textarea
          className="shift-note-textarea"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={error ? 'true' : 'false'}
        />
      </div>
      {isListening && interimText && (
        <p className="shift-note-live">
          <span className="shift-note-live-label">Đang nhận:</span> {interimText}
        </p>
      )}
      {error && <p className="vital-input-error">{error}</p>}
    </div>
  );
}

function DrawerConfirmDialog({
  open,
  kind,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  kind: ConfirmKind | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !kind) return null;

  const config: Record<
    ConfirmKind,
    { title: string; message: string; confirmLabel: string; cancelLabel: string; danger: boolean }
  > = {
    save: {
      title: 'Xác nhận lưu ghi nhận',
      message: 'Bạn có chắc chắn muốn lưu các chỉ số và ghi nhận sức khỏe trong ca này?',
      confirmLabel: 'Xác nhận lưu',
      cancelLabel: 'Xem lại',
      danger: false,
    },
    'discard-drawer': {
      title: 'Thay đổi chưa được lưu',
      message: 'Bạn có dữ liệu chưa lưu. Nếu thoát bây giờ, các thông tin vừa nhập sẽ bị mất.',
      confirmLabel: 'Hủy thay đổi',
      cancelLabel: 'Tiếp tục chỉnh sửa',
      danger: true,
    },
    'discard-supplement': {
      title: 'Thay đổi chưa được lưu',
      message: 'Bạn có dữ liệu chưa lưu. Nếu quay lại bây giờ, các thông tin vừa nhập sẽ bị mất.',
      confirmLabel: 'Hủy thay đổi',
      cancelLabel: 'Tiếp tục chỉnh sửa',
      danger: true,
    },
    'disable-fluctuation': {
      title: 'Tắt biến động sức khỏe?',
      message:
        'Ca trước ghi nhận có biến động. Tắt công tắc này có thể làm mất một số thông tin bắt buộc đã nhập. Bạn vẫn muốn tắt?',
      confirmLabel: 'Xác nhận tắt',
      cancelLabel: 'Giữ biến động',
      danger: true,
    },
  };

  const c = config[kind];

  return (
    <div className="drawer-confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="drawer-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={c.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`drawer-confirm-icon${c.danger ? ' is-danger' : ''}`} aria-hidden>
          <AlertTriangle className="icon icon-xl" />
        </div>
        <h4 className="drawer-confirm-title">{c.title}</h4>
        <p className="drawer-confirm-message">{c.message}</p>
        <div className="drawer-confirm-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            {c.cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${c.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {c.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ElderDetailDrawerProps {
  elder: Elderly | null;
  isOpen: boolean;
  onClose: () => void;
  onQuickStable: (id: string) => void;
  onSaveVitals: (
    elderId: string,
    data: { vitals: Vitals; observation: string; handoverAction: string; hasFluctuation: boolean }
  ) => void;
}

function ElderDetailDrawerComponent({
  elder,
  isOpen,
  onClose,
  onQuickStable,
  onSaveVitals,
}: ElderDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('shift');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isSupplementFormOpen, setIsSupplementFormOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const [historyPage, setHistoryPage] = useState(1);
  const [visitsPage, setVisitsPage] = useState(1);

  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [spo2, setSpo2] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [respiration, setRespiration] = useState('');
  const [observation, setObservation] = useState('');
  const [handoverAction, setHandoverAction] = useState('');
  const [hasFluctuation, setHasFluctuation] = useState(false);
  const [recordTime, setRecordTime] = useState('');
  const [saveStage, setSaveStage] = useState<SaveStage>('idle');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmKind | null>(null);
  const [touched, setTouched] = useState<Set<VitalFormField>>(new Set());
  const [snapshot, setSnapshot] = useState<FormSnapshot | null>(null);
  const [listeningField, setListeningField] = useState<NoteField | null>(null);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningFieldRef = useRef<NoteField | null>(null);
  const saveStageRef = useRef<SaveStage>('idle');
  const savingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  // Drawer chỉ render phía client (sau khi mở) nên không gây sai lệch hydration.
  const speechSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  useEffect(() => {
    saveStageRef.current = saveStage;
  }, [saveStage]);

  const markTouched = useCallback((field: VitalFormField) => {
    setTouched((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  const clearSaveTimers = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    const active = recognitionRef.current;
    if (active) {
      active.onresult = null;
      active.onerror = null;
      active.onend = null;
      active.stop();
    }
    recognitionRef.current = null;
    listeningFieldRef.current = null;
    setListeningField(null);
    setInterimText('');
  }, []);

  useEffect(() => {
    if (isOpen && elder) {
      // Không reset form khi đang lưu / vừa lưu xong để tránh gián đoạn animation đóng.
      if (saveStageRef.current !== 'idle') {
        requestAnimationFrame(() => setIsVisible(true));
        return;
      }
      const resetTimer = window.setTimeout(() => {
        setActiveTab('shift');
        setHistoryLoaded(false);
        setHistoryPage(1);
        setVisitsPage(1);
        setIsClosing(false);
        const [sys, dia] = splitBloodPressure(elder.lastVitals?.bp || '');
        const initialTime = getCurrentTime();
        const initialFluctuation = Boolean(elder.recentFluctuationHistory || elder.hasFluctuation);
        const snapshot: FormSnapshot = {
          bpSys: sys,
          bpDia: dia,
          spo2: elder.lastVitals?.spo2?.toString() || '',
          pulse: elder.lastVitals?.pulse?.toString() || '',
          temp: elder.lastVitals?.temp?.toString() || '',
          bloodSugar: elder.lastVitals?.bloodSugar?.toString() || '',
          respiration: elder.lastVitals?.respiration?.toString() || '18',
          recordTime: initialTime,
          observation: '',
          handoverAction: '',
          hasFluctuation: initialFluctuation,
        };
        setBpSys(snapshot.bpSys);
        setBpDia(snapshot.bpDia);
        setSpo2(snapshot.spo2);
        setPulse(snapshot.pulse);
        setTemp(snapshot.temp);
        setBloodSugar(snapshot.bloodSugar);
        setRespiration(snapshot.respiration);
        setObservation(snapshot.observation);
        setHandoverAction(snapshot.handoverAction);
        setRecordTime(snapshot.recordTime);
        setHasFluctuation(snapshot.hasFluctuation);
        setIsSupplementFormOpen(false);
        setSaveStage('idle');
        setConfirmDialog(null);
        setTouched(new Set());
        savingRef.current = false;
        setSnapshot(snapshot);
        stopListening();
      }, 0);
      requestAnimationFrame(() => setIsVisible(true));
      const loadTimer = window.setTimeout(() => setHistoryLoaded(true), 120);
      return () => {
        window.clearTimeout(resetTimer);
        window.clearTimeout(loadTimer);
      };
    }
    clearSaveTimers();
    saveStageRef.current = 'idle';
    savingRef.current = false;
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
      setSaveStage('idle');
      setConfirmDialog(null);
      stopListening();
    }, 0);
    return () => window.clearTimeout(hideTimer);
  }, [isOpen, elder?.id, elder?.lastVitals, elder?.hasFluctuation, elder?.recentFluctuationHistory, stopListening, clearSaveTimers]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current);
    };
  }, []);

  const startListening = useCallback(
    (field: NoteField) => {
      const SpeechRecognitionCtor =
        typeof window !== 'undefined'
          ? window.SpeechRecognition || window.webkitSpeechRecognition
          : undefined;

      if (!SpeechRecognitionCtor) return;

      if (listeningFieldRef.current === field) {
        stopListening();
        return;
      }

      stopListening();

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += text;
          } else {
            interim += text;
          }
        }
        if (finalChunk) {
          if (field === 'observation') {
            setObservation((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
          } else {
            setHandoverAction((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
          }
        }
        setInterimText(interim);
      };

      recognition.onerror = () => {
        if (recognitionRef.current === recognition) {
          stopListening();
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        listeningFieldRef.current = null;
        setListeningField(null);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      listeningFieldRef.current = field;
      setListeningField(field);
      setInterimText('');
      try {
        recognition.start();
      } catch {
        stopListening();
      }
    },
    [stopListening]
  );

  const performClose = useCallback(() => {
    clearSaveTimers();
    stopListening();
    setIsClosing(true);
    setIsVisible(false);
    window.setTimeout(() => onClose(), 320);
  }, [onClose, clearSaveTimers, stopListening]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const shiftVitalRecords = useMemo(() => {
    if (!historyLoaded || !elder) return [];
    const seedRecords = getShiftVitalRecords(elder.id);
    const manualRecords = elder.shiftVitalRecords ?? [];
    return [...seedRecords, ...manualRecords].sort((a, b) => b.time.localeCompare(a.time));
  }, [historyLoaded, elder?.id, elder?.shiftVitalRecords]);

  const todayShiftVisits = useMemo(
    () => (historyLoaded && elder ? getTodayVisits(elder.id) : []),
    [historyLoaded, elder?.id]
  );

  const shiftHistory = useMemo(
    () => (historyLoaded && elder ? getShiftHistory(elder.id) : []),
    [historyLoaded, elder?.id]
  );

  const visitRecords = useMemo(
    () => (historyLoaded && elder ? getVisitHistory(elder.id) : []),
    [historyLoaded, elder?.id]
  );

  const historyTotalPages = Math.max(1, Math.ceil(shiftHistory.length / HISTORY_PAGE_SIZE));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return shiftHistory.slice(start, start + HISTORY_PAGE_SIZE);
  }, [shiftHistory, historyPage]);

  const visitsTotalPages = Math.max(1, Math.ceil(visitRecords.length / VISITS_PAGE_SIZE));
  const paginatedVisits = useMemo(() => {
    const start = (visitsPage - 1) * VISITS_PAGE_SIZE;
    return visitRecords.slice(start, start + VISITS_PAGE_SIZE);
  }, [visitRecords, visitsPage]);

  const handleTabChange = useCallback(
    (tabId: DetailTab) => {
      const tabOrder: DetailTab[] = ['shift', 'history', 'visits', 'personal'];
      const currentIdx = tabOrder.indexOf(activeTab);
      const nextIdx = tabOrder.indexOf(tabId);
      setTabDirection(nextIdx >= currentIdx ? 'right' : 'left');
      setActiveTab(tabId);
      stopListening();
    },
    [activeTab, stopListening]
  );

  const handleQuickStable = useCallback(() => {
    if (elder) onQuickStable(elder.id);
  }, [elder, onQuickStable]);

  const resetVitalsFormFromElder = useCallback(() => {
    if (!elder) return;
    const [sys, dia] = splitBloodPressure(elder.lastVitals?.bp || '');
    const initialTime = getCurrentTime();
    const snapshot: FormSnapshot = {
      bpSys: sys,
      bpDia: dia,
      spo2: elder.lastVitals?.spo2?.toString() || '',
      pulse: elder.lastVitals?.pulse?.toString() || '',
      temp: elder.lastVitals?.temp?.toString() || '',
      bloodSugar: elder.lastVitals?.bloodSugar?.toString() || '',
      respiration: elder.lastVitals?.respiration?.toString() || '18',
      recordTime: initialTime,
      observation: '',
      handoverAction: '',
      hasFluctuation: false,
    };
    setBpSys(snapshot.bpSys);
    setBpDia(snapshot.bpDia);
    setSpo2(snapshot.spo2);
    setPulse(snapshot.pulse);
    setTemp(snapshot.temp);
    setBloodSugar(snapshot.bloodSugar);
    setRespiration(snapshot.respiration);
    setObservation(snapshot.observation);
    setHandoverAction(snapshot.handoverAction);
    setRecordTime(snapshot.recordTime);
    setHasFluctuation(snapshot.hasFluctuation);
    setTouched(new Set());
    setSnapshot(snapshot);
    stopListening();
  }, [elder, stopListening]);

  const handleOpenSupplementForm = useCallback(() => {
    resetVitalsFormFromElder();
    setIsSupplementFormOpen(true);
  }, [resetVitalsFormFromElder]);

  const formValues: VitalsFormValues = useMemo(
    () => ({
      bpSys,
      bpDia,
      spo2,
      pulse,
      temp,
      bloodSugar,
      respiration,
      recordTime,
      observation,
      handoverAction,
    }),
    [bpSys, bpDia, spo2, pulse, temp, bloodSugar, respiration, recordTime, observation, handoverAction]
  );

  const fieldErrors: VitalsFormErrors = useMemo(
    () => validateVitalsForm(formValues, { requireAll: hasFluctuation }),
    [formValues, hasFluctuation]
  );

  const isFormValid = Object.keys(fieldErrors).length === 0;

  const isDirty = useMemo(() => {
    if (!snapshot) return false;
    return (
      snapshot.bpSys !== bpSys ||
      snapshot.bpDia !== bpDia ||
      snapshot.spo2 !== spo2 ||
      snapshot.pulse !== pulse ||
      snapshot.temp !== temp ||
      snapshot.bloodSugar !== bloodSugar ||
      snapshot.respiration !== respiration ||
      snapshot.observation !== observation ||
      snapshot.handoverAction !== handoverAction ||
      snapshot.hasFluctuation !== hasFluctuation
    );
  }, [snapshot, bpSys, bpDia, spo2, pulse, temp, bloodSugar, respiration, observation, handoverAction, hasFluctuation]);

  const hasEnteredData = useCallback(
    () =>
      [bpSys, bpDia, spo2, pulse, temp, bloodSugar, respiration, observation, handoverAction].some(
        (v) => v.trim() !== ''
      ),
    [bpSys, bpDia, spo2, pulse, temp, bloodSugar, respiration, observation, handoverAction]
  );

  const requestClose = useCallback(() => {
    if (saveStage === 'saving' || saveStage === 'confirming') return;
    if (saveStage === 'success') {
      performClose();
      return;
    }
    const formShown = isSupplementFormOpen || shiftVitalRecords.length === 0;
    if (formShown && isDirty) {
      setConfirmDialog('discard-drawer');
      return;
    }
    performClose();
  }, [saveStage, isSupplementFormOpen, shiftVitalRecords.length, isDirty, performClose]);

  const handleCancelSupplementForm = useCallback(() => {
    if (isDirty) {
      setConfirmDialog('discard-supplement');
      return;
    }
    setIsSupplementFormOpen(false);
    stopListening();
  }, [isDirty, stopListening]);

  const handleToggleFluctuation = useCallback(
    (checked: boolean) => {
      if (!checked && hasFluctuation && hasEnteredData()) {
        setConfirmDialog('disable-fluctuation');
        return;
      }
      setHasFluctuation(checked);
    },
    [hasFluctuation, hasEnteredData]
  );

  const proceedSave = useCallback(() => {
    if (!elder || savingRef.current) return;
    savingRef.current = true;
    setConfirmDialog(null);
    setSaveStage('saving');
    saveStageRef.current = 'saving';
    stopListening();

    saveTimerRef.current = window.setTimeout(() => {
      const vitals: Vitals = {
        time: recordTime,
        bp: `${bpSys.trim()}/${bpDia.trim()}`,
        spo2: parseVitalNumber(spo2) ?? 96,
        pulse: parseVitalNumber(pulse) ?? 75,
        temp: parseVitalNumber(temp) ?? 36.5,
        respiration: parseVitalNumber(respiration) ?? 18,
      };
      const sugar = parseVitalNumber(bloodSugar);
      if (sugar !== null) vitals.bloodSugar = sugar;

      onSaveVitals(elder.id, {
        vitals,
        observation: observation.trim(),
        handoverAction: handoverAction.trim(),
        hasFluctuation,
      });

      setSaveStage('success');
      saveStageRef.current = 'success';
      successTimerRef.current = window.setTimeout(() => {
        performClose();
      }, 1000);
    }, 700);
  }, [
    elder,
    recordTime,
    bpSys,
    bpDia,
    spo2,
    pulse,
    temp,
    bloodSugar,
    respiration,
    observation,
    handoverAction,
    hasFluctuation,
    onSaveVitals,
    stopListening,
    performClose,
  ]);

  const handleSaveClick = useCallback(() => {
    if (saveStage !== 'idle') return;
    if (!isFormValid) {
      const allFields: VitalFormField[] = [
        'spo2',
        'pulse',
        'bpSys',
        'bpDia',
        'temp',
        'respiration',
        'bloodSugar',
        'recordTime',
        'observation',
        'handoverAction',
      ];
      setTouched(new Set(allFields));
      return;
    }
    setConfirmDialog('save');
  }, [saveStage, isFormValid]);

  const handleConfirmDialog = useCallback(() => {
    if (confirmDialog === 'save') {
      proceedSave();
    } else if (confirmDialog === 'discard-drawer') {
      setConfirmDialog(null);
      performClose();
    } else if (confirmDialog === 'discard-supplement') {
      setConfirmDialog(null);
      setIsSupplementFormOpen(false);
      resetVitalsFormFromElder();
    } else if (confirmDialog === 'disable-fluctuation') {
      setConfirmDialog(null);
      setHasFluctuation(false);
    }
  }, [confirmDialog, proceedSave, performClose, resetVitalsFormFromElder]);

  const handleCancelDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmDialog) {
        setConfirmDialog(null);
        return;
      }
      requestClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, confirmDialog, requestClose]);

  if (!isOpen || !elder) return null;

  const isLogged = elder.status !== 'stable';
  const hasShiftVitals = shiftVitalRecords.length > 0;
  const showVitalsForm = !hasShiftVitals || isSupplementFormOpen;
  const isSupplementMode = hasShiftVitals && isSupplementFormOpen;
  const vitalsFormTitle = isSupplementMode ? 'Bổ sung lần đo và ghi nhận' : 'Nhập chỉ số trong ca';
  const saveVitalsLabel = isSupplementMode ? 'Bổ sung lần đo và ghi nhận' : 'Lưu chỉ số';
  const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'shift', label: 'Ghi nhận trong ca', icon: <FileText className="icon icon-sm" /> },
    { id: 'history', label: 'Lịch sử ghi nhận', icon: <History className="icon icon-sm" /> },
    { id: 'visits', label: 'Lịch sử thăm khám', icon: <Stethoscope className="icon icon-sm" /> },
    { id: 'personal', label: 'Thông tin cá nhân', icon: <ClipboardList className="icon icon-sm" /> },
  ];
  return (
    <div
      className={`drawer-overlay ${isVisible && !isClosing ? 'drawer-overlay-visible' : ''}`}
      onClick={() => {
        if (!confirmDialog) requestClose();
      }}
      role="presentation"
    >
      <aside
        className={`elder-drawer ${isVisible && !isClosing ? 'elder-drawer-visible' : 'elder-drawer-closing'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="elder-drawer-title"
      >
        <header className="elder-drawer-header">
          <div className="elder-drawer-header-info">
            <img src={elder.avatar} alt="" className="elder-drawer-avatar" />
            <div>
              <h2 id="elder-drawer-title" className="elder-drawer-title">
                {elder.name}
              </h2>
              <p className="elder-drawer-subtitle">
                {elder.age} tuổi · {elder.gender} · {elder.area}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={requestClose}
            disabled={saveStage === 'saving' || saveStage === 'confirming'}
            aria-label="Đóng"
          >
            <X className="icon icon-xl" />
          </button>
        </header>

        <nav className="elder-drawer-tabs" aria-label="Chi tiết người cao tuổi">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`elder-drawer-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="elder-drawer-body">
          <div
            key={activeTab}
            className={`drawer-tab-panel drawer-tab-panel-${tabDirection}`}
          >
            {activeTab === 'shift' && (
              <div className="detail-section">
                {!historyLoaded ? (
                  <div className="detail-loading">
                    <div className="spinner" />
                    <span>Đang tải...</span>
                  </div>
                ) : showVitalsForm ? (
                  <div className="shift-vitals-form">
                    {isSupplementMode && (
                      <button
                        type="button"
                        className="shift-vitals-form-back"
                        onClick={handleCancelSupplementForm}
                      >
                        <ChevronLeft className="icon icon-sm" aria-hidden />
                        Quay lại
                      </button>
                    )}
                    <div className="shift-vitals-form-header">
                      <h3 className="detail-section-title shift-vitals-form-heading">{vitalsFormTitle}</h3>
                      <div className="fluctuation-toggle-wrap">
                        <span className="toggle-label-sm">Biến động sức khoẻ</span>
                        <label className="toggle-switch toggle-switch-glow" title="Biến động sức khỏe bất thường">
                          <input
                            type="checkbox"
                            checked={hasFluctuation}
                            onChange={(e) => handleToggleFluctuation(e.target.checked)}
                            aria-label="Biến động sức khỏe bất thường"
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    </div>

                    {hasFluctuation && (
                      <p className="shift-vitals-required-hint">
                        <AlertTriangle className="icon icon-xs" aria-hidden />
                        Ca có biến động: vui lòng nhập đầy đủ tất cả chỉ số và ghi chú bắt buộc.
                      </p>
                    )}

                    <div className="vital-time-row">
                      <label className="vital-time-label" htmlFor="record-time">
                        <Clock className="icon icon-xs" aria-hidden />
                        Giờ ghi nhận
                      </label>
                      <input
                        id="record-time"
                        type="time"
                        className={`vital-time-input${touched.has('recordTime') && fieldErrors.recordTime ? ' has-error' : ''}`}
                        value={recordTime}
                        onChange={(e) => {
                          setRecordTime(e.target.value);
                          markTouched('recordTime');
                        }}
                        onBlur={() => markTouched('recordTime')}
                        aria-label="Giờ ghi nhận chỉ số"
                      />
                      {touched.has('recordTime') && fieldErrors.recordTime && (
                        <span className="vital-input-error">{fieldErrors.recordTime}</span>
                      )}
                    </div>

                    <div className="shift-vitals-input-grid">
                      <div className="vital-input-cell">
                        <div className="vital-input-header">
                          <span className="vital-input-icon"><Wind className="icon icon-xs" aria-hidden /></span>
                          <span className="vital-input-label">SpO₂</span>
                        </div>
                        <div className="vital-input-value-row">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className={`vital-input-field${touched.has('spo2') && fieldErrors.spo2 ? ' has-error' : ''}`}
                            placeholder="96"
                            value={spo2}
                            onChange={(e) => {
                              setSpo2(e.target.value);
                              markTouched('spo2');
                            }}
                            onBlur={() => markTouched('spo2')}
                            aria-label="SpO2 phần trăm"
                            aria-invalid={touched.has('spo2') && fieldErrors.spo2 ? 'true' : 'false'}
                          />
                          <span className="vital-input-unit">%</span>
                        </div>
                        {touched.has('spo2') && fieldErrors.spo2 && (
                          <span className="vital-input-error">{fieldErrors.spo2}</span>
                        )}
                      </div>

                      <div className="vital-input-cell">
                        <div className="vital-input-header">
                          <span className="vital-input-icon"><Heart className="icon icon-xs" aria-hidden /></span>
                          <span className="vital-input-label">Mạch</span>
                        </div>
                        <div className="vital-input-value-row">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className={`vital-input-field${touched.has('pulse') && fieldErrors.pulse ? ' has-error' : ''}`}
                            placeholder="75"
                            value={pulse}
                            onChange={(e) => {
                              setPulse(e.target.value);
                              markTouched('pulse');
                            }}
                            onBlur={() => markTouched('pulse')}
                            aria-label="Nhịp mạch"
                            aria-invalid={touched.has('pulse') && fieldErrors.pulse ? 'true' : 'false'}
                          />
                          <span className="vital-input-unit">bpm</span>
                        </div>
                        {touched.has('pulse') && fieldErrors.pulse && (
                          <span className="vital-input-error">{fieldErrors.pulse}</span>
                        )}
                      </div>

                      <div className="vital-input-cell">
                        <div className="vital-input-header">
                          <span className="vital-input-icon"><Activity className="icon icon-xs" aria-hidden /></span>
                          <span className="vital-input-label">HA</span>
                        </div>
                        <div className="vital-bp-inputs">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className={`vital-input-field${touched.has('bpSys') && fieldErrors.bpSys ? ' has-error' : ''}`}
                            placeholder="120"
                            value={bpSys}
                            onChange={(e) => {
                              setBpSys(e.target.value);
                              markTouched('bpSys');
                            }}
                            onBlur={() => markTouched('bpSys')}
                            aria-label="Huyết áp tối đa"
                            aria-invalid={touched.has('bpSys') && fieldErrors.bpSys ? 'true' : 'false'}
                          />
                          <span className="vital-bp-sep">/</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className={`vital-input-field${touched.has('bpDia') && fieldErrors.bpDia ? ' has-error' : ''}`}
                            placeholder="80"
                            value={bpDia}
                            onChange={(e) => {
                              setBpDia(e.target.value);
                              markTouched('bpDia');
                            }}
                            onBlur={() => markTouched('bpDia')}
                            aria-label="Huyết áp tối thiểu"
                            aria-invalid={touched.has('bpDia') && fieldErrors.bpDia ? 'true' : 'false'}
                          />
                        </div>
                        {((touched.has('bpSys') && fieldErrors.bpSys) ||
                          (touched.has('bpDia') && fieldErrors.bpDia)) && (
                          <span className="vital-input-error">
                            {(touched.has('bpSys') && fieldErrors.bpSys) ||
                              (touched.has('bpDia') && fieldErrors.bpDia)}
                          </span>
                        )}
                      </div>

                      <div className="vital-input-cell">
                        <div className="vital-input-header">
                          <span className="vital-input-icon"><Thermometer className="icon icon-xs" aria-hidden /></span>
                          <span className="vital-input-label">Nhiệt</span>
                        </div>
                        <div className="vital-input-value-row">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            className={`vital-input-field${touched.has('temp') && fieldErrors.temp ? ' has-error' : ''}`}
                            placeholder="36.5"
                            value={temp}
                            onChange={(e) => {
                              setTemp(e.target.value);
                              markTouched('temp');
                            }}
                            onBlur={() => markTouched('temp')}
                            aria-label="Nhiệt độ"
                            aria-invalid={touched.has('temp') && fieldErrors.temp ? 'true' : 'false'}
                          />
                          <span className="vital-input-unit">°C</span>
                        </div>
                        {touched.has('temp') && fieldErrors.temp && (
                          <span className="vital-input-error">{fieldErrors.temp}</span>
                        )}
                      </div>

                      <div className="vital-input-cell">
                        <div className="vital-input-header">
                          <span className="vital-input-icon"><Droplet className="icon icon-xs" aria-hidden /></span>
                          <span className="vital-input-label">Đ/H</span>
                        </div>
                        <div className="vital-input-value-row">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className={`vital-input-field${touched.has('bloodSugar') && fieldErrors.bloodSugar ? ' has-error' : ''}`}
                            placeholder="—"
                            value={bloodSugar}
                            onChange={(e) => {
                              setBloodSugar(e.target.value);
                              markTouched('bloodSugar');
                            }}
                            onBlur={() => markTouched('bloodSugar')}
                            aria-label="Đường huyết"
                            aria-invalid={touched.has('bloodSugar') && fieldErrors.bloodSugar ? 'true' : 'false'}
                          />
                          <span className="vital-input-unit">mg</span>
                        </div>
                        {touched.has('bloodSugar') && fieldErrors.bloodSugar && (
                          <span className="vital-input-error">{fieldErrors.bloodSugar}</span>
                        )}
                      </div>

                      <div className="vital-input-cell">
                        <div className="vital-input-header">
                          <span className="vital-input-icon"><AirVent className="icon icon-xs" aria-hidden /></span>
                          <span className="vital-input-label">Thở</span>
                        </div>
                        <div className="vital-input-value-row">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className={`vital-input-field${touched.has('respiration') && fieldErrors.respiration ? ' has-error' : ''}`}
                            placeholder="18"
                            value={respiration}
                            onChange={(e) => {
                              setRespiration(e.target.value);
                              markTouched('respiration');
                            }}
                            onBlur={() => markTouched('respiration')}
                            aria-label="Nhịp thở"
                            aria-invalid={touched.has('respiration') && fieldErrors.respiration ? 'true' : 'false'}
                          />
                          <span className="vital-input-unit">/p</span>
                        </div>
                        {touched.has('respiration') && fieldErrors.respiration && (
                          <span className="vital-input-error">{fieldErrors.respiration}</span>
                        )}
                      </div>
                    </div>

                    <div className="shift-notes-form">
                      <ShiftNoteField
                        label="Ghi nhận tình trạng"
                        field="observation"
                        value={observation}
                        onChange={(v) => {
                          setObservation(v);
                          markTouched('observation');
                        }}
                        onBlur={() => markTouched('observation')}
                        placeholder="Ví dụ: Ăn hết suất, ngủ sâu..."
                        rows={4}
                        listeningField={listeningField}
                        interimText={interimText}
                        onMicClick={() => startListening('observation')}
                        speechSupported={speechSupported}
                        required={hasFluctuation}
                        error={touched.has('observation') ? fieldErrors.observation : undefined}
                      />
                      <ShiftNoteField
                        label="Hướng xử lý / Bàn giao"
                        field="handover"
                        value={handoverAction}
                        onChange={(v) => {
                          setHandoverAction(v);
                          markTouched('handoverAction');
                        }}
                        onBlur={() => markTouched('handoverAction')}
                        placeholder="Ví dụ: Theo dõi sát nhiệt độ..."
                        rows={3}
                        listeningField={listeningField}
                        interimText={interimText}
                        onMicClick={() => startListening('handover')}
                        speechSupported={speechSupported}
                        required={hasFluctuation}
                        error={touched.has('handoverAction') ? fieldErrors.handoverAction : undefined}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="detail-section-title">Chỉ số đo trong ca</h3>
                    <div className="shift-vitals-list">
                      {shiftVitalRecords.map((record) => {
                        const severity = getVitalSeverity(record);
                        return (
                        <div key={record.id} className={`shift-vital-card shift-vital-card-${severity}`}>
                          <div className="shift-vital-card-header">
                            <time>{record.time}</time>
                            <span>{record.recordedBy}</span>
                            {record.hasFluctuation && (
                              <span className={`elder-tag elder-tag-sm ${severity === 'critical' ? 'elder-tag-fluctuation' : 'elder-tag-prior-fluctuation'}`}>
                                {severity === 'critical' ? 'Biến động nặng' : 'Biến động'}
                              </span>
                            )}
                          </div>
                          <div className="shift-vital-grid">
                            <VitalMetric icon={<Wind className="icon icon-sm" />} label="SpO₂" value={`${record.spo2}%`} />
                            <VitalMetric icon={<Heart className="icon icon-sm" />} label="Mạch" value={record.pulse} />
                            <VitalMetric icon={<Activity className="icon icon-sm" />} label="HA" value={record.bp} />
                            {record.temp != null && (
                              <VitalMetric icon={<Thermometer className="icon icon-sm" />} label="Nhiệt" value={`${record.temp}°C`} />
                            )}
                            {record.respiration != null && (
                              <VitalMetric icon={<AirVent className="icon icon-sm" />} label="Thở" value={`${record.respiration}/p`} />
                            )}
                            {record.bloodSugar != null && (
                              <VitalMetric icon={<Droplet className="icon icon-sm" />} label="Đ/H" value={`${record.bloodSugar} mg`} />
                            )}
                          </div>
                          {record.note && <p className="shift-vital-note">{record.note}</p>}
                        </div>
                        );
                      })}
                    </div>

                    {(elder.observation || elder.handoverAction) && (
                      <>
                        <h3 className="detail-section-title">Ghi chú ca trực</h3>
                        {elder.observation && <p className="detail-note">{elder.observation}</p>}
                        {elder.handoverAction && <p className="detail-note">{elder.handoverAction}</p>}
                      </>
                    )}

                    <h3 className="detail-section-title">
                      <Stethoscope className="icon icon-md" aria-hidden />
                      Thăm khám bác sĩ trong ca ({todayShiftVisits.length})
                    </h3>
                    {todayShiftVisits.length === 0 ? (
                      <p className="detail-empty">Chưa có lịch thăm khám trong ca này.</p>
                    ) : (
                      <div className="visit-timeline">
                        {todayShiftVisits.map((v) => (
                          <div key={v.id} className="visit-timeline-item">
                            <div className="visit-timeline-dot" />
                            <div className="visit-timeline-content">
                              <time className="visit-date">{v.date}</time>
                              <p className="visit-doctor">{v.doctor}</p>
                              <p className="visit-result">{v.result}</p>
                              <p className="visit-treatment">
                                <strong>Chỉ định:</strong> {v.treatment}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  Lịch sử ghi nhận ({shiftHistory.length})
                </h3>
                {!historyLoaded ? (
                  <div className="detail-loading">
                    <div className="spinner" />
                    <span>Đang tải lịch sử...</span>
                  </div>
                ) : (
                  <>
                    <div className="shift-history-list">
                      {paginatedHistory.map((entry) => {
                        const severity = getVitalSeverity(entry);
                        return (
                        <div key={entry.id} className={`shift-history-card shift-history-card-${severity}`}>
                          <div className="shift-history-card-header">
                            <div>
                              <time className="shift-history-date">{entry.date}</time>
                              <span className="shift-history-shift">{entry.shift}</span>
                            </div>
                            {entry.hasFluctuation ? (
                              <span className={`elder-tag elder-tag-sm ${severity === 'critical' ? 'elder-tag-fluctuation' : 'elder-tag-prior-fluctuation'}`}>
                                {severity === 'critical' ? 'Biến động nặng' : 'Biến động sức khoẻ'}
                              </span>
                            ) : (
                              <span className="elder-tag elder-tag-stable elder-tag-sm">
                                Cảm quan ổn định
                              </span>
                            )}
                          </div>
                          <div className="shift-vital-grid">
                            <VitalMetric icon={<Wind className="icon icon-sm" />} label="SpO₂" value={`${entry.spo2}%`} />
                            <VitalMetric icon={<Heart className="icon icon-sm" />} label="Mạch" value={entry.pulse} />
                            <VitalMetric icon={<Activity className="icon icon-sm" />} label="HA" value={entry.bp} />
                          </div>
                          <p className="shift-history-obs">{entry.observation}</p>
                          {entry.handoverAction && (
                            <p className="shift-history-handover">
                              <strong>Bàn giao:</strong> {entry.handoverAction}
                            </p>
                          )}
                          <p className="shift-history-by">Ghi bởi {entry.recordedBy}</p>
                        </div>
                        );
                      })}
                    </div>

                    {shiftHistory.length > HISTORY_PAGE_SIZE && (
                      <div className="detail-pagination">
                        <button
                          type="button"
                          className="detail-pagination-btn"
                          disabled={historyPage <= 1}
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          aria-label="Trang trước"
                        >
                          <ChevronLeft className="icon icon-lg" />
                        </button>
                        <span className="detail-pagination-info">
                          Trang {historyPage} / {historyTotalPages}
                        </span>
                        <button
                          type="button"
                          className="detail-pagination-btn"
                          disabled={historyPage >= historyTotalPages}
                          onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                          aria-label="Trang sau"
                        >
                          <ChevronRight className="icon icon-lg" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'visits' && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  <Stethoscope className="icon icon-md" aria-hidden />
                  Lịch sử thăm khám ({visitRecords.length})
                </h3>
                {!historyLoaded ? (
                  <div className="detail-loading">
                    <div className="spinner" />
                    <span>Đang tải lịch sử...</span>
                  </div>
                ) : (
                  <>
                    <div className="visit-timeline">
                      {paginatedVisits.map((v) => (
                        <div key={v.id} className="visit-timeline-item">
                          <div className="visit-timeline-dot" />
                          <div className="visit-timeline-content">
                            <time className="visit-date">{v.date}</time>
                            <p className="visit-doctor">{v.doctor}</p>
                            <p className="visit-result">{v.result}</p>
                            <p className="visit-treatment">
                              <strong>Chỉ định:</strong> {v.treatment}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {visitRecords.length > VISITS_PAGE_SIZE && (
                      <div className="detail-pagination">
                        <button
                          type="button"
                          className="detail-pagination-btn"
                          disabled={visitsPage <= 1}
                          onClick={() => setVisitsPage((p) => Math.max(1, p - 1))}
                          aria-label="Trang trước"
                        >
                          <ChevronLeft className="icon icon-lg" />
                        </button>
                        <span className="detail-pagination-info">
                          Trang {visitsPage} / {visitsTotalPages}
                        </span>
                        <button
                          type="button"
                          className="detail-pagination-btn"
                          disabled={visitsPage >= visitsTotalPages}
                          onClick={() => setVisitsPage((p) => Math.min(visitsTotalPages, p + 1))}
                          aria-label="Trang sau"
                        >
                          <ChevronRight className="icon icon-lg" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="detail-section">
                <h3 className="detail-section-title">Thông tin cá nhân</h3>
                <dl className="detail-dl">
                  <div className="detail-row">
                    <dt>Họ tên</dt>
                    <dd>{elder.name}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Ngày sinh</dt>
                    <dd>{elder.dateOfBirth ?? '—'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Tuổi</dt>
                    <dd>{elder.age}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Giới tính</dt>
                    <dd>{elder.gender ?? '—'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Địa chỉ</dt>
                    <dd>{elder.address ?? '—'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Người thân liên hệ</dt>
                    <dd>{elder.emergencyContact ?? '—'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Phòng / Giường</dt>
                    <dd>{elder.room} · {elder.bed}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Người chăm sóc</dt>
                    <dd>{elder.caregiverName ?? '—'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Chiều cao</dt>
                    <dd>{elder.height != null ? `${elder.height} cm` : '—'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Cân nặng</dt>
                    <dd>{elder.weight != null ? `${elder.weight} kg` : '—'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Bệnh nền</dt>
                    <dd>
                      {(elder.chronicDiseases ?? []).length > 0
                        ? (elder.chronicDiseases ?? []).join(', ')
                        : 'Không có'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>

        <footer className="elder-drawer-footer">
          {showVitalsForm ? (
            <>
              {!isFormValid && (
                <p className="elder-drawer-footer-hint">
                  <AlertTriangle className="icon icon-xs" aria-hidden />
                  Vui lòng nhập đủ các trường bắt buộc và đúng phạm vi để lưu.
                </p>
              )}
              <div className="elder-drawer-footer-actions">
                {!isLogged && (
                  <button
                    type="button"
                    className="btn-action btn-action-stable"
                    onClick={handleQuickStable}
                    disabled={saveStage !== 'idle'}
                  >
                    <Check className="icon icon-md" />
                    Cảm quan ổn định
                  </button>
                )}
                <button
                  type="button"
                  className="btn-action btn-action-manual"
                  onClick={handleSaveClick}
                  disabled={!isFormValid || saveStage !== 'idle'}
                >
                  <Save className="icon icon-md" />
                  {saveVitalsLabel}
                </button>
              </div>
            </>
          ) : (
            <>
              {!isLogged && (
                <button
                  type="button"
                  className="btn-action btn-action-stable"
                  onClick={handleQuickStable}
                >
                  <Check className="icon icon-md" />
                  Cảm quan ổn định
                </button>
              )}
              <button type="button" className="btn-action btn-action-manual" onClick={handleOpenSupplementForm}>
                <Edit className="icon icon-md" />
                Nhập chỉ số
              </button>
            </>
          )}
        </footer>

        {(saveStage === 'saving' || saveStage === 'success') && (
          <div className="drawer-save-overlay" role="status" aria-live="polite">
            <div className="drawer-save-panel">
              {saveStage === 'saving' ? (
                <>
                  <div className="spinner spinner-lg" />
                  <p className="drawer-save-text">Đang lưu ghi nhận...</p>
                </>
              ) : (
                <>
                  <div className="drawer-save-success-icon" aria-hidden>
                    <CheckCircle2 className="icon icon-2xl" />
                  </div>
                  <p className="drawer-save-text">Đã lưu thành công</p>
                </>
              )}
            </div>
          </div>
        )}

        <DrawerConfirmDialog
          open={Boolean(confirmDialog)}
          kind={confirmDialog}
          onConfirm={handleConfirmDialog}
          onCancel={handleCancelDialog}
        />
      </aside>
    </div>
  );
}

const ElderDetailDrawer = memo(ElderDetailDrawerComponent);
ElderDetailDrawer.displayName = 'ElderDetailDrawer';

export default ElderDetailDrawer;
