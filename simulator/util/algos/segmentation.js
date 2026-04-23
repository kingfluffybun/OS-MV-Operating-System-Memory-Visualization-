// /c:/OS-MV-Operating-System-Memory-Visualization/util/algos/segmentation.js

class Segment {
    constructor(id, name, base, size, breakdown = { code: 0, heap: 0, stack: 0 }) {
        this.id = id
        this.name = name
        this.base = base
        this.size = size
        this.breakdown = breakdown
    }

    get end() {
        return this.base + this.size - 1
    }
}

class SegmentationMemory {
    constructor(totalSize = 1024) {
        this.totalSize = totalSize
        this.segments = [] // allocated segments sorted by base
        this.nextId = 1
    }

    _findHole(size) {
        if (this.segments.length === 0) return 0
        if (this.segments[0].base >= size) return 0
        for (let i = 0; i < this.segments.length - 1; i++) {
            const currentEnd = this.segments[i].end
            const nextBase = this.segments[i + 1].base
            const hole = nextBase - (currentEnd + 1)
            if (hole >= size) return currentEnd + 1
        }
        const lastEnd = this.segments[this.segments.length - 1].end
        if (this.totalSize - (lastEnd + 1) >= size) return lastEnd + 1
        return -1
    }

    allocate(name, size) {
        if (!name || size <= 0) throw new Error('invalid allocation')
        const base = this._findHole(size)
        if (base < 0) return null

        const breakdown = SegmentationMemory.breakdownSize(size)
        const seg = new Segment(this.nextId++, name, base, size, breakdown)
        this.segments.push(seg)
        this.segments.sort((a, b) => a.base - b.base)
        return seg
    }

    deallocate(nameOrId) {
        const idx = this.segments.findIndex(
            seg =>
                seg.name === nameOrId ||
                seg.id === nameOrId ||
                String(seg.id) === String(nameOrId)
        )
        if (idx < 0) return false
        this.segments.splice(idx, 1)
        return true
    }

    getStatus() {
        const allocated = this.segments.map(seg => ({
            id: seg.id,
            name: seg.name,
            base: seg.base,
            size: seg.size,
            end: seg.end,
            breakdown: seg.breakdown
        }))
        let free = []
        if (allocated.length === 0) {
            free.push({ base: 0, size: this.totalSize, end: this.totalSize - 1 })
        } else {
            if (allocated[0].base > 0) {
                free.push({ base: 0, size: allocated[0].base, end: allocated[0].base - 1 })
            }
            for (let i = 0; i < allocated.length - 1; i++) {
                const gapBase = allocated[i].end + 1
                const gapSize = allocated[i + 1].base - gapBase
                if (gapSize > 0) free.push({ base: gapBase, size: gapSize, end: gapBase + gapSize - 1 })
            }
            const last = allocated[allocated.length - 1]
            if (last.end < this.totalSize - 1) {
                free.push({ base: last.end + 1, size: this.totalSize - last.end - 1, end: this.totalSize - 1 })
            }
        }
        return { totalSize: this.totalSize, allocated, free }
    }

    static breakdownSize(size) {
        if (size <= 0) return { code: 0, data: 0, stack: 0, heap: 0 };
            const code = Math.floor(size * 0.40);
            const data = Math.floor(size * 0.30);
            const stack = Math.floor(size * 0.20);
            const heap = size - code - data - stack;
        return { code, data, stack, heap };
    }
}

