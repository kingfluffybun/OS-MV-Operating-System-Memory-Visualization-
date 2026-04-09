let autoInterval;

const memorySimulator = {
  createLinkedMemory(blocks) {
    let head = null;
    let tail = null;
    blocks.forEach((size, i) => {
      const node = { id: i + 1, size, status: "Free", next: null };
      if (!tail) head = node;
      else tail.next = node;
      tail = node;
    });
    return head;
  },

  cloneLinkedMemory(head) {
    let newHead = null;
    let tail = null;
    for (let node = head; node; node = node.next) {
      const copy = {
        id: node.id,
        size: node.size,
        status: node.status,
        next: null,
      };
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
    const entries = Array.isArray(results)
      ? results
      : Object.values(results || {});
    const unallocated = entries
      .filter((r) => r.status === "Unallocated")
      .map((r) => r.size);
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
    const memoryUtilization =
      totalMemory > 0 ? (allocatedSize / totalMemory) * 100 : 0;
    const successRate =
      processes.length > 0
        ? (successfulAllocations / processes.length) * 100
        : 0;

    return {
      totalMemory,
      allocatedSize,
      totalFree,
      intFragmentation: stats.intFragmentation,
      externalFragmentation,
      memoryUtilization,
      successRate,
    };
  },

  firstFitFixedStep(memoryHead, processSize) {
    for (let block = memoryHead; block; block = block.next) {
      if (block.status === "Free" && processSize <= block.size) {
        const fragmentation = block.size - processSize;
        block.status = "Occupied";
        return {
          result: {
            size: processSize,
            block: block.id,
            status: "Allocated",
            fragmentation,
          },
          allocatedSize: processSize,
          successfulAllocations: 1,
        };
      }
    }
    return {
      result: { size: processSize, block: "None", status: "Unallocated" },
      allocatedSize: 0,
      successfulAllocations: 0,
    };
  },

  performCompaction(head, processSize) {
    // Step 1: Calculate total free space
    const totalFree = this.totalFreeSize(head);
    if (totalFree < processSize) return null;

    // Step 2: Create new compacted list with only occupied nodes + one free block
    let newHead = null;
    let tail = null;
    let freeTotal = 0;
    let newBlockId = 1;
    const idMapping = {};

    // Step 3: Filter only OCCUPIED nodes and assign sequential IDs
    for (let node = head; node; node = node.next) {
      if (node.status === "Occupied") {
        // Create a copy of the occupied node with new ID
        const newNode = {
          id: newBlockId,
          size: node.size,
          status: "Occupied",
          parentId: node.parentId,
          next: null,
        };

        // Map old block ID to new block ID (for updating results)
        idMapping[node.id] = newBlockId;

        // Add to new list
        if (!tail) {
          newHead = newNode;
        } else {
          tail.next = newNode;
        }
        tail = newNode;
        newBlockId++;
      } else if (node.status === "Free") {
        // Step 4: Sum ALL free space into one block
        freeTotal += node.size;
      }
    }

    // Step 5: Create single consolidated FREE block at the end
    if (freeTotal > 0) {
      const freeNode = {
        id: newBlockId,
        size: freeTotal,
        status: "Free",
        next: null,
      };

      if (tail) {
        tail.next = freeNode;
      } else {
        // Edge case: only free blocks exist (shouldn't happen in normal use)
        newHead = freeNode;
      }
    }

    return { head: newHead, idMapping };
  },

  firstFitDynamicStep(memoryHead, processSize) {
    for (let block = memoryHead; block; block = block.next) {
      if (block.status === "Free" && processSize <= block.size) {
        const leftover = block.size - processSize;
        const displayBlockId = block.id;
        block.size = processSize;
        block.status = "Occupied";

        let newFreeId = null;
        if (leftover > 0) {
          newFreeId = Math.max(...this._collectIds(memoryHead)) + 1;
          block.next = {
            id: newFreeId,
            size: leftover,
            status: "Free",
            next: block.next,
            parentId: block.id,
          };
        }

        return {
          result: {
            size: processSize,
            block: block.id,
            displayBlock: displayBlockId,
            status: "Allocated",
            fragmentation: leftover,
          },
          allocatedSize: processSize,
          successfulAllocations: 1,
          newFreeId,
          ifCompacted: false,
        };
      }
    }

    // Trigger compaction
    const compacted = this.performCompaction(memoryHead, processSize);
    if (compacted && compacted.head) {
      const { head: compactedHead, idMapping } = compacted;
      for (let block = compactedHead; block; block = block.next) {
        if (block.status === "Free" && processSize <= block.size) {
          const leftover = block.size - processSize;
          const displayBlockId = block.id;
          block.size = processSize;
          block.status = "Occupied";

          let newFreeId = null;
          if (leftover > 0) {
            newFreeId = block.id + 1;
            block.next = {
              id: newFreeId,
              size: leftover,
              status: "Free",
              next: block.next,
              parentId: block.id,
            };
          }

          return {
            result: {
              size: processSize,
              block: block.id,
              displayBlock: displayBlockId,
              status: "Allocated",
              fragmentation: leftover,
            },
            allocatedSize: processSize,
            successfulAllocations: 1,
            newFreeId,
            newMemoryHead: compactedHead,
            ifCompacted: true,
            idMapping,
          };
        }
      }
    }

    return {
      result: { size: processSize, block: "None", status: "Unallocated" },
      allocatedSize: 0,
      successfulAllocations: 0,
      ifCompacted: false,
    };
  },

  _collectIds(head) {
    const ids = [];
    for (let node = head; node; node = node.next) ids.push(node.id);
    return ids;
  },

  // Compatibility layer for existing script.js calls.
  bestFitFixedStep(memoryHead, processSize) {
    return this.firstFitFixedStep(memoryHead, processSize);
  },

  bestFitDynamicStep(memoryHead, processSize) {
    return this.firstFitDynamicStep(memoryHead, processSize);
  },

  allocateFixedStep(memoryHead, processSize) {
    return this.firstFitFixedStep(memoryHead, processSize);
  },

  allocateDynamicStep(memoryHead, processSize) {
    return this.firstFitDynamicStep(memoryHead, processSize);
  },
};
