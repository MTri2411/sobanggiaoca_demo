'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  caregiverName: string;
  onConfirm: (receiverName: string, signatureDataUrl: string) => void;
}

export default function HandoverModal({
  isOpen,
  onClose,
  caregiverName,
  onConfirm,
}: HandoverModalProps) {
  const [receiverName, setReceiverName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set display size (css)
    const rect = canvas.parentElement?.getBoundingClientRect();
    const width = rect?.width || 500;
    const height = 150;

    canvas.width = width * 2; // For retina displays
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = '#1E293B'; // slate-800
    context.lineWidth = 3;
    contextRef.current = context;

    // Fill background with white so the saved image isn't transparent
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
  }, []);
  
  // Initialize Canvas
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setReceiverName(''), 0);
      setTimeout(initCanvas, 50);
    }
  }, [isOpen, initCanvas]);



  if (!isOpen) return null;

  // Drawing Events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e.nativeEvent);
    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    e.preventDefault();
    const coords = getCoordinates(e.nativeEvent);
    contextRef.current.lineTo(coords.x, coords.y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const getCoordinates = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, rect.width, rect.height);
  };

  const handleConfirm = () => {
    if (!receiverName.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export signature as base64 png
    const signatureDataUrl = canvas.toDataURL('image/png');
    onConfirm(receiverName.trim(), signatureDataUrl);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Ký xác nhận bàn giao ca</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Đóng modal ký xác nhận bàn giao ca">
            <X className="icon icon-2xl" />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-info-banner">
            <p><strong>Người bàn giao (Hiện tại):</strong> {caregiverName}</p>
            <p className="form-hint">
              Hành động này sẽ khóa dữ liệu chăm sóc ca trực hiện tại và bàn giao toàn bộ thông tin ghi nhận cho điều dưỡng tiếp quản.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Tên người nhận bàn giao ca</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập tên người tiếp nhận ca trực"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Ký tên điện tử xác nhận</label>
            <div className="signature-canvas-container">
              <canvas
                ref={canvasRef}
                className="signature-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button
                type="button"
                className="canvas-clear-btn flex items-center gap-1"
                onClick={clearCanvas}
              >
                <RotateCcw className="icon icon-sm" /> Xóa vẽ
              </button>
            </div>
            <p className="form-hint">
              Vẽ trực tiếp chữ ký của bạn vào khung trên bằng chuột hoặc ngón tay.
            </p>
          </div>

          <div className="modal-footer modal-footer-flush" style={{ marginTop: 'var(--space-xl)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="btn btn-success-solid"
              onClick={handleConfirm}
              style={{ flex: 1 }}
              disabled={!receiverName.trim()}
            >
              <Check className="icon icon-lg" />
              Xác nhận bàn giao
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
