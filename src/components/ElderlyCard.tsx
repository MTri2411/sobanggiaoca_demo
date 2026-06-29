'use client';

import React, { memo, useCallback } from 'react';
import { Elderly } from '@/types';
import { isPriorFluctuation, isShiftFluctuation } from '@/utils/elderFilters';
import {
  Activity,
  AirVent,
  Clock,
  Droplet,
  Heart,
  Thermometer,
  Wind,
} from 'lucide-react';

interface ElderlyCardProps {
  elder: Elderly;
  onClick: (id: string) => void;
}

function VitalCell({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string | null;
  unit?: string;
  icon: React.ReactNode;
}) {
  const hasValue = value != null && value !== '';
  return (
    <div className={`elder-vital-cell ${hasValue ? 'has-value' : 'is-empty'}`}>
      <div className="elder-vital-header-row">
        <span className="elder-vital-icon">{icon}</span>
        <span className="elder-vital-label">{label}</span>
      </div>
      <span
        className="elder-vital-value"
        aria-label={hasValue ? `${label} ${value}${unit ?? ''}` : `${label} chưa đo`}
      >
        {hasValue ? (
          <>
            {value}
            {unit && <small>{unit}</small>}
          </>
        ) : (
          <span className="elder-vital-placeholder">—</span>
        )}
      </span>
    </div>
  );
}

function ElderlyCardComponent({ elder, onClick }: ElderlyCardProps) {
  const handleClick = useCallback(() => onClick(elder.id), [elder.id, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(elder.id);
      }
    },
    [elder.id, onClick]
  );

  const isRecordedInShift = elder.status !== 'stable';
  const showVitals = isRecordedInShift && elder.vitalsMeasuredInShift && elder.lastVitals;
  const vitals = elder.lastVitals;

  let cardStateClass = 'elder-card-pending';
  if (isRecordedInShift) {
    cardStateClass = isShiftFluctuation(elder) ? 'elder-card-fluctuation' : 'elder-card-logged';
  }

  return (
    <article
      className={`elder-card-compact elder-card-glass ${cardStateClass}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết ${elder.name}`}
    >
      <p className="elder-card-location">
        {elder.area} · {elder.bed}
      </p>
      <div className="elder-card-compact-top">
        <img
          src={elder.avatar}
          alt=""
          className="elder-card-avatar"
          loading="lazy"
        />
        <div className="elder-card-compact-meta">
          <h4 className="elder-card-name">{elder.name}</h4>
          <p className="elder-card-sub">
            {elder.age} tuổi · {elder.gender}
          </p>
        </div>
      </div>

      <div className="elder-card-vitals">
        <VitalCell
          label="SpO₂"
          icon={<Wind className="icon icon-vital" aria-hidden />}
          value={showVitals ? String(vitals!.spo2) : null}
          unit="%"
        />
        <VitalCell
          label="Mạch"
          icon={<Heart className="icon icon-vital" aria-hidden />}
          value={showVitals ? String(vitals!.pulse) : null}
          unit=" bpm"
        />
        <VitalCell
          label="HA"
          icon={<Activity className="icon icon-vital" aria-hidden />}
          value={showVitals ? vitals!.bp : null}
        />
        <VitalCell
          label="Nhiệt"
          icon={<Thermometer className="icon icon-vital" aria-hidden />}
          value={showVitals ? String(vitals!.temp) : null}
          unit="°C"
        />
        <VitalCell
          label="Đ/H"
          icon={<Droplet className="icon icon-vital" aria-hidden />}
          value={showVitals && vitals!.bloodSugar != null ? String(vitals!.bloodSugar) : null}
          unit=" mg"
        />
        <VitalCell
          label="Thở"
          icon={<AirVent className="icon icon-vital" aria-hidden />}
          value={showVitals ? String(vitals!.respiration) : null}
          unit="/p"
        />
      </div>

      <div className="elder-card-compact-footer">
        {isShiftFluctuation(elder) ? (
          <span className="elder-tag elder-tag-fluctuation">Biến động ca trực</span>
        ) : isRecordedInShift ? (
          <span className="elder-tag elder-tag-stable">Cảm quan ổn định</span>
        ) : isPriorFluctuation(elder) ? (
          <span className="elder-tag elder-tag-prior-fluctuation">Biến động ca trước</span>
        ) : (
          <span className="elder-tag elder-tag-pending">
            <Clock className="icon icon-xs" aria-hidden />
            Chưa ghi nhận
          </span>
        )}
      </div>
    </article>
  );
}

const ElderlyCard = memo(ElderlyCardComponent);
ElderlyCard.displayName = 'ElderlyCard';

export default ElderlyCard;
