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
        successfulAllocations: 0,
      };
    }

    const fragmentation = allocatedBlock.size - processSize;
    allocatedBlock.status = "Occupied";

    // Advance pointer past the now-occupied block for the next call
    this._nextLastBlock = allocatedBlock.next || memoryHead;

    return {
      result: {
        size: processSize,
        block: allocatedBlock.id,
        status: "Allocated",
        fragmentation,
      },
      allocatedSize: processSize,
      successfulAllocations: 1,
    };
  },

  performCompaction(head, processSize) {
    const totalFree = this.totalFreeSize(head);
    if (totalFree < processSize) return null;

    let newHead = null;
    let tail = null;
    let freeTotal = 0;
    let idCounter = 1;
    const idMapping = {};

    for (let node = head; node; node = node.next) {
      if (node.status === "Occupied") {
        const newId = idCounter++;
        idMapping[node.id] = newId;
        const copy = {
          id: newId,
          size: node.size,
          status: node.status,
          next: null,
        };
        if (!tail) newHead = copy;
        else tail.next = copy;
        tail = copy;
      } else {
        freeTotal += node.size;
      }
    }

    if (freeTotal > 0) {
      const freeNode = {
        id: idCounter,
        size: freeTotal,
        status: "Free",
        next: null,
      };
      if (tail) tail.next = freeNode;
      else newHead = freeNode;
    }
    return { head: newHead, idMapping };
  },

  nextFitDynamicStep(memoryHead, processSize) {
    const tryAllocateOn = (searchHead) => {
      let current = searchHead;
      while (current) {
        if (current.status === "Free" && processSize <= current.size)
          return current;
        current = current.next;
      }
      return null;
    };

    let start = this._nextLastBlock || memoryHead;
    let allocatedBlock = tryAllocateOn(start);
    if (!allocatedBlock && start !== memoryHead) {
      allocatedBlock = tryAllocateOn(memoryHead);
    }

    let compactedHead = null;
    let idMapping = null;
    if (!allocatedBlock) {
      const compacted = this.performCompaction(memoryHead, processSize);
      if (compacted && compacted.head) {
        compactedHead = compacted.head;
        idMapping = compacted.idMapping;
        allocatedBlock = tryAllocateOn(compactedHead);
      }
    }

    if (!allocatedBlock) {
      return {
        result: { size: processSize, block: "None", status: "Unallocated" },
        allocatedSize: 0,
        successfulAllocations: 0,
      };
    }

    const currentHead = compactedHead || memoryHead;
    const leftoverSize = allocatedBlock.size - processSize;
    allocatedBlock.size = processSize;
    allocatedBlock.status = "Occupied";

    let newFreeId = null;
    if (leftoverSize > 0) {
      newFreeId = Math.max(...this._collectIds(currentHead)) + 1;
      const oldNext = allocatedBlock.next;
      allocatedBlock.next = {
        id: newFreeId,
        size: leftoverSize,
        status: "Free",
        next: oldNext,
      };
    }

    this._nextLastBlock = allocatedBlock.next || compactedHead || memoryHead;

    return {
      result: {
        size: processSize,
        block: allocatedBlock.id,
        status: "Allocated",
        fragmentation: leftoverSize,
      },
      allocatedSize: processSize,
      successfulAllocations: 1,
      newFreeId,
      ifCompacted: Boolean(compactedHead),
      newMemoryHead: compactedHead || undefined,
      idMapping,
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
  },
};
