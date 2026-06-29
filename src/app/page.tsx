'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import CaregiverSelector from '@/components/CaregiverSelector';
import StatsDashboard from '@/components/StatsDashboard';
import SignOffCard from '@/components/SignOffCard';
import BottomNavigation from '@/components/BottomNavigation';
import ElderlyGrid from '@/components/ElderlyGrid';
import ElderDetailDrawer from '@/components/ElderDetailDrawer';

import HandoverModal from '@/modals/HandoverModal';

import { CAREGIVERS, MOCK_ELDERLY } from '@/data/mockData';
import { Elderly, ShiftVitalRecord, Vitals } from '@/types';
import { getCurrentTime } from '@/utils/helpers';
import { normalizeResidentsData } from '@/utils/normalizeElderly';
import {
  countByFilter,
  filterResidents,
  isLoggedInShift,
  resolveElderRecordState,
  searchResidents,
  StatusFilter,
} from '@/utils/elderFilters';
import { RefreshCw, Search, X } from 'lucide-react';

interface HandoverState {
  isHandedOver: boolean;
  receiverName: string;
  signatureUrl: string | null;
}

export default function Home() {
  const [selectedCgId, setSelectedCgId] = useState('cg-01');
  const [residentsData, setResidentsData] = useState<Record<string, Elderly[]>>({});
  const [handovers, setHandovers] = useState<Record<string, HandoverState>>({
    'cg-01': { isHandedOver: false, receiverName: '', signatureUrl: null },
    'cg-02': { isHandedOver: false, receiverName: '', signatureUrl: null },
    'cg-03': { isHandedOver: false, receiverName: '', signatureUrl: null },
  });

  const [activeTab, setActiveTab] = useState('home');
  const [activeModal, setActiveModal] = useState<'handover' | null>(null);
  const [selectedElderId, setSelectedElderId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedCgId = localStorage.getItem('selectedCgId');
      if (storedCgId) setTimeout(() => setSelectedCgId(storedCgId), 0);

      const storedResidents = localStorage.getItem('residentsData');
      if (storedResidents) {
        setTimeout(() => setResidentsData(normalizeResidentsData(JSON.parse(storedResidents))), 0);
      } else {
        setTimeout(() => setResidentsData(JSON.parse(JSON.stringify(MOCK_ELDERLY))), 0);
      }

      const storedHandovers = localStorage.getItem('handovers');
      if (storedHandovers) {
        setTimeout(() => setHandovers(JSON.parse(storedHandovers)), 0);
      }
    } catch (e) {
      console.error('Failed to load localStorage', e);
      setTimeout(() => setResidentsData(JSON.parse(JSON.stringify(MOCK_ELDERLY))), 0);
    }
    setTimeout(() => setIsLoaded(true), 0);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('selectedCgId', selectedCgId);
      localStorage.setItem('residentsData', JSON.stringify(residentsData));
      localStorage.setItem('handovers', JSON.stringify(handovers));
    } catch (e) {
      console.error('Failed to save localStorage', e);
    }
  }, [selectedCgId, residentsData, handovers, isLoaded]);

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục lại dữ liệu mẫu ban đầu? Toàn bộ thay đổi và chữ ký sẽ bị xóa.')) {
      localStorage.clear();
      setSelectedCgId('cg-01');
      setResidentsData(JSON.parse(JSON.stringify(MOCK_ELDERLY)));
      setHandovers({
        'cg-01': { isHandedOver: false, receiverName: '', signatureUrl: null },
        'cg-02': { isHandedOver: false, receiverName: '', signatureUrl: null },
        'cg-03': { isHandedOver: false, receiverName: '', signatureUrl: null },
      });
      setActiveTab('home');
      setActiveModal(null);
      setSelectedElderId(null);
      setDetailDrawerOpen(false);
      setStatusFilter('all');
      setSearchQuery('');
    }
  };

  const currentCaregiver = CAREGIVERS.find((cg) => cg.id === selectedCgId) || CAREGIVERS[0];
  const currentResidents = residentsData[selectedCgId] || [];
  const currentHandover = handovers[selectedCgId] || { isHandedOver: false, receiverName: '', signatureUrl: null };

  const totalCount = currentResidents.length;
  const loggedCount = currentResidents.filter(isLoggedInShift).length;
  const shiftFluctuationCount = countByFilter(currentResidents, 'shift_fluctuation');
  const priorFluctuationCount = countByFilter(currentResidents, 'prior_fluctuation');
  const stablePerceptionCount = countByFilter(currentResidents, 'stable_perception');
  const pendingCount = countByFilter(currentResidents, 'pending');

  const filteredResidents = useMemo(() => {
    const byStatus = filterResidents(currentResidents, statusFilter);
    return searchResidents(byStatus, searchQuery);
  }, [currentResidents, statusFilter, searchQuery]);

  const handleQuickStable = useCallback((elderId: string) => {
    setResidentsData((prev) => {
      const updated = { ...prev };
      const list = updated[selectedCgId] ? [...updated[selectedCgId]] : [];
      const index = list.findIndex((r) => r.id === elderId);
      if (index !== -1) {
        const elder = list[index];
        const defaultStableVitals: Vitals = elder.lastVitals || {
          bp: '120/80',
          spo2: 97,
          pulse: 72,
          temp: 36.5,
          respiration: 18,
        };
        defaultStableVitals.time = getCurrentTime();

        list[index] = {
          ...elder,
          status: 'logged',
          lastVitals: defaultStableVitals,
          observation: elder.observation || 'Cảm quan sức khỏe ổn định, ăn ngủ tốt.',
          handoverAction: elder.handoverAction || 'Theo dõi sinh hoạt thông thường.',
          hasFluctuation: false,
          recentFluctuationHistory: false,
          vitalsMeasuredInShift: false,
        };
      }
      updated[selectedCgId] = list;
      return updated;
    });
  }, [selectedCgId]);

  const handleSaveManualVitals = useCallback((
    elderId: string,
    data: { vitals: Vitals; observation: string; handoverAction: string; hasFluctuation: boolean }
  ) => {
    setResidentsData((prev) => {
      const updated = { ...prev };
      const list = updated[selectedCgId] ? [...updated[selectedCgId]] : [];
      const index = list.findIndex((r) => r.id === elderId);
      if (index !== -1) {
        const elder = list[index];
        const recordState = resolveElderRecordState({
          vitalsMeasuredInShift: true,
          lastVitals: data.vitals,
          manualFluctuation: data.hasFluctuation,
        });

        const newRecord: ShiftVitalRecord = {
          id: `${elderId}-sv-manual-${Date.now()}`,
          time: data.vitals.time || getCurrentTime(),
          recordedBy: currentCaregiver.name,
          bp: data.vitals.bp,
          pulse: data.vitals.pulse,
          spo2: data.vitals.spo2,
          temp: data.vitals.temp,
          respiration: data.vitals.respiration,
          bloodSugar: data.vitals.bloodSugar,
          note: data.observation || undefined,
          hasFluctuation: recordState.hasFluctuation,
        };

        list[index] = {
          ...elder,
          status: recordState.status,
          lastVitals: data.vitals,
          observation: data.observation,
          handoverAction: data.handoverAction,
          hasFluctuation: recordState.hasFluctuation,
          recentFluctuationHistory: recordState.recentFluctuationHistory,
          vitalsMeasuredInShift: recordState.vitalsMeasuredInShift,
          shiftVitalRecords: [...(elder.shiftVitalRecords ?? []), newRecord],
        };
      }
      updated[selectedCgId] = list;
      return updated;
    });
  }, [selectedCgId, currentCaregiver.name]);

  const handleConfirmHandover = useCallback((receiverName: string, signatureUrl: string) => {
    setHandovers((prev) => ({
      ...prev,
      [selectedCgId]: {
        isHandedOver: true,
        receiverName,
        signatureUrl,
      },
    }));
  }, [selectedCgId]);


  const openHandoverModal = useCallback(() => {
    setActiveModal('handover');
  }, []);

  const handleSelectElder = useCallback((id: string) => {
    setSelectedElderId(id);
    setDetailDrawerOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDrawerOpen(false);
  }, []);

  const handleFilterChange = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);
  }, []);

  if (!isLoaded) {
    return (
      <div className="app-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const selectedElder = currentResidents.find((r) => r.id === selectedElderId) || null;

  const statsProps = {
    totalCount,
    loggedCount,
    shiftFluctuationCount,
    priorFluctuationCount,
    stablePerceptionCount,
    pendingCount,
    statusFilter,
    onFilterChange: handleFilterChange,
  };

  return (
    <div className="app-container">
      <div className="app-body">
      <aside className="sidebar">
       

        <div className="sidebar-content">
          <CaregiverSelector
            selectedCgId={selectedCgId}
            onSelectCaregiver={setSelectedCgId}
          />

          <StatsDashboard {...statsProps} />

          <SignOffCard
            isHandedOver={currentHandover.isHandedOver}
            receiverName={currentHandover.receiverName}
            signatureUrl={currentHandover.signatureUrl}
            onOpenHandoverModal={openHandoverModal}
          />

          <button type="button" className="btn-reset-data" onClick={handleResetData}>
            <RefreshCw className="icon icon-sm" />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Header className={activeTab === 'home' ? 'web-header--mobile-home-hidden' : undefined} />

        <section className="cg-selector-mobile">
          <CaregiverSelector
            selectedCgId={selectedCgId}
            onSelectCaregiver={setSelectedCgId}
            hideBadges
          />
        </section>

        {activeTab === 'home' && (
          <div className="main-content-body">
            <section className="stats-dashboard-mobile">
              <StatsDashboard
                {...statsProps}
                embedHeader
                embedMeta={{
                  facility: currentCaregiver.facility,
                  area: currentCaregiver.area,
                  shift: currentCaregiver.shift,
                }}
              />
            </section>

            <section className="residents-section">
              <div className="section-header residents-section-header">
                <h3 className="section-subtitle">Danh sách người cao tuổi</h3>
                <div className="residents-search">
                  <Search className="icon icon-sm residents-search-icon" aria-hidden />
                  <input
                    type="search"
                    className="residents-search-input"
                    placeholder="Tìm tên hoặc giường..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Tìm kiếm người cao tuổi theo tên hoặc giường"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="residents-search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="Xóa tìm kiếm"
                    >
                      <X className="icon icon-xs" aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              <ElderlyGrid
                residents={filteredResidents}
                onSelectElder={handleSelectElder}
              />
            </section>
          </div>
        )}

        <section className="signoff-card-mobile" style={{ display: activeTab === 'handover' ? 'block' : 'none' }}>
          <SignOffCard
            isHandedOver={currentHandover.isHandedOver}
            receiverName={currentHandover.receiverName}
            signatureUrl={currentHandover.signatureUrl}
            onOpenHandoverModal={openHandoverModal}
          />
        </section>

        <BottomNavigation
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          selectedCgId={selectedCgId}
          onSelectCaregiver={setSelectedCgId}
          onOpenHandoverModal={() => {
            setActiveTab('handover');
            openHandoverModal();
          }}
        />
      </main>
      </div>

      <ElderDetailDrawer
        elder={selectedElder}
        isOpen={detailDrawerOpen}
        onClose={handleCloseDetail}
        onQuickStable={handleQuickStable}
        onSaveVitals={handleSaveManualVitals}
      />

      <HandoverModal
        isOpen={activeModal === 'handover'}
        onClose={() => setActiveModal(null)}
        caregiverName={currentCaregiver.name}
        onConfirm={handleConfirmHandover}
      />
    </div>
  );
}
