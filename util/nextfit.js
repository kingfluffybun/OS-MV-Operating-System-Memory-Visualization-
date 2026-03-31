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

    nextFitFixed(memoryHead, processes) {
        const head = this.cloneLinkedMemory(memoryHead);
        const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
        const results = {};
        let lastBlock = head;

        processes.forEach((size, i) => {
            const pId = `process_${i + 1}`;
            let block = lastBlock;
            let allocated = false;

            while (block) {
                if (block.status === "Free" && size <= block.size) {
                    stats.intFragmentation += block.size - size;
                    stats.allocatedSize += size;
                    stats.successfulAllocations++;
                    block.status = "Occupied";
                    results[pId] = { size, block: block.id, status: "Allocated" };
                    lastBlock = block; // update pointer for next process
                    allocated = true;
                    break;
                }
                block = block.next;
            }

            // If not found from lastBlock onward, wrap around from head
            if (!allocated) {
                block = head;
                while (block !== lastBlock) {
                    if (block.status === "Free" && size <= block.size) {
                        stats.intFragmentation += block.size - size;
                        stats.allocatedSize += size;
                        stats.successfulAllocations++;
                        block.status = "Occupied";
                        results[pId] = { size, block: block.id, status: "Allocated" };
                        lastBlock = block;
                        allocated = true;
                        break;
                    }
                    block = block.next;
                }
            }

            if (!allocated) {
                results[pId] = { size, block: "None", status: "Unallocated" };
            }
        });

        return { results, stats };
    },

    // 2. NEXT FIT DYNAMIC
    nextFitDynamic(memoryHead, processes) {
        const head = this.cloneLinkedMemory(memoryHead);
        const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
        const results = {};

        let splitId = 0;
        for (let n = head; n; n = n.next) splitId = Math.max(splitId, n.id);
        splitId++;

        let lastBlock = head; // Next Fit: resume from last allocated block

        processes.forEach((size, i) => {
            const pId = `process_${i + 1}`;
            let block = lastBlock;  // start from where we left off
            let allocated = false;

            const tryAllocate = (b) => {
                if (b.status === "Free" && size <= b.size) {
                    const leftover = b.size - size;
                    b.size = size;
                    b.status = "Occupied";
                    stats.allocatedSize += size;
                    stats.successfulAllocations++;

                    if (leftover > 0) {
                        b.next = { id: splitId++, size: leftover, status: "Free", next: b.next };
                    }

                    results[pId] = { size, block: b.id, status: "Allocated" };
                    lastBlock = b;
                    return true;
                }
                return false;
            };

            // Search from lastBlock to end of list
            while (block) {
                if (tryAllocate(block)) { allocated = true; break; }
                block = block.next;
            }

            // If not found, wrap around from head up to lastBlock
            if (!allocated) {
                block = head;
                while (block !== lastBlock) {
                    if (tryAllocate(block)) { allocated = true; break; }
                    block = block.next;
                }
            }

            if (!allocated) {
                results[pId] = { size, block: "None", status: "Unallocated" };
            }
        });

        return { results, stats };
    },

    nextFitFixedStep(memoryHead, processSize, lastBlock) {
        let block = lastBlock || memoryHead;
        const start = block;
        let allocated = false;
        let allocatedBlock = null;

        while (block) {
            if (block.status === "Free" && processSize <= block.size) {
                block.status = "Occupied";
                allocated = true;
                allocatedBlock = block;
                break;
            }
            block = block.next;
        }

        if (!allocated) {
            block = memoryHead;
            while (block && block !== start) {
                if (block.status === "Free" && processSize <= block.size) {
                    block.status = "Occupied";
                    allocated = true;
                    allocatedBlock = block;
                    break;
                }
                block = block.next;
            }
        }

        if (allocated) {
            const fragmentation = allocatedBlock.size - processSize;
            return {
                result: { size: processSize, block: allocatedBlock.id, status: "Allocated", fragmentation },
                lastBlock: allocatedBlock
            };
        }

        return { result: { size: processSize, block: "None", status: "Unallocated" }, lastBlock };
    },

    nextFitDynamicStep(memoryHead, processSize, lastBlock, nextSplitId) {
        let block = lastBlock || memoryHead;
        const start = block;
        let allocated = false;
        let allocatedBlock = null;
        let splitId = nextSplitId;

        const tryAllocate = (b) => {
            if (b.status === "Free" && processSize <= b.size) {
                const leftover = b.size - processSize;
                b.size = processSize;
                b.status = "Occupied";
                if (leftover > 0) {
                    b.next = { id: splitId++, size: leftover, status: "Free", next: b.next };
                }
                allocated = true;
                allocatedBlock = b;
                return true;
            }
            return false;
        };

        while (block) {
            if (tryAllocate(block)) break;
            block = block.next;
        }

        if (!allocated) {
            block = memoryHead;
            while (block && block !== start) {
                if (tryAllocate(block)) break;
                block = block.next;
            }
        }

        if (allocated) {
            const fragmentation = 0;
            return {
                result: { size: processSize, block: allocatedBlock.id, status: "Allocated", fragmentation },
                lastBlock: allocatedBlock,
                nextSplitId: splitId
            };
        }

        return { result: { size: processSize, block: "None", status: "Unallocated" }, lastBlock, nextSplitId: splitId };
    }
};

let autoInterval = null;

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

const memory = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const memoryState = memorySimulator.cloneLinkedMemory(memory);
const processes = [200, 600, 300, 100];
let stepIndex = 0;
let Partition = "fixed";
let lastFixedBlock = memoryState;
let lastDynamicBlock = memoryState;
const stepResults = {};
const overallStats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
let nextSplitId = (() => {
    let max = 0;
    for (let n = memoryState; n; n = n.next) max = Math.max(max, n.id);
    return max + 1;
})();
let currentIntervalSpeed = null;

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
    const pId = `process_${stepIndex + 1}`;
    let result;

    if (Partition === "fixed") {
        result = memorySimulator.nextFitFixedStep(memoryState, processSize, lastFixedBlock);
        lastFixedBlock = result.lastBlock;
    }

    if (Partition === "dynamic") {
        result = memorySimulator.nextFitDynamicStep(memoryState, processSize, lastDynamicBlock, nextSplitId);
        lastDynamicBlock = result.lastBlock;
        nextSplitId = result.nextSplitId;
    }

    stepResults[pId] = result.result;
    overallStats.allocatedSize += result.result.status === "Allocated" ? result.result.size : 0;
    overallStats.successfulAllocations += result.result.status === "Allocated" ? 1 : 0;
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

function stopInterval() {
    clearInterval(autoInterval);
    console.log("Interval stopped");
}

startInterval();
