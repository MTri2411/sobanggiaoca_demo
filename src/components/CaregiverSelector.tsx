'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { CAREGIVERS } from '@/data/mockData';
import { ChevronDown, Calendar, Phone, Shield, Building2 } from 'lucide-react';

interface CaregiverSelectorProps {
  selectedCgId: string;
  onSelectCaregiver: (id: string) => void;
  variant?: 'default' | 'nav';
  hideBadges?: boolean;
}

function CaregiverSelectorComponent({
  selectedCgId,
  onSelectCaregiver,
  variant = 'default',
  hideBadges = false,
}: CaregiverSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentCaregiver = CAREGIVERS.find((cg) => cg.id === selectedCgId) || CAREGIVERS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });

  const isNav = variant === 'nav';

  return (
    <div
      className={isNav ? 'bottom-nav-cg' : 'cg-card cg-card-compact'}
      ref={dropdownRef}
    >
      {!isNav && <div className="cg-selector-header">Nhân viên trực ca</div>}

      <div className="cg-select-wrapper">
        <button
          aria-label="Mở/Đóng danh sách nhân viên trực ca"
          type="button"
          className={
            isNav
              ? `nav-tab-item cg-nav-trigger${isOpen ? ' active' : ''}`
              : 'cg-dropdown-trigger'
          }
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <img
            src={currentCaregiver.avatar}
            alt=""
            className={`avatar-img ${isNav ? 'avatar-img-sm cg-nav-avatar' : 'avatar-img-sm'}`}
          />
          {isNav ? (
            <span>Nhân viên</span>
          ) : (
            <>
              <div className="cg-info">
                <span className="cg-name line-clamp-1">{currentCaregiver.name}</span>
                <span className="cg-phone">
                  <Phone className="icon icon-xs" aria-hidden /> {currentCaregiver.phone}
                </span>
              </div>
              <ChevronDown className="icon icon-lg text-muted" />
            </>
          )}
        </button>

        {isOpen && (
          <div className={`cg-dropdown-menu ${isNav ? 'cg-dropdown-menu-up' : ''}`}>
            {CAREGIVERS.map((cg) => (
              <button
                key={cg.id}
                type="button"
                className={`cg-dropdown-item ${cg.id === selectedCgId ? 'active' : ''}`}
                onClick={() => {
                  onSelectCaregiver(cg.id);
                  setIsOpen(false);
                }}
              >
                <img src={cg.avatar} alt="" className="avatar-img avatar-img-xs" />
                <div className="cg-info">
                  <span className="cg-name cg-name-sm line-clamp-1">{cg.name}</span>
                  <span className="cg-phone cg-phone-sm">{cg.area} - Ca {cg.shift}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isNav && !hideBadges && (
        <div className="cg-badges">
          <span className="badge badge-primary badge-sm">
            <Calendar className="icon icon-2xs" aria-hidden /> {todayStr}
          </span>
          <span className="badge badge-warning badge-sm">
            <Building2 className="icon icon-2xs" aria-hidden /> {currentCaregiver.facility}
          </span>
          <span className="badge badge-success badge-sm">
            <Shield className="icon icon-2xs" aria-hidden /> {currentCaregiver.area}
          </span>
          <span className="badge badge-secondary badge-sm">
            Ca {currentCaregiver.shift}
          </span>
        </div>
      )}
    </div>
  );
}

const CaregiverSelector = memo(CaregiverSelectorComponent);
CaregiverSelector.displayName = 'CaregiverSelector';

export default CaregiverSelector;
