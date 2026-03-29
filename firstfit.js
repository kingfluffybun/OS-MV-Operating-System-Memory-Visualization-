function firstFitFixed(memBlockNum, processNum) {
    let allocatedSize = 0;           
    let successfulAllocations = 0;   
    let intFragmentation = 0;
    let totalMemory = memBlockNum.reduce((sum, current) => sum + current, 0);
    let freeSize = totalMemory;
    let status = new Array(memBlockNum.length).fill("Free");
    let allocationResults = [];

    // 2. Process Loop (Connector 'b' logic)
    for (let countP = 0; countP < processNum.length; countP++) {
        let currentProcessSize = processNum[countP];
        let allocated = false;

        // 3. Memory Block Loop (Connector 'a' logic)
        for (let countM = 0; countM < memBlockNum.length; countM++) {
            
            // Flowchart check: Status[CountM] == "Occupied"?
            if (status[countM] === "Free") {
                
                // Flowchart check: Process[CountP] <= MemoryBlock[CountM]?
                if (currentProcessSize <= memBlockNum[countM]) {
                    // Allocation logic from the large rectangle
                    intFragmentation += (memBlockNum[countM] - currentProcessSize);
                    status[countM] = "Occupied";
                    allocatedSize += currentProcessSize;
                    freeSize -= currentProcessSize;
                    successfulAllocations++;
                    
                    allocationResults.push({
                        process: countP + 1,
                        size: currentProcessSize,
                        block: countM + 1,
                        status: "Allocated"
                    });
                    allocated = true;
                    break; // Exit inner loop (Connector 'b')
                }
            }
        }

        if (!allocated) {
            allocationResults.push({
                process: countP + 1,
                size: currentProcessSize,
                block: "None",
                status: "Unallocated"
            });
        }
    }

    return {
        results: allocationResults,
        stats: { successfulAllocations, allocatedSize, intFragmentation, freeSize }
    };
}

function firstFitDynamic(memBlockNum, processNum) {
    let allocatedSize = 0;
    let successfulAllocations = 0;
    let totalMemory = memBlockNum.reduce((sum, current) => sum + current, 0);
    let freeSize = totalMemory;
    
    // Track memory blocks as objects to follow "MemoryBlock[CountM] > 0"
    let memory = memBlockNum.map(size => ({ size, status: "Free" }));
    let allocationResults = [];

    for (let countP = 0; countP < processNum.length; countP++) {
        let currentProcessSize = processNum[countP];
        let allocated = false;

        for (let countM = 0; countM < memory.length; countM++) {
            // Flowchart check: MemoryBlock[CountM] > 0 and size check
            if (memory[countM].status === "Free" && currentProcessSize <= memory[countM].size) {
                
                let originalSize = memory[countM].size;
                
                // Logic from the large rectangle in Dynamic Flowchart
                memory[countM].size = currentProcessSize;
                memory[countM].status = "Occupied";

                allocatedSize += currentProcessSize;
                freeSize -= currentProcessSize;
                successfulAllocations++;

                // Dynamic Splitting (creating the "leftover" block)
                let leftover = originalSize - currentProcessSize;
                if (leftover > 0) {
                    memory.splice(countM + 1, 0, { size: leftover, status: "Free" });
                }

                allocationResults.push({
                    process: countP + 1,
                    size: currentProcessSize,
                    block: countM + 1,
                    status: "Allocated"
                });
                allocated = true;
                break;
            }
        }

        // Check for Compaction (Decision: FreeSize >= Process[CountP])
        if (!allocated) {
            if (freeSize >= currentProcessSize) {
                // Flowchart: Memory Compaction process
                let totalFreeSpace = memory
                    .filter(m => m.status === "Free")
                    .reduce((sum, m) => sum + m.size, 0);
                
                memory = memory.filter(m => m.status === "Occupied");
                memory.push({ size: totalFreeSpace, status: "Free" });

                countP--; // Retry allocation for the same process (Back to 'a')
                continue;
            } else {
                allocationResults.push({
                    process: countP + 1,
                    size: currentProcessSize,
                    block: "None",
                    status: "Unallocated"
                });
            }
        }
    }

    return { 
        results: allocationResults, 
        stats: { successfulAllocations, allocatedSize, intFragmentation: 0, freeSize } 
    };
}
console.log("First Fit Fixed:", firstFitFixed([100, 500, 200, 300, 600], [212, 417, 112, 426]));
console.log("First Fit Dynamic:", firstFitDynamic([100, 500, 200, 300, 600], [212, 417, 112, 426]));
