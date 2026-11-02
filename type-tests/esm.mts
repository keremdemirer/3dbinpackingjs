import { pack } from '3dbinpackingjs';
import type { Dimensions, Item, PackInput, PackResult, Position, RotationRule } from '3dbinpackingjs';

const container: Readonly<Dimensions> = Object.freeze({ width: 2, height: 1, depth: 1 });
const items: ReadonlyArray<Readonly<Item>> = Object.freeze([
  Object.freeze({ id: 42, width: 1, height: 1, depth: 1 })
]);
const input: PackInput = { container, items };
const result: PackResult = pack(input);
const position: Position | undefined = result.placements[0]?.position;
result.container.width = 3; // Returned data is owned by the caller and mutable.
void position;
// @ts-expect-error There is no default export in the ES module wrapper.
import defaultAPI from '3dbinpackingjs';
// @ts-expect-error Required item dimensions cannot be omitted.
pack({ container, items: [{ width: 1, height: 1 }] });
// @ts-expect-error Input item collections must be arrays.
pack({ container, items: {} });

const rotation: RotationRule = 'upright';
pack({ container, items: [{ width: 1, height: 1, depth: 1, rotation }] });
// @ts-expect-error Rotation rules are a closed set of named modes.
pack({ container, items: [{ width: 1, height: 1, depth: 1, rotation: 'sideways' }] });

pack({ container, items: [], settle: true }).diagnostics.settling?.totalDrop;

import type { SearchMode } from '3dbinpackingjs';
const search: SearchMode = 'extended';
pack({ container, items: [], search }).diagnostics.search?.passes;
