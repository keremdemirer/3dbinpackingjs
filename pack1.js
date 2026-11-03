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
      'ID | Item index | Instance index | Rotation | X Y Z | Packed width height depth'
    ];
    if (result.diagnostics.search) lines.splice(1,0,'SEARCH PASSES : ' + result.diagnostics.search.passes);
    result.placements.forEach(function(item) {
      var p = item.position;
      var d = item.dimensions;
      lines.push([item.id, item.itemIndex, item.instanceIndex, item.rotation || 'free',
        [p.x, p.y, p.z].join(' '), [d.width, d.height, d.depth].join(' ')].join(' | '));
    });
    lines.push('', '*** LIST OF UNPACKED BOXES ***');
    result.unpacked.forEach(function(item) {
      var d = item.dimensions;
      lines.push([item.id, item.itemIndex, item.instanceIndex, item.rotation || 'free',
        [d.width, d.height, d.depth].join(' ')].join(' | '));
    });
    return lines.join('\n');
  }

  function readInput() {
    return {
      search: document.getElementById('search') ? document.getElementById('search').value : undefined,
      settle: document.getElementById('settle') ? document.getElementById('settle').checked : false,
      container: {
        width: Number(document.getElementById('strxx').value),
        height: Number(document.getElementById('stryy').value),
        depth: Number(document.getElementById('strzz').value)
      },
      items: Array.from(document.getElementsByClassName('box-inputs'), function(row) {
        var rotation = row.querySelector ? row.querySelector('[name="rotation"]') : row.children.rotation;
        return {
          id: row.children.lbl.value,
          width: Number(row.children.dim1.value),
          height: Number(row.children.dim2.value),
          depth: Number(row.children.dim3.value),
          quantity: Number(row.children.boxn.value),
          rotation: rotation ? rotation.value : undefined
        };
      })
    };
  }
  var pendingReport = null, reportDetails = null;
  function renderReport() {
    if (pendingReport && (!reportDetails || reportDetails.open)) {
      document.getElementById('screen').value = formatReport(pendingReport);
      pendingReport = null;
    }
  }
  function showResult(result) {
    var screen = document.getElementById('screen');
    var details = screen.closest ? screen.closest('details') : null;
    if (details !== reportDetails) {
      if (reportDetails) reportDetails.removeEventListener('toggle', renderReport);
      reportDetails = details;
      if (reportDetails) reportDetails.addEventListener('toggle', renderReport);
    }
    pendingReport = result;
    screen.value = '';
    renderReport();
    if (typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      root.dispatchEvent(new root.CustomEvent('packing:result', { detail: result }));
    }
  }
  function showError(message) {
    pendingReport = null;
    document.getElementById('screen').value = message;
    if (typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      root.dispatchEvent(new root.CustomEvent('packing:error', { detail: message }));
    }
  }
  root.PackingForm = { readInput: readInput, formatReport: formatReport, showResult: showResult, showError: showError };
  root.main = function() {
    try {
      showResult(root.BinPacking.pack(readInput()));
      return 0;
    } catch (error) {
      showError(error.message);
      return 1;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
