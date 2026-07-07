import type { MatchInfo } from "@/lib/types";
import type { PathwayBracketLayout } from "@/lib/knockout-bracket-layout";
import { getFifaMatchNumber } from "@/lib/knockout-bracket-layout";
import { getRoundLabel, getRoundShortLabel } from "@/lib/bracket-constants";

/** Vertical slot units — 16 slots span one side's R32 column. */
export const BRACKET_SLOT_UNITS = 16;
export const BRACKET_CARD_GAP_PX = 20;
export const BRACKET_COL_WIDTH_PX = 148;
export const BRACKET_CARD_INSET_PX = 10;
export const R32_ROW_SPAN = 2;

export type BracketDetailLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Viewport-fitted base dimensions — set on "Fit all", scaled up per detail level. */
export interface BracketLayoutBase {
  colWidthPx: number;
  unitPx: number;
}

export const DEFAULT_BRACKET_LAYOUT_BASE: BracketLayoutBase = {
  colWidthPx: 100,
  unitPx: 30,
};

/** Spacing multiplier as detail level rises (more content → more room). */
const DETAIL_SCALE: Record<BracketDetailLevel, number> = {
  0: 1,
  1: 1.1,
  2: 1.22,
  3: 1.42,
  4: 1.72,
  5: 2.1,
};

/**
 * Progressive disclosure by zoom % — 100% is always "fit all" (flags & scores).
 * Names, venue, then analysis appear as the user zooms in past each threshold.
 */
export function getBracketDetailLevelFromZoom(zoomPercent: number): BracketDetailLevel {
  if (zoomPercent < 108) return 0;
  if (zoomPercent < 125) return 1;
  if (zoomPercent < 145) return 2;
  if (zoomPercent < 170) return 3;
  if (zoomPercent < 220) return 4;
  return 5;
}

const ZOOM_LEVEL_DOWN_AT: Record<BracketDetailLevel, number> = {
  0: 0,
  1: 100,
  2: 115,
  3: 132,
  4: 155,
  5: 200,
};

/** Hysteresis prevents card content flickering when zoom hovers on a threshold. */
export function getBracketDetailLevelSmoothFromZoom(
  zoomPercent: number,
  previous: BracketDetailLevel
): BracketDetailLevel {
  const raw = getBracketDetailLevelFromZoom(zoomPercent);
  if (raw >= previous) return raw;
  if (zoomPercent >= ZOOM_LEVEL_DOWN_AT[previous]) return previous;
  return raw;
}

/** Minimum card heights (px) per detail level — used to prevent vertical overlap. */
const MIN_CARD_HEIGHT: Record<BracketDetailLevel, number> = {
  0: 50,
  1: 58,
  2: 70,
  3: 98,
  4: 128,
  5: 168,
};

/** Minimum column width (px) so wide analysis text fits inside the slot. */
const MIN_COL_WIDTH: Record<BracketDetailLevel, number> = {
  0: 88,
  1: 96,
  2: 108,
  3: 128,
  4: 248,
  5: 332,
};

function minUnitPxForLevel(level: BracketDetailLevel): number {
  const h = MIN_CARD_HEIGHT[level];
  return Math.ceil((h + BRACKET_CARD_GAP_PX) / R32_ROW_SPAN);
}

/** Compute base column/row sizes that fill the viewport at fit-all (detail level 0). */
export function computeViewportFittedBase(
  viewportWidth: number,
  viewportHeight: number
): BracketLayoutBase {
  const hMargin = 40;
  const vMargin = 88;

  const colWidthPx = Math.floor((viewportWidth - hMargin) / 9);
  const unitPx = Math.floor((viewportHeight - vMargin) / BRACKET_SLOT_UNITS);

  return {
    colWidthPx: Math.max(MIN_COL_WIDTH[0], colWidthPx),
    unitPx: Math.max(minUnitPxForLevel(0), unitPx),
  };
}

export function resolveBracketDimensions(
  base: BracketLayoutBase,
  detailLevel: BracketDetailLevel
): { unitPx: number; colWidthPx: number } {
  const scale = DETAIL_SCALE[detailLevel];
  let unitPx = Math.round(base.unitPx * scale);
  let colWidthPx = Math.round(base.colWidthPx * scale);

  unitPx = Math.max(unitPx, minUnitPxForLevel(detailLevel));
  colWidthPx = Math.max(colWidthPx, MIN_COL_WIDTH[detailLevel]);

  return { unitPx, colWidthPx };
}

/** Card width always fits its column slot — columns grow with detail level. */
export function getBracketCardDisplayWidth(
  _detailLevel: BracketDetailLevel,
  slotWidth: number
): number {
  return slotWidth;
}

/** Center a card inside its column slot (equal inset on both sides). */
export function bracketCardLeftOffset(slotWidth: number, cardWidth: number): number {
  return (slotWidth - cardWidth) / 2;
}

