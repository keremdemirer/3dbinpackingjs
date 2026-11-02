import api = require('3dbinpackingjs');
import type { PackInput, PackResult, Placement, UnpackedItem } from '3dbinpackingjs';

const input: PackInput = {
  container: { width: 2, height: 1, depth: 1 },
  items: [{ id: 'sku', width: 1, height: 1, depth: 1, quantity: 3 }]
};
const result: PackResult = api.pack(input);
const placement: Placement | undefined = result.placements[0];
if (placement) {
  const x: number = placement.position.x;
  const id: string | number = placement.id;
  const width: number = placement.dimensions.width;
  void [x, id, width];
}
const unpacked: UnpackedItem | undefined = result.unpacked[0];
if (unpacked) {
  // @ts-expect-error Unpacked items have no position.
  unpacked.position.x;
}
// @ts-expect-error The API requires a structured request.
api.pack();
// @ts-expect-error Numeric strings are rejected at runtime.
api.pack({ container: { width: '2', height: 1, depth: 1 }, items: [] });
// @ts-expect-error Item IDs must be strings or numbers.
api.pack({ container: input.container, items: [{ id: {}, width: 1, height: 1, depth: 1 }] });
