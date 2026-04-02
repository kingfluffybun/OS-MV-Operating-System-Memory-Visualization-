const firstFitSimulator = {

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

    firstFitFixedStep(memoryHead, processSize) {
        for (let block = memoryHead; block; block = block.next) {
            if (block.status === "Free" && processSize <= block.size) {
                const fragmentation = block.size - processSize;
                block.status = "Occupied";
                return {
                    result: { size: processSize, block: block.id, status: "Allocated", fragmentation },
                    allocatedSize: processSize,
                    successfulAllocations: 1
                };
            }
        }
        return { result: { size: processSize, block: "None", status: "Unallocated" }, allocatedSize: 0, successfulAllocations: 0 };
    },

    firstFitDynamic(memoryHead, processes) {
        let head = this.cloneLinkedMemory(memoryHead);
        const results = [];

        const totalFreeSize = () => {
            let total = 0;
            for (let n = head; n; n = n.next) {
                if (n.status === "Free") total += n.size;
            }
            return total;
        };

        const maxNodeId = () => {
            let max = 0;
            for (let n = head; n; n = n.next) max = Math.max(max, n.id);
            return max;
        };

        for (let countP = 0; countP < processes.length; countP++) {
            const processSize = processes[countP];
            let allocated = false;

            for (let block = head; block; block = block.next) {
                if (block.status === "Free" && block.id <= 5 && processSize <= block.size) {
                    block.status = "Occupied";
                    results.push({ process: countP + 1, size: processSize, block: block.id, status: "Allocated" });
                    allocated = true;
                    break;
                }
            }

            if (allocated) continue;

            const freeSize = totalFreeSize();
            if (freeSize >= processSize) {
                let newHead = null;
                let tail = null;

                for (let n = head; n; n = n.next) {
                    if (n.status === "Occupied") {
                        const node = { id: n.id, size: n.size, status: "Occupied", next: null };
                        if (!tail) newHead = node;
                        else tail.next = node;
                        tail = node;
                    }
                }

                const mergedFree = { id: 6, size: freeSize, status: "Free", next: null };
                if (!tail) newHead = mergedFree;
                else tail.next = mergedFree;
                head = newHead;

                if (processSize === freeSize) {
                    mergedFree.status = "Occupied";
                    results.push({ process: countP + 1, size: processSize, block: 6, status: "Allocated" });
                } else {
                    const newId = maxNodeId() + 1;
                    const allocatedBlock = { id: newId, size: processSize, status: "Occupied", next: mergedFree };
                    if (!tail) head = allocatedBlock;
                    else tail.next = allocatedBlock;
                    mergedFree.size = freeSize - processSize;
                    results.push({ process: countP + 1, size: processSize, block: newId, status: "Allocated" });
                }

                continue;
            }

            results.push({ process: countP + 1, size: processSize, block: "None", status: "Unallocated" });
        }

        const successfulAllocations = results.filter(r => r.status === "Allocated").length;
        const allocatedSize = results.filter(r => r.status === "Allocated").reduce((sum, r) => sum + r.size, 0);
        const freeSize = totalFreeSize();

        return { results, stats: { successfulAllocations, allocatedSize, intFragmentation: 0, freeSize } };
    },

    firstFitDynamicStep(memoryHead, processSize) {
        let head = memoryHead;
        let totalFree = 0;
        let maxId = 0;
        let originalFit = null;

        for (let n = head; n; n = n.next) {
            maxId = Math.max(maxId, n.id);
            if (n.status === "Free") {
                totalFree += n.size;
                if (n.id <= 5 && processSize <= n.size && !originalFit) {
                    originalFit = n;
                }
            }
        }

        if (originalFit) {
            const fragmentation = originalFit.size - processSize;
            originalFit.status = "Occupied";
            return {
                result: { size: processSize, block: originalFit.id, status: "Allocated", fragmentation },
                newHead: head,
                allocatedSize: processSize,
                successfulAllocations: 1
            };
        }

        if (totalFree >= processSize) {
            // If block 6 already exists, use it after compaction logic
            let block6 = null;
            let prev = null;
            for (let n = head; n; prev = n, n = n.next) {
                if (n.id === 6) {
                    block6 = n;
                    break;
                }
            }

            if (block6 && block6.status === "Free") {
                if (processSize === block6.size) {
                    block6.status = "Occupied";
                    return {
                        result: { size: processSize, block: 6, status: "Allocated", fragmentation: 0 },
                        newHead: head,
                        allocatedSize: processSize,
                        successfulAllocations: 1
                    };
                }

                const leftover = block6.size - processSize;
                const allocatedBlock = { id: maxId + 1, size: processSize, status: "Occupied", next: block6 };
                if (prev) prev.next = allocatedBlock;
                else head = allocatedBlock;
                block6.size = leftover;
                return {
                    result: { size: processSize, block: allocatedBlock.id, status: "Allocated", fragmentation: leftover },
                    newHead: head,
                    allocatedSize: processSize,
                    successfulAllocations: 1
                };
            }

            // Compact all free space into block 6
            let newHead = null;
            let tail = null;
            for (let n = head; n; n = n.next) {
                if (n.status === "Occupied") {
                    const node = { id: n.id, size: n.size, status: "Occupied", next: null };
                    if (!tail) newHead = node;
                    else tail.next = node;
                    tail = node;
                }
            }

            const mergedFree = { id: 6, size: totalFree, status: "Free", next: null };
            if (!tail) newHead = mergedFree;
            else tail.next = mergedFree;
            head = newHead;

            if (processSize === totalFree) {
                mergedFree.status = "Occupied";
                return {
                    result: { size: processSize, block: 6, status: "Allocated", fragmentation: 0 },
                    newHead: head,
                    allocatedSize: processSize,
                    successfulAllocations: 1
                };
            }

            const leftover = totalFree - processSize;
            const allocatedBlock = { id: maxId + 1, size: processSize, status: "Occupied", next: mergedFree };
            if (newHead === mergedFree) {
                head = allocatedBlock;
            } else {
                tail.next = allocatedBlock;
            }
            mergedFree.size = leftover;
            return {
                result: { size: processSize, block: allocatedBlock.id, status: "Allocated", fragmentation: leftover },
                newHead: head,
                allocatedSize: processSize,
                successfulAllocations: 1
            };
        }

        return { result: { size: processSize, block: "None", status: "Unallocated" }, newHead: head, allocatedSize: 0, successfulAllocations: 0 };
    }
};

window.memorySimulators = window.memorySimulators || {};
window.memorySimulators.firstFit = firstFitSimulator;
