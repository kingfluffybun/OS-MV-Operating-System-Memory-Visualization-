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

    firstFitFixedStep(memoryHead, processSize) {
        for (let block = memoryHead; block; block = block.next) {
            if (block.status === "Free" && processSize <= block.size) {
                block.status = "Occupied";
                return { size: processSize, block: block.id, status: "Allocated" };
            }
        }
        return { size: processSize, block: "None", status: "Unallocated" };
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
            originalFit.status = "Occupied";
            return { result: { size: processSize, block: originalFit.id, status: "Allocated" }, newHead: head };
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
                    return { result: { size: processSize, block: 6, status: "Allocated" }, newHead: head };
                }

                const leftover = block6.size - processSize;
                const allocatedBlock = { id: maxId + 1, size: processSize, status: "Occupied", next: block6 };
                if (prev) prev.next = allocatedBlock;
                else head = allocatedBlock;
                block6.size = leftover;
                return { result: { size: processSize, block: allocatedBlock.id, status: "Allocated" }, newHead: head };
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
                return { result: { size: processSize, block: 6, status: "Allocated" }, newHead: head };
            }

            const allocatedBlock = { id: maxId + 1, size: processSize, status: "Occupied", next: mergedFree };
            if (newHead === mergedFree) {
                head = allocatedBlock;
            } else {
                tail.next = allocatedBlock;
            }
            mergedFree.size = totalFree - processSize;
            return { result: { size: processSize, block: allocatedBlock.id, status: "Allocated" }, newHead: head };
        }

        return { result: { size: processSize, block: "None", status: "Unallocated" }, newHead: head };
    }
};

// --- Interval helpers ---
// let autoInterval = null;
// let currentIntervalSpeed = null;
// const memory = memorySimulator.createLinkedMemory([100, 500, 200, 300, 600]);
// let memoryState = memorySimulator.cloneLinkedMemory(memory);
// const processes = [212, 417, 112, 426];
// let stepIndex = 0;
// let Partition = "dynamic";

// function getSliderValue() {
//     const slider = typeof document !== "undefined" ? document.querySelector('.slider') : null;
//     return slider ? Number(slider.value) : 50;
// }

// function getIntervalSpeed() {
//     const sliderValue = getSliderValue();
//     const multiplier = 1 + ((sliderValue - 1) / 99) * 2;
//     const baseDelay = 1000;
//     return baseDelay / multiplier;
// }

// function updateIntervalSpeed() {
//     const speed = getIntervalSpeed();
//     if (autoInterval && speed !== currentIntervalSpeed) {
//         clearInterval(autoInterval);
//         currentIntervalSpeed = speed;
//         autoInterval = setInterval(stepThrough, currentIntervalSpeed);
//         console.log("Adjusted interval speed to:", currentIntervalSpeed, "ms");
//     }
// }

// function stepThrough() {
//     if (stepIndex >= processes.length) {
//         console.log("Simulation complete");
//         clearInterval(autoInterval);
//         return;
//     }

//     updateIntervalSpeed();

//     const processSize = processes[stepIndex];
//     console.log("Allocating process:", processSize);

//     if (Partition === "fixed") {
//         const resultFixed = memorySimulator.firstFitFixedStep(memoryState, processSize);
//         console.log("Fixed First Fit Partition");
//         console.log(resultFixed);
//     }

//     if (Partition === "dynamic") {
//         const stepResult = memorySimulator.firstFitDynamicStep(memoryState, processSize);
//         memoryState = stepResult.newHead;
//         console.log("Dynamic First Fit Partition");
//         console.log(stepResult.result);
//     }

//     stepIndex++;
// }

// function startInterval() {
//     clearInterval(autoInterval);
//     currentIntervalSpeed = getIntervalSpeed();
//     autoInterval = setInterval(stepThrough, currentIntervalSpeed);
//     console.log("Interval started at speed:", currentIntervalSpeed, "ms");
// }

// function stopInterval() {
//     clearInterval(autoInterval);
//     console.log("Interval stopped");
// }

// --- Execution ---
// console.log("First Fit Fixed:",   memorySimulator.firstFitFixed(memory, processes));
// console.log("First Fit Dynamic:", memorySimulator.firstFitDynamic(memory, processes));
// startInterval();
