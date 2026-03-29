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

    // 1. NEXT FIT FIXED
    nextFitFixed(memoryHead, processes) {
        const head = this.cloneLinkedMemory(memoryHead);
        const stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
        const results = {};

        let lastBlock = head; // Next Fit: resume from last allocated block

        processes.forEach((size, i) => {
            const pId = `process_${i + 1}`;
            let block = lastBlock;  // start from where we left off
            let allocated = false;

            // Search from lastBlock to end of list
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
    }
};

// --- Execution ---
const memory = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const processes = [212, 417, 112, 426];

const fixed   = memorySimulator.nextFitFixed(memory, processes);
console.log("NEXT FIT FIXED RESULTS:", fixed.results);
console.log("NEXT FIT FIXED STATS:", fixed.stats + "\n");

const dynamic = memorySimulator.nextFitDynamic(memory, processes);
console.log("NEXT FIT DYNAMIC RESULTS:", dynamic.results);
console.log("NEXT FIT DYNAMIC STATS:", dynamic.stats);
