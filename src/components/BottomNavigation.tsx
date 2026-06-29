'use client';

import React, { useCallback, useState } from 'react';
import { Home, FileEdit, User, type LucideIcon } from 'lucide-react';
import CaregiverProfileSheet from '@/components/CaregiverProfileSheet';

interface BottomNavigationProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  selectedCgId: string;
  onSelectCaregiver: (id: string) => void;
  onOpenHandoverModal: () => void;
}

type NavTabId = 'home' | 'handover' | 'profile';

interface NavTabConfig {
  id: NavTabId;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
}

const NAV_TABS: NavTabConfig[] = [
  { id: 'home', label: 'Trang chủ', icon: Home, ariaLabel: 'Trang chủ' },
  { id: 'handover', label: 'Bàn giao', icon: FileEdit, ariaLabel: 'Bàn giao ca trực' },
  { id: 'profile', label: 'Tài khoản', icon: User, ariaLabel: 'Thông tin chăm sóc viên' },
];

export default function BottomNavigation({
  activeTab,
  onChangeTab,
  selectedCgId,
  onSelectCaregiver,
  onOpenHandoverModal,
}: BottomNavigationProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const isTabActive = useCallback(
    (tabId: NavTabId) => {
      if (tabId === 'home') return activeTab === 'home';
      if (tabId === 'handover') return activeTab === 'handover';
      return profileOpen;
    },
    [activeTab, profileOpen]
  );

  const handleTabPress = useCallback(
    (tabId: NavTabId) => {
      if (tabId === 'home') {
        onChangeTab('home');
        return;
      }
      if (tabId === 'handover') {
        onOpenHandoverModal();
        return;
      }
      setProfileOpen(true);
    },
    [onChangeTab, onOpenHandoverModal]
  );

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Điều hướng chính">
        <div className="mobile-bottom-nav-inner">
          {NAV_TABS.map(({ id, label, icon: Icon, ariaLabel }) => {
            const active = isTabActive(id);
            return (
              <button
                key={id}
                type="button"
                className={`nav-tab-item${active ? ' active' : ''}`}
                onClick={() => handleTabPress(id)}
                aria-label={ariaLabel}
                aria-current={active ? 'page' : undefined}
              >
                <span className="nav-tab-icon-shell">
                  <Icon
                    className="icon nav-tab-icon"
                    strokeWidth={active ? 2.75 : 2}
                    aria-hidden
                  />
                </span>
                <span className="nav-tab-label">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <CaregiverProfileSheet
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        selectedCgId={selectedCgId}
        onSelectCaregiver={onSelectCaregiver}
      />
    </>
  );
}
