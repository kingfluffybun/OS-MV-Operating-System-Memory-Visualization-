let autoInterval;

const worstFitSimulator = {

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
            const pId = `process ${i + 1}`;

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
        const pId = `process ${i + 1}`;

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
            return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0 };
        }

        const fragmentation = worstBlock.size - processSize;
        worstBlock.status = "Occupied";
        return { result: { size: processSize, block: worstBlock.id, status: "Allocated", fragmentation }, allocatedSize: processSize, successfulAllocations: 1 };
    },

    worstFitDynamicStep(memoryHead, processSize) {
        let worstBlock = null;
        for (let block = memoryHead; block; block = block.next) {
            if (block.status === "Free" && processSize <= block.size) {
                if (!worstBlock || block.size > worstBlock.size) worstBlock = block;
            }
        }

        if (!worstBlock) {
            return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0, nextSplitId: Math.max(...this._collectIds(memoryHead)) + 1 };
        }

        const leftover = worstBlock.size - processSize;
        let splitId = Math.max(...this._collectIds(memoryHead)) + 1;
        worstBlock.size = processSize;
        worstBlock.status = "Occupied";

        if (leftover > 0) {
            worstBlock.next = { id: splitId++, size: leftover, status: "Free", next: worstBlock.next };
        }

        return { result: { size: processSize, block: worstBlock.id, status: "Allocated", fragmentation: leftover }, allocatedSize: processSize, successfulAllocations: 1, nextSplitId: splitId };
    },

    _collectIds(head) {
        const ids = [];
        for (let node = head; node; node = node.next) ids.push(node.id);
        return ids;
    }
};

window.memorySimulators = window.memorySimulators || {};
window.memorySimulators.worstFit = worstFitSimulator;