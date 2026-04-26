// /c:/OS-MV-Operating-System-Memory-Visualization/util/algos/segmentation.js

class Segment {
  constructor(id, name, type, base, size) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.base = base;
    this.size = size;
  }

  get end() {
    return this.base + this.size - 1;
  }
}

class SegmentationMemory {
  constructor(totalSize = 1024) {
    this.totalSize = totalSize;
    this.segments = []; // allocated segments sorted by base
    this.nextId = 1;
  }

  _findHole(size) {
    if (this.segments.length === 0) return 0;
    if (this.segments[0].base >= size) return 0;
    for (let i = 0; i < this.segments.length - 1; i++) {
      const currentEnd = this.segments[i].end;
      const nextBase = this.segments[i + 1].base;
      const hole = nextBase - (currentEnd + 1);
      if (hole >= size) return currentEnd + 1;
    }
    const lastEnd = this.segments[this.segments.length - 1].end;
    if (this.totalSize - (lastEnd + 1) >= size) return lastEnd + 1;
    return -1;
  }

  allocate(name, size) {
    if (!name || size <= 0) throw new Error("invalid allocation");
    const breakdown = SegmentationMemory.breakdownSize(size);
    const segmentTypes = ["code", "heap", "data", "stack"];

    // Save state for rollback
    const originalSegments = [...this.segments];
    const originalNextId = this.nextId;
    const newSegments = [];
    let possible = true;

    for (const type of segmentTypes) {
      const segSize = breakdown[type];
      if (segSize > 0) {
        const base = this._findHole(segSize);
        if (base >= 0) {
          const seg = new Segment(this.nextId++, name, type, base, segSize);
          this.segments.push(seg);
          this.segments.sort((a, b) => a.base - b.base);
          newSegments.push(seg);
        } else {
          possible = false;
          break;
        }
      }
    }

    if (!possible) {
      // Rollback all segments for this process if even one fails
      this.segments = originalSegments;
      this.nextId = originalNextId;
      return null;
    }

    return newSegments.length > 0 ? newSegments[0] : null;
  }

  allocateSegment(name, type, size) {
    if (!name || !type || size <= 0) throw new Error("invalid allocation");
    const base = this._findHole(size);
    if (base < 0) return null;

    const seg = new Segment(this.nextId++, name, type, base, size);
    this.segments.push(seg);
    this.segments.sort((a, b) => a.base - b.base);
    return seg;
  }

  deallocate(nameOrId) {
    const idx = this.segments.findIndex(
      (seg) =>
        seg.name === nameOrId ||
        seg.id === nameOrId ||
        String(seg.id) === String(nameOrId),
    );
    if (idx < 0) return false;
    this.segments.splice(idx, 1);
    return true;
  }

  getStatus() {
    const allocated = this.segments.map((seg) => ({
      id: seg.id,
      name: seg.name,
      type: seg.type,
      base: seg.base,
      size: seg.size,
      end: seg.end,
    }));
    let free = [];
    if (allocated.length === 0) {
      free.push({ base: 0, size: this.totalSize, end: this.totalSize - 1 });
    } else {
      if (allocated[0].base > 0) {
        free.push({
          base: 0,
          size: allocated[0].base,
          end: allocated[0].base - 1,
        });
      }
      for (let i = 0; i < allocated.length - 1; i++) {
        const gapBase = allocated[i].end + 1;
        const gapSize = allocated[i + 1].base - gapBase;
        if (gapSize > 0)
          free.push({
            base: gapBase,
            size: gapSize,
            end: gapBase + gapSize - 1,
          });
      }
      const last = allocated[allocated.length - 1];
      if (last.end < this.totalSize - 1) {
        free.push({
          base: last.end + 1,
          size: this.totalSize - last.end - 1,
          end: this.totalSize - 1,
        });
      }
    }
    return { totalSize: this.totalSize, allocated, free };
  }

  static breakdownSize(size) {
    if (size <= 0) return { code: 0, data: 0, stack: 0, heap: 0 };
    const evenFloor = (val) => Math.floor(val / 2) * 2;

    const code = evenFloor(size * 0.4);
    const heap = evenFloor(size * 0.3);
    const data = evenFloor(size * 0.2);
    const stack = size - code - heap - data;
    return { code, heap, data, stack };
  }
}

var memorySimulator = {
  createMemory(totalSize = 1024) {
    return new SegmentationMemory(totalSize);
  },

  allocate(memory, name, size) {
    const segment = memory.allocate(name, size);
    return segment;
  },

  allocateSegment(memory, name, type, size) {
    const segment = memory.allocateSegment(name, type, size);
    return segment;
  },

  deallocate(memory, nameOrId) {
    return memory.deallocate(nameOrId);
  },

  getStatus(memory) {
    return memory.getStatus();
  },

  segmentation(memory, processes) {
    const simMemory =
      memory instanceof SegmentationMemory
        ? memory
        : new SegmentationMemory(memory);
    const results = {};
    let allocatedSize = 0;
    let successfulAllocations = 0;

    for (const pId in processes) {
      if (!Object.prototype.hasOwnProperty.call(processes, pId)) continue;
      const size = processes[pId];
      const segName = pId;
      const seg = simMemory.allocate(segName, size);
      if (seg) {
        results[pId] = {
          size,
          status: "Allocated",
          segment: seg,
          breakdown: seg.breakdown,
        };
        allocatedSize += size;
        successfulAllocations++;
      } else {
        results[pId] = {
          size,
          status: "Unallocated",
          segment: null,
          breakdown: null,
        };
      }
    }

    const stats = {
      totalSize: simMemory.totalSize,
      allocatedSize,
      successfulAllocations,
      externalFragmentation: simMemory
        .getStatus()
        .free.reduce((a, f) => a + f.size, 0),
      totalSegments: simMemory.segments.length,
    };

    return { results, stats, memory: simMemory };
  },

  segmentationStep(memory, processId, processSize) {
    const seg = memory.allocate(processId, processSize);
    const breakdown = SegmentationMemory.breakdownSize(processSize);
    return {
      result: {
        id: processId,
        size: processSize,
        status: seg ? "Allocated" : "Unallocated",
        segment: seg,
        breakdown,
      },
      memory,
    };
  },

  segmentationStepSingle(memory, processId, segmentType, segmentSize) {
    const seg = memory.allocateSegment(processId, segmentType, segmentSize);
    return {
      result: {
        id: processId,
        type: segmentType,
        size: segmentSize,
        status: seg ? "Allocated" : "Unallocated",
        segment: seg,
      },
      memory,
    };
  },
};

// ===== SEGMENTATION UI STATE =====
let segmentationState = {
  memory: null,
  processQueue: [],
  currentProcessIndex: 0,
  results: {},
  isRunning: false,
  allocatedSegments: [],
  currentSegmentIndex: 0,
  currentProcessBreakdown: null,
  currentAllocatedSegmentId: null,
};

const getProcessColors = (processName) => {
  const defaultColors = { bg: "#9BF6FF", border: "#74B8BF", text: "#085041" };
  if (!processName) return defaultColors;

  const processes = Array.from(document.querySelectorAll(".process"));
  const processEl = processes.find((process) => {
    const nameEl = process.querySelector(".process-content p:first-child");
    return nameEl && nameEl.textContent.trim() === processName;
  });

  if (!processEl) return defaultColors;
  return {
    bg: processEl.getAttribute("data-bg") || defaultColors.bg,
    border: processEl.getAttribute("data-border") || defaultColors.border,
    text: processEl.getAttribute("data-text") || defaultColors.text,
  };
};

const followAllocatedSegment = (segmentId) => {
  if (!segmentId) return;

  document
    .querySelectorAll(".physical-memory-container .allocated-segments.current")
    .forEach((seg) => {
      seg.classList.remove("current");
      seg.style.outline = "";
      seg.style.boxShadow = "";
    });

  const segEl = document.getElementById(`segment-${segmentId}`);
  if (segEl) {
    segEl.classList.add("current");
    segEl.style.outline = "2px solid var(--primary-color)";
    segEl.style.boxShadow = "0 0 0 1px rgba(76, 175, 80, 0.2)";
    segEl.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
};

const getSegmentationInputs = () => {
  // Try to find the memory-size input in the segmentation view first
  let memorySizeInput = null;

  // Check if we're in the segmentation view section
  const segmentationView = document.getElementById("segmentation-view");
  if (segmentationView && segmentationView.style.display !== "none") {
    memorySizeInput = segmentationView.querySelector("#memory-size");
  }

  // Check standalone segmentation page (simulation-Segmentation.html)
  if (!memorySizeInput) {
    const mainGrid = document.querySelector(".main-grid.segmentation");
    if (mainGrid) {
      memorySizeInput = mainGrid.querySelector("#memory-size");
    }
  }

  // Fallback to any #memory-size element
  if (!memorySizeInput) {
    memorySizeInput = document.getElementById("memory-size");
  }

  let memorySize = memorySizeInput
    ? parseInt(memorySizeInput.value, 10)
    : 1024;

  if (memorySize > 1000000) memorySize = 1000000;

  return { memorySize };
};

const initializeSegmentationUI = (memory, processes = []) => {
  if (!memory) {
    const { memorySize } = getSegmentationInputs();
    memory = memorySimulator.createMemory(memorySize);
  }

  segmentationState.memory = memory;
  segmentationState.processQueue = processes || [];
  segmentationState.currentProcessIndex = 0;
  segmentationState.results = {};
  segmentationState.allocatedSegments = [];
  segmentationState.currentSegmentIndex = 0;
  segmentationState.currentProcessBreakdown = null;
  segmentationState.currentAllocatedSegmentId = null;

  // Display total memory at initialization using the actual user input
  const { memorySize } = getSegmentationInputs();
  if (
    !Number.isNaN(memorySize) &&
    memorySize > 0 &&
    typeof setTotalMemoryDisplay === "function"
  ) {
    setTotalMemoryDisplay(memorySize);
  }

  resetSegmentationUI();
  const segmentationProcessContainer =
    document.querySelector("#segmentation-view .process-container") ||
    document.querySelector(".main-grid.segmentation .process-container");
  if (segmentationProcessContainer && typeof renumberProcesses === "function") {
    renumberProcesses(segmentationProcessContainer);
  }
  updateSegmentationStatistics();
};

const resetSegmentationUI = () => {
  const segmentationContainer = document.querySelector(
    ".segmentation-container",
  );
  const physicalMemoryContainer = document.querySelector(
    ".physical-memory-container",
  );
  const pageTableBody = document.querySelector("#segmentation-page-table-body");

  if (segmentationContainer) segmentationContainer.innerHTML = "";
  if (physicalMemoryContainer) physicalMemoryContainer.innerHTML = "";
  if (pageTableBody) pageTableBody.innerHTML = "";

  segmentationState.allocatedSegments = [];
};

const updateSegmentationUI = () => {
  if (!segmentationState || !segmentationState.memory) return;

  try {
    const status = segmentationState.memory.getStatus();

    // Ensure total memory is displayed
    if (
      status &&
      status.totalSize &&
      typeof setTotalMemoryDisplay === "function"
    ) {
      setTotalMemoryDisplay(status.totalSize);
    }

    updateSegmentationDisplay(status);
    updatePhysicalMemoryDisplay(status);
    updateSegmentationTable();
    updateSegmentationStatistics();
  } catch (error) {
    console.error("Error updating segmentation UI:", error);
  }
};

const updateSegmentationDisplay = (status) => {
  try {
    const container = document.querySelector(".segmentation-container");
    if (!container) return;

    // Clear previous current highlights
    document
      .querySelectorAll(".segmentation-container .segments.current")
      .forEach((seg) => seg.classList.remove("current"));

    container.innerHTML = "";

    if (!status || !status.allocated || status.allocated.length === 0) {
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #999;">No segments allocated</div>';
      return;
    }

    // Get current allocated segment from current memory status
    const currentSeg = status.allocated.find(
      (seg) => seg.id === segmentationState.currentAllocatedSegmentId,
    );

    // Group segments by process name
    const processGroups = {};
    status.allocated.forEach((seg) => {
      if (!seg || !seg.name) return;
      if (!processGroups[seg.name]) {
        processGroups[seg.name] = [];
      }
      processGroups[seg.name].push(seg);
    });

    // Add current process breakdown if exists
    const currentProcessName = `Process ${segmentationState.currentProcessIndex + 1}`;
    if (
      segmentationState.currentProcessBreakdown &&
      !processGroups[currentProcessName]
    ) {
      processGroups[currentProcessName] = []; // Will be handled separately
    }

    // Display each process
    Object.keys(processGroups).forEach((processName) => {
      const processSegments = processGroups[processName];

      // Create one segmentation container per process
      const processDiv = document.createElement("div");
      processDiv.className = "segmentation";

      if (
        processName === currentProcessName &&
        segmentationState.currentProcessBreakdown
      ) {
        // Show breakdown for current process
        const segmentTypes = [
          {
            type: "Code",
            size: segmentationState.currentProcessBreakdown.code || 0,
          },
          {
            type: "Heap",
            size: segmentationState.currentProcessBreakdown.heap || 0,
          },
          {
            type: "Data",
            size: segmentationState.currentProcessBreakdown.data || 0,
          },
          {
            type: "Stack",
            size: segmentationState.currentProcessBreakdown.stack || 0,
          },
        ];

        segmentTypes.forEach((segmentType, index) => {
          if (segmentType.size > 0) {
            const { bg, border, text } = getProcessColors(processName);
            const segmentContainer = document.createElement("div");
            segmentContainer.className = "segments-container";

            // Add segment number
            const segmentNumberDiv = document.createElement("div");
            segmentNumberDiv.id = "segment-number";
            segmentNumberDiv.textContent = `S${index}`;
            segmentContainer.appendChild(segmentNumberDiv);

            // Add segment type info
            const infoDiv = document.createElement("div");
            const PX_PER_KB = 1;
            infoDiv.style.height = `${segmentType.size * PX_PER_KB + 48}px`;
            infoDiv.style.display = "flex";
            infoDiv.className =
              "segments" +
              (currentSeg &&
              currentSeg.name === processName &&
              currentSeg.type.toLowerCase() === segmentType.type.toLowerCase()
                ? " current"
                : "");
            infoDiv.style.backgroundColor = bg;
            infoDiv.style.borderBottom = `4px solid ${border}`;
            infoDiv.style.color = text;

            const nameP = document.createElement("p");
            nameP.id = "process-segment";
            nameP.textContent = processName;

            const typeP = document.createElement("p");
            typeP.className = "segment-type";
            typeP.textContent = segmentType.type;

            const sizeP = document.createElement("p");
            sizeP.id = "segment-size";
            sizeP.textContent = `${segmentType.size} KB`;

            const infoDiv2 = document.createElement("div");
            infoDiv.appendChild(infoDiv2);

            infoDiv2.appendChild(nameP);
            infoDiv2.appendChild(typeP);
            infoDiv.appendChild(sizeP);

            segmentContainer.appendChild(infoDiv);
            processDiv.appendChild(segmentContainer);
          }
        });
      } else {
        // Show allocated segments for completed processes
        processSegments.forEach((seg, index) => {
          const { bg, border, text } = getProcessColors(seg.name);
          const segmentContainer = document.createElement("div");
          segmentContainer.className = "segments-container";

          // Add segment number
          const segmentNumberDiv = document.createElement("div");
          segmentNumberDiv.id = "segment-number";
          segmentNumberDiv.textContent = `S${index}`;
          segmentContainer.appendChild(segmentNumberDiv);

          // Add segment type info
          const infoDiv = document.createElement("div");
          const PX_PER_KB = 1;
          infoDiv.style.height = `${seg.size * PX_PER_KB + 48}px`;
          infoDiv.style.display = "flex";
          infoDiv.className =
            "segments" +
            (seg.id === segmentationState.currentAllocatedSegmentId
              ? " current"
              : "");
          infoDiv.style.backgroundColor = bg;
          infoDiv.style.borderBottom = `4px solid ${border}`;
          infoDiv.style.color = text;

          const nameP = document.createElement("p");
          nameP.id = "process-segment";
          nameP.textContent = seg.name;

          const typeP = document.createElement("p");
          typeP.className = "segment-type";
          typeP.textContent =
            seg.type.charAt(0).toUpperCase() + seg.type.slice(1);

          const sizeP = document.createElement("p");
          sizeP.id = "segment-size";
          sizeP.textContent = `${seg.size} KB`;

          const infoDiv2 = document.createElement("div");
          infoDiv.appendChild(infoDiv2);

          infoDiv2.appendChild(nameP);
          infoDiv2.appendChild(typeP);
          infoDiv.appendChild(sizeP);

          segmentContainer.appendChild(infoDiv);
          processDiv.appendChild(segmentContainer);
        });
      }

      container.appendChild(processDiv);
    });

    const currentSegEl = container.querySelector(".segments.current");
    if (currentSegEl) {
      currentSegEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  } catch (error) {
    console.error("Error updating segmentation display:", error);
  }
};

const updatePhysicalMemoryDisplay = (status) => {
  try {
    const container = document.querySelector(".physical-memory-container");
    if (!container) return;

    const memDiv = document.createElement("div");
    memDiv.className = "physical-memory";

    if (status && status.allocated) {
      // Group segments by process name
      const processGroups = {};
      status.allocated.forEach((seg) => {
        if (!seg || !seg.name) return;
        if (!processGroups[seg.name]) {
          processGroups[seg.name] = [];
        }
        processGroups[seg.name].push(seg);
      });

      let currentBase = 0;
      let lastPrinted = null;
      // Display each process with its segments
      Object.keys(processGroups).forEach((processName) => {
        const processSegments = processGroups[processName];

        processSegments.forEach((seg) => {
          const { bg, border, text } = getProcessColors(seg.name);
          const segDiv = document.createElement("div");
          const PX_PER_KB = 1;
          segDiv.style.height = `${seg.size * PX_PER_KB + 48}px`;
          segDiv.className = "allocated-segments";
          segDiv.id = `segment-${seg.id}`;
          if (seg.id === segmentationState.currentAllocatedSegmentId) {
            segDiv.classList.add("current");
          }
          segDiv.style.position = `relative`;
          segDiv.style.backgroundColor = bg;
          segDiv.style.borderBottom = `4px solid ${border}`;
          segDiv.style.color = text;

          const baseValue = currentBase;
          const limitValue = currentBase + seg.size;

          // Only show base address if it hasn't been printed yet (i.e., very first segment)
          let baseHTML = "";
          if (lastPrinted === null) {
            baseHTML = `<p class="segment-base">${baseValue}</p>`;
          }

          segDiv.innerHTML = `
          <div style="display:flex; flex-direction: column; align-items:center; width:100%;">
            <p class="process-segment">${seg.name}</p>
            <p class="segment-type">${seg.type.charAt(0).toUpperCase() + seg.type.slice(1)}</p>
          </div>
          <div class="segment-base-limit">
            ${baseHTML}
            <p class="segment-limit">${limitValue}</p>
          </div>
          `;

          memDiv.appendChild(segDiv);

          currentBase = limitValue;
          lastPrinted = limitValue;
        });
      });
    }

    if (status && status.free) {
      // Show free space
      status.free.forEach((freeSpace, idx) => {
        if (!freeSpace) return;
        const freeDiv = document.createElement("div");
        const PX_PER_KB = 1.5;
        freeDiv.style.height = `${(freeSpace.size || 0) * PX_PER_KB}px`;
        freeDiv.style.backgroundColor = "#f0f0f0";
        freeDiv.style.display = "flex";
        freeDiv.style.alignItems = "center";
        freeDiv.style.justifyContent = "center";
        freeDiv.style.fontSize = "12px";
        freeDiv.style.color = "#999";
        freeDiv.innerHTML = `Free: ${freeSpace.size || 0} KB`;
        memDiv.appendChild(freeDiv);
      });
    }

    container.innerHTML = "";
    container.appendChild(memDiv);

    // Highlight and scroll to current segment
    followAllocatedSegment(segmentationState.currentAllocatedSegmentId);
  } catch (error) {
    console.error("Error updating physical memory display:", error);
  }
};

const updateSegmentationTable = () => {
  try {
    const tableBody = document.querySelector("#segmentation-page-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!segmentationState || !segmentationState.memory) return;

    const status = segmentationState.memory.getStatus();
    if (!status || !status.allocated) return;

    // Group segments by process name
    const processGroups = {};
    status.allocated.forEach((seg) => {
      if (!seg || !seg.name) return;
      if (!processGroups[seg.name]) {
        processGroups[seg.name] = [];
      }
      processGroups[seg.name].push(seg);
    });

    // Add current process breakdown if exists
    const currentProcessName = `Process ${segmentationState.currentProcessIndex + 1}`;
    if (
      segmentationState.currentProcessBreakdown &&
      !processGroups[currentProcessName]
    ) {
      processGroups[currentProcessName] = []; // Will be handled separately
    }

    // Display each process
    Object.keys(processGroups).forEach((processName) => {
      const processSegments = processGroups[processName];

      if (
        processName === currentProcessName &&
        segmentationState.currentProcessBreakdown
      ) {
        // Show allocated segments for this process with actual base/limit
        processSegments.forEach((seg) => {
          const row = document.createElement("tr");
          const { bg, border } = getProcessColors(seg.name);
          row.style.borderLeft = `8px solid ${bg}`;
          if (seg.id === segmentationState.currentAllocatedSegmentId) {
            row.classList.add("current");
          }
          row.innerHTML = `
            <td>${seg.name}</td>
            <td>${seg.type.charAt(0).toUpperCase() + seg.type.slice(1)}</td>
            <td>${seg.base}</td>
            <td>${seg.end}</td>
          `;
          tableBody.appendChild(row);
        });

        // Show remaining segments to be allocated with -
        const segmentTypes = ["code", "heap", "data", "stack"];
        for (let i = segmentationState.currentSegmentIndex; i < 4; i++) {
          const type = segmentTypes[i];
          const size = segmentationState.currentProcessBreakdown[type];
          if (size > 0) {
            const row = document.createElement("tr");
            const { bg, border } = getProcessColors(processName);
            row.style.borderLeft = `8px solid ${bg}`;
            row.innerHTML = `
              <td>${processName}</td>
              <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
              <td>-</td>
              <td>-</td>
            `;
            tableBody.appendChild(row);
          }
        }
      } else {
        // Show allocated segments for completed processes
        processSegments.forEach((seg) => {
          const row = document.createElement("tr");
          const { bg, border } = getProcessColors(seg.name);
          row.style.borderLeft = `8px solid ${bg}`;
          if (seg.id === segmentationState.currentAllocatedSegmentId) {
            row.classList.add("current");
          }
          row.innerHTML = `
            <td>${seg.name}</td>
            <td>${seg.type.charAt(0).toUpperCase() + seg.type.slice(1)}</td>
            <td>${seg.base}</td>
            <td>${seg.end}</td>
          `;
          tableBody.appendChild(row);
        });
      }
    });

    setTimeout(() => {
      const currentRow = tableBody.querySelector("tr.current");
      if (currentRow) {
        currentRow.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    }, 50);
  } catch (error) {
    console.error("Error updating segmentation table:", error);
  }
};

const updateSegmentationStatistics = () => {
  try {
    if (!segmentationState || !segmentationState.memory) return;

    const status = segmentationState.memory.getStatus();
    if (!status) return;

    // Use the actual user input for total memory instead of calculated value
    const { memorySize } = getSegmentationInputs();
    const totalMemory =
      !Number.isNaN(memorySize) && memorySize > 0
        ? memorySize
        : status.totalSize || 0;
    const allocatedSize = status.allocated
      ? status.allocated.reduce(
          (sum, seg) => sum + (seg ? seg.size || 0 : 0),
          0,
        )
      : 0;
    const totalFree = status.free
      ? status.free.reduce((sum, f) => sum + (f ? f.size || 0 : 0), 0)
      : 0;
    const intFragmentation = 0;
    const externalFragmentation = totalFree;
    const memoryUtilization =
      totalMemory > 0 ? (allocatedSize / totalMemory) * 100 : 0;

    // Calculate total segments allocated and needed
    const totalSegmentsNeeded =
      (segmentationState.processQueue || []).length * 4; // 4 segments per process
    const totalSegmentsAllocated = (status.allocated || []).length;

    // Success rate is incremental: allocated segments / total segments needed
    const successRate =
      totalSegmentsNeeded > 0
        ? (totalSegmentsAllocated / totalSegmentsNeeded) * 100
        : 0;

    // Only show total free and external fragmentation when simulation has started (processes allocated)
    const adjustedTotalFree =
      status.allocated && status.allocated.length > 0 ? totalFree : 0;

    const stats = {
      allocatedSize,
      totalFree: adjustedTotalFree,
      intFragmentation,
      externalFragmentation: adjustedTotalFree,
      memoryUtilization,
      successRate,
    };

    if (typeof updateStatistics === "function") {
      updateStatistics(stats);
    }
    if (typeof setTotalMemoryDisplay === "function") {
      setTotalMemoryDisplay(totalMemory);
    }
  } catch (error) {
    console.error("Error updating segmentation statistics:", error);
  }
};

const allocateNextProcess = () => {
  if (
    !segmentationState.memory ||
    segmentationState.currentProcessIndex >=
      segmentationState.processQueue.length
  ) {
    return null;
  }

  const processSize =
    segmentationState.processQueue[segmentationState.currentProcessIndex];
  const processIndex = segmentationState.currentProcessIndex;
  const processName = `Process ${processIndex + 1}`;

  // If starting a new process, calculate breakdown and display in segmentation view
  if (segmentationState.currentSegmentIndex === 0) {
    segmentationState.currentProcessBreakdown =
      SegmentationMemory.breakdownSize(processSize);
    updateSegmentationUI();
  }

  const segmentTypes = ["code", "heap", "data", "stack"];
  const segmentType = segmentTypes[segmentationState.currentSegmentIndex];
  const segmentSize = segmentationState.currentProcessBreakdown[segmentType];

  const result = memorySimulator.segmentationStepSingle(
    segmentationState.memory,
    processName,
    segmentType,
    segmentSize,
  );
  segmentationState.results[`${processName}-${segmentType}`] = result.result;
  segmentationState.allocatedSegments.push(result.result);

  if (result.result.segment) {
    segmentationState.currentAllocatedSegmentId = result.result.segment.id;

    const waitForNextProcess = segmentationState.currentSegmentIndex >= 3;

    segmentationState.currentSegmentIndex++;
    if (segmentationState.currentSegmentIndex >= 4) {
      segmentationState.currentProcessIndex++;
      segmentationState.currentSegmentIndex = 0;
      segmentationState.currentProcessBreakdown = null;
    }

    updateSegmentationUI();

    return {
      processName,
      processIndex,
      segmentType,
      segmentSize,
      status: result.result.status,
      allocated: result.result.status === "Allocated",
      completedProcess: waitForNextProcess,
    };
  } else {
    // FAILED: Rollback any segments of this process already allocated
    segmentationState.currentAllocatedSegmentId = null;

    // Remove all segments with this processName from memory
    while (segmentationState.memory.deallocate(processName)) {
      // Continue until all segments for this process are deallocated
    }

    // Skip the rest of this process and mark as completed (failed)
    segmentationState.currentProcessIndex++;
    segmentationState.currentSegmentIndex = 0;
    segmentationState.currentProcessBreakdown = null;

    updateSegmentationUI();

    return {
      processName,
      processIndex,
      segmentType,
      segmentSize,
      status: "Unallocated",
      allocated: false,
      completedProcess: true,
    };
  }
};

const resetSegmentation = () => {
  const { memorySize } = getSegmentationInputs();
  segmentationState.memory = memorySimulator.createMemory(memorySize);
  segmentationState.currentProcessIndex = 0;
  segmentationState.results = {};
  segmentationState.allocatedSegments = [];
  segmentationState.isRunning = false;
  segmentationState.currentSegmentIndex = 0;
  segmentationState.currentProcessBreakdown = null;
  segmentationState.currentAllocatedSegmentId = null;

  resetSegmentationUI();
  const segmentationProcessContainer =
    document.querySelector("#segmentation-view .process-container") ||
    document.querySelector(".main-grid.segmentation .process-container");
  if (segmentationProcessContainer && typeof renumberProcesses === "function") {
    renumberProcesses(segmentationProcessContainer);
  }
  updateSegmentationStatistics();
};

// ===== REAL-TIME TOTAL MEMORY UPDATE FOR SEGMENTATION =====
const updateTotalMemoryDisplaySegmentation = () => {
  const { memorySize } = getSegmentationInputs();
  if (!Number.isNaN(memorySize) && memorySize > 0) {
    if (typeof setTotalMemoryDisplay === "function") {
      setTotalMemoryDisplay(memorySize);
    }
  }
};

// Attach listeners to segmentation-view inputs
const attachSegmentationInputListeners = () => {
  // Try to find inputs in the segmentation view first
  const segmentationView = document.getElementById("segmentation-view");
  if (segmentationView) {
    const memorySizeInput = segmentationView.querySelector("#memory-size");
    if (memorySizeInput && !memorySizeInput._segmentation_listener_attached) {
      memorySizeInput.addEventListener(
        "input",
        updateTotalMemoryDisplaySegmentation,
      );
      memorySizeInput.addEventListener(
        "change",
        updateTotalMemoryDisplaySegmentation,
      );
      memorySizeInput._segmentation_listener_attached = true;
    }
  }

  // Try standalone segmentation page (simulation-Segmentation.html)
  const mainGrid = document.querySelector(".main-grid.segmentation");
  if (mainGrid) {
    const memorySizeInput = mainGrid.querySelector("#memory-size");
    if (memorySizeInput && !memorySizeInput._segmentation_listener_attached) {
      memorySizeInput.addEventListener(
        "input",
        updateTotalMemoryDisplaySegmentation,
      );
      memorySizeInput.addEventListener(
        "change",
        updateTotalMemoryDisplaySegmentation,
      );
      memorySizeInput._segmentation_listener_attached = true;
    }
  }

  // Fallback to global search
  const memorySizeInput = document.getElementById("memory-size");
  if (memorySizeInput && !memorySizeInput._segmentation_listener_attached) {
    memorySizeInput.addEventListener(
      "input",
      updateTotalMemoryDisplaySegmentation,
    );
    memorySizeInput.addEventListener(
      "change",
      updateTotalMemoryDisplaySegmentation,
    );
    memorySizeInput._segmentation_listener_attached = true;
  }
};

// Attach listeners when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    attachSegmentationInputListeners,
  );
} else {
  attachSegmentationInputListeners();
}

if (typeof window !== "undefined") {
  window.memorySimulator = memorySimulator;
  window.segmentationState = segmentationState;
  window.initializeSegmentationUI = initializeSegmentationUI;
  window.allocateNextProcess = allocateNextProcess;
  window.resetSegmentation = resetSegmentation;
  window.getSegmentationInputs = getSegmentationInputs;
  window.updateSegmentationUI = updateSegmentationUI;
  window.attachSegmentationInputListeners = attachSegmentationInputListeners;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SegmentationMemory, memorySimulator };
}

// Node simulation demo when run directly (collapsed object view w/ full details)
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  process.argv[1].endsWith("segmentation.js")
) {
  const mem = memorySimulator.createMemory(100);
  const procs = { p1: 20, p2: 25, p3: 30, p4: 10, p5: 25 };

  console.log("Initial status:");
  console.dir(memorySimulator.getStatus(mem), { depth: null, colors: true });

  Object.entries(procs).forEach(([k, v]) => {
    const r = memorySimulator.segmentationStep(mem, k, v);
    console.log(`Allocate ${k} (${v}):`, r.result.status);
    console.dir(r.result, { depth: null, colors: true });
  });

  console.log("Final status:");
  console.dir(memorySimulator.getStatus(mem), { depth: null, colors: true });
}
