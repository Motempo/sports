"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BracketDetailLevel, BracketLayoutBase } from "@/lib/bracket-tree-layout";
import type { BracketRound, MatchInfo } from "@/lib/types";
import { organizePathwayBracket } from "@/lib/knockout-bracket-layout";
import {
  BRACKET_CARD_INSET_PX,
  bracketCardLeftOffset,
  bracketConnectors,
  cardCenterY,
  computeBracketTreeGeometry,
  computeViewportFittedBase,
  DEFAULT_BRACKET_LAYOUT_BASE,
  getBracketCardDisplayWidth,
  getBracketDetailLevelSmoothFromZoom,
  getBracketSlotHeight,
  nodeLeftPx,
  nodeTopPx,
  slotForRound,
} from "@/lib/bracket-tree-layout";
import { BracketMatchCard } from "./BracketMatchCard";

const WHEEL_ZOOM_INTENSITY = 0.0012;
const BUTTON_ZOOM_FACTOR = 1.12;
const MIN_ZOOM_PERCENT = 25;
const MAX_ZOOM_PERCENT = 800;
const PAN_PADDING_PX = 20;
const FIT_ANIMATION_MS = 280;

interface BracketZoomViewProps {
  grouped: Record<BracketRound, MatchInfo[]>;
}

interface TransformState {
  zoomPercent: number;
  offsetX: number;
  offsetY: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Keep panned content inside the viewport — no large empty margins. */
function clampPanOffset(
  offset: number,
  viewportSize: number,
  contentSize: number,
  padding = PAN_PADDING_PX
): number {
  if (contentSize <= viewportSize) {
    const centered = (viewportSize - contentSize) / 2;
    const maxSlack = Math.max(0, (viewportSize - contentSize) / 2 - padding);
    return clamp(offset, centered - maxSlack, centered + maxSlack);
  }
  return clamp(offset, viewportSize - contentSize - padding, padding);
}

function clampTransformToViewport(
  state: TransformState,
  fitScale: number,
  viewportW: number,
  viewportH: number,
  geomW: number,
  geomH: number
): TransformState {
  const scale = (state.zoomPercent / 100) * fitScale;
  return {
    ...state,
    offsetX: clampPanOffset(state.offsetX, viewportW, geomW * scale),
    offsetY: clampPanOffset(state.offsetY, viewportH, geomH * scale),
  };
}

function connectorPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  side: "left" | "right"
): string {
  const midX = side === "left" ? fromX + (toX - fromX) * 0.55 : fromX - (fromX - toX) * 0.55;
  return `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`;
}

function zoomTowardPoint(
  state: TransformState,
  fitScale: number,
  factor: number,
  px: number,
  py: number
): TransformState {
  const prevScale = (state.zoomPercent / 100) * fitScale;
  const nextScale = clamp(
    prevScale * factor,
    fitScale * (MIN_ZOOM_PERCENT / 100),
    fitScale * (MAX_ZOOM_PERCENT / 100)
  );
  const ratio = nextScale / prevScale;
  const nextPercent = (nextScale / fitScale) * 100;

  return {
    zoomPercent: nextPercent,
    offsetX: px - ratio * (px - state.offsetX),
    offsetY: py - ratio * (py - state.offsetY),
  };
}

/** Keep the viewport focal point stable when the canvas geometry grows. */
function compensateGeometryGrowth(
  state: TransformState,
  fitScale: number,
  viewportW: number,
  viewportH: number,
  geomRatio: number
): { state: TransformState; fitScale: number } {
  const actualScale = (state.zoomPercent / 100) * fitScale;
  const newFit = fitScale / geomRatio;
  const cx = viewportW / 2;
  const cy = viewportH / 2;
  const canvasX = (cx - state.offsetX) / actualScale;
  const canvasY = (cy - state.offsetY) / actualScale;
  const newActual = (state.zoomPercent / 100) * newFit;

  return {
    fitScale: newFit,
    state: {
      ...state,
      offsetX: cx - canvasX * newActual,
      offsetY: cy - canvasY * newActual,
    },
  };
}