const memorySimulator = {
    createMemory(totalSize = 1024) {
        return new SegmentationMemory(totalSize)
    },

    allocate(memory, name, size) {
        const segment = memory.allocate(name, size)
        return segment
    },

    deallocate(memory, nameOrId) {
        return memory.deallocate(nameOrId)
    },

    getStatus(memory) {
        return memory.getStatus()
    },

    segmentation(memory, processes) {
        const simMemory = memory instanceof SegmentationMemory ? memory : new SegmentationMemory(memory)
        const results = {}
        let allocatedSize = 0
        let successfulAllocations = 0

        for (const pId in processes) {
            if (!Object.prototype.hasOwnProperty.call(processes, pId)) continue
            const size = processes[pId]
            const segName = pId
            const seg = simMemory.allocate(segName, size)
            if (seg) {
                results[pId] = {
                    size,
                    status: 'Allocated',
                    segment: seg,
                    breakdown: seg.breakdown
                }
                allocatedSize += size
                successfulAllocations++
            } else {
                results[pId] = { size, status: 'Unallocated', segment: null, breakdown: null }
            }
        }

        const stats = {
            totalSize: simMemory.totalSize,
            allocatedSize,
            successfulAllocations,
            externalFragmentation: simMemory.getStatus().free.reduce((a, f) => a + f.size, 0),
            totalSegments: simMemory.segments.length
        }

        return { results, stats, memory: simMemory }
    },

    segmentationStep(memory, processId, processSize) {
        const seg = memory.allocate(processId, processSize)
        const breakdown = seg ? seg.breakdown : { code: 0, data: 0, stack: 0, heap: 0 }
        return {
            result: {
                id: processId,
                size: processSize,
                status: seg ? 'Allocated' : 'Unallocated',
                segment: seg,
                breakdown
            },
            memory
        }
    }
}

// ===== SEGMENTATION UI STATE =====
let segmentationState = {
  memory: null,
  processQueue: [],
  currentProcessIndex: 0,
  results: {},
  isRunning: false,
  allocatedSegments: []
};

