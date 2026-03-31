let autoInterval;

const memorySimulator = {

    createLinkedMemory(blocks) {
        let head = null, tail = null;
        blocks.forEach((size, i) => {
            const node = { id: i + 1, size, status: "Free", next: null };
            if (!tail) head = node;
            else tail.next = node;
            tail = node;
        });
        return head;
    },

    cloneLinkedMemory(head) {
        let newHead = null, tail = null, cur = head;
        while (cur) {
            const node = { id: cur.id, size: cur.size, status: cur.status, next: null };
            if (!tail) newHead = node;
            else tail.next = node;
            tail = node;
            cur = cur.next;
        }
        return newHead;
    },

    totalMemory(head) {
        let total = 0;
        for (let n = head; n; n = n.next) total += n.size;
        return total;
    },

    totalFreeSize(head) {
        let total = 0;
        for (let n = head; n; n = n.next) {
            if (n.status === "Free") total += n.size;
        }
        return total;
    },

    externalFragmentation(head, results) {
        const entries = Array.isArray(results) ? results : Object.values(results);
        const unallocated = entries.filter(r => r.status === "Unallocated").map(r => r.size);
        if (unallocated.length === 0) return 0;
        const smallest = Math.min(...unallocated);
        let fragmentation = 0;
        for (let n = head; n; n = n.next) {
            if (n.status === "Free" && n.size < smallest) fragmentation += n.size;
        }
        return fragmentation;
    },

    computeStats(head, processes, results, stats) {
        const totalMemory = this.totalMemory(head);
        const totalFree = this.totalFreeSize(head);
        const allocatedSize = stats.allocatedSize;
        const successfulAllocations = stats.successfulAllocations;
        const externalFragmentation = this.externalFragmentation(head, results);
        const memoryUtilization = totalMemory > 0 ? (allocatedSize / totalMemory) * 100 : 0;
        const successRate = processes.length > 0 ? (successfulAllocations / processes.length) * 100 : 0;
        return {
            totalMemory,
            allocatedSize,
            totalFree,
            intFragmentation: stats.intFragmentation,
            externalFragmentation,
            memoryUtilization,
            successRate
        };
    },

    worstFitFixed(memoryHead, processes) {
        const head = memoryHead;
        const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
        const results = {};

        processes.forEach((size, i) => {
            const pId = `process ${stepIndex + 1}`;

            let worstBlock = null;
            for (let block = head; block; block = block.next) {
                if (block.status === "Free" && size <= block.size) {
                    if (!worstBlock || block.size > worstBlock.size) worstBlock = block;
                }
            }

            if (worstBlock) {
                stats.intFragmentation += worstBlock.size - size;
                stats.allocatedSize += size;
                stats.successfulAllocations++;
                worstBlock.status = "Occupied";
                results[pId] = { size, block: worstBlock.id, status: "Allocated" };
            } else {
                results[pId] = { size, block: "None", status: "Unallocated" };
            }
        });

        return { results, stats };
    },
    
    worstFitDynamic(memoryHead, processes) {
    const head = memoryHead;
    const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
    const results = {};

    // Generate unique IDs for new split blocks
    let splitId = 0;
    for (let n = head; n; n = n.next) splitId = Math.max(splitId, n.id);
    splitId++;

    processes.forEach((size, i) => {
        const pId = `process ${stepIndex + 1}`;

        // Find worst fit block
        let worstBlock = null;
        for (let block = head; block; block = block.next) {
            if (block.status === "Free" && size <= block.size) {
                if (!worstBlock || block.size > worstBlock.size) worstBlock = block;
            }
        }

        if (worstBlock) {
            const leftover = worstBlock.size - size;

            // Allocate the block
            worstBlock.size = size;
            worstBlock.status = "Occupied";

            stats.allocatedSize += size;
            stats.successfulAllocations++;

            // Split leftover into a new free block
            if (leftover > 0) {
                const newNode = {
                    id: splitId++,
                    size: leftover,
                    status: "Free",
                    next: worstBlock.next 
                };
                worstBlock.next = newNode;
            }

            results[pId] = { size, block: worstBlock.id, status: "Allocated" };
        } else {
            results[pId] = { size, block: "None", status: "Unallocated" };
        }
    });

    return { results, stats };
},

    worstFitFixedStep(memoryHead, processSize) {
        let worstBlock = null;
        for (let block = memoryHead; block; block = block.next) {
            if (block.status === "Free" && processSize <= block.size) {
                if (!worstBlock || block.size > worstBlock.size) worstBlock = block;
            }
        }
        if (!worstBlock) {
            return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0, fragmentation: 0 };
        }
        const fragmentation = worstBlock.size - processSize;
        worstBlock.status = "Occupied";
        return { result: { size: processSize, block: worstBlock.id, status: "Allocated", fragmentation }, allocatedSize: processSize, successfulAllocations: 1 };
    },

    worstFitDynamicStep(memoryHead, processSize, splitId) {
        let worstBlock = null;
        for (let block = memoryHead; block; block = block.next) {
            if (block.status === "Free" && processSize <= block.size) {
                if (!worstBlock || block.size > worstBlock.size) worstBlock = block;
            }
        }
        if (!worstBlock) {
            return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0, fragmentation: 0, nextSplitId: splitId };
        }
        const leftover = worstBlock.size - processSize;
        worstBlock.size = processSize;
        worstBlock.status = "Occupied";
        if (leftover > 0) {
            worstBlock.next = { id: splitId++, size: leftover, status: "Free", next: worstBlock.next };
        }
        return { result: { size: processSize, block: worstBlock.id, status: "Allocated", fragmentation: leftover }, allocatedSize: processSize, successfulAllocations: 1, nextSplitId: splitId };
    }
};

