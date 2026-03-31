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
        for (let node = head; node; node = node.next) total += node.size;
        return total;
    },

    totalFreeSize(head) {
        let total = 0;
        for (let node = head; node; node = node.next) {
            if (node.status === "Free") total += node.size;
        }
        return total;
    },

    externalFragmentation(head, results) {
        const entries = Array.isArray(results) ? results : Object.values(results);
        const unallocated = entries.filter(r => r.status === "Unallocated").map(r => r.size);
        if (unallocated.length === 0) return 0;

        const smallestUnallocated = Math.min(...unallocated);
        let fragmentation = 0;
        for (let node = head; node; node = node.next) {
            if (node.status === "Free" && node.size < smallestUnallocated) {
                fragmentation += node.size;
            }
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

    bestFitFixed(memoryHead, processes) {
        const head = this.cloneLinkedMemory(memoryHead);
        const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
        const results = {};

        processes.forEach((size, i) => {
            const pId = `process ${stepIndex + 1}`;

            let bestBlock = null;
            for (let block = head; block; block = block.next) {
                if (block.status === "Free" && size <= block.size) {
                    if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
                }
            }

            if (bestBlock) {
                stats.intFragmentation += bestBlock.size - size;
                stats.allocatedSize += size;
                stats.successfulAllocations++;
                bestBlock.status = "Occupied";
                results[pId] = { size, block: bestBlock.id, status: "Allocated" };
            } else {
                results[pId] = { size, block: "None", status: "Unallocated" };
            }
        });

        return { results, stats: this.computeStats(head, processes, results, stats) };
    },
    
    bestFitDynamic(memoryHead, processes) {
    const head = this.cloneLinkedMemory(memoryHead);
    const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
    const results = {};

    // Generate unique IDs for new split blocks
    let splitId = 0;
    for (let n = head; n; n = n.next) splitId = Math.max(splitId, n.id);
    splitId++;

    processes.forEach((size, i) => {
        const pId = `process ${stepIndex + 1}`;

        // Find best fit block
        let bestBlock = null;
        for (let block = head; block; block = block.next) {
            if (block.status === "Free" && size <= block.size) {
                if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
            }
        }

        if (bestBlock) {
            const leftover = bestBlock.size - size;

            // Allocate the block
            bestBlock.size = size;
            bestBlock.status = "Occupied";

            stats.allocatedSize += size;
            stats.successfulAllocations++;

            // Split leftover into a new free block
            if (leftover > 0) {
                const newNode = {
                    id: splitId++,
                    size: leftover,
                    status: "Free",
                    next: bestBlock.next 
                };
                bestBlock.next = newNode;
            }

            results[pId] = { size, block: bestBlock.id, status: "Allocated" };
        } else {
            results[pId] = { size, block: "None", status: "Unallocated" };
        }
    });

    return { results, stats: this.computeStats(head, processes, results, stats) };
},

    bestFitFixedStep(memoryHead, processSize) {
        let bestBlock = null;
        for (let block = memoryHead; block; block = block.next) {
            if (block.status === "Free" && processSize <= block.size) {
                if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
            }
        }

        if (!bestBlock) {
            return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0 };
        }

        const fragmentation = bestBlock.size - processSize;
        bestBlock.status = "Occupied";
        return { result: { size: processSize, block: bestBlock.id, status: "Allocated", fragmentation }, allocatedSize: processSize, successfulAllocations: 1 };
    },

    bestFitDynamicStep(memoryHead, processSize) {
        let bestBlock = null;
        for (let block = memoryHead; block; block = block.next) {
            if (block.status === "Free" && processSize <= block.size) {
                if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
            }
        }

        if (!bestBlock) {
            return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0 };
        }

        const leftover = bestBlock.size - processSize;
        bestBlock.size = processSize;
        bestBlock.status = "Occupied";

        if (leftover > 0) {
            bestBlock.next = { id: Math.max(...this._collectIds(memoryHead)) + 1, size: leftover, status: "Free", next: bestBlock.next };
        }

        return { result: { size: processSize, block: bestBlock.id, status: "Allocated", fragmentation: leftover }, allocatedSize: processSize, successfulAllocations: 1 };
    },

    _collectIds(head) {
        const ids = [];
        for (let node = head; node; node = node.next) ids.push(node.id);
        return ids;
    }
};

const memory = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const memoryState = memorySimulator.cloneLinkedMemory(memory);
const processes = [212, 417, 112, 426];
const stepResults = [];
const overallStats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
let stepIndex = 0;

function stepThrough() {
    if (stepIndex >= processes.length) {
        console.log("Simulation complete");
        const finalStats = memorySimulator.computeStats(memoryState, processes, stepResults, overallStats);
        console.log("Final allocation results:", stepResults);
        console.log("Final statistics:", finalStats);
        clearInterval(autoInterval);
        return;
    }

    const processSize = processes[stepIndex];
    let stepResult;

    if (Partition === "fixed") {
        stepResult = memorySimulator.bestFitFixedStep(memoryState, processSize);
    } else {
        stepResult = memorySimulator.bestFitDynamicStep(memoryState, processSize);
    }

    stepResults.push(stepResult.result);
    overallStats.allocatedSize += stepResult.allocatedSize;
    overallStats.successfulAllocations += stepResult.successfulAllocations;
    if (stepResult.result.status === "Allocated") {
        overallStats.intFragmentation += stepResult.result.fragmentation || 0;
    }

    console.log("Allocated process:", processSize, "->", stepResult.result);
    stepIndex++;
}

function startInterval() {
    clearInterval(autoInterval);
    // document.getElementById("slider").value
    const sliderValue = 100;
    const multiplier = 1 + ((sliderValue - 1) / 99) * 2;
    const baseDelay = 1000;
    const speed = baseDelay / multiplier;
    autoInterval = setInterval(stepThrough, speed);
    console.log("Interval started at speed:", speed, "ms");
}

let Partition = "fixed";
startInterval();

function stopInterval() {
    clearInterval(autoInterval);
    console.log("Interval stopped");
}