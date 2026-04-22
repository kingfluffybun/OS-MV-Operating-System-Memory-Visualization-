const memorySimulator = {

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
    const pSize = Number(pageSize); // Force numeric type
    let allocatedSize = 0;
    let successfulAllocations = 0;
    let internalFragmentation = 0;

    for (const pId in processes) {
        if (!Object.prototype.hasOwnProperty.call(processes, pId)) continue;
        const size = Number(processes[pId]); // Force numeric type
        const pagesNeeded = Math.ceil(size / pSize);
        const freeFrames = this.totalFreeFrames(frames);

        if (freeFrames < pagesNeeded) {
            results[pId] = { size, pagesNeeded, frameIds: {}, status: "Unallocated" };
            continue;
        }

        // First pass: collect which frames we'll allocate WITHOUT modifying them
        let remaining = size;
        let allocatedCount = 0;
        const framesToAllocate = [];

        for (const key in frames.frames) {
            if (allocatedCount >= pagesNeeded) break;
            const frame = frames.frames[key];
            if (frame.status !== "Free") continue;
            
            framesToAllocate.push(key);
            allocatedCount++;
        }

        // Only allocate if we got all the pages we need
        if (framesToAllocate.length < pagesNeeded) {
            results[pId] = { size, pagesNeeded, frameIds: {}, status: "Unallocated" };
            continue;
        }

        // Second pass: actually allocate the frames
        remaining = size;
        allocatedCount = 0;
        const allocatedFrames = {};

        for (const key of framesToAllocate) {
            const frame = frames.frames[key];
            const used = remaining > pSize ? pSize : remaining;
            frame.status = "Occupied";
            frame.process = pId;
            frame.page = allocatedCount + 1;
            frame.used = Number(used); // Prevents "1010" concatenation
            
            allocatedFrames[key] = true;
            allocatedCount++;
            remaining -= used;
        }

        const processInternal = (pagesNeeded * pSize) - size;
        allocatedSize += size;
        internalFragmentation += processInternal;
        successfulAllocations++;

        results[pId] = { size, pagesNeeded, frameIds: allocatedFrames, internalFragmentation: processInternal, status: "Allocated" };
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
            pageSize: pSize, 
            externalFragmentation: 0 
        }, 
        frames 
    };
},

pagingStep(memoryFrames, processSize, pageSize, processId) {
    const frames = this.cloneFrames(memoryFrames);
    const pSize = Number(pageSize); // Force numeric type
    const pSizeActual = Number(processSize); // Force numeric type
    const pagesNeeded = Math.ceil(pSizeActual / pSize);
    const freeFrames = this.totalFreeFrames(frames);

    if (freeFrames < pagesNeeded) {
        return {
            result: { size: pSizeActual, pagesNeeded, frameIds: {}, status: "Unallocated" },
            frames
        };
    }

    const freeFrameKeys = Object.keys(frames.frames).filter(key => frames.frames[key].status === "Free");
    
    // Shuffle logic for randomized physical frame assignment
    for (let i = freeFrameKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [freeFrameKeys[i], freeFrameKeys[j]] = [freeFrameKeys[j], freeFrameKeys[i]];
    }

    // Use underscore split for IDs like "process_1"
    const processNum = parseInt(processId.split('_')[1]) || 1;

    // Optimized Single-Loop Logic: Step 2 for even, Step 1 for odd
    const step = (processNum % 2 === 0) ? 2 : 1;
    const limit = (processNum % 2 === 0) ? pagesNeeded * 2 : pagesNeeded;

    // First pass: collect which frames we'll allocate WITHOUT modifying them
    const framesToAllocate = [];
    let allocatedCount = 0;
    for (let i = 0; i < limit && allocatedCount < pagesNeeded; i += step) {
        if (i >= freeFrameKeys.length) break;
        framesToAllocate.push(freeFrameKeys[i]);
        allocatedCount++;
    }

    // Only allocate if we got all the pages we need
    if (framesToAllocate.length < pagesNeeded) {
        return {
            result: { size: pSizeActual, pagesNeeded, frameIds: {}, status: "Unallocated" },
            frames
        };
    }

    // Second pass: actually allocate the frames
    const allocatedFrames = {};
    let remaining = pSizeActual;
    for (let idx = 0; idx < framesToAllocate.length; idx++) {
        const key = framesToAllocate[idx];
        const frame = frames.frames[key];

        const used = remaining > pSize ? pSize : remaining;
        frame.status = "Occupied";
        frame.process = processId;
        frame.page = idx + 1;
        frame.used = Number(used); // Fixes UI display bugs
        
        allocatedFrames[key] = true;
        remaining -= used;
    }

    const internal = (pagesNeeded * pSize) - pSizeActual;
    return {
        result: { 
            size: pSizeActual, 
            pagesNeeded, 
            frameIds: allocatedFrames, 
            internalFragmentation: internal, 
            status: "Allocated" 
        },
        frames
    };
},

