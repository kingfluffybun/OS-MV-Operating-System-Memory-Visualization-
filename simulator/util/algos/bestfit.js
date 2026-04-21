let autoInterval;

const memorySimulator = {
  createLinkedMemory(blocks) {
    let head = null,
      tail = null;
    blocks.forEach((size, i) => {
      const node = { id: i + 1, size, status: "Free", next: null };
      if (!tail) head = node;
      else tail.next = node;
      tail = node;
    });
    return head;
  },

  cloneLinkedMemory(head) {
    let newHead = null,
      tail = null,
      cur = head;
    while (cur) {
      const node = {
        id: cur.id,
        size: cur.size,
        status: cur.status,
        next: null,
      };
      if (!tail) newHead = node;
      else tail.next = node;
      tail = node;
      cur = cur.next;
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
    const entries = Array.isArray(results) ? results : Object.values(results);
    const unallocated = entries
      .filter((r) => r.status === "Unallocated")
      .map((r) => r.size);
    if (unallocated.length === 0) return 0;

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

  bestFitFixed(memoryHead, processes) {
    const head = this.cloneLinkedMemory(memoryHead);
    const stats = {
      allocatedSize: 0,
      successfulAllocations: 0,
      intFragmentation: 0,
    };
    const results = {};

    processes.forEach((size, i) => {
      const pId = `process ${i + 1}`;

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

    return {
      results,
      stats: this.computeStats(head, processes, results, stats),
      finalMemory: head,
    };
  },

  bestFitDynamic(memoryHead, processes) {
    const head = this.cloneLinkedMemory(memoryHead);
    const stats = {
      allocatedSize: 0,
      successfulAllocations: 0,
      intFragmentation: 0,
    };
    const results = {};

    // Generate unique IDs for new split blocks
    let splitId = 0;
    for (let n = head; n; n = n.next) splitId = Math.max(splitId, n.id);
    splitId++;

    processes.forEach((size, i) => {
      const pId = `process ${i + 1}`;

      // Find best fit block
      let bestBlock = null;
      for (let block = head; block; block = block.next) {
        if (block.status === "Free" && size <= block.size) {
          if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
        }
      }

      if (bestBlock) {
        const originalLabel = bestBlock.originalLabel ?? bestBlock.id;
        const leftover = bestBlock.size - size;

        // Allocate the block
        bestBlock.size = size;
        bestBlock.status = "Occupied";

        stats.allocatedSize += size;
        stats.successfulAllocations++;

        // Split leftover into a new free block (carries original label forward)
        if (leftover > 0) {
          const newNode = {
            id: splitId++,
            size: leftover,
            status: "Free",
            next: bestBlock.next,
            originalLabel, // future allocations from this fragment inherit the label
          };
          bestBlock.next = newNode;
        }

        results[pId] = {
          size,
          block: bestBlock.id,
          status: "Allocated",
          displayBlock: originalLabel,
        };
      } else {
        results[pId] = { size, block: "None", status: "Unallocated" };
      }
    });

    return {
      results,
      stats: this.computeStats(head, processes, results, stats),
      finalMemory: head,
    };
  },

  bestFitFixedStep(memoryHead, processSize) {
    let bestBlock = null;
    for (let block = memoryHead; block; block = block.next) {
      if (block.status === "Free" && processSize <= block.size) {
        if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
      }
    }

    if (!bestBlock) {
      return {
        result: { size: processSize, block: "None", status: "Unallocated" },
        allocatedSize: 0,
        successfulAllocations: 0,
      };
    }

    const fragmentation = bestBlock.size - processSize;
    bestBlock.status = "Occupied";
    return {
      result: {
        size: processSize,
        block: bestBlock.id,
        status: "Allocated",
        fragmentation,
      },
      allocatedSize: processSize,
      successfulAllocations: 1,
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

  bestFitDynamicStep(memoryHead, processSize) {
    let bestBlock = null;
    for (let block = memoryHead; block; block = block.next) {
      if (block.status === "Free" && processSize <= block.size) {
        if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
      }
    }

    let compactedHead = null;
    let idMapping = null;
    if (!bestBlock) {
      const compacted = this.performCompaction(memoryHead, processSize);
      if (compacted && compacted.head) {
        compactedHead = compacted.head;
        idMapping = compacted.idMapping;
        for (let block = compactedHead; block; block = block.next) {
          if (block.status === "Free" && processSize <= block.size) {
            if (!bestBlock || block.size < bestBlock.size) bestBlock = block;
          }
        }
      }
    }

    if (!bestBlock) {
      return {
        result: { size: processSize, block: "None", status: "Unallocated" },
        allocatedSize: 0,
        successfulAllocations: 0,
      };
    }

    // Preserve the user-visible partition label before any modification
    const originalLabel = bestBlock.originalLabel ?? bestBlock.id;

    const leftover = bestBlock.size - processSize;
    bestBlock.size = processSize;
    bestBlock.status = "Occupied";

    let newFreeId = null;
    if (leftover > 0) {
      const idsHead = compactedHead || memoryHead;
      newFreeId = Math.max(...this._collectIds(idsHead)) + 1;
      bestBlock.next = {
        id: newFreeId,
        size: leftover,
        status: "Free",
        next: bestBlock.next,
        originalLabel, // carry forward so future allocations from this fragment show the same block label
      };
    }

    const result = {
      result: {
        size: processSize,
        block: bestBlock.id,
        status: "Allocated",
        fragmentation: leftover,
        displayBlock: originalLabel, // script.js uses this for console output
      },
      allocatedSize: processSize,
      successfulAllocations: 1,
      newFreeId,
      ifCompacted: Boolean(compactedHead),
      newMemoryHead: compactedHead || undefined,
      idMapping,
    };

    return result;
  },

  _collectIds(head) {
    const ids = [];
    for (let node = head; node; node = node.next) ids.push(node.id);
    return ids;
  },

  allocateFixedStep(memoryHead, processSize) {
    return this.bestFitFixedStep(memoryHead, processSize);
  },

  allocateDynamicStep(memoryHead, processSize) {
    return this.bestFitDynamicStep(memoryHead, processSize);
  },
};
