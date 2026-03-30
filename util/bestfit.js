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

        return { results, stats };
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

    return { results, stats };
}
};

const memory = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const processes = [212, 417, 112, 426];
let stepIndex = 0;

function stepThrough() {
    if (stepIndex >= processes.length) {
        console.log("Simulation complete");
        clearInterval(autoInterval);
        return;
    }
    console.log("Allocating process:", processes[stepIndex]);

    if (Partition === "fixed") {
        const resultFixed = memorySimulator.bestFitFixed(memory, [processes[stepIndex]]);
        console.log("Fixed Best Fit Partition");
        console.log(resultFixed);
    }

    if (Partition === "dynamic") {
        const resultDynamic = memorySimulator.bestFitDynamic(memory, [processes[stepIndex]]);
        console.log("Dynamic Best Fit Partition");
        console.log(resultDynamic);
    }
    stepIndex++;
}

function startInterval() {
    clearInterval(autoInterval);
    const sliderValue = 50;
    const multiplier = 1 + ((sliderValue - 1) / 99) * 2;
    const baseDelay = 1000;
    const speed = baseDelay / multiplier;
    autoInterval = setInterval(stepThrough, speed);
    console.log("Interval started at speed:", speed, "ms");
}

let Partition = "dynamic";
startInterval();

function stopInterval() {
    clearInterval(autoInterval);
    console.log("Interval stopped");
}