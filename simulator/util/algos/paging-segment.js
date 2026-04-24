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
    const id = parseInt(processName.replace("Process ", "")) || 1;
    return this.processColors[(id - 1) % this.processColors.length];
  },

  // Divide the process size into four segments: Code 40%, Data 30%, Stack 20%, Heap 10%
  breakdownSize(totalSize) {
    const size = Number(totalSize);
    if (!Number.isFinite(size) || size <= 0) {
      return { code: 0, data: 0, stack: 0, heap: 0 };
    }

    const evenFloor = (val) => Math.floor(val / 2) * 2;

    const code = evenFloor(size * 0.4);
    const heap = evenFloor(size * 0.3);
    const data = evenFloor(size * 0.2);
    const stack = size - code - heap - data;
    return { code, heap, data, stack };
  },

  // Split a segment into pages and compute internal fragmentation.
  segmentToPages(segmentSize, pageSize) {
    const segSize = Number(segmentSize);
    const pgSize = Number(pageSize);
    if (
      !Number.isFinite(segSize) ||
      segSize <= 0 ||
      !Number.isFinite(pgSize) ||
      pgSize <= 0
    ) {
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
    if (
      !Number.isFinite(memorySize) ||
      memorySize <= 0 ||
      !Number.isFinite(frameSize) ||
      frameSize <= 0
    ) {
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
    const framesArray = Array.isArray(frames) ? frames : Object.values(frames);

    console.log(
      `Allocating ${pages.length} pages for ${processName} - ${segmentType}`,
    );

    for (const page of pages) {
      const freeFrames = framesArray.filter((frame) => frame.status === "Free");
      if (freeFrames.length === 0) {
        console.warn("No free frames found during allocation!");
        // Return whatever was allocated so far instead of rolling back
        return { success: false, allocation };
      }
      const randomIndex = Math.floor(Math.random() * freeFrames.length);
      const freeFrame = freeFrames[randomIndex];

      freeFrame.status = "Occupied";
      freeFrame.processName = processName;
      freeFrame.segmentType = segmentType;
      freeFrame.pageIndex = page.pageIndex;
      freeFrame.used = page.size;
      page.frameId = freeFrame.frameId || freeFrame.id; // Support both frameId and id

      allocation.push({
        processName,
        segmentType,
        pageIndex: page.pageIndex,
        pageSize: page.size,
        frameId: page.frameId,
      });
      allocatedFrames.push(freeFrame);
    }

    console.log(
      `Successfully allocated ${allocation.length} frames for ${segmentType}`,
    );
    return { success: true, allocation };
  },

  // Allocate a single page to a free frame.
  allocatePageStepSingle(frames, processName, segmentType, page) {
    const framesArray = Array.isArray(frames) ? frames : Object.values(frames);
    const freeFrames = framesArray.filter((frame) => frame.status === "Free");

    if (freeFrames.length === 0) {
      return { success: false };
    }

    const randomIndex = Math.floor(Math.random() * freeFrames.length);
    const freeFrame = freeFrames[randomIndex];

    freeFrame.status = "Occupied";
    freeFrame.processName = processName;
    freeFrame.segmentType = segmentType;
    freeFrame.pageIndex = page.pageIndex;
    freeFrame.used = page.size;
    page.frameId = freeFrame.frameId || freeFrame.id;

    return {
      success: true,
      allocation: {
        processName,
        segmentType,
        pageIndex: page.pageIndex,
        pageSize: page.size,
        frameId: page.frameId,
      },
    };
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

      Object.entries({
        Code: breakdown.code,
        Heap: breakdown.heap,
        Data: breakdown.data,
        Stack: breakdown.stack
      }).forEach(([segmentType, segmentSize]) => {
        if (!processAllocatable) {
          // If we ran out of memory in a previous segment, just record the segment with no physical frames
          const { pages, internalFragmentation } = this.segmentToPages(segmentSize, pageSize);
          segments.push({
            segmentType,
            segmentSize,
            pages,
            internalFragmentation: 0,
          });
          return;
        }

        const { pages, internalFragmentation } = this.segmentToPages(
          segmentSize,
          pageSize,
        );
        const allocationResult = this.allocatePagesToFrames(
          memory.frames,
          processName,
          segmentType,
          pages,
        );

        if (!allocationResult.success) {
          processAllocatable = false;
        }

        processInternalFrag += internalFragmentation;
        processPagesAllocated = processPagesAllocated.concat(
          allocationResult.allocation,
        );
        segments.push({
          segmentType,
          segmentSize,
          pages,
          internalFragmentation,
        });
      });

      if (processPagesAllocated.length === 0) {
        processResults.push({
          processName,
          requestedSize: processSize,
          status: "Unallocated",
          breakdown,
          segments,
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

    const usedFrames = memory.frames.filter(
      (frame) => frame.status === "Occupied",
    ).length;
    const freeFrames = memory.frames.filter(
      (frame) => frame.status === "Free",
    ).length;

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

  getSimulationSummary(state) {
    const { processes, memory, processResults, memorySize, pageSize } = state;
    if (!memory || !memory.frames) return null;

    const framesArray = Array.isArray(memory.frames)
      ? memory.frames
      : Object.values(memory.frames);
    const usedFrames = framesArray.filter(
      (frame) => frame.status === "Occupied",
    ).length;
    const freeFrames = framesArray.filter(
      (frame) => frame.status === "Free",
    ).length;
    const totalInternalFragmentation = processResults.reduce(
      (sum, proc) => sum + (proc.internalFragmentation || 0),
      0,
    );
    const allocatedProcesses = processResults.filter(
      (p) => p.status === "Allocated",
    ).length;

    return {
      totalMemory: memorySize,
      pageSize,
      frameCount: framesArray.length,
      usedFrames,
      freeFrames,
      totalInternalFragmentation,
      allocatedProcesses,
      totalProcesses: processes.length,
      memory: { frames: framesArray },
      processResults,
    };
  },

  getSegmentContainer() {
    return document.querySelector(
      "#segmentation-paging-view .segmentation-paging",
    );
  },

  getFramesContainer() {
    return document.querySelector(
      "#segmentation-paging-view .frames-container",
    );
  },

  getPageTableBody() {
    return document.querySelector(
      "#segmentation-paging-view #seg-paging-table-body",
    );
  },

  resetSegmentationPagingUI() {
    const segContainer = this.getSegmentContainer();
    const framesContainer = this.getFramesContainer();
    const tableBody = this.getPageTableBody();

    if (segContainer) {
      segContainer.innerHTML = "";
    }
    if (framesContainer) {
      framesContainer.innerHTML = "";
    }
    if (tableBody) {
      tableBody.innerHTML = "";
    }

    if (typeof updateStatistics === "function") {
      updateStatistics({
        allocatedSize: 0,
        totalFree: 0,
        يفة: 0,
        externalFragmentation: 0,
        memoryUtilization: 0,
        successRate: 0,
      });
    }
    if (typeof setTotalMemoryDisplay === "function") {
      setTotalMemoryDisplay(0);
    }
  },

  initializeSegmentationPagingUI(processes, totalMemory, pageSize) {
    this.resetSegmentationPagingUI();
    // Try to use the actual user input for total memory if available
    const { memorySize } = getSegmentationPagingInputs();
    const displayMemory =
      !Number.isNaN(memorySize) && memorySize > 0 ? memorySize : totalMemory;
    if (typeof setTotalMemoryDisplay === "function") {
      setTotalMemoryDisplay(displayMemory);
    }
    if (typeof updateStatistics === "function") {
      updateStatistics({
        allocatedSize: 0,
        totalFree: displayMemory,
        يفة: 0,
        externalFragmentation: 0,
        memoryUtilization: 0,
        successRate: 0,
      });
    }
    const algoDescription = document.getElementById("algo-description");
    if (algoDescription) {
      algoDescription.textContent = "Segmentation with Paging Simulation";
    }
  },

  updateSegmentationPagingUI(result) {
    const segContainer = this.getSegmentContainer();
    const framesContainer = this.getFramesContainer();
    const tableBody = this.getPageTableBody();

    // if (!segContainer || !framesContainer || !tableBody || !result) {
    //   console.warn("UI Containers or Result missing:", { segContainer, framesContainer, tableBody, result });
    //   return;
    // }

    // if (typeof appendConsoleMessage === 'function') {
    //   appendConsoleMessage(`DEBUG: Rendering ${result.processResults.length} processes and ${result.memory.frames.length} frames.`);
    // }

    segContainer.innerHTML = "";
    framesContainer.innerHTML = "";
    tableBody.innerHTML = "";

    const currentAlloc = result.currentAllocation || {};

    const allocatedSize = result.processResults.reduce((sum, proc) => {
      return sum + (proc.status === "Allocated" ? proc.requestedSize : 0);
    }, 0);
    const totalFree = result.freeFrames * result.pageSize;
    const successRate =
      result.totalProcesses > 0
        ? (result.allocatedProcesses / result.totalProcesses) * 100
        : 0;

    result.processResults.forEach((process) => {
      const colorPair = this.getProcessColor(process.processName);

      process.segments.forEach((segment, index) => {
        const segmentCard = document.createElement("div");
        segmentCard.className = "segments-paging-container";

        const segmentNumber = document.createElement("p");
        segmentNumber.id = "segment-number";
        segmentNumber.textContent = `S${index}`;

        const segmentsPaging = document.createElement("div");
        segmentsPaging.className = "segments-paging";
        segmentsPaging.style.borderColor = colorPair.bg;

        let pagesHtml = "";
        segment.pages.forEach((page) => {
          const isCurrent =
            currentAlloc.processName === process.processName &&
            currentAlloc.segmentType === segment.segmentType &&
            currentAlloc.pageIndex === page.pageIndex;
          const currentClass = isCurrent ? " current" : "";

          pagesHtml += `
            <div class="page" id="seg-page-${process.processName.replace(/\s+/g, "-")}-${segment.segmentType}-${page.pageIndex}">
              <p id="page-number">P${page.pageIndex}</p>
              <div class="page-content${currentClass}" style="background-color: ${colorPair.bg}; border-bottom-color: ${colorPair.border}">
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

    const framesArray = Array.isArray(result.memory.frames)
      ? result.memory.frames
      : Object.values(result.memory.frames);
    let framesHtml = "";
    let tableRowsHtml = "";

    // Build table rows based on allocation (logical to physical mapping)
    result.processResults.forEach((process) => {
      const colorPair = this.getProcessColor(process.processName);
      process.segments.forEach((segment) => {
        segment.pages.forEach((page) => {
          const isCurrentRow = currentAlloc.processName === process.processName &&
                               currentAlloc.segmentType === segment.segmentType &&
                               currentAlloc.pageIndex === page.pageIndex;
          const currentClass = isCurrentRow ? " class=\"current\"" : "";

          tableRowsHtml += `
            <tr${currentClass} style="border-left: 8px solid ${colorPair.bg}">
              <td>${process.processName}</td>
              <td>${segment.segmentType}</td>
              <td>Page ${page.pageIndex}</td>
              <td>${page.frameId !== null ? "Frame " + page.frameId : "-"}</td>
            </tr>`;
        });
      });
    });

    // if (typeof appendConsoleMessage === 'function') {
    //   appendConsoleMessage(`DEBUG: Processing ${framesArray.length} frames...`);
    // }

    for (let i = 0; i < framesArray.length; i++) {
      const frame = framesArray[i];
      const frameId = frame.frameId || frame.id || i + 1;
      let frameContent = "";

      if (frame.status === "Occupied") {
        const isCurrent = currentAlloc.frameId === frameId;
        const currentClass = isCurrent ? " current" : "";

        let bg = "#CAFFBF"; // Fallback color
        let border = "#98BF8F";

        try {
          const colorPair = this.getProcessColor(frame.processName);
          if (colorPair) {
            bg = colorPair.bg;
            border = colorPair.border;
          }
        } catch (e) {
          console.error("Color lookup failed:", e);
        }

        frameContent = `
          <div class="frame-content${currentClass}" style="background-color: ${bg}; border-bottom-color: ${border}; display:grid; grid-template-columns: 1fr 1fr 1fr;">
            <p>${frame.processName || "Unknown"} - ${frame.segmentType || "Page"}</p>
            <p>Page ${frame.pageIndex !== null ? frame.pageIndex : "?"}</p>
            <p>${frame.size} KB</p>
          </div>`;
      } else {
        frameContent = `
          <div class="frame-content" style="background-color: #fff; border-bottom-color: #ccc">
            <p>Free</p>
            <p>${frame.size} KB</p>
          </div>`;
      }

      framesHtml += `
        <div class="frame" id="frame-${frameId}">
          <p id="frame-number" style="min-width: 25px; font-weight: bold;">F${frameId}</p>
          ${frameContent}
        </div>`;
    }

    // if (typeof appendConsoleMessage === 'function') {
    //   appendConsoleMessage(`DEBUG: HTML build complete (${framesHtml.length} chars). Applying to DOM...`);
    // }

    const targetContainer = this.getFramesContainer();

    if (targetContainer) {
      targetContainer.innerHTML = framesHtml;
      // if (typeof appendConsoleMessage === 'function') {
      //   appendConsoleMessage(`DEBUG: DOM updated successfully. Container now has ${targetContainer.children.length} elements.`);
      // }
    } else {
      if (typeof appendConsoleMessage === "function") {
        appendConsoleMessage(`ERROR: Could not find frames container in DOM!`);
      }
    }

    if (tableBody) {
      tableBody.innerHTML = tableRowsHtml;
    }

    if (typeof updateStatistics === "function") {
      updateStatistics({
        allocatedSize,
        totalFree,
        intFragmentation: result.totalInternalFragmentation,
        externalFragmentation: 0,
        memoryUtilization:
          result.totalMemory > 0
            ? ((result.totalMemory - totalFree) / result.totalMemory) * 100
            : 0,
        successRate,
      });
    }
    // Use the actual user input for total memory instead of calculated value
    const { memorySize } = getSegmentationPagingInputs();
    const displayMemory =
      !Number.isNaN(memorySize) && memorySize > 0
        ? memorySize
        : result.totalMemory;
    if (typeof setTotalMemoryDisplay === "function") {
      setTotalMemoryDisplay(displayMemory);
    }

    if (currentAlloc && currentAlloc.frameId !== undefined) {
      setTimeout(() => {
        const currentEls = document.querySelectorAll(
          ".segmentation-paging .page-content.current, .simulation-segmentation .frame-content.current, #seg-paging-table-body tr.current",
        );
        currentEls.forEach((el) => {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        });
      }, 50);
    }
  },
};

// ===== GET SEGMENTATION-PAGING INPUTS =====
const getSegmentationPagingInputs = () => {
  // Try to find the memory-size and page-size inputs in the segmentation-paging view
  let memorySizeInput = null;
  let pageSizeInput = null;

  // Check if we're in the segmentation-paging view section
  const segmentationPagingView = document.getElementById(
    "segmentation-paging-view",
  );
  if (
    segmentationPagingView &&
    segmentationPagingView.style.display !== "none"
  ) {
    memorySizeInput = segmentationPagingView.querySelector("#memory-size");
    pageSizeInput = segmentationPagingView.querySelector("#page-frame-size");
  }

  // Check standalone segmentation-paging page (simulation-Segmentation-Paging.html)
  if (!memorySizeInput) {
    const mainGrid = document.querySelector(".main-grid.segmentation-paging");
    if (mainGrid) {
      memorySizeInput = mainGrid.querySelector("#memory-size");
      pageSizeInput = mainGrid.querySelector("#page-frame-size");
    }
  }

  // Fallback to any element with those IDs
  if (!memorySizeInput) {
    memorySizeInput = document.getElementById("memory-size");
  }
  if (!pageSizeInput) {
    pageSizeInput = document.getElementById("page-frame-size");
  }

  const memorySize = memorySizeInput
    ? parseInt(memorySizeInput.value, 10)
    : NaN;
  const pageSize = pageSizeInput ? parseInt(pageSizeInput.value, 10) : NaN;
  return { memorySize, pageSize };
};

// ===== REAL-TIME TOTAL MEMORY UPDATE FOR SEGMENTATION-PAGING =====
const updateTotalMemoryDisplaySegmentationPaging = () => {
  const { memorySize } = getSegmentationPagingInputs();
  if (!Number.isNaN(memorySize) && memorySize > 0) {
    if (typeof setTotalMemoryDisplay === "function") {
      setTotalMemoryDisplay(memorySize);
    }
  }
};

// Attach listeners to segmentation-paging-view inputs
const attachSegmentationPagingInputListeners = () => {
  // Try to find inputs in the segmentation-paging view first
  const segmentationPagingView = document.getElementById(
    "segmentation-paging-view",
  );
  if (segmentationPagingView) {
    const memorySizeInput =
      segmentationPagingView.querySelector("#memory-size");
    if (
      memorySizeInput &&
      !memorySizeInput._segmentation_paging_listener_attached
    ) {
      memorySizeInput.addEventListener(
        "input",
        updateTotalMemoryDisplaySegmentationPaging,
      );
      memorySizeInput.addEventListener(
        "change",
        updateTotalMemoryDisplaySegmentationPaging,
      );
      memorySizeInput._segmentation_paging_listener_attached = true;
    }
  }

  // Try standalone segmentation-paging page (simulation-Segmentation-Paging.html)
  const mainGrid = document.querySelector(".main-grid.segmentation-paging");
  if (mainGrid) {
    const memorySizeInput = mainGrid.querySelector("#memory-size");
    if (
      memorySizeInput &&
      !memorySizeInput._segmentation_paging_listener_attached
    ) {
      memorySizeInput.addEventListener(
        "input",
        updateTotalMemoryDisplaySegmentationPaging,
      );
      memorySizeInput.addEventListener(
        "change",
        updateTotalMemoryDisplaySegmentationPaging,
      );
      memorySizeInput._segmentation_paging_listener_attached = true;
    }
  }

  // Fallback to global search
  const memorySizeInput = document.getElementById("memory-size");
  if (
    memorySizeInput &&
    !memorySizeInput._segmentation_paging_listener_attached
  ) {
    memorySizeInput.addEventListener(
      "input",
      updateTotalMemoryDisplaySegmentationPaging,
    );
    memorySizeInput.addEventListener(
      "change",
      updateTotalMemoryDisplaySegmentationPaging,
    );
    memorySizeInput._segmentation_paging_listener_attached = true;
  }
};

// Attach listeners when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    attachSegmentationPagingInputListeners,
  );
} else {
  attachSegmentationPagingInputListeners();
}

if (typeof window !== "undefined") {
  window.PagingSegmentSimulator = PagingSegmentSimulator;
  window.initializeSegmentationPagingUI = function (
    processes,
    totalMemory,
    pageSize,
  ) {
    PagingSegmentSimulator.initializeSegmentationPagingUI(
      processes,
      totalMemory,
      pageSize,
    );
  };
  window.updateSegmentationPagingUI = function (result) {
    PagingSegmentSimulator.updateSegmentationPagingUI(result);
  };
  window.resetSegmentationPagingUI = function () {
    PagingSegmentSimulator.resetSegmentationPagingUI();
  };
  window.getSegmentationPagingInputs = getSegmentationPagingInputs;
  window.attachSegmentationPagingInputListeners =
    attachSegmentationPagingInputListeners;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PagingSegmentSimulator };
}
