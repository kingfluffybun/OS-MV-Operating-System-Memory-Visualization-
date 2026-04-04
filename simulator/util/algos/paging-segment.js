// ============= PAGING IMPLEMENTATION =============
const pagingSimulator = {

    createFrames(frameCount, frameSize = 100) {
        const frames = {};
        for (let i = 1; i <= frameCount; i++) {
            frames[i] = {
                id: i,
                size: frameSize,
                status: "Free",
                process: null,
                page: null,
                used: 0
            };
        }
        return { frames, count: frameCount, frameSize };
    },

    cloneFrames(memoryFrames) {
        const clone = { frames: {}, count: memoryFrames.count, frameSize: memoryFrames.frameSize };
        for (const key in memoryFrames.frames) {
            const frame = memoryFrames.frames[key];
            clone.frames[key] = { ...frame };
        }
        return clone;
    },

    countObjectKeys(obj) {
        let count = 0;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) count++;
        }
        return count;
    },

    totalFreeFrames(memoryFrames) {
        let freeCount = 0;
        for (const key in memoryFrames.frames) {
            if (memoryFrames.frames[key].status === "Free") freeCount++;
        }
        return freeCount;
    },

    totalFreeMemory(memoryFrames) {
        return this.totalFreeFrames(memoryFrames) * memoryFrames.frameSize;
    },

    paging(memoryFrames, pageSize, processes) {
        const frames = this.cloneFrames(memoryFrames);
        const results = {};
        let allocatedSize = 0;
        let successfulAllocations = 0;
        let internalFragmentation = 0;

        for (const pId in processes) {
            if (!Object.prototype.hasOwnProperty.call(processes, pId)) continue;
            const size = processes[pId];
            const pagesNeeded = Math.ceil(size / pageSize);
            const freeFrames = this.totalFreeFrames(frames);

            if (freeFrames < pagesNeeded) {
                results[pId] = {
                    size,
                    pagesNeeded,
                    frameIds: {},
                    internalFragmentation: null,
                    status: "Unallocated"
                };
                continue;
            }

            const allocatedFrames = {};
            let remaining = size;
            let allocatedCount = 0;

            for (const key in frames.frames) {
                if (allocatedCount >= pagesNeeded) break;
                const frame = frames.frames[key];
                if (frame.status !== "Free") continue;

                const used = remaining > pageSize ? pageSize : remaining;
                frame.status = "Occupied";
                frame.process = pId;
                frame.page = allocatedCount + 1;
                frame.used = used;
                allocatedFrames[key] = true;
                allocatedCount++;
                remaining -= used;
            }

            const processInternal = pagesNeeded * pageSize - size;
            allocatedSize += size;
            internalFragmentation += processInternal;
            successfulAllocations++;

            results[pId] = {
                size,
                pagesNeeded,
                frameIds: allocatedFrames,
                internalFragmentation: processInternal,
                status: "Allocated"
            };
        }

        return {
            results,
            stats: {
                successfulAllocations,
                allocatedSize,
                internalFragmentation,
                freeFrames: this.totalFreeFrames(frames),
                freeMemory: this.totalFreeMemory(frames),
                totalFrames: frames.count,
                pageSize,
                externalFragmentation: 0
            },
            frames
        };
    },

    pagingStep(memoryFrames, processSize, pageSize, processId) {
        const frames = this.cloneFrames(memoryFrames);
        const pagesNeeded = Math.ceil(processSize / pageSize);
        const freeFrames = this.totalFreeFrames(frames);

        if (freeFrames < pagesNeeded) {
            return {
                result: {
                    size: processSize,
                    pagesNeeded,
                    frameIds: {},
                    internalFragmentation: null,
                    status: "Unallocated"
                },
                frames
            };
        }

        const allocatedFrames = {};
        let remaining = processSize;
        let allocatedCount = 0;

        for (const key in frames.frames) {
            if (allocatedCount >= pagesNeeded) break;
            const frame = frames.frames[key];
            if (frame.status !== "Free") continue;

            const used = remaining > pageSize ? pageSize : remaining;
            frame.status = "Occupied";
            frame.process = processId;
            frame.page = allocatedCount + 1;
            frame.used = used;
            allocatedFrames[key] = true;
            allocatedCount++;
            remaining -= used;
        }

        const internal = pagesNeeded * pageSize - processSize;
        return {
            result: {
                size: processSize,
                pagesNeeded,
                frameIds: allocatedFrames,
                internalFragmentation: internal,
                status: "Allocated"
            },
            frames
        };
    },

    createPageTable(memoryFrames) {
        const table = {};
        for (const key in memoryFrames.frames) {
            const frame = memoryFrames.frames[key];
            if (frame.status !== "Occupied") continue;
            table[key] = {
                frame: frame.id,
                process: frame.process,
                page: frame.page,
                used: frame.used,
                frameSize: frame.size
            };
        }
        return table;
    }
};