pagingStepSingle(memoryFrames, processSize, pageSize, processId, pageIndexToAllocate) {
    const frames = this.cloneFrames(memoryFrames);
    const pSize = Number(pageSize);
    const pSizeActual = Number(processSize);
    const pagesNeeded = Math.ceil(pSizeActual / pSize);
    
    // Find all free frames and randomly select one
    const freeFrameKeys = Object.keys(frames.frames).filter(key => frames.frames[key].status === "Free");
    
    if (freeFrameKeys.length === 0) {
        return {
            result: { size: pSizeActual, pagesNeeded, frameIds: {}, status: "Unallocated" },
            frames
        };
    }

    // Randomly select a free frame
    const randomIndex = Math.floor(Math.random() * freeFrameKeys.length);
    const freeFrameKey = freeFrameKeys[randomIndex];

    // Calculate how much to allocate for this page
    let allocatedSize = 0;
    for (let i = 0; i < pageIndexToAllocate; i++) {
        allocatedSize += Math.min(pSize, pSizeActual - (i * pSize));
    }
    const remaining = pSizeActual - allocatedSize;
    const used = Math.min(pSize, remaining);

    // Allocate single page
    const frame = frames.frames[freeFrameKey];
    frame.status = "Occupied";
    frame.process = processId;
    frame.page = pageIndexToAllocate + 1;
    frame.used = Number(used);

    const allocatedFrames = {};
    allocatedFrames[freeFrameKey] = true;

    const internal = (pagesNeeded * pSize) - pSizeActual;
    return {
        result: { 
            size: pSizeActual, 
            pagesNeeded, 
            frameIds: allocatedFrames, 
            internalFragmentation: internal, 
            status: "Allocated",
            pageIndex: pageIndexToAllocate
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

const memoryFrames = memorySimulator.createFrames(16, 100);
const processes = {
    process_1: 130,
    process_2: 260,
    process_3: 80, 
    process_4: 190,
    process_5: 420
};
const processOrder = {
    1: "process_1",
    2: "process_2",
    3: "process_3",
    4: "process_4",
    5: "process_5"
};
const pageSize = 100;
let frameState = memorySimulator.cloneFrames(memoryFrames);
let currentProcessIndex = 1;
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
    const totalProcesses = memorySimulator.countObjectKeys(processOrder);
    if (currentProcessIndex > totalProcesses) {
        console.log("Paging simulation complete");
        clearInterval(autoInterval);
        return;
    }

    updateIntervalSpeed();
    const processId = processOrder[currentProcessIndex];
    const processSize = processes[processId];
    const result = memorySimulator.pagingStep(frameState, processSize, pageSize, processId);
    frameState = result.frames;

    console.log(`Paging step ${currentProcessIndex}:`, result.result);
    console.log("Current frame state:", frameState);

    currentProcessIndex++;
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

console.log("Paging simulation result:", memorySimulator.paging(memoryFrames, pageSize, processes));
console.log("Sample page table:", memorySimulator.createPageTable(memorySimulator.paging(memoryFrames, pageSize, processes).frames));
startInterval();
