/**
 * SortableZone — A zone-based drag-and-drop container for panels.
 * 
 * Panels within a zone can be reordered via touch drag on the drag handle.
 * Uses @dnd-kit for accessible, touch-friendly sorting.
 */
import { ReactNode, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableZoneProps {
  zoneId: string;
  items: string[];
  direction: 'vertical' | 'horizontal';
  onReorder: (zoneId: string, oldIndex: number, newIndex: number) => void;
  children: (orderedIds: string[]) => ReactNode;
  className?: string;
}

export function SortableZone({ zoneId, items, direction, onReorder, children, className }: SortableZoneProps) {
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const strategy = direction === 'vertical' ? verticalListSortingStrategy : horizontalListSortingStrategy;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(zoneId, oldIndex, newIndex);
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={strategy}>
        <div className={className}>
          {children(items)}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortablePanelProps {
  id: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  direction?: 'vertical' | 'horizontal';
}

export function SortablePanel({ id, children, className, style: externalStyle, direction = 'vertical' }: SortablePanelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = useMemo(() => ({
    ...externalStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : undefined,
  }), [externalStyle, transform, transition, isDragging]);

  return (
    <div ref={setNodeRef} style={style} className={`${className || ''} relative group`} {...attributes}>
      {/* Drag Handle — always subtly visible for touch discovery */}
      <div
        {...listeners}
        className="absolute top-1 left-1/2 -translate-x-1/2 z-30 opacity-30 group-hover:opacity-80 active:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing touch-manipulation"
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder"
      >
        <div className="flex items-center gap-[2px] px-3 py-1.5 rounded-full bg-[var(--color-cp-surface)]/80 backdrop-blur-sm border border-white/10">
          <DragDots />
        </div>
      </div>
      {children}
    </div>
  );
}

function DragDots() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-[var(--color-cp-text-tertiary)]">
      <circle cx="3" cy="3" r="1.2" />
      <circle cx="9" cy="3" r="1.2" />
      <circle cx="3" cy="6" r="1.2" />
      <circle cx="9" cy="6" r="1.2" />
      <circle cx="3" cy="9" r="1.2" />
      <circle cx="9" cy="9" r="1.2" />
    </svg>
  );
}