const memory = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const memoryState = memorySimulator.cloneLinkedMemory(memory);
const processes = [212, 417, 112, 426];
const stepResults = {};
const overallStats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
let stepIndex = 0;
let currentIntervalSpeed = null;
let nextSplitId = (() => {
    let max = 0;
    for (let n = memoryState; n; n = n.next) max = Math.max(max, n.id);
    return max + 1;
})();

function getSliderValue() {
    const slider = typeof document !== "undefined" ? document.querySelector('.slider') : null;
    return slider ? Number(slider.value) : 50;
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
        console.log("Adjusted interval speed to:", currentIntervalSpeed, "ms");
    }
}

function stepThrough() {
    if (stepIndex >= processes.length) {
        console.log("Simulation complete");
        const finalStats = memorySimulator.computeStats(memoryState, processes, stepResults, overallStats);
        console.log("Final allocation results:", stepResults);
        console.log("Final statistics:", finalStats);
        clearInterval(autoInterval);
        return;
    }

    updateIntervalSpeed();

    const processSize = processes[stepIndex];
    const pId = `process ${stepIndex + 1}`;
    let result;

    if (Partition === "fixed") {
        result = memorySimulator.worstFitFixedStep(memoryState, processSize);
    }

    if (Partition === "dynamic") {
        result = memorySimulator.worstFitDynamicStep(memoryState, processSize, nextSplitId);
        nextSplitId = result.nextSplitId;
    }

    stepResults[pId] = result.result;
    overallStats.allocatedSize += result.allocatedSize;
    overallStats.successfulAllocations += result.successfulAllocations;
    overallStats.intFragmentation += result.result.fragmentation || 0;

    console.log("Allocated process:", processSize, "->", result.result);
    stepIndex++;
}

function startInterval() {
    clearInterval(autoInterval);
    currentIntervalSpeed = getIntervalSpeed();
    autoInterval = setInterval(stepThrough, currentIntervalSpeed);
    console.log("Interval started at speed:", currentIntervalSpeed, "ms");
}

let Partition = "fixed";
startInterval();

function stopInterval() {
    clearInterval(autoInterval);
    console.log("Interval stopped");
}