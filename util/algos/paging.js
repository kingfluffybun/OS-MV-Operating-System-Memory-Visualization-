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
