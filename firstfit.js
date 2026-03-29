/**
 * FIRST FIT: FIXED PARTITION
 */
function firstFitFixed(memoryBlocks, processSizes) {
    let allocatedSize = 0;
    let successfulAllocations = 0;
    // Fixed the naming here: 'sum' and 'current' for clarity
    let totalMemory = memoryBlocks.reduce((sum, current) => sum + current, 0);
    let freeSize = totalMemory;
    let intFragmentation = 0;
    
    let status = new Array(memoryBlocks.length).fill("Free");
    let allocationResults = [];

    for (let countP = 0; countP < processSizes.length; countP++) {
        let currentProcessSize = processSizes[countP];
        let allocated = false;

        for (let countM = 0; countM < memoryBlocks.length; countM++) {
            if (status[countM] === "Free" && currentProcessSize <= memoryBlocks[countM]) {
                intFragmentation += (memoryBlocks[countM] - currentProcessSize);
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
                break; 
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

/**
 * FIRST FIT: DYNAMIC PARTITION WITH COMPACTION
 */
function firstFitDynamicWithCompaction(memoryBlocks, processSizes) {
    let allocatedSize = 0;
    let successfulAllocations = 0;
    let totalMemory = memoryBlocks.reduce((a, b) => a + b, 0);
    let freeSize = totalMemory;
    
    // Map initial blocks to objects to track status
    let memory = memoryBlocks.map(size => ({ size, status: "Free" }));
    let allocationResults = [];

    for (let countP = 0; countP < processSizes.length; countP++) {
        let currentProcessSize = processSizes[countP];
        let allocated = false;

        for (let countM = 0; countM < memory.length; countM++) {
            if (memory[countM].status === "Free" && currentProcessSize <= memory[countM].size) {
                let originalSize = memory[countM].size;
                memory[countM].size = currentProcessSize;
                memory[countM].status = "Occupied";
                
                allocatedSize += currentProcessSize;
                freeSize -= currentProcessSize;
                successfulAllocations++;

                let leftover = originalSize - currentProcessSize;
                if (leftover > 0) {
                    memory.splice(countM + 1, 0, { size: leftover, status: "Free" });
                }

                allocationResults.push({ process: countP + 1, size: currentProcessSize, status: "Allocated" });
                allocated = true;
                break;
            }
        }

        if (!allocated) {
            if (freeSize >= currentProcessSize) {
                console.log(`\n[!] Compacting memory for Process ${countP + 1} (${currentProcessSize})...`);
                
                let totalFreeSpace = memory
                    .filter(m => m.status === "Free")
                    .reduce((sum, m) => sum + m.size, 0);
                
                memory = memory.filter(m => m.status === "Occupied");
                memory.push({ size: totalFreeSpace, status: "Free" });

                countP--; 
                continue;
            } else {
                allocationResults.push({ process: countP + 1, size: currentProcessSize, status: "Unallocated" });
            }
        }
    }

    return { results: allocationResults, stats: { successfulAllocations, allocatedSize, freeSize } };
}

// --- MAIN EXECUTION ---
const blocks = [100, 500, 200, 300, 600];
const processes = [212, 417, 112, 426];

// Use spread operator [...] to pass copies so the functions don't interfere with each other
const fixedOutput = firstFitFixed([...blocks], [...processes]);
const dynamicOutput = firstFitDynamicWithCompaction([...blocks], [...processes]);

console.log("\n========================================");
console.log("       FIXED PARTITION RESULTS");
console.log("========================================");
console.log(`Success: ${fixedOutput.stats.successfulAllocations} | Frag: ${fixedOutput.stats.छात्राओं}`);
console.table(fixedOutput.results);

console.log("\n========================================");
console.log("      DYNAMIC + COMPACTION RESULTS");
console.log("========================================");
console.log(`Success: ${dynamicOutput.stats.successfulAllocations} | Free: ${dynamicOutput.stats.freeSize}`);
console.table(dynamicOutput.results);