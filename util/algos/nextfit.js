const memorySimulator = {
    _nextLastBlock: null,

    createLinkedMemory(blocks) {
        let head = null;
        let tail = null;
        blocks.forEach((size, i) => {
            const node = { id: i + 1, size, status: "Free", next: null };
            if (!tail) head = node;
            else tail.next = node;
            tail = node;
        });
        // Reset next-fit pointer whenever a new memory list is created (e.g. on reset)
        this._nextLastBlock = null;
        return head;
    },

    cloneLinkedMemory(head) {
        let newHead = null;
        let tail = null;
        for (let node = head; node; node = node.next) {
            const copy = { id: node.id, size: node.size, status: node.status, next: null };
            if (!tail) newHead = copy;
            else tail.next = copy;
            tail = copy;
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
        const entries = Array.isArray(results) ? results : Object.values(results || {});
        const unallocated = entries.filter(r => r.status === "Unallocated").map(r => r.size);
        if (!unallocated.length) return 0;

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

    nextFitFixedStep(memoryHead, processSize) {
        // Start from last allocated block, or beginning if first call / after reset
        let start = this._nextLastBlock || memoryHead;
        let block = start;
        let allocatedBlock = null;

        // Search from start to end of list
        while (block) {
            if (block.status === "Free" && processSize <= block.size) {
                allocatedBlock = block;
                break;
            }
            block = block.next;
        }

        // Wrap around: search from head up to (not including) start
        if (!allocatedBlock) {
            block = memoryHead;
            while (block && block !== start) {
                if (block.status === "Free" && processSize <= block.size) {
                    allocatedBlock = block;
                    break;
                }
                block = block.next;
            }
        }

        if (!allocatedBlock) {
            return {
                result: { size: processSize, block: "None", status: "Unallocated" },
                allocatedSize: 0,
                successfulAllocations: 0
            };
        }

        const fragmentation = allocatedBlock.size - processSize;
        allocatedBlock.status = "Occupied";

        // Advance pointer past the now-occupied block for the next call
        this._nextLastBlock = allocatedBlock.next || memoryHead;

        return {
            result: { size: processSize, block: allocatedBlock.id, status: "Allocated", fragmentation },
            allocatedSize: processSize,
            successfulAllocations: 1
        };
    },

    performCompaction(head, processSize) {
        const totalFree = this.totalFreeSize(head);
        if (totalFree < processSize) return null;

        const allocated = [];
        let freeTotal = 0;
        let maxId = 0;
        let tail = null;

        // Collect allocated blocks and sum free
        for (let node = head; node; node = node.next) {
            maxId = Math.max(maxId, node.id);
            if (node.status === "Occupied") {
                allocated.push(node);
            } else {
                freeTotal += node.size;
            }
        }

        // Rebuild: allocated blocks + single free at end
        let newHead = null;
        for (let node of allocated) {
            if (!newHead) newHead = node;
            if (tail) tail.next = node;
            tail = node;
            node.next = null;
        }
        if (freeTotal > 0) {
            const freeNode = { id: maxId + 1, size: freeTotal, status: "Free", next: null };
            if (tail) tail.next = freeNode;
            else newHead = freeNode;
        }
        return newHead;
    },

    nextFitDynamicStep(memoryHead, processSize) {
        // Start from last allocated block, or beginning if first call / after reset
        let start = this._nextLastBlock || memoryHead;
        let block = start;
        let allocatedBlock = null;
        let newFreeIdFromSplit = null;
        let leftoverSize = 0;

        const tryAllocate = (current) => {
            if (current.status !== "Free" || processSize > current.size) return false;

            leftoverSize = current.size - processSize;
            current.size = processSize;
            current.status = "Occupied";

            if (leftoverSize > 0) {
                newFreeIdFromSplit = Math.max(...this._collectIds(memoryHead)) + 1;
                // Capture old next BEFORE rewiring, then insert split node
                const oldNext = current.next;
                current.next = {
                    id: newFreeIdFromSplit,
                    size: leftoverSize,
                    status: "Free",
                    next: oldNext
                };
            }

            allocatedBlock = current;
            return true;
        };

        // Search from start to end of list
        while (block) {
            if (tryAllocate(block)) break;
            block = block.next;
        }

        // Wrap around: search from head up to (not including) start
        if (!allocatedBlock) {
            block = memoryHead;
            while (block && block !== start) {
                if (tryAllocate(block)) break;
                block = block.next;
            }
        }

        if (!allocatedBlock) {
            // Trigger compaction for Next-Fit
            const compactedHead = this.performCompaction(memoryHead, processSize);
            if (compactedHead) {
                // Try allocate in compacted, starting from _nextLastBlock equivalent or head
                let compBlock = this._nextLastBlock || compactedHead;
                const compStart = compBlock;
                while (compBlock) {
                    if (tryAllocate(compBlock)) break;
                    compBlock = compBlock.next;
                }
                if (!allocatedBlock) {
                    compBlock = compactedHead;
                    while (compBlock && compBlock !== compStart) {
                        if (tryAllocate(compBlock)) break;
                        compBlock = compBlock.next;
                    }
                }
                if (allocatedBlock) {
                    // Update structure and _nextLastBlock
                    let origTail = memoryHead;
                    while (origTail.next) origTail = origTail.next;
                    origTail.next = compactedHead;
                    this._nextLastBlock = allocatedBlock;
                    return {
                        result: { size: processSize, block: allocatedBlock.id, status: "Allocated", fragmentation: allocatedBlock.size - processSize },
                        allocatedSize: processSize,
                        successfulAllocations: 1,
                        newFreeId: newFreeIdFromSplit
                    };
                }
            }

            return {
                result: { size: processSize, block: "None", status: "Unallocated" },
                allocatedSize: 0,
                successfulAllocations: 0
            };
        }

        // After a dynamic split, allocatedBlock.next is the new free remainder node.
        // Resume next search from there so we continue forward, not restart from head.
        // If no split (exact fit) or we fell off the end, wrap back to head.
        this._nextLastBlock = allocatedBlock.next || memoryHead;

        return {
            result: {
                size: processSize,
                block: allocatedBlock.id,
                status: "Allocated",
                fragmentation: leftoverSize
            },
            allocatedSize: processSize,
            successfulAllocations: 1,
            newFreeId: newFreeIdFromSplit
        };
    },

    _collectIds(head) {
        const ids = [];
        for (let node = head; node; node = node.next) ids.push(node.id);
        return ids;
    },

    // Compatibility layer for existing script.js calls.
    bestFitFixedStep(memoryHead, processSize) {
        return this.nextFitFixedStep(memoryHead, processSize);
    },

    bestFitDynamicStep(memoryHead, processSize) {
        return this.nextFitDynamicStep(memoryHead, processSize);
    }
};