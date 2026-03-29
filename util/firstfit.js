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

    // Get total memory by walking the list
    totalSize(head) {
        let total = 0;
        for (let n = head; n; n = n.next) total += n.size;
        return total;
    },

    firstFitFixed(memoryHead, processes) {
        const head = this.cloneLinkedMemory(memoryHead);
        let allocatedSize = 0, successfulAllocations = 0, intFragmentation = 0;
        let freeSize = this.totalSize(head);
        const results = [];

        for (let countP = 0; countP < processes.length; countP++) {
            const currentProcessSize = processes[countP];
            let allocated = false;

            // Walk the linked list (replaces inner for loop over memBlockNum)
            for (let block = head; block; block = block.next) {
                if (block.status === "Free" && currentProcessSize <= block.size) {
                    intFragmentation += block.size - currentProcessSize;
                    block.status = "Occupied";
                    allocatedSize += currentProcessSize;
                    freeSize -= currentProcessSize;
                    successfulAllocations++;

                    results.push({ process: countP + 1, size: currentProcessSize, block: block.id, status: "Allocated" });
                    allocated = true;
                    break;
                }
            }

            if (!allocated) {
                results.push({ process: countP + 1, size: currentProcessSize, block: "None", status: "Unallocated" });
            }
        }

        return { results, stats: { successfulAllocations, allocatedSize, intFragmentation, freeSize } };
    },

    firstFitDynamic(memoryHead, processes) {
        let head = this.cloneLinkedMemory(memoryHead);
        let allocatedSize = 0, successfulAllocations = 0;
        let freeSize = this.totalSize(head);

        // Track split IDs (replaces splice index-based IDs)
        let splitId = 0;
        for (let n = head; n; n = n.next) splitId = Math.max(splitId, n.id);
        splitId++;

        const results = [];

        for (let countP = 0; countP < processes.length; countP++) {
            const currentProcessSize = processes[countP];
            let allocated = false;

            // Walk the linked list (replaces inner for loop over memory[])
            for (let block = head; block; block = block.next) {
                if (block.status === "Free" && currentProcessSize <= block.size) {
                    const leftover = block.size - currentProcessSize;

                    block.size = currentProcessSize;
                    block.status = "Occupied";
                    allocatedSize += currentProcessSize;
                    freeSize -= currentProcessSize;
                    successfulAllocations++;

                    // Dynamic Splitting (replaces splice — inserts a new node after current)
                    if (leftover > 0) {
                        block.next = { id: splitId++, size: leftover, status: "Free", next: block.next };
                    }

                    results.push({ process: countP + 1, size: currentProcessSize, block: block.id, status: "Allocated" });
                    allocated = true;
                    break;
                }
            }

            // Compaction (replaces filter + push on the array)
            if (!allocated) {
                if (freeSize >= currentProcessSize) {
                    // Collect all occupied nodes, then append one merged free node
                    let newHead = null, tail = null, totalFree = 0;
                    for (let n = head; n; n = n.next) {
                        if (n.status === "Occupied") {
                            const node = { id: n.id, size: n.size, status: "Occupied", next: null };
                            if (!tail) newHead = node;
                            else tail.next = node;
                            tail = node;
                        } else {
                            totalFree += n.size;
                        }
                    }
                    // Append the single merged free block at the end
                    const mergedFree = { id: splitId++, size: totalFree, status: "Free", next: null };
                    if (!tail) newHead = mergedFree;
                    else tail.next = mergedFree;
                    head = newHead;

                    countP--; // Retry the same process
                    continue;
                } else {
                    results.push({ process: countP + 1, size: currentProcessSize, block: "None", status: "Unallocated" });
                }
            }
        }

        return { results, stats: { successfulAllocations, allocatedSize, intFragmentation: 0, freeSize } };
    }
};

// --- Execution ---
const memory    = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
const processes = [212, 417, 112, 426];

console.log("First Fit Fixed:",   memorySimulator.firstFitFixed(memory, processes));
console.log("First Fit Dynamic:", memorySimulator.firstFitDynamic(memory, processes));
