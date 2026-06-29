'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Elderly } from '@/types';
import ElderlyCard from './ElderlyCard';

function useGridColumns() {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1536) setColumns(5);
      else if (w >= 1280) setColumns(4);
      else if (w >= 1024) setColumns(3);
      else if (w >= 640) setColumns(3);
      else setColumns(2);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return columns;
}

function useGridRowHeight() {
  const [rowHeight, setRowHeight] = useState(160);

  useEffect(() => {
    const update = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--grid-row-height')
        .trim();
      setRowHeight(parseInt(raw, 10) || 160);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return rowHeight;
}

interface ElderlyGridProps {
  residents: Elderly[];
  onSelectElder: (id: string) => void;
  scrollParentRef?: React.RefObject<HTMLElement | null>;
}

function ElderlyGridComponent({ residents, onSelectElder, scrollParentRef }: ElderlyGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const columns = useGridColumns();
  const rowHeight = useGridRowHeight();

  const rows = useMemo(() => {
    const result: Elderly[][] = [];
    for (let i = 0; i < residents.length; i += columns) {
      result.push(residents.slice(i, i + columns));
    }
    return result;
  }, [residents, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollParentRef?.current ?? parentRef.current,
    estimateSize: () => rowHeight,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 3,
  });

  const handleSelect = useCallback(
    (id: string) => onSelectElder(id),
    [onSelectElder]
  );

  return (
    <div ref={parentRef} className="elderly-grid-scroll">
      <div
        className="elderly-grid-virtual"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="elderly-grid-row"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {rowItems.map((elder) => (
                <ElderlyCard key={elder.id} elder={elder} onClick={handleSelect} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ElderlyGrid = memo(ElderlyGridComponent);
ElderlyGrid.displayName = 'ElderlyGrid';

export default ElderlyGrid;