const getSegmentationInputs = () => {
  // Try to find the memory-size input in the segmentation view first
  let memorySizeInput = null;
  
  // Check if we're in the segmentation view section
  const segmentationView = document.getElementById("segmentation-view");
  if (segmentationView && segmentationView.style.display !== 'none') {
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
  
  const memorySize = memorySizeInput ? parseInt(memorySizeInput.value, 10) : 1024;
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
  
  resetSegmentationUI();
  updateSegmentationStatistics();
};

const resetSegmentationUI = () => {
  const segmentationContainer = document.querySelector(".segmentation-container");
  const physicalMemoryContainer = document.querySelector(".physical-memory-container");
  const pageTableBody = document.querySelector("#page-table-body");
  
  if (segmentationContainer) segmentationContainer.innerHTML = "";
  if (physicalMemoryContainer) physicalMemoryContainer.innerHTML = "";
  if (pageTableBody) pageTableBody.innerHTML = "";
  
  segmentationState.allocatedSegments = [];
};

const updateSegmentationUI = () => {
  if (!segmentationState || !segmentationState.memory) return;
  
  try {
    const status = segmentationState.memory.getStatus();
    updateSegmentationDisplay(status);
    updatePhysicalMemoryDisplay(status);
    updateSegmentationTable();
    updateSegmentationStatistics();
  } catch (error) {
    console.error('Error updating segmentation UI:', error);
  }
};

const updateSegmentationDisplay = (status) => {
  try {
    const container = document.querySelector(".segmentation-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!status || !status.allocated || status.allocated.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No segments allocated</div>';
      return;
    }
    
    // Group segments by process name
    const processGroups = {};
    status.allocated.forEach(seg => {
      if (!seg || !seg.name) return;
      if (!processGroups[seg.name]) {
        processGroups[seg.name] = [];
      }
      processGroups[seg.name].push(seg);
    });
    
    // Display each process with its breakdown segments
    Object.keys(processGroups).forEach(processName => {
      const processSegments = processGroups[processName];
      
      // Create one segmentation container per process
      const processDiv = document.createElement("div");
      processDiv.className = "segmentation";
      
      processSegments.forEach(seg => {
        if (!seg.breakdown) return;
        
        // Create segments for Code, Data, Stack, Heap
        const segmentTypes = [
          { type: 'Code', size: seg.breakdown.code || 0 },
          { type: 'Data', size: seg.breakdown.data || 0 },
          { type: 'Stack', size: seg.breakdown.stack || 0 },
          { type: 'Heap', size: seg.breakdown.heap || 0 }
        ];
        
        // Create a segments-container for each segment type
        segmentTypes.forEach((segmentType) => {
          if (segmentType.size > 0) {
            const segmentContainer = document.createElement("div");
            segmentContainer.className = "segments-container";
            
            // Add segment number
            const segmentNumberDiv = document.createElement("div");
            segmentNumberDiv.id = "segment-number";
            segmentNumberDiv.textContent = `S${seg.id - 1}`;
            segmentContainer.appendChild(segmentNumberDiv);
            
            // Add segment type info
            const infoDiv = document.createElement("div");
            infoDiv.style.display = "flex";
            infoDiv.className = "segments";
            infoDiv.style.flexDirection = "column";
            infoDiv.style.alignItems = "center";
            
            const nameP = document.createElement("p");
            nameP.id = "process-segment";
            nameP.textContent = seg.name;
            
            const typeP = document.createElement("p");
            typeP.className = "segment-type";
            typeP.textContent = segmentType.type;
            
            const sizeP = document.createElement("p");
            sizeP.id = "segment-size";
            sizeP.textContent = segmentType.size;
            
            infoDiv.appendChild(nameP);
            infoDiv.appendChild(typeP);
            infoDiv.appendChild(sizeP);
            
            segmentContainer.appendChild(infoDiv);
            processDiv.appendChild(segmentContainer);
          }
        });
      });
      
      container.appendChild(processDiv);
    });
  } catch (error) {
    console.error('Error updating segmentation display:', error);
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
      status.allocated.forEach(seg => {
        if (!seg || !seg.name) return;
        if (!processGroups[seg.name]) {
          processGroups[seg.name] = [];
        }
        processGroups[seg.name].push(seg);
      });
      
      let currentBase = 0;
      let lastPrinted = null;
      // Display each process with its breakdown segments
      Object.keys(processGroups).forEach(processName => {
        const processSegments = processGroups[processName];

processSegments.forEach(seg => {
  if (!seg.breakdown) return;
  
  const segmentTypes = [
    { type: 'Code', size: seg.breakdown.code || 0 },
    { type: 'Data', size: seg.breakdown.data || 0 },
    { type: 'Stack', size: seg.breakdown.stack || 0 },
    { type: 'Heap', size: seg.breakdown.heap || 0 }
  ];
    segmentTypes.forEach(segmentType => {
                if (segmentType.size > 0) {
                    const segDiv = document.createElement("div");
                    segDiv.className = "allocated-segments";

                    const baseValue = currentBase;
                    const limitValue = currentBase + segmentType.size;

                    // Only show base address if it hasn't been printed yet (i.e., very first segment)
                    let baseHTML = "";
                    if (lastPrinted === null) {
                        baseHTML = `<p class="segment-base">${baseValue}</p>`;
                    }

                    segDiv.innerHTML = `
                    <div>
                        <p class="process-segment">${seg.name}</p>
                        <p class="segment-type">${segmentType.type}</p>
                    </div>
                    <div class="segment-base-limit">
                        ${baseHTML}
                        <p class="segment-limit">${limitValue}</p>
                    </div>
                    `;

                    memDiv.appendChild(segDiv);

                    currentBase = limitValue;
                    lastPrinted = limitValue;
                }
            });
        }); 
    });
}
    
    if (status && status.free) {
      // Show free space
      status.free.forEach((freeSpace, idx) => {
        if (!freeSpace) return;
        const freeDiv = document.createElement("div");
        freeDiv.style.height = ((freeSpace.size || 0) * 20) + "px";
        freeDiv.style.backgroundColor = "#f0f0f0";
        freeDiv.style.marginBottom = "4px";
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
  } catch (error) {
    console.error('Error updating physical memory display:', error);
  }
};

const updateSegmentationTable = () => {
  try {
    const tableBody = document.querySelector("#page-table-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (!segmentationState || !segmentationState.memory) return;
    
    const status = segmentationState.memory.getStatus();
    if (!status || !status.allocated) return;
    
    // Group segments by process name
    const processGroups = {};
    status.allocated.forEach(seg => {
      if (!seg || !seg.name) return;
      if (!processGroups[seg.name]) {
        processGroups[seg.name] = [];
      }
      processGroups[seg.name].push(seg);
    });
    
    // Display each process with its breakdown segments
    Object.keys(processGroups).forEach(processName => {
      const processSegments = processGroups[processName];
      
      processSegments.forEach(seg => {
        if (!seg.breakdown) return;
        
        let currentBase = seg.base;
        
        // Create table rows for Code, Data, Stack, Heap
        const segmentTypes = [
          { type: 'Code', size: seg.breakdown.code || 0 },
          { type: 'Data', size: seg.breakdown.data || 0 },
          { type: 'Stack', size: seg.breakdown.stack || 0 },
          { type: 'Heap', size: seg.breakdown.heap || 0 }
        ];
        
        segmentTypes.forEach((segmentType, index) => {
          if (segmentType.size > 0) {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${seg.name}</td>
              <td>${segmentType.type}</td>
              <td>${currentBase}</td>
              <td>${currentBase + segmentType.size}</td>
            `;
            tableBody.appendChild(row);
            currentBase += segmentType.size;
          }
        });
      });
    });
  } catch (error) {
    console.error('Error updating segmentation table:', error);
  }
};

const updateSegmentationStatistics = () => {
  try {
    if (!segmentationState || !segmentationState.memory) return;
    
    const status = segmentationState.memory.getStatus();
    if (!status) return;
    
    const totalMemory = status.totalSize || 0;
    const allocated = status.allocated ? status.allocated.reduce((sum, seg) => sum + (seg ? seg.size || 0 : 0), 0) : 0;
    const free = status.free ? status.free.reduce((sum, f) => sum + (f ? f.size || 0 : 0), 0) : 0;
    const externalFrag = free;
    const utilization = totalMemory > 0 ? (allocated / totalMemory) * 100 : 0;
    const successRate = segmentationState.processQueue && segmentationState.processQueue.length > 0 
      ? ((status.allocated ? status.allocated.length : 0) / segmentationState.processQueue.length) * 100 
      : 0;
    
    const updateElement = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    
    updateElement("total-memory-value", `${totalMemory} KB`);
    updateElement("allocated-value", `${allocated} KB`);
    updateElement("total-free-value", `${free} KB`);
    updateElement("external-frag-value", `${externalFrag} KB`);
    updateElement("internal-frag-value", "0 KB");
    updateElement("util-value", `${utilization.toFixed(2)}%`);
    updateElement("success-rate-value", `${successRate.toFixed(2)}%`);
  } catch (error) {
    console.error('Error updating segmentation statistics:', error);
  }
};

const allocateNextProcess = () => {
  if (!segmentationState.memory || segmentationState.currentProcessIndex >= segmentationState.processQueue.length) {
    return false;
  }
  
  const processSize = segmentationState.processQueue[segmentationState.currentProcessIndex];
  const processName = `Process ${segmentationState.currentProcessIndex + 1}`;
  
  const result = memorySimulator.segmentationStep(segmentationState.memory, processName, processSize);
  segmentationState.results[processName] = result.result;
  segmentationState.allocatedSegments.push(result.result);
  segmentationState.currentProcessIndex++;
  
  updateSegmentationUI();
  return result.result.status === 'Allocated';
};

const resetSegmentation = () => {
  const { memorySize } = getSegmentationInputs();
  segmentationState.memory = memorySimulator.createMemory(memorySize);
  segmentationState.currentProcessIndex = 0;
  segmentationState.results = {};
  segmentationState.allocatedSegments = [];
  segmentationState.isRunning = false;
  
  resetSegmentationUI();
  updateSegmentationStatistics();
};

if (typeof window !== 'undefined') {
    window.memorySimulator = memorySimulator
    window.segmentationState = segmentationState
    window.initializeSegmentationUI = initializeSegmentationUI
    window.allocateNextProcess = allocateNextProcess
    window.resetSegmentation = resetSegmentation
    window.getSegmentationInputs = getSegmentationInputs
    window.updateSegmentationUI = updateSegmentationUI
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SegmentationMemory, memorySimulator }
}

// Node simulation demo when run directly (collapsed object view w/ full details)
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('segmentation.js')) {
    const mem = memorySimulator.createMemory(100)
    const procs = { p1: 20, p2: 25, p3: 30, p4: 10, p5: 25 }

    console.log('Initial status:')
    console.dir(memorySimulator.getStatus(mem), { depth: null, colors: true })

    Object.entries(procs).forEach(([k, v]) => {
        const r = memorySimulator.segmentationStep(mem, k, v)
        console.log(`Allocate ${k} (${v}):`, r.result.status)
        console.dir(r.result, { depth: null, colors: true })
    })

    console.log('Final status:')
    console.dir(memorySimulator.getStatus(mem), { depth: null, colors: true })
}