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

    // 1. BEST FIT FIXED
    bestFitFixed(memoryHead, processes) {
        const head = this.cloneLinkedMemory(memoryHead);
        const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
        const results = {};

        processes.forEach((size, i) => {
            const pId = `process_${i + 1}`;

            // Scan entire list to find the smallest block that still fits
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

    // 2. BEST FIT DYNAMIC
    bestFitDynamic(memoryHead, processes) {
        const head = this.cloneLinkedMemory(memoryHead);
        const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
        const results = {};

        let splitId = 0;
        for (let n = head; n; n = n.next) splitId = Math.max(splitId, n.id);
        splitId++;

        processes.forEach((size, i) => {
            const pId = `process_${i + 1}`;

            // Scan entire list to find the smallest block that still fits
            let bestBlock = null;
            for (let block = head; block; block = block.next) {
                if (block.status === "Free" && size <= block.size) {
                    if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
                }
            }

            if (bestBlock) {
                const leftover = bestBlock.size - size;
                bestBlock.size = size;
                bestBlock.status = "Occupied";
                stats.allocatedSize += size;
                stats.successfulAllocations++;

                // Split: insert a new free node for the leftover space
                if (leftover > 0) {
                    bestBlock.next = { id: splitId++, size: leftover, status: "Free", next: bestBlock.next };
                }

                results[pId] = { size, block: bestBlock.id, status: "Allocated" };
            } else {
                results[pId] = { size, block: "None", status: "Unallocated" };
            }
        });

        return { results, stats };
    }
};

// --- Execution ---
const memory    = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const processes = [212, 417, 112, 426];

const fixed   = memorySimulator.bestFitFixed(memory, processes);
const dynamic = memorySimulator.bestFitDynamic(memory, processes);

console.log("BEST FIT FIXED RESULTS:",   fixed.results);
console.log("BEST FIT FIXED STATS:",     fixed.stats);
console.log("BEST FIT DYNAMIC RESULTS:", dynamic.results);
console.log("BEST FIT DYNAMIC STATS:",   dynamic.stats);
