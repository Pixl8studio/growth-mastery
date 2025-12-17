/**
 * DraggableSlides Component
 * Drag-and-drop slide reordering using @dnd-kit
 *
 * Related: GitHub Issue #327 - Drag-and-Drop Slide Reordering
 */

"use client";

import { useState, useCallback } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    SlideThumbnail,
    GeneratingSlotPlaceholder,
    type SlideData,
    type BrandDesign,
} from "./slide-thumbnail";

interface DraggableSlidesProps {
    slides: SlideData[];
    selectedIndex: number;
    brandDesign?: BrandDesign | null;
    generatingSlideNumber?: number;
    totalSlidesToGenerate?: number;
    onSlideSelect: (index: number) => void;
    onSlideReorder: (newOrder: number[]) => void;
    onSlideDuplicate: (index: number) => void;
    onSlideDelete: (index: number) => void;
    onAddSlide?: () => void;
    className?: string;
}

interface SortableSlideProps {
    slide: SlideData;
    index: number;
    isSelected: boolean;
    brandDesign?: BrandDesign | null;
    onSelect: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

function SortableSlide({
    slide,
    index,
    isSelected,
    brandDesign,
    onSelect,
    onDuplicate,
    onDelete,
}: SortableSlideProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: slide.slideNumber });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
    };

    return (
        <div ref={setNodeRef} style={style} className="relative">
            {/* Drag handle */}
            <div
                className={cn(
                    "absolute left-0 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded-l-md p-1 opacity-0 transition-all group-hover:opacity-100",
                    isSelected && "opacity-100"
                )}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="group pl-5">
                <SlideThumbnail
                    slide={slide}
                    index={index}
                    isSelected={isSelected}
                    isCompleted={true}
                    brandDesign={brandDesign}
                    onClick={onSelect}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

export function DraggableSlides({
    slides,
    selectedIndex,
    brandDesign,
    generatingSlideNumber,
    totalSlidesToGenerate,
    onSlideSelect,
    onSlideReorder,
    onSlideDuplicate,
    onSlideDelete,
    onAddSlide,
    className,
}: DraggableSlidesProps) {
    const [activeId, setActiveId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;

            if (over && active.id !== over.id) {
                const oldIndex = slides.findIndex((s) => s.slideNumber === active.id);
                const newIndex = slides.findIndex((s) => s.slideNumber === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const reorderedSlides = arrayMove(slides, oldIndex, newIndex);
                    const newOrder = reorderedSlides.map((s) => s.slideNumber);
                    onSlideReorder(newOrder);
                }
            }

            setActiveId(null);
        },
        [slides, onSlideReorder]
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    const activeSlide = activeId
        ? slides.find((s) => s.slideNumber === activeId)
        : null;
    const activeIndex = activeId
        ? slides.findIndex((s) => s.slideNumber === activeId)
        : -1;

    // Calculate remaining slots to show during generation
    const remainingGeneratingSlots =
        generatingSlideNumber && totalSlidesToGenerate
            ? Math.max(0, totalSlidesToGenerate - slides.length)
            : 0;

    return (
        <div className={cn("space-y-2", className)}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <SortableContext
                    items={slides.map((s) => s.slideNumber)}
                    strategy={verticalListSortingStrategy}
                >
                    {slides.map((slide, index) => (
                        <SortableSlide
                            key={slide.slideNumber}
                            slide={slide}
                            index={index}
                            isSelected={index === selectedIndex}
                            brandDesign={brandDesign}
                            onSelect={() => onSlideSelect(index)}
                            onDuplicate={() => onSlideDuplicate(index)}
                            onDelete={() => onSlideDelete(index)}
                        />
                    ))}
                </SortableContext>

                {/* Drag overlay for smooth dragging */}
                <DragOverlay>
                    {activeSlide && (
                        <div className="rotate-3 scale-105 opacity-90">
                            <SlideThumbnail
                                slide={activeSlide}
                                index={activeIndex}
                                isSelected={true}
                                brandDesign={brandDesign}
                                showActions={false}
                            />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Generating placeholders */}
            {remainingGeneratingSlots > 0 && (
                <>
                    {/* Currently generating slide */}
                    {generatingSlideNumber && generatingSlideNumber > slides.length && (
                        <GeneratingSlotPlaceholder
                            slideNumber={generatingSlideNumber}
                        />
                    )}

                    {/* Pending slots */}
                    {Array.from({
                        length: Math.min(remainingGeneratingSlots - 1, 2),
                    }).map((_, idx) => (
                        <div
                            key={`pending-${idx}`}
                            className="rounded-xl border-2 border-dashed border-muted bg-muted/20 p-2.5"
                        >
                            <div className="aspect-[16/9] rounded-lg bg-muted/30" />
                            <div className="mt-1.5">
                                <span className="text-[10px] text-muted-foreground/50">
                                    {slides.length + idx + 2}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* "More slides generating" indicator */}
                    {remainingGeneratingSlots > 3 && (
                        <div className="py-2 text-center text-xs text-muted-foreground">
                            +{remainingGeneratingSlots - 3} more slides generating...
                        </div>
                    )}
                </>
            )}

            {/* Add Slide Button */}
            {onAddSlide && !generatingSlideNumber && (
                <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                    onClick={onAddSlide}
                >
                    <Plus className="h-4 w-4" />
                    Add Slide
                </button>
            )}
        </div>
    );
}
