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
}
};

const memory = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const processes = [212, 417, 112, 426];
let stepIndex = 0;
let currentIntervalSpeed = null;

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
        clearInterval(autoInterval);
        return;
    }

    updateIntervalSpeed();
    console.log("Allocating process:", processes[stepIndex]);

    if (Partition === "fixed") {
        const resultFixed = memorySimulator.worstFitFixed(memory, [processes[stepIndex]]);
        console.log("Fixed Worst Fit Partition");
        console.log(resultFixed);
    }

    if (Partition === "dynamic") {
        const resultDynamic = memorySimulator.worstFitDynamic(memory, [processes[stepIndex]]);
        console.log("Dynamic Worst Fit Partition");
        console.log(resultDynamic);
    }
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