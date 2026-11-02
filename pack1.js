/* Browser form adapter. The packing algorithm lives in pack.js. */
(function(root) {
  'use strict';

  function formatReport(result) {
    var lines = [
      'TOTAL NUMBER OF ITERATIONS DONE : ' + result.diagnostics.iterations,
      'TOTAL NUMBER OF BOXES : ' + result.totalCount,
      'PACKED NUMBER OF BOXES : ' + result.packedCount,
      'TOTAL VOLUME OF ALL BOXES : ' + result.totalItemVolume,
      'PALLET VOLUME : ' + result.containerVolume,
      "BEST SOLUTION'S VOLUME UTILIZATION : " + result.packedVolume + ' OUT OF ' + result.containerVolume,
      'PERCENTAGE OF PALLET VOLUME USED : ' + result.utilization * 100,
      'PERCENTAGE OF PACKED BOXES (VOLUME) : ' + (result.totalItemVolume ? result.packedVolume / result.totalItemVolume * 100 : 0),
      '',
      '*** PACKED BOXES ***',
      'ID | Item index | Instance index | X Y Z | Packed width height depth'
    ];
    result.placements.forEach(function(item) {
      var p = item.position;
      var d = item.dimensions;
      lines.push([item.id, item.itemIndex, item.instanceIndex,
        [p.x, p.y, p.z].join(' '), [d.width, d.height, d.depth].join(' ')].join(' | '));
    });
    lines.push('', '*** LIST OF UNPACKED BOXES ***');
    result.unpacked.forEach(function(item) {
      var d = item.dimensions;
      lines.push([item.id, item.itemIndex, item.instanceIndex,
        [d.width, d.height, d.depth].join(' ')].join(' | '));
    });
    return lines.join('\n');
  }

  root.main = function() {
    var screen = document.getElementById('screen');
    try {
      var result = root.BinPacking.pack({
        container: {
          width: Number(document.getElementById('strxx').value),
          height: Number(document.getElementById('stryy').value),
          depth: Number(document.getElementById('strzz').value)
        },
        items: Array.from(document.getElementsByClassName('box-inputs'), function(row) {
          return {
            id: row.children.lbl.value,
            width: Number(row.children.dim1.value),
            height: Number(row.children.dim2.value),
            depth: Number(row.children.dim3.value),
            quantity: Number(row.children.boxn.value)
          };
        })
      });
      screen.value = formatReport(result);
      return 0;
    } catch (error) {
      screen.value = error.message;
      return 1;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
