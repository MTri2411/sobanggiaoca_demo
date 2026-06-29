'use client';

import React, { useEffect, memo } from 'react';
import { X, Phone, Building2, Shield, Calendar, User } from 'lucide-react';
import { CAREGIVERS } from '@/data/mockData';

interface CaregiverProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCgId: string;
  onSelectCaregiver: (id: string) => void;
}

function CaregiverProfileSheetComponent({
  isOpen,
  onClose,
  selectedCgId,
  onSelectCaregiver,
}: CaregiverProfileSheetProps) {
  const currentCaregiver = CAREGIVERS.find((cg) => cg.id === selectedCgId) || CAREGIVERS[0];

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay cg-profile-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content cg-profile-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cg-profile-title"
      >
        <div className="modal-header cg-profile-header">
          <h2 id="cg-profile-title" className="modal-title">
            Thông tin chăm sóc viên
          </h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Đóng">
            <X className="icon icon-lg" />
          </button>
        </div>

        <div className="modal-body cg-profile-body">
          <div className="cg-profile-hero">
            <img
              src={currentCaregiver.avatar}
              alt=""
              className="avatar-img avatar-img-lg cg-profile-avatar"
            />
            <div className="cg-profile-hero-info">
              <span className="cg-profile-name">{currentCaregiver.name}</span>
              <a href={`tel:${currentCaregiver.phone.replace(/\./g, '')}`} className="cg-profile-phone">
                <Phone className="icon icon-sm" aria-hidden />
                {currentCaregiver.phone}
              </a>
            </div>
          </div>

          <div className="cg-profile-details">
            <div className="cg-profile-detail-row">
              <Calendar className="icon icon-md text-muted" aria-hidden />
              <div>
                <span className="cg-profile-detail-label">Ngày trực</span>
                <span className="cg-profile-detail-value">{todayStr}</span>
              </div>
            </div>
            <div className="cg-profile-detail-row">
              <Building2 className="icon icon-md text-muted" aria-hidden />
              <div>
                <span className="cg-profile-detail-label">Cơ sở</span>
                <span className="cg-profile-detail-value">{currentCaregiver.facility}</span>
              </div>
            </div>
            <div className="cg-profile-detail-row">
              <Shield className="icon icon-md text-muted" aria-hidden />
              <div>
                <span className="cg-profile-detail-label">Khu vực trực</span>
                <span className="cg-profile-detail-value">{currentCaregiver.area}</span>
              </div>
            </div>
            <div className="cg-profile-detail-row">
              <User className="icon icon-md text-muted" aria-hidden />
              <div>
                <span className="cg-profile-detail-label">Ca trực</span>
                <span className="cg-profile-detail-value">Ca {currentCaregiver.shift}</span>
              </div>
            </div>
          </div>

          <div className="cg-profile-switch">
            <p className="cg-profile-switch-label">Chuyển nhân viên trực ca</p>
            <div className="cg-profile-switch-list">
              {CAREGIVERS.map((cg) => (
                <button
                  key={cg.id}
                  type="button"
                  className={`cg-profile-switch-item${cg.id === selectedCgId ? ' active' : ''}`}
                  onClick={() => {
                    onSelectCaregiver(cg.id);
                    onClose();
                  }}
                >
                  <img src={cg.avatar} alt="" className="avatar-img avatar-img-xs" />
                  <div className="cg-info">
                    <span className="cg-name cg-name-sm line-clamp-1">{cg.name}</span>
                    <span className="cg-phone cg-phone-sm">
                      {cg.area} · Ca {cg.shift}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CaregiverProfileSheet = memo(CaregiverProfileSheetComponent);
CaregiverProfileSheet.displayName = 'CaregiverProfileSheet';

export default CaregiverProfileSheet;
