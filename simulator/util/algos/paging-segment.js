// Segmentation with Paging Simulator
// This module creates 4 logical segments for a process and maps each segment's pages to physical frames.

const PagingSegmentSimulator = {
  processColors: [
    { bg: "#FFADAD", border: "#BF8282" }, // Powder Blush
    { bg: "#FFD6A5", border: "#BFA07C" }, // Apricot Cream
    { bg: "#FDFFB6", border: "#BEBF88" }, // Cream
    { bg: "#CAFFBF", border: "#98BF8F" }, // Tea Green
    { bg: "#9BF6FF", border: "#7DC6CE" }, // Electric Aqua
    { bg: "#A0C4FF", border: "#7893BF" }, // Baby Blue Ice
    { bg: "#BDB2FF", border: "#8E85BF" }, // Periwinkle
    { bg: "#FFC6FF", border: "#BF94BF" }, // Mavue
  ],

  getProcessColor(processName) {
    if (!processName) return { bg: "#ffffff", border: "#e0e0e0" };
    const id = parseInt(processName.replace('Process ', '')) || 1;
    return this.processColors[(id - 1) % this.processColors.length];
  },

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

    result.processResults.forEach((process) => {
      const colorPair = this.getProcessColor(process.processName);
      // const processTitle = document.createElement('div');
      // processTitle.className = 'process-segmentation-heading';
      // processTitle.innerHTML = `<h4>${process.processName}${process.status === 'Unallocated' ? ' (Unallocated)' : ''}</h4>`;
      // segContainer.appendChild(processTitle);


      process.segments.forEach((segment, index) => {
        const segmentCard = document.createElement('div');
        segmentCard.className = 'segments-paging-container';

        const segmentNumber = document.createElement('p');
        segmentNumber.id = 'segment-number';
        segmentNumber.textContent = `S${index}`;

        const segmentsPaging = document.createElement('div');
        segmentsPaging.className = 'segments-paging';
        segmentsPaging.style.borderColor = colorPair.bg;

        let pagesHtml = '';
        segment.pages.forEach((page) => {
          pagesHtml += `
            <div class="page">
              <p id="page-number">P${page.pageIndex}</p>
              <div class="page-content" style="background-color: ${colorPair.bg}; border-bottom-color: ${colorPair.border}">
                <p>${process.processName} - ${segment.segmentType}</p>
                <p>${page.size} KB</p>
              </div>
            </div>
          `;
        });

        segmentsPaging.innerHTML = `
          <div class="segment-paging-header" style="background-color: ${colorPair.bg}">
            <div>
              <p><b>${process.processName}</b></p>
              <p class="segment-type">${segment.segmentType}</p>
            </div>
            <div><p>${segment.segmentSize} KB</p></div>
          </div>
          <div class="segment-pages">
            ${pagesHtml}
          </div>
        `;

        segmentCard.appendChild(segmentNumber);
        segmentCard.appendChild(segmentsPaging);
        segContainer.appendChild(segmentCard);
      });
    });

    result.memory.frames.forEach((frame) => {
      const frameEl = document.createElement('div');
      frameEl.className = 'frame';
      frameEl.id = `frame-${frame.frameId}`;
      let content = '';
      if (frame.status === 'Occupied') {
        const colorPair = this.getProcessColor(frame.processName);
        content = `<div class="frame-content" style="background-color: ${colorPair.bg}; border-bottom-color: ${colorPair.border}">`;
        content += `<p>${frame.size} KB</p><p>${frame.processName}</p><p>${frame.segmentType}</p><p>Page ${frame.pageIndex}</p>`;
      } else {
        content = `<div class="frame-content">`;
        content += `<p>${frame.size} KB</p><p>Free</p>`;
      }
      content += '</div>';
      frameEl.innerHTML = `<p id="frame-number">F${frame.frameId}</p>${content}`;
      framesContainer.appendChild(frameEl);
    });

    Object.values(result.memory.frames)
      .filter((frame) => frame.status === 'Occupied')
      .forEach((frame) => {
        const row = document.createElement('tr');
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