export function BracketZoomView({ grouped }: BracketZoomViewProps) {
  const layout = useMemo(() => organizePathwayBracket(grouped), [grouped]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<TransformState>({ zoomPercent: 100, offsetX: 0, offsetY: 0 });
  const fitScaleRef = useRef(1);
  const detailLevelRef = useRef<BracketDetailLevel>(0);
  const layoutBaseRef = useRef<BracketLayoutBase>(DEFAULT_BRACKET_LAYOUT_BASE);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [zoomPercent, setZoomPercent] = useState(100);
  const [fitScale, setFitScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [detailLevel, setDetailLevel] = useState<BracketDetailLevel>(0);
  const [layoutBase, setLayoutBase] = useState<BracketLayoutBase>(DEFAULT_BRACKET_LAYOUT_BASE);
  const [fitted, setFitted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const geometry = useMemo(
    () => computeBracketTreeGeometry(layout, detailLevel, layoutBase),
    [layout, detailLevel, layoutBase]
  );

  const slotWidth = geometry.colWidthPx - BRACKET_CARD_INSET_PX * 2;
  const cardWidth = getBracketCardDisplayWidth(detailLevel, slotWidth);
  const actualScale = (zoomPercent / 100) * fitScale;

  const applyDetailLevelChange = useCallback(
    (
      state: TransformState,
      currentFitScale: number,
      nextDetail: BracketDetailLevel
    ): { state: TransformState; fitScale: number; detail: BracketDetailLevel } => {
      const prevDetail = detailLevelRef.current;
      if (nextDetail === prevDetail) {
        return { state, fitScale: currentFitScale, detail: prevDetail };
      }

      const viewport = viewportRef.current;
      if (!viewport) {
        detailLevelRef.current = nextDetail;
        return { state, fitScale: currentFitScale, detail: nextDetail };
      }

      const oldGeom = computeBracketTreeGeometry(layout, prevDetail, layoutBaseRef.current);
      const newGeom = computeBracketTreeGeometry(layout, nextDetail, layoutBaseRef.current);
      const geomRatio = Math.max(
        newGeom.widthPx / oldGeom.widthPx,
        newGeom.heightPx / oldGeom.heightPx
      );

      const compensated = compensateGeometryGrowth(
        state,
        currentFitScale,
        viewport.clientWidth,
        viewport.clientHeight,
        geomRatio
      );

      detailLevelRef.current = nextDetail;
      return { ...compensated, detail: nextDetail };
    },
    [layout]
  );

  const commitTransform = useCallback(
    (state: TransformState, currentFitScale: number) => {
      const nextDetail = getBracketDetailLevelSmoothFromZoom(state.zoomPercent, detailLevelRef.current);
      const { state: adjusted, fitScale: adjustedFit, detail } = applyDetailLevelChange(
        state,
        currentFitScale,
        nextDetail
      );

      const viewport = viewportRef.current;
      let finalState = adjusted;
      let finalFit = adjustedFit;
      if (viewport) {
        const geom = computeBracketTreeGeometry(layout, detail, layoutBaseRef.current);
        finalState = clampTransformToViewport(
          adjusted,
          adjustedFit,
          viewport.clientWidth,
          viewport.clientHeight,
          geom.widthPx,
          geom.heightPx
        );
      }

      transformRef.current = finalState;
      fitScaleRef.current = finalFit;
      setFitScale(finalFit);
      setZoomPercent(Math.round(finalState.zoomPercent));
      setOffset({ x: finalState.offsetX, y: finalState.offsetY });
      if (detail !== detailLevel) setDetailLevel(detail);
    },
    [applyDetailLevelChange, detailLevel, layout]
  );

  const scheduleCommit = useCallback(
    (state: TransformState, currentFitScale: number) => {
      transformRef.current = state;

      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        commitTransform(state, currentFitScale);
      });
    },
    [commitTransform]
  );

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const pad = 16;
    const vw = viewport.clientWidth - pad * 2;
    const vh = viewport.clientHeight - pad * 2;

    const base = computeViewportFittedBase(vw, vh);
    layoutBaseRef.current = base;
    setLayoutBase(base);

    const geom = computeBracketTreeGeometry(layout, 0, base);
    const nextFitScale = Math.min(vw / geom.widthPx, vh / geom.heightPx);

    const next: TransformState = {
      zoomPercent: 100,
      offsetX: (viewport.clientWidth - geom.widthPx * nextFitScale) / 2,
      offsetY: (viewport.clientHeight - geom.heightPx * nextFitScale) / 2,
    };

    transformRef.current = next;
    detailLevelRef.current = 0;
    fitScaleRef.current = nextFitScale;
    setFitScale(nextFitScale);
    setZoomPercent(100);
    setOffset({ x: next.offsetX, y: next.offsetY });
    setDetailLevel(0);
    setFitted(true);
    setIsAnimating(true);
    window.setTimeout(() => setIsAnimating(false), FIT_ANIMATION_MS);
  }, [layout]);

  useEffect(() => {
    setFitted(false);
  }, [layout]);

  useEffect(() => {
    if (!fitted) fitToView();
  }, [fitToView, fitted]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !fitted) return;

    const onResize = () => {
      commitTransform(transformRef.current, fitScaleRef.current);
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [commitTransform, fitted]);

  const buttonZoom = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const px = vp.clientWidth / 2;
      const py = vp.clientHeight / 2;
      const next = zoomTowardPoint(transformRef.current, fitScale, factor, px, py);
      commitTransform(next, fitScale);
    },
    [commitTransform, fitScale]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_INTENSITY);
      const next = zoomTowardPoint(transformRef.current, fitScaleRef.current, factor, px, py);
      scheduleCommit(next, fitScaleRef.current);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [scheduleCommit]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: transformRef.current.offsetX,
      oy: transformRef.current.offsetY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const next: TransformState = {
      ...transformRef.current,
      offsetX: dragRef.current.ox + (e.clientX - dragRef.current.x),
      offsetY: dragRef.current.oy + (e.clientY - dragRef.current.y),
    };
    scheduleCommit(next, fitScaleRef.current);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const connectorLines = useMemo(() => {
    const lines: Array<{ d: string; key: string }> = [];
    const { unitPx, colWidthPx } = geometry;
    const cardRight = colWidthPx - BRACKET_CARD_INSET_PX;
    const cardLeft = BRACKET_CARD_INSET_PX;

    for (const side of ["left", "right"] as const) {
      for (const seg of bracketConnectors(side)) {
        const fromX =
          side === "left"
            ? nodeLeftPx(seg.fromCol, colWidthPx) + cardRight
            : nodeLeftPx(seg.fromCol, colWidthPx) + cardLeft;
        const toX =
          side === "left"
            ? nodeLeftPx(seg.toCol, colWidthPx) + cardLeft
            : nodeLeftPx(seg.toCol, colWidthPx) + cardRight;

        for (let i = 0; i < seg.pairs; i++) {
          const childA = slotForRound(i * 2, seg.fromRoundSize);
          const childB = slotForRound(i * 2 + 1, seg.fromRoundSize);
          const parent = slotForRound(i, seg.toRoundSize);

          for (const childSlot of [childA, childB] as const) {
            lines.push({
              key: `${side}-${seg.fromCol}-${seg.toCol}-${childSlot}`,
              d: connectorPath(
                fromX,
                cardCenterY(childSlot, unitPx),
                toX,
                cardCenterY(parent, unitPx),
                side
              ),
            });
          }
        }
      }
    }

    const finalY = cardCenterY(7, unitPx);
    const finalLeft = nodeLeftPx(4, colWidthPx) + cardLeft;
    const finalRight = nodeLeftPx(4, colWidthPx) + cardRight;

    for (const { col, side } of [
      { col: 3, side: "left" as const },
      { col: 5, side: "right" as const },
    ]) {
      const sfX =
        side === "left"
          ? nodeLeftPx(col, colWidthPx) + cardRight
          : nodeLeftPx(col, colWidthPx) + cardLeft;
      const toX = side === "left" ? finalLeft : finalRight;
      lines.push({
        key: `sf-final-${col}`,
        d: connectorPath(sfX, cardCenterY(7, unitPx), toX, finalY, side),
      });
    }

    return lines;
  }, [geometry]);

  return (
    <div className="relative hidden lg:block">
      <div className="mb-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-center text-[11px] font-medium uppercase tracking-widest text-muted sm:text-left">
          Pathways to the Final
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => buttonZoom(1 / BUTTON_ZOOM_FACTOR)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-surface"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={fitToView}
            className="flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[11px] font-medium hover:bg-surface"
            aria-label="Fit bracket to view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fit all
          </button>
          <button
            type="button"
            onClick={() => buttonZoom(BUTTON_ZOOM_FACTOR)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-surface"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="ml-1 text-[11px] tabular-nums text-muted">{zoomPercent}%</span>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "relative h-[min(82vh,720px)] overflow-hidden rounded-2xl border border-border touch-none",
          "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface/80 via-background to-background",
          dragRef.current ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={cn(
            "absolute left-0 top-0 origin-top-left will-change-transform",
            isAnimating && "transition-transform duration-300 ease-out"
          )}
          style={{
            width: geometry.widthPx,
            height: geometry.heightPx,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${actualScale})`,
          }}
        >
          {geometry.columns.map((col) => (
            <p
              key={col.col}
              className="absolute text-center text-[9px] font-semibold uppercase tracking-wide text-muted"
              style={{
                left: nodeLeftPx(col.col, geometry.colWidthPx),
                top: 6,
                width: geometry.colWidthPx - 8,
              }}
            >
              {col.label}
            </p>
          ))}

          <svg
            className="pointer-events-none absolute inset-0 text-foreground/50"
            width={geometry.widthPx}
            height={geometry.heightPx}
            aria-hidden
          >
            {connectorLines.map((line) => (
              <path
                key={line.key}
                d={line.d}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {geometry.nodes.map((node) => {
            const isFinal = node.col === 4 && node.slot === 7;
            const isBronze = node.col === 4 && node.slot === 12;
            const slotH = getBracketSlotHeight(geometry.unitPx);

            return (
              <div
                key={node.match.id}
                className="absolute"
                style={{
                  left:
                    nodeLeftPx(node.col, geometry.colWidthPx) +
                    bracketCardLeftOffset(slotWidth, cardWidth) +
                    BRACKET_CARD_INSET_PX,
                  top: nodeTopPx(node.slot, geometry.unitPx),
                  width: cardWidth,
                  height: slotH,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <BracketMatchCard
                  match={node.match}
                  detailLevel={detailLevel}
                  cardWidth={cardWidth}
                  highlight={isFinal ? "final" : isBronze ? "bronze" : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted">
        Scroll to zoom smoothly · drag to pan · zoom in for venue &amp; match analysis
      </p>
    </div>
  );
}