// ============= SEGMENTATION IMPLEMENTATION =============
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
        if (size <= 0) return { code: 0, heap: 0, stack: 0 }
        if (size < 3) {
            return { code: size, heap: 0, stack: 0 }
        }

        const code = Math.floor(Math.random() * (size - 2)) + 1
        const heap = Math.floor(Math.random() * (size - code - 1)) + 1
        const stack = size - code - heap
        return { code, heap, stack }
    }
}

const segmentationSimulator = {
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
        const breakdown = seg ? seg.breakdown : { code: 0, heap: 0, stack: 0 }
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

// ============= COMBINED INITIALIZATION & EXECUTION =============

// Paging setup
const memoryFrames = pagingSimulator.createFrames(16, 100);
const pagingProcesses = {
    process_1: 130,
    process_2: 260,
    process_3: 80, 
    process_4: 190,
    process_5: 420
};
const pagingProcessOrder = {
    1: "process_1",
    2: "process_2",
    3: "process_3",
    4: "process_4",
    5: "process_5"
};
const pageSize = 100;
let pagingFrameState = pagingSimulator.cloneFrames(memoryFrames);
let pagingCurrentProcessIndex = 1;

// Segmentation setup
const segmentationMemory = segmentationSimulator.createMemory(100);
const segmentationProcesses = {
    p1: 20,
    p2: 25,
    p3: 30,
    p4: 10,
    p5: 25
};

let autoInterval = null;
let currentIntervalSpeed = null;

function getSliderValue() {
    const slider = typeof document !== "undefined" ? document.querySelector('.slider') : null;
    return slider ? Number(slider.value) : 1;
}

function getIntervalSpeed() {
    const sliderValue = getSliderValue();
    const multiplier = 1 + ((sliderValue - 1) / 99) * 2;
    const baseDelay = 1000;
    return baseDelay / multiplier;
}

function updateIntervalSpeed() {
    const speed = getIntervalSpeed();
    if (autoInterval && speed !== currentIntervalSpeed) {
        clearInterval(autoInterval);
        currentIntervalSpeed = speed;
        autoInterval = setInterval(stepThrough, currentIntervalSpeed);
        console.log("Adjusted paging interval to:", currentIntervalSpeed, "ms");
    }
}

function stepThrough() {
    const totalProcesses = pagingSimulator.countObjectKeys(pagingProcessOrder);
    if (pagingCurrentProcessIndex > totalProcesses) {
        console.log("Paging simulation complete");
        clearInterval(autoInterval);
        return;
    }

    updateIntervalSpeed();
    const processId = pagingProcessOrder[pagingCurrentProcessIndex];
    const processSize = pagingProcesses[processId];
    const result = pagingSimulator.pagingStep(pagingFrameState, processSize, pageSize, processId);
    pagingFrameState = result.frames;

    console.log(`Paging step ${pagingCurrentProcessIndex}:`, result.result);
    console.log("Current frame state:", pagingFrameState);

    pagingCurrentProcessIndex++;
}

function startInterval() {
    clearInterval(autoInterval);
    currentIntervalSpeed = getIntervalSpeed();
    autoInterval = setInterval(stepThrough, currentIntervalSpeed);
    console.log("Paging interval started at speed:", currentIntervalSpeed, "ms");
}

function stopInterval() {
    clearInterval(autoInterval);
    console.log("Paging interval stopped");
}

// ===== NODE EXECUTION OUTPUT =====
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('paging-segment.js')) {
    console.log('\n==================== COMBINED PAGING & SEGMENTATION SIMULATION ====================\n');

    // Get speed from command line argument or environment variable (default: 1)
    const speedArg = process.argv.find(arg => arg.startsWith('--speed=')) || process.env.SPEED;
    const speed = speedArg ? parseFloat(speedArg.replace('--speed=', '')) : 1;
    const getStepDelay = () => {
        const maxDelay = 1200;
        const minDelay = 250;
        const normalized = (speed - 1) / 2; // 1..3 => 0..1
        return Math.max(minDelay, maxDelay - normalized * (maxDelay - minDelay));
    };

    console.log(`Simulation speed: ${speed}x (delay: ${getStepDelay()}ms per step)\n`);

    // Initialize both memory systems
    const pagingFrames = pagingSimulator.createFrames(16, 100);
    const pagingMem = pagingSimulator.cloneFrames(pagingFrames);
    const segmentationMem = segmentationSimulator.createMemory(100);

    // Use unified process list for both simulations
    const processes = {
        process_1: { paging: 130, segmentation: 20 },
        process_2: { paging: 260, segmentation: 25 },
        process_3: { paging: 80, segmentation: 30 },
        process_4: { paging: 190, segmentation: 10 },
        process_5: { paging: 420, segmentation: 25 }
    };

    console.log('Initial Segmentation Memory Status:');
    console.dir(segmentationSimulator.getStatus(segmentationMem), { depth: null, colors: true });
    console.log('\n');

    // Run both simulations simultaneously with speed control
    const processEntries = Object.entries(processes);
    let currentIndex = 0;

    const runNextStep = () => {
        if (currentIndex >= processEntries.length) {
            // Final results
            console.log('================== FINAL RESULTS ===================\n');

            console.log('PAGING FINAL RESULTS:');
            const finalPagingResult = pagingSimulator.paging(pagingFrames, pageSize, Object.fromEntries(Object.entries(processes).map(([k, v]) => [k, v.paging])));
            console.log('Complete paging simulation:', finalPagingResult);
            console.log('Sample page table:', pagingSimulator.createPageTable(finalPagingResult.frames));

            console.log('\nSEGMENTATION FINAL RESULTS:');
            console.log('Final memory status:');
            console.dir(segmentationSimulator.getStatus(segmentationMem), { depth: null, colors: true });
            return;
        }

        const [processId, sizes] = processEntries[currentIndex];
        const step = currentIndex + 1;

        // PAGING ALLOCATION
        console.log(`=== STEP ${step}: ${processId} ===`);
        console.log(`PAGING - Process: ${processId}, Size: ${sizes.paging}`);
        const pagingResult = pagingSimulator.pagingStep(pagingMem, sizes.paging, pageSize, processId);
        pagingMem.frames = pagingResult.frames.frames;
        pagingMem.count = pagingResult.frames.count;
        pagingMem.frameSize = pagingResult.frames.frameSize;

        console.log('Paging Result:', pagingResult.result);
        console.log('Free Frames Remaining:', pagingSimulator.totalFreeFrames(pagingMem));

        // SEGMENTATION ALLOCATION
        console.log(`SEGMENTATION - Process: ${processId}, Size: ${sizes.segmentation}`);
        const segmentationResult = segmentationSimulator.segmentationStep(segmentationMem, processId, sizes.segmentation);
        console.log(`Allocate ${processId} (${sizes.segmentation}):`, segmentationResult.result.status);
        console.dir(segmentationResult.result, { depth: null, colors: true });

        console.log('Current Segmentation Memory Status:');
        console.dir(segmentationSimulator.getStatus(segmentationMem), { depth: null, colors: true });
        console.log('\n');

        currentIndex++;

        // Schedule next step with speed-controlled delay
        if (currentIndex < processEntries.length) {
            setTimeout(runNextStep, getStepDelay());
        } else {
            // Final results after a short delay
            setTimeout(runNextStep, getStepDelay());
        }
    };

    // Start the simulation
    runNextStep();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.pagingSimulator = pagingSimulator;
    window.segmentationSimulator = segmentationSimulator;
    window.startInterval = startInterval;
    window.stopInterval = stopInterval;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { pagingSimulator, segmentationSimulator, startInterval, stopInterval, SegmentationMemory };
}
