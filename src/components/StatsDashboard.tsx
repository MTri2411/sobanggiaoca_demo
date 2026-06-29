'use client';

import React, { memo, useCallback, useState } from 'react';
import Image from 'next/image';
import {
  ShieldAlert,
  CheckCircle2,
  Users,
  Clock,
  History,
  Building2,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import logoBinhMy from '@/img/logo-binh-my-moi-2025-1.png';
import { StatusFilter } from '@/utils/elderFilters';

export type { StatusFilter };

interface StatsDashboardProps {
  totalCount: number;
  loggedCount: number;
  shiftFluctuationCount: number;
  priorFluctuationCount: number;
  stablePerceptionCount: number;
  pendingCount: number;
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  /** Gộp logo header vào card (dùng trên mobile/tablet trang chủ). */
  embedHeader?: boolean;
  /** Meta cơ sở / khu / ca (tách khỏi logo khi embedHeader). */
  embedMeta?: {
    facility: string;
    area: string;
    shift: string;
  };
}

interface FilterOption {
  value: StatusFilter;
  label: string;
  ariaLabel: string;
  icon: LucideIcon;
  tone: 'neutral' | 'danger' | 'prior' | 'stable' | 'pending';
}

const FILTER_MAP: Record<StatusFilter, FilterOption> = {
  all: {
    value: 'all',
    label: 'Tất cả',
    ariaLabel: 'Tất cả người cao tuổi',
    icon: Users,
    tone: 'neutral',
  },
  prior_fluctuation: {
    value: 'prior_fluctuation',
    label: 'Biến động ca trước',
    ariaLabel: 'Biến động sức khỏe ghi nhận ở ca trước, cần theo dõi đặc biệt',
    icon: History,
    tone: 'prior',
  },
  pending: {
    value: 'pending',
    label: 'Chưa ghi nhận',
    ariaLabel: 'Chưa ghi nhận trong ca trực',
    icon: Clock,
    tone: 'pending',
  },
  stable_perception: {
    value: 'stable_perception',
    label: 'Cảm quan ổn định',
    ariaLabel: 'Đã ghi nhận cảm quan ổn định trong ca',
    icon: CheckCircle2,
    tone: 'stable',
  },
  shift_fluctuation: {
    value: 'shift_fluctuation',
    label: 'Biến động',
    ariaLabel: 'Biến động sức khỏe trong ca trực hiện tại',
    icon: ShieldAlert,
    tone: 'danger',
  },
};

const PRIMARY_FILTERS: StatusFilter[] = ['all', 'prior_fluctuation', 'pending'];
const LOGGED_FILTERS: StatusFilter[] = ['stable_perception', 'shift_fluctuation'];

function FilterButton({
  filter,
  count,
  isActive,
  onSelect,
  tile,
}: {
  filter: FilterOption;
  count: number;
  isActive: boolean;
  onSelect: () => void;
  tile?: boolean;
}) {
  const Icon = filter.icon;
  const [isTapping, setIsTapping] = useState(false);

  const handleSelect = useCallback(() => {
    setIsTapping(false);
    requestAnimationFrame(() => {
      setIsTapping(true);
    });
    onSelect();
  }, [onSelect]);

  const handleAnimationEnd = useCallback((event: React.AnimationEvent<HTMLButtonElement>) => {
    if (event.animationName === 'statsFilterTap') {
      setIsTapping(false);
    }
  }, []);

  return (
    <button
      type="button"
      className={`stats-filter-card stats-filter-card--${filter.tone}${tile ? ' stats-filter-card--tile' : ''}${isActive ? ' active' : ''}${isTapping ? ' stats-filter-card--tap' : ''}`}
      onClick={handleSelect}
      onAnimationEnd={handleAnimationEnd}
      aria-pressed={isActive ? 'true' : 'false'}
      aria-label={`${filter.ariaLabel}: ${count}`}
    >
      {tile ? (
        <>
          <span className="stats-filter-card-head">
            <span className="stats-filter-card-icon" aria-hidden>
              <Icon className="icon icon-sm" />
            </span>
            <span className="stats-filter-card-value">{count}</span>
          </span>
          <span className="stats-filter-card-label">{filter.label}</span>
        </>
      ) : (
        <>
          <span className="stats-filter-card-main">
            <span className="stats-filter-card-icon" aria-hidden>
              <Icon className="icon icon-sm" />
            </span>
            <span className="stats-filter-card-label">{filter.label}</span>
          </span>
          <span className="stats-filter-card-value">{count}</span>
        </>
      )}
    </button>
  );
}

function StatsProgressBlock({
  totalCount,
  loggedCount,
  pendingCount,
  percent,
}: {
  totalCount: number;
  loggedCount: number;
  pendingCount: number;
  percent: number;
}) {
  return (
    <div className="stats-progress-block" aria-label="Tiến độ ghi nhận ca trực">
      <div className="stats-progress-block-meta">
        <span className="stats-progress-block-main">
          <strong>{loggedCount}</strong> / {totalCount} đã ghi
        </span>
        <span className="stats-progress-meta-muted">{pendingCount} chưa ghi</span>
        <span className="stats-progress-percent">{percent}%</span>
      </div>
      <div
        className="stats-progress-track"
        style={{ '--stats-progress': `${percent}%` } as React.CSSProperties}
      >
        <div className="stats-progress-bar-fill" />
      </div>
    </div>
  );
}

function StatsDashboardComponent({
  totalCount,
  loggedCount,
  shiftFluctuationCount,
  priorFluctuationCount,
  stablePerceptionCount,
  pendingCount,
  statusFilter,
  onFilterChange,
  embedHeader = false,
  embedMeta,
}: StatsDashboardProps) {
  const percent = totalCount > 0 ? Math.round((loggedCount / totalCount) * 100) : 0;

  const counts: Record<StatusFilter, number> = {
    all: totalCount,
    shift_fluctuation: shiftFluctuationCount,
    prior_fluctuation: priorFluctuationCount,
    stable_perception: stablePerceptionCount,
    pending: pendingCount,
  };

  return (
    <div className={`stats-card${embedHeader ? ' stats-card--embed-header' : ''}`}>
      {embedHeader && (
        <>
          <div className="stats-card-brand stats-card-brand--center">
            <Image
              src={logoBinhMy}
              alt="Hệ thống Dưỡng lão Bình Mỹ"
              className="stats-card-logo"
              priority
            />
          </div>
          {embedMeta && (
            <div className="stats-card-meta-row">
              <span className="stats-meta-item">
                <Building2 className="icon icon-2xs" aria-hidden />
                {embedMeta.facility}
              </span>
              <span className="stats-meta-sep" aria-hidden>·</span>
              <span className="stats-meta-item">
                <Shield className="icon icon-2xs" aria-hidden />
                {embedMeta.area}
              </span>
              <span className="stats-meta-sep" aria-hidden>·</span>
              <span className="stats-meta-item">Ca {embedMeta.shift}</span>
            </div>
          )}
        </>
      )}

      <div className="stats-filters" role="group" aria-label="Lọc trạng thái">
        <div className="stats-filter-primary-row">
          {PRIMARY_FILTERS.map((key) => {
            const filter = FILTER_MAP[key];
            return (
              <FilterButton
                key={key}
                filter={filter}
                count={counts[key]}
                isActive={statusFilter === key}
                onSelect={() => onFilterChange(key)}
                tile
              />
            );
          })}
        </div>

        <div className="stats-filter-logged-group">
          <p className="stats-filter-group-label stats-filter-group-label--logged">Đã ghi nhận</p>
          <div className="stats-filter-logged-row">
            {LOGGED_FILTERS.map((key) => {
              const filter = FILTER_MAP[key];
              return (
                <FilterButton
                  key={key}
                  filter={filter}
                  count={counts[key]}
                  isActive={statusFilter === key}
                  onSelect={() => onFilterChange(key)}
                  tile
                />
              );
            })}
          </div>
        </div>
      </div>

      <StatsProgressBlock
        totalCount={totalCount}
        loggedCount={loggedCount}
        pendingCount={pendingCount}
        percent={percent}
      />
    </div>
  );
}

const StatsDashboard = memo(StatsDashboardComponent);
StatsDashboard.displayName = 'StatsDashboard';

export default StatsDashboard;
