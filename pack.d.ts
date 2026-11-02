export as namespace BinPacking;

/** Dimensions use one consistent unit; width maps to X, height to Y, depth to Z. */
export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export type ItemId = string | number;

export interface Item extends Dimensions {
  /** Defaults to the item's zero-based input array index. Duplicate IDs are allowed. */
  id?: ItemId;
  /** Positive safe integer; defaults to 1. */
  quantity?: number;
}

export interface PackInput {
  readonly container: Readonly<Dimensions>;
  readonly items: ReadonlyArray<Readonly<Item>>;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface ItemInstance {
  id: ItemId;
  /** Zero-based index in the input items array. */
  itemIndex: number;
  /** Zero-based index within this item's quantity. */
  instanceIndex: number;
  dimensions: Dimensions;
}

export interface Placement extends ItemInstance {
  /** Minimum corner in the original container axes; dimensions reflect rotation. */
  position: Position;
}

/** Dimensions retain the original input orientation; there is no position. */
export interface UnpackedItem extends ItemInstance {}

export interface PackDiagnostics {
  /** Number of initial-layer search trials. */
  iterations: number;
}

export interface PackResult {
  container: Dimensions;
  placements: Placement[];
  unpacked: UnpackedItem[];
  totalCount: number;
  packedCount: number;
  containerVolume: number;
  totalItemVolume: number;
  packedVolume: number;
  /** Packed volume / container volume, as a fraction rather than a percentage. */
  utilization: number;
  diagnostics: PackDiagnostics;
}

/**
 * Synchronous, single-container heuristic. Does not modify input objects.
 * Dimensions and computed volumes must be positive finite numbers.
 * @throws {TypeError} If the input shape, dimensions, IDs, or quantities are invalid.
 */
export function pack(input: PackInput): PackResult;
