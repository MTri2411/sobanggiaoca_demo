'use client';

import React from 'react';
import { PenTool, CheckCircle2, ChevronRight } from 'lucide-react';

interface SignOffCardProps {
  isHandedOver: boolean;
  receiverName?: string;
  signatureUrl?: string | null;
  onOpenHandoverModal: () => void;
}

export default function SignOffCard({
  isHandedOver,
  receiverName,
  signatureUrl,
  onOpenHandoverModal,
}: SignOffCardProps) {
  return (
    <div className="signoff-card">
      <h3 className="stats-title">Hoàn tất ca trực</h3>
      <p className="signoff-body-text">
        Vui lòng kiểm tra kỹ các thông tin sức khỏe của các cụ trước khi ký xác nhận bàn giao ca trực.
      </p>
      {isHandedOver ? (
        <div className="signoff-stack">
          <div className="signoff-row">
            <CheckCircle2 className="icon icon-2xl" />
            <span className="signoff-done-title">Đã ký bàn giao ca</span>
          </div>

          <div className="signoff-body-text">
            <p><strong>Người nhận:</strong> {receiverName}</p>
          </div>

          {signatureUrl && (
            <div className="signoff-stack" style={{ gap: 'var(--space-xs)' }}>
              <span className="signoff-meta-label">Chữ ký xác nhận:</span>
              <img
                src={signatureUrl}
                alt="Chữ ký"
                className="signature-img-preview"
              />
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline signoff-btn-sm"
            onClick={onOpenHandoverModal}
          >
            Cập nhật chữ ký
          </button>
        </div>
      ) : (
        <div className="signoff-stack">


          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenHandoverModal}
          >
            <PenTool className="icon icon-lg" />
            <span>Ký bàn giao ca</span>
            <ChevronRight className="icon icon-lg" style={{ marginLeft: 'auto' }} />
          </button>
        </div>
      )}
    </div>
  );
}
