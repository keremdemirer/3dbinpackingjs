export as namespace BinPacking;

/** Dimensions use one consistent unit; width maps to X, height to Y, depth to Z. */
export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export type ItemId = string | number;

/** Upright preserves original Y height and permits width/depth swaps; fixed preserves X/Y/Z. */
export type RotationRule = 'free' | 'upright' | 'fixed';

export interface Item extends Dimensions {
  /** Defaults to the item's zero-based input array index. Duplicate IDs are allowed. */
  id?: ItemId;
  /** Positive safe integer; defaults to 1. */
  quantity?: number;
  /** Defaults to free. Rules are measured in the original container axes. */
  rotation?: RotationRule;
}

/** Standard preserves existing decisions; extended tries at most two search passes. */
export type SearchMode = 'standard' | 'extended';

export interface PackInput {
  /** Defaults to standard. Extended retains the standard result unless more volume fits. */
  readonly search?: SearchMode;
  /** Lower packed boxes along original -Y after search. Defaults to false; not a stability model. */
  readonly settle?: boolean;
  readonly container: Readonly<Dimensions>;
  readonly items: ReadonlyArray<Readonly<Item>>;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface ItemInstance {
  /** Present for upright/fixed instances; omitted for free rotation for compatibility. */
  rotation?: Exclude<RotationRule, 'free'>;
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
  /** Present only for extended search. Iterations count trials across both passes. */
  search?: { mode: 'extended'; passes: 1 | 2 };
  /** Present only when settle is true, including empty/no-fit results. */
  settling?: {
    movedCount: number;
    /** Sum of vertical distances moved, in the input dimension unit. */
    totalDrop: number;
  };
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
