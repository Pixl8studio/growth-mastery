/**
 * DraggableSlides Component
 * Drag-and-drop slide reordering using @dnd-kit
 *
 * Related: GitHub Issue #327 - Drag-and-Drop Slide Reordering
 */

"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
    onRefSet?: (slideNumber: number, element: HTMLDivElement | null) => void;
}

function SortableSlide({
    slide,
    index,
    isSelected,
    brandDesign,
    onSelect,
    onDuplicate,
    onDelete,
    onRefSet,
}: SortableSlideProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: slide.slideNumber });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
    };

    // Combined ref handler for both dnd-kit and scroll tracking
    const handleRef = useCallback(
        (element: HTMLDivElement | null) => {
            setNodeRef(element);
            onRefSet?.(slide.slideNumber, element);
        },
        [setNodeRef, onRefSet, slide.slideNumber]
    );

    return (
        <div ref={handleRef} style={style} className="relative">
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
    const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const previousSlideCount = useRef<number>(0);

    // Filter out any undefined or invalid slides to prevent crashes during streaming (Issue #331)
    // CRITICAL: Also sort by slideNumber to ensure slides always display in Step 4 presentation order
    // Memoized to avoid O(n log n) sorting on every render - only recalculates when slides change
    const validSlides = useMemo(
        () =>
            slides
                .filter(
                    (slide): slide is SlideData =>
                        slide != null && typeof slide.slideNumber === "number"
                )
                .sort((a, b) => a.slideNumber - b.slideNumber),
        [slides]
    );

    // Auto-scroll to newest slide when generating - scroll to the selected slide
    useEffect(() => {
        // Only scroll if slides were added (not removed) and we're generating
        if (validSlides.length > previousSlideCount.current && generatingSlideNumber) {
            const selectedSlide = validSlides[selectedIndex];
            if (selectedSlide) {
                const slideElement = slideRefs.current.get(selectedSlide.slideNumber);
                if (slideElement) {
                    slideElement.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    });
                }
            }
        }
        previousSlideCount.current = validSlides.length;
    }, [validSlides.length, selectedIndex, generatingSlideNumber, validSlides]);

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
                const oldIndex = validSlides.findIndex(
                    (s) => s.slideNumber === active.id
                );
                const newIndex = validSlides.findIndex(
                    (s) => s.slideNumber === over.id
                );

                if (oldIndex !== -1 && newIndex !== -1) {
                    const reorderedSlides = arrayMove(validSlides, oldIndex, newIndex);
                    const newOrder = reorderedSlides.map((s) => s.slideNumber);
                    onSlideReorder(newOrder);
                }
            }

            setActiveId(null);
        },
        [validSlides, onSlideReorder]
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    const activeSlide = activeId
        ? validSlides.find((s) => s.slideNumber === activeId)
        : null;
    const activeIndex = activeId
        ? validSlides.findIndex((s) => s.slideNumber === activeId)
        : -1;

    // Calculate remaining slots to show during generation
    const remainingGeneratingSlots =
        generatingSlideNumber && totalSlidesToGenerate
            ? Math.max(0, totalSlidesToGenerate - validSlides.length)
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
                    items={validSlides.map((s) => s.slideNumber)}
                    strategy={verticalListSortingStrategy}
                >
                    {validSlides.map((slide, index) => (
                        <SortableSlide
                            key={slide.slideNumber}
                            slide={slide}
                            index={index}
                            isSelected={index === selectedIndex}
                            brandDesign={brandDesign}
                            onSelect={() => onSlideSelect(index)}
                            onDuplicate={() => onSlideDuplicate(index)}
                            onDelete={() => onSlideDelete(index)}
                            onRefSet={(slideNumber, element) => {
                                if (element) {
                                    slideRefs.current.set(slideNumber, element);
                                } else {
                                    slideRefs.current.delete(slideNumber);
                                }
                            }}
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
                    {generatingSlideNumber &&
                        generatingSlideNumber > validSlides.length && (
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
                                    {validSlides.length + idx + 2}
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
