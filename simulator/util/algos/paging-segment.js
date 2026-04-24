// Segmentation with Paging Simulator
// This module creates 4 logical segments for a process and maps each segment's pages to physical frames.

const PagingSegmentSimulator = {
  // Divide the process size into four segments: Code 40%, Data 30%, Stack 20%, Heap 10%
  breakdownSize(totalSize) {
    const size = Number(totalSize);
    if (!Number.isFinite(size) || size <= 0) {
      return { code: 0, data: 0, stack: 0, heap: 0 };
    }

    const code = Math.floor(size * 0.40);
    const data = Math.floor(size * 0.30);
    const stack = Math.floor(size * 0.20);
    const heap = size - code - data - stack;

    return { code, data, stack, heap };
  },

  // Split a segment into pages and compute internal fragmentation.
  segmentToPages(segmentSize, pageSize) {
    const segSize = Number(segmentSize);
    const pgSize = Number(pageSize);
    if (!Number.isFinite(segSize) || segSize <= 0 || !Number.isFinite(pgSize) || pgSize <= 0) {
      return { pages: [], internalFragmentation: 0 };
    }

    const totalPages = Math.ceil(segSize / pgSize);
    const pages = [];
    let remaining = segSize;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const pageUsed = Math.min(pgSize, remaining);
      pages.push({
        pageIndex,
        size: pageUsed,
        frameId: null,
      });
      remaining -= pageUsed;
    }

    const internalFragmentation = totalPages * pgSize - segSize;
    return { pages, internalFragmentation };
  },

  // Create physical memory frames from total memory and page/frame size.
  createFrames(totalMemory, pageSize) {
    const memorySize = Number(totalMemory);
    const frameSize = Number(pageSize);
    if (!Number.isFinite(memorySize) || memorySize <= 0 || !Number.isFinite(frameSize) || frameSize <= 0) {
      return { frames: [], frameSize: 0 };
    }

    const frameCount = Math.floor(memorySize / frameSize);
    const frames = [];

    for (let i = 0; i < frameCount; i++) {
      frames.push({
        frameId: i + 1,
        size: frameSize,
        status: "Free",
        processName: null,
        segmentType: null,
        pageIndex: null,
        used: 0,
      });
    }

    return { frames, frameSize };
  },

  // Allocate all segment pages to free frames sequentially.
  allocatePagesToFrames(frames, processName, segmentType, pages) {
    const allocation = [];
    const allocatedFrames = [];

    for (const page of pages) {
      const freeFrame = frames.find((frame) => frame.status === "Free");
      if (!freeFrame) {
        // Roll back any changes made for this segment when allocation fails partway.
        allocatedFrames.forEach((frame) => {
          frame.status = "Free";
          frame.processName = null;
          frame.segmentType = null;
          frame.pageIndex = null;
          frame.used = 0;
        });
        return { success: false, allocation: [] };
      }

      freeFrame.status = "Occupied";
      freeFrame.processName = processName;
      freeFrame.segmentType = segmentType;
      freeFrame.pageIndex = page.pageIndex;
      freeFrame.used = page.size;
      page.frameId = freeFrame.frameId;
      allocation.push({
        processName,
        segmentType,
        pageIndex: page.pageIndex,
        pageSize: page.size,
        frameId: freeFrame.frameId,
      });
      allocatedFrames.push(freeFrame);
    }

    return { success: true, allocation };
  },

  // Simulate segmentation with paging for a list of processes.
  simulate(processes, totalMemory = 128, pageSize = 4) {
    const memory = this.createFrames(totalMemory, pageSize);
    const processResults = [];
    let totalInternalFrag = 0;
    let allocatedProcesses = 0;

    processes.forEach((processSize, processIndex) => {
      const processName = `Process ${processIndex + 1}`;
      const breakdown = this.breakdownSize(processSize);
      const segments = [];
      let processAllocatable = true;
      let processInternalFrag = 0;
      let processPagesAllocated = [];

      const remainingFreeFrames = memory.frames.filter((frame) => frame.status === "Free").length;
      const requiredPages = Object.values({ Code: breakdown.code, Data: breakdown.data, Stack: breakdown.stack, Heap: breakdown.heap })
        .map((segmentSize) => Math.ceil(segmentSize / pageSize))
        .reduce((total, count) => total + count, 0);

      if (requiredPages > remainingFreeFrames) {
        processAllocatable = false;
      }

      if (processAllocatable) {
        Object.entries({ Code: breakdown.code, Data: breakdown.data, Stack: breakdown.stack, Heap: breakdown.heap }).forEach(([segmentType, segmentSize]) => {
          const { pages, internalFragmentation } = this.segmentToPages(segmentSize, pageSize);
          const allocationResult = this.allocatePagesToFrames(memory.frames, processName, segmentType, pages);

          if (!allocationResult.success) {
            processAllocatable = false;
            return;
          }

          processInternalFrag += internalFragmentation;
          processPagesAllocated = processPagesAllocated.concat(allocationResult.allocation);
          segments.push({
            segmentType,
            segmentSize,
            pages,
            internalFragmentation,
          });
        });
      }

      if (!processAllocatable) {
        processResults.push({
          processName,
          requestedSize: processSize,
          status: "Unallocated",
          breakdown,
          segments: [],
          pages: [],
          internalFragmentation: 0,
        });
        return;
      }

      allocatedProcesses += 1;
      totalInternalFrag += processInternalFrag;

      processResults.push({
        processName,
        requestedSize: processSize,
        status: "Allocated",
        breakdown,
        segments,
        pages: processPagesAllocated,
        internalFragmentation: processInternalFrag,
      });
    });

    const usedFrames = memory.frames.filter((frame) => frame.status === "Occupied").length;
    const freeFrames = memory.frames.filter((frame) => frame.status === "Free").length;

    return {
      totalMemory,
      pageSize,
      frameCount: memory.frames.length,
      usedFrames,
      freeFrames,
      totalInternalFragmentation: totalInternalFrag,
      allocatedProcesses,
      totalProcesses: processes.length,
      memory,
      processResults,
    };
  },

  getSegmentContainer() {
    return document.querySelector('.segmentation-paging');
  },

  getFramesContainer() {
    return document.querySelector('.frames-container');
  },

  getPageTableBody() {
    return document.querySelector('#page-table-body');
  },

  resetSegmentationPagingUI() {
    const segContainer = this.getSegmentContainer();
    const framesContainer = this.getFramesContainer();
    const tableBody = this.getPageTableBody();

    if (segContainer) {
      segContainer.innerHTML = '';
    }
    if (framesContainer) {
      framesContainer.innerHTML = '';
    }
    if (tableBody) {
      tableBody.innerHTML = '';
    }

    if (typeof updateStatistics === 'function') {
      updateStatistics({
        allocatedSize: 0,
        totalFree: 0,
        intFragmentation: 0,
        externalFragmentation: 0,
        memoryUtilization: 0,
        successRate: 0,
      });
    }
    if (typeof setTotalMemoryDisplay === 'function') {
      setTotalMemoryDisplay(0);
    }
  },

  initializeSegmentationPagingUI(processes, totalMemory, pageSize) {
    this.resetSegmentationPagingUI();
    if (typeof setTotalMemoryDisplay === 'function') {
      setTotalMemoryDisplay(totalMemory);
    }
    if (typeof updateStatistics === 'function') {
      updateStatistics({
        allocatedSize: 0,
        totalFree: totalMemory,
        intFragmentation: 0,
        externalFragmentation: 0,
        memoryUtilization: 0,
        successRate: 0,
      });
    }
    const algoDescription = document.getElementById('algo-description');
    if (algoDescription) {
      algoDescription.textContent = 'Segmentation with Paging Simulation';
    }
  },

  updateSegmentationPagingUI(result) {
    const segContainer = this.getSegmentContainer();
    const framesContainer = this.getFramesContainer();
    const tableBody = this.getPageTableBody();

    if (!segContainer || !framesContainer || !tableBody || !result) return;

    segContainer.innerHTML = '';
    framesContainer.innerHTML = '';
    tableBody.innerHTML = '';

    const allocatedSize = result.processResults.reduce((sum, proc) => {
      return sum + (proc.status === 'Allocated' ? proc.requestedSize : 0);
    }, 0);
    const totalFree = result.freeFrames * result.pageSize;
    const successRate = result.totalProcesses > 0 ? (result.allocatedProcesses / result.totalProcesses) * 100 : 0;

    const getProcessColors = (processName) => {
      const defaultColors = { bg: '#9BF6FF', border: '#74B8BF' };
      if (!processName) return defaultColors;
      const processes = Array.from(document.querySelectorAll('.process'));
      const processEl = processes.find((process) => {
        const nameEl = process.querySelector('.process-content p:first-child');
        return nameEl && nameEl.textContent.trim() === processName;
      });
      if (!processEl) return defaultColors;
      return {
        bg: processEl.getAttribute('data-bg') || defaultColors.bg,
        border: processEl.getAttribute('data-border') || defaultColors.border,
      };
    };

    result.processResults.forEach((process) => {
      // const processTitle = document.createElement('div');
      // processTitle.className = 'process-segmentation-heading';
      // processTitle.innerHTML = `<h4>${process.processName}${process.status === 'Unallocated' ? ' (Unallocated)' : ''}</h4>`;
      // segContainer.appendChild(processTitle);

      // if (process.segments.length === 0) {
      //   const emptySignal = document.createElement('div');
      //   emptySignal.style.padding = '12px';
      //   emptySignal.style.color = '#777';
      //   emptySignal.textContent = 'This process could not be allocated into frames.';
      //   segContainer.appendChild(emptySignal);
      //   return;
      // }

      const { bg, border } = getProcessColors(process.processName);

      process.segments.forEach((segment, index) => {
        const segmentCard = document.createElement('div');
        segmentCard.className = 'segments-paging-container';
        // segmentCard.style.display = 'flex';
        // segmentCard.style.alignItems = 'flex-start';
        // segmentCard.style.gap = '12px';
        // segmentCard.style.marginTop = '8px';

        const segmentNumberDiv = document.createElement("div");
        segmentNumberDiv.id = "segment-number";
        segmentNumberDiv.textContent = `S${index}`;
        segmentNumberDiv.style.minWidth = '20px';
        segmentNumberDiv.style.display = 'flex';
        segmentNumberDiv.style.alignItems = 'center';
        segmentNumberDiv.style.marginTop = '12px';
        segmentCard.appendChild(segmentNumberDiv);

        const header = document.createElement('div');
        header.className = 'segments-paging';
        header.style.border = `4px solid ${bg}`;
        header.style.borderRadius = '8px';
        header.style.width = '100%';
        header.style.backgroundColor = 'white';

        header.innerHTML = `
          <div class="segment-paging-header" style="background-color: ${bg}; padding: 12px; display: flex; justify-content: space-between;">
            <div>
              <p><b>${process.processName}</b></p>
              <p class="segment-type">${segment.segmentType}</p>
            </div>
            <div><p>${segment.segmentSize} KB</p></div>
          </div>
        `;

        const pagesRow = document.createElement('div');
        pagesRow.className = 'segment-pages';
        pagesRow.style.display = 'flex';
        pagesRow.style.flexDirection = 'column';
        pagesRow.style.gap = '4px';
        pagesRow.style.padding = '8px';

        segment.pages.forEach((page) => {
          const pageEl = document.createElement('div');
          pageEl.className = 'page';
          pageEl.style.display = 'flex';
          pageEl.style.gap = '8px';
          pageEl.style.alignItems = 'center';
          
          pageEl.innerHTML = `
            <p id="page-number" style="font-size: 12px; min-width: 20px;">P${page.pageIndex}</p>
            <div class="page-content" style="background-color: ${bg}; border-bottom: 2px solid ${border}; display: grid; grid-template-columns: repeat(2, 1fr); width: 100%; border-radius: 8px; padding: 10px; font-size: 10px; align-items: center; box-sizing: border-box;">
              <p style="text-align: left;">${process.processName} - ${segment.segmentType}</p>
              <p style="text-align: right;">${page.size} KB</p>
            </div>
          `;
          pagesRow.appendChild(pageEl);
        });

        header.appendChild(pagesRow);
        segmentCard.appendChild(header);
        segContainer.appendChild(segmentCard);
      });
    });

    result.memory.frames.forEach((frame) => {
      const frameEl = document.createElement('div');
      frameEl.className = 'frame';
      frameEl.id = `frame-${frame.frameId}`;
      let content = '';
      if (frame.status === 'Occupied') {
        const { bg, border } = getProcessColors(frame.processName);
        content = `<div class="frame-content" style="grid-template-columns: repeat(3, 1fr); background-color: ${bg}; border-bottom: 4px solid ${border}; width: 100%; box-sizing: border-box;"><p style="text-align: left;">${frame.processName}</p><p style="text-align: center;">${frame.segmentType}</p><p style="text-align: right;">Page ${frame.pageIndex}</p></div>`;
      } else {
        content = `<div class="frame-content" style="display: flex; justify-content: space-between; width: 100%; box-sizing: border-box;"><p>Free</p><p>${frame.size} KB</p></div>`;
      }
      frameEl.innerHTML = `<p id="frame-number" style="min-width: 24px;">F${frame.frameId}</p>${content}`;
      framesContainer.appendChild(frameEl);
    });

    Object.values(result.memory.frames)
      .filter((frame) => frame.status === 'Occupied')
      .forEach((frame) => {
        const { bg } = getProcessColors(frame.processName);
        const row = document.createElement('tr');
        row.style.borderLeft = `8px solid ${bg}`;
        row.innerHTML = `
          <td>${frame.processName}</td>
          <td>${frame.segmentType}</td>
          <td>Page ${frame.pageIndex}</td>
          <td>Frame ${frame.frameId}</td>
        `;
        tableBody.appendChild(row);
      });

    if (typeof updateStatistics === 'function') {
      updateStatistics({
        allocatedSize,
        totalFree,
        intFragmentation: result.totalInternalFragmentation,
        externalFragmentation: 0,
        memoryUtilization: result.totalMemory > 0 ? ((result.totalMemory - totalFree) / result.totalMemory) * 100 : 0,
        successRate,
      });
    }
    if (typeof setTotalMemoryDisplay === 'function') {
      setTotalMemoryDisplay(result.totalMemory);
    }
  },
};

if (typeof window !== 'undefined') {
  window.PagingSegmentSimulator = PagingSegmentSimulator;
  window.initializeSegmentationPagingUI = function(processes, totalMemory, pageSize) {
    PagingSegmentSimulator.initializeSegmentationPagingUI(processes, totalMemory, pageSize);
  };
  window.updateSegmentationPagingUI = function(result) {
    PagingSegmentSimulator.updateSegmentationPagingUI(result);
  };
  window.resetSegmentationPagingUI = function() {
    PagingSegmentSimulator.resetSegmentationPagingUI();
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PagingSegmentSimulator };
}
