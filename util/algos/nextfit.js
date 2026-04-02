const nextFitSimulator = {

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
                allocatedSize: processSize,
                successfulAllocations: 1,
                lastBlock: allocatedBlock
            };
        }

        return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0, lastBlock };
    },

    nextFitDynamicStep(memoryHead, processSize, lastBlock, nextSplitId) {
        let block = lastBlock || memoryHead;
        const start = block;
        let allocated = false;
        let allocatedBlock = null;
        let splitId = typeof nextSplitId === 'number' ? nextSplitId : (() => {
            let maxId = 0;
            for (let n = memoryHead; n; n = n.next) maxId = Math.max(maxId, n.id);
            return maxId + 1;
        })();

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
            const fragmentation = allocatedBlock.size - processSize;
            return {
                result: { size: processSize, block: allocatedBlock.id, status: "Allocated", fragmentation },
                allocatedSize: processSize,
                successfulAllocations: 1,
                lastBlock: allocatedBlock,
                nextSplitId: splitId
            };
        }

        return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0, lastBlock, nextSplitId: splitId };
    }
};

window.memorySimulators = window.memorySimulators || {};
window.memorySimulators.nextFit = nextFitSimulator;