export function getEstimatedCardHeight(level: BracketDetailLevel, unitPx: number): number {
  return Math.min(
    R32_ROW_SPAN * unitPx - BRACKET_CARD_GAP_PX,
    MIN_CARD_HEIGHT[level] + 8
  );
}

export interface BracketNode {
  match: MatchInfo;
  col: number;
  slot: number;
  fifa?: number;
}

export interface BracketColumn {
  col: number;
  label: string;
}

export interface BracketTreeGeometry {
  nodes: BracketNode[];
  columns: BracketColumn[];
  widthPx: number;
  heightPx: number;
  colWidthPx: number;
  unitPx: number;
}

function slotForRound(index: number, roundSize: 8 | 4 | 2 | 1): number {
  if (roundSize === 8) return index * 2;
  if (roundSize === 4) return index * 4 + 1;
  if (roundSize === 2) return index * 8 + 3;
  return 7;
}

function placeColumn(
  matches: MatchInfo[],
  col: number,
  roundSize: 8 | 4 | 2 | 1
): BracketNode[] {
  return matches.map((match, i) => ({
    match,
    col,
    slot: slotForRound(i, roundSize),
    fifa: getFifaMatchNumber(match),
  }));
}

export function computeBracketTreeGeometry(
  layout: PathwayBracketLayout,
  detailLevel: BracketDetailLevel,
  base: BracketLayoutBase = DEFAULT_BRACKET_LAYOUT_BASE
): BracketTreeGeometry {
  const { unitPx, colWidthPx } = resolveBracketDimensions(base, detailLevel);

  const nodes: BracketNode[] = [
    ...placeColumn(layout.left.R32, 0, 8),
    ...placeColumn(layout.left.R16, 1, 4),
    ...placeColumn(layout.left.QF, 2, 2),
    ...placeColumn(layout.left.SF, 3, 1),
    ...placeColumn(layout.right.SF, 5, 1),
    ...placeColumn(layout.right.QF, 6, 2),
    ...placeColumn(layout.right.R16, 7, 4),
    ...placeColumn(layout.right.R32, 8, 8),
  ];

  if (layout.final) {
    nodes.push({
      match: layout.final,
      col: 4,
      slot: 7,
      fifa: getFifaMatchNumber(layout.final),
    });
  }
  if (layout.third) {
    nodes.push({
      match: layout.third,
      col: 4,
      slot: 12,
      fifa: getFifaMatchNumber(layout.third),
    });
  }

  const columns: BracketColumn[] = [
    { col: 0, label: getRoundLabel("R32") },
    { col: 1, label: getRoundLabel("R16") },
    { col: 2, label: getRoundShortLabel("QF") },
    { col: 3, label: getRoundShortLabel("SF") },
    { col: 4, label: "Final" },
    { col: 5, label: getRoundShortLabel("SF") },
    { col: 6, label: getRoundShortLabel("QF") },
    { col: 7, label: getRoundLabel("R16") },
    { col: 8, label: getRoundLabel("R32") },
  ];

  const widthPx = 9 * colWidthPx + 40;
  const heightPx = BRACKET_SLOT_UNITS * unitPx + 80;

  return { nodes, columns, widthPx, heightPx, colWidthPx, unitPx };
}

export function nodeTopPx(slot: number, unitPx: number): number {
  return slot * unitPx + 36;
}

export function cardCenterY(slot: number, unitPx: number): number {
  const cardH = R32_ROW_SPAN * unitPx - BRACKET_CARD_GAP_PX;
  return nodeTopPx(slot, unitPx) + cardH / 2;
}

export function nodeLeftPx(col: number, colWidthPx: number): number {
  return col * colWidthPx + 20;
}

/** Connector segments between adjacent rounds on one side. */
export function bracketConnectors(side: "left" | "right"): Array<{
  fromCol: number;
  toCol: number;
  fromRoundSize: 8 | 4 | 2;
  toRoundSize: 4 | 2 | 1;
  pairs: number;
}> {
  return side === "left"
    ? [
        { fromCol: 0, toCol: 1, fromRoundSize: 8, toRoundSize: 4, pairs: 4 },
        { fromCol: 1, toCol: 2, fromRoundSize: 4, toRoundSize: 2, pairs: 2 },
        { fromCol: 2, toCol: 3, fromRoundSize: 2, toRoundSize: 1, pairs: 1 },
      ]
    : [
        { fromCol: 8, toCol: 7, fromRoundSize: 8, toRoundSize: 4, pairs: 4 },
        { fromCol: 7, toCol: 6, fromRoundSize: 4, toRoundSize: 2, pairs: 2 },
        { fromCol: 6, toCol: 5, fromRoundSize: 2, toRoundSize: 1, pairs: 1 },
      ];
}

export { slotForRound };
