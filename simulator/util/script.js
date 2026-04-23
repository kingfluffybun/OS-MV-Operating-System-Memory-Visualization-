(function loadUtilityScripts() {
  const currentScript = document.currentScript;
  if (!currentScript) {
    return;
  }

  const scriptSrc = currentScript.src;
  const scriptDir = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);
  const utilityScripts = [
    'sidebarFunctions.js',
    'blockFunctions.js',
    'processFunctions.js',
    'uiFunctions.js',
  ];

  utilityScripts.forEach((fileName) => {
    const scriptUrl = scriptDir + fileName;
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.defer = true;
    script.async = false;
    document.head.appendChild(script);
  });
})();

// Show correct menu
function showMenu() {
  const currentPath = window.location.pathname;
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

  const isAdminUser = currentUser && currentUser.user_role === 'admin';

  const Menus = [
    'menu-dashboard',
    'menu-simulation',
    'menu-usermanagement',
    'menu-back-simulator',
    'menu-admin-dashboard'
  ];

  // Hide all menus for now
  Menus.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
      el.classList.remove('active');
    }
  });

  // Check which page is user on
  const isAdminPage = currentPath.includes('/admin-dashboard/');
  const isSimulator = currentPath.includes('/simulator/algorithm/');
  const isComparisonPage = currentPath.includes('/simulator/comparison.html');
  const isFrontPage = currentPath.includes('/simulator/index.html') || currentPath.endsWith('/simulator/');

  // Admin Menu
  if (isAdminUser) {
    const adminMenu = document.getElementById('menu-admin-dashboard');
    if (!isAdminPage) adminMenu.style.display = '';

    if (isAdminPage) {
      document.getElementById('menu-usermanagement').style.display = '';
      document.getElementById('menu-usermanagement').classList.add('active');
      document.getElementById('menu-back-simulator').style.display = '';
    }
  }

  // If on simulator page
  if (!isAdminPage) {
    document.getElementById('menu-dashboard').style.display = '';
    document.getElementById('menu-simulation').style.display = '';

    if (isFrontPage) {
      document.getElementById('menu-dashboard').classList.add('active');
    }

    if (isSimulator) {
      document.getElementById('single-mode').classList.add('active');
    }

    if (isComparisonPage) {
      document.getElementById('comparison-mode').classList.add('active');
    }
  }
}

// Display username
function loadCurrentUser() {
  const stored = JSON.parse(sessionStorage.getItem("currentUser"));
  const username = document.getElementById("username");

  if (stored && stored.username) {
    username.textContent = stored.username;
    document.getElementById("in-out-icon").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out-icon lucide-log-out"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`;
    document.getElementById("in-out").innerHTML = "Logout";
  } else {
    username.textContent = "Guest";
    document.getElementById("in-out-icon").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-in-icon lucide-log-in"><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>`
    document.getElementById("in-out").innerHTML = "Login";
  }
}

const processContainer = document.querySelector(".process-container");
const allProcessContainers = Array.from(document.querySelectorAll(".process-container"));
const getProcessContainer = (element) => (element ? element.closest(".process-container") : null);

const simulationContainer =
  document.querySelector(".simulation .simulation-scroll-track") ||
  document.querySelector(".simulation .container") ||
  document.querySelector(".simulation-paging .container");
const totalMemoryValue = document.getElementById("total-memory-value");

let preSimBlockState = null;

const isDynamicPartitionMode = () =>
  document.body.dataset.partitionMode === "dynamic";

function isPagingMode() {
  const pagingView = document.getElementById("paging-view");
  const isPaging = pagingView && pagingView.style.display === "grid";

  const selectedAlgo = sessionStorage.getItem("selectedAlgo");
  const urlParams = new URLSearchParams(window.location.search);
  const urlAlgo = urlParams.get("algorithm");

  return isPaging || (selectedAlgo && selectedAlgo.toLowerCase() === "paging") || (urlAlgo && urlAlgo.toLowerCase() === "paging");
}

function isSegmentationMode() {
  const segmentationView = document.getElementById("segmentation-view");
  const isSegmentation = segmentationView && segmentationView.style.display === "grid";

  const selectedAlgo = sessionStorage.getItem("selectedAlgo");
  const urlParams = new URLSearchParams(window.location.search);
  const urlAlgo = urlParams.get("algorithm");

  return isSegmentation || (selectedAlgo && selectedAlgo.toLowerCase() === "segmentation") || (urlAlgo && urlAlgo.toLowerCase() === "segmentation");
}

function attachProcessListeners() {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const segmentationView = document.getElementById("segmentation-view");
  // Also handle standalone simulation-Segmentation.html which has no view wrappers
  const mainGrid = document.querySelector(".main-grid.segmentation");

  let activeView = null;
  if (pagingView && pagingView.style.display === "grid") {
    activeView = pagingView;
  } else if (segmentationView && segmentationView.style.display === "grid") {
    activeView = segmentationView;
  } else if (standardView && standardView.style.display === "grid") {
    activeView = standardView;
  } else if (mainGrid) {
    // Standalone segmentation page (simulation-Segmentation.html)
    activeView = mainGrid;
  } else if (standardView) {
    activeView = standardView;
  }

  if (!activeView) return;

  const isSegmentation = isSegmentationMode();

  const addProcessBtn = activeView.querySelector("#add-process-btn");
  const randomizeBtn = activeView.querySelector("#randomize-value");
  const processSizeInput = activeView.querySelector("#process-size");

  if (addProcessBtn) {
    const newAddBtn = addProcessBtn.cloneNode(true);
    addProcessBtn.parentNode.replaceChild(newAddBtn, addProcessBtn);

    newAddBtn.addEventListener("click", () => {
      const sizeInput = activeView.querySelector("#process-size");
      const size = parseInt(sizeInput ? sizeInput.value : 0, 10);
      if (!size || size <= 0) return;

      if (isPagingMode()) {
        const pagingprocessContainer = activeView.querySelector(".process-container");
        if (!pagingprocessContainer) return;
        const nextId = pagingprocessContainer.querySelectorAll(".process").length + 1;
        const newProcess = createProcessElement(nextId, size);
        pagingprocessContainer.appendChild(newProcess);
        if (sizeInput) sizeInput.value = '';
        pagingprocessContainer.scrollTo({
          top: pagingprocessContainer.scrollHeight,
          behavior: "smooth",
        });
      } else if (isSegmentation) {
        const segContainer = activeView.querySelector(".process-container");
        if (!segContainer) return;
        const nextId = segContainer.querySelectorAll(".process").length + 1;
        const newProcess = createProcessElement(nextId, size);
        segContainer.appendChild(newProcess);
        if (sizeInput) sizeInput.value = '';
        segContainer.scrollTo({ top: segContainer.scrollHeight, behavior: "smooth" });
      } else {
        if (!processContainer) return;
        const nextId = processContainer.querySelectorAll(".process").length + 1;
        const newProcess = createProcessElement(nextId, size);
        processContainer.appendChild(newProcess);
        if (processSizeInput) processSizeInput.value = '';
        scrollDown();
      }
    });
  }

  if (randomizeBtn) {
    const newRandomizeBtn = randomizeBtn.cloneNode(true);
    randomizeBtn.parentNode.replaceChild(newRandomizeBtn, randomizeBtn);

    newRandomizeBtn.addEventListener("click", function () {
      let min, max;

      if (isPagingMode()) {
        min = 3;
        max = 6;
      } else {
        min = 4;
        max = 8;
      }

      const size = Math.pow(2, Math.floor(Math.random() * (max - min + 1)) + min);

      if (isPagingMode()) {
        const pagingProcessContainer = activeView.querySelector(".process-container");
        if (!pagingProcessContainer) return;
        const nextId = pagingProcessContainer.querySelectorAll(".process").length + 1;
        const newProcess = createProcessElement(nextId, size);
        pagingProcessContainer.appendChild(newProcess);
        pagingProcessContainer.scrollTo({
          top: pagingProcessContainer.scrollHeight,
          behavior: "smooth",
        });
      } else if (isSegmentation) {
        const segContainer = activeView.querySelector(".process-container");
        if (!segContainer) return;
        const nextId = segContainer.querySelectorAll(".process").length + 1;
        const newProcess = createProcessElement(nextId, size);
        segContainer.appendChild(newProcess);
        segContainer.scrollTo({ top: segContainer.scrollHeight, behavior: "smooth" });
      } else {
        if (!processContainer) return;
        const nextId = processContainer.querySelectorAll(".process").length + 1;
        const newProcess = createProcessElement(nextId, size);
        processContainer.appendChild(newProcess);
        scrollDown();
      }
    });
  }
}

const scrollToRight = () => {
  if (simulationContainer) {
    simulationContainer.scrollTo({
      left: simulationContainer.scrollWidth,
      behavior: "smooth",
    });
  }
};

const add_block_btn = document.getElementById("add-block-btn");
if (add_block_btn) {
  add_block_btn.addEventListener("click", () => {
    if (!simulationContainer) {
      return;
    }
    const min = 4;
    const max = 8;
    const nextBlockId =
      simulationContainer.querySelectorAll(".block").length + 1;
    const newBlock = createBlockElement(
      nextBlockId,
      Math.pow(2, Math.floor(Math.random() * (max - min + 1)) + min),
    );
    simulationContainer.insertBefore(newBlock, add_block_btn);
    updateTotalMemory();
    resizeBlocks();
    scrollToRight();
  });
}

if (allProcessContainers.length) {
  allProcessContainers.forEach((container) => {
    container.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const currentContainer = getProcessContainer(target) || container;

      if (target.classList.contains("delete-process-btn")) {
        removeElement(target, ".process");
        renumberProcesses(currentContainer);
        return;
      }

      if (target.classList.contains("edit-process-btn")) {
        const process = target.closest(".process");
        if (process) editProcess(process);
      }
    });
  });
}

if (simulationContainer) {
  simulationContainer.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (target.classList.contains("delete-block-btn")) {
      removeElement(target, ".block");
      renumberBlocks();
      updateTotalMemory();
      return;
    }

    if (target.classList.contains("edit-block-btn")) {
      const block = target.closest(".block");
      if (block) {
        editBlock(block);
      }
      return;
    }
  });

  simulationContainer.addEventListener("mouseover", (event) => {
    const block = event.target.closest(".block");
    if (block && simulationContainer.contains(block)) {
      block.classList.add("hovered");
    }
  });

  simulationContainer.addEventListener("mouseout", (event) => {
    const block = event.target.closest(".block");
    const related = event.relatedTarget;
    if (block && (!related || !block.contains(related))) {
      block.classList.remove("hovered");
    }
  });
}

let playInterval = null;
let simulationState = null;

// UI helper functions are loaded from uiFunctions.js

const resetBlocksUI = () => {
  // 1. Remove all blocks created by splitting logic (waste fragments and dynamic holes)
  simulationContainer
    .querySelectorAll(".block--split-free, .block--fixed-waste")
    .forEach((extraBlock) => {
      extraBlock.remove();
    });

  // 2. Reset the original partitions back to their pre-simulation state
  simulationContainer.querySelectorAll(".block").forEach((block) => {
    block.style.background = "";
    block.style.borderColor = "";
    block.style.borderBottom = "";
    block.style.borderRadius = "12px";
    block.classList.remove("allocated");

    const bId = block.id.replace("block-", "");
    const labelNum = block.dataset.partitionLabel || bId;
    const text = block.querySelector("p");
    const status = block.querySelector(".block-status");
    const isSplitFree = block.classList.contains("block--split-free");

    if (text) {
      if (isSplitFree) {
        text.textContent = "Hole";
      } else {
        text.textContent = labelNum ? `Block ${labelNum}` : "";
      }
    }
    if (status) status.textContent = "Free";

    // Restore the original size that was stamped at prepareSimulation time
    const originalSize = block.dataset.originalSize;
    const sizeDisplay = block.querySelector(".block-size-value");
    if (originalSize && sizeDisplay) {
      sizeDisplay.textContent = originalSize;
    }
  });

  resizeBlocks();
};

const restorePreSimulationBlocks = () => {
  if (!simulationContainer) return;
  const addBtn = document.getElementById("add-block-btn");
  simulationContainer.querySelectorAll(".block").forEach((b) => b.remove());
  if (preSimBlockState && preSimBlockState.length) {
    preSimBlockState.forEach((sz, i) => {
      const el = createBlockElement(i + 1, sz);
      simulationContainer.insertBefore(el, addBtn || null);
    });
  }
  updateTotalMemory();
  resizeBlocks();
};

const prepareSimulation = () => {
  const processes = getProcessSizes();
  const isPaging = isPagingMode();
  const isSegmentation = isSegmentationMode();
  const blocks = getBlockSizes();

  if (!processes.length) {
    appendConsoleMessage("No processes in queue to allocate.");
    return false;
  }

  // Segmentation uses a continuous-memory model — no discrete blocks required
  if (!isPaging && !isSegmentation && !blocks.length) {
    appendConsoleMessage("No memory blocks defined.");
    return false;
  }

  if (isPaging) {
    const { pageSize, memorySize } = getPagingInputs();
    const frameCount = getPagingFrameCount();

    if (Number.isNaN(pageSize) || pageSize <= 0) {
      appendConsoleMessage("Enter a valid page/frame size.");
      return false;
    }

    if (Number.isNaN(memorySize) || memorySize <= 0) {
      appendConsoleMessage("Enter a valid total memory size.");
      return false;
    }

    if (!frameCount) {
      appendConsoleMessage(
        "Total memory must be at least one page/frame in size.",
      );
      return false;
    }

    simulationState = {
      processes: processes,
      memoryFrames: memorySimulator.createFrames(frameCount, pageSize),
      currentIndex: 0,
      pageAllocationIndex: 0,
      results: {},
      stats: {
        allocatedSize: 0,
        successfulAllocations: 0,
        intFragmentation: 0,
      },
    };
    initializePagingUI(simulationState.memoryFrames, processes);

  } else if (isSegmentation) {
    const { memorySize } = getSegmentationInputs();
    if (Number.isNaN(memorySize) || memorySize <= 0) {
      appendConsoleMessage("Enter a valid total memory size.");
      return false;
    }
    segmentationState.memory = memorySimulator.createMemory(memorySize);
    segmentationState.processQueue = processes;
    segmentationState.currentProcessIndex = 0;
    segmentationState.results = {};
    segmentationState.allocatedSegments = [];
    segmentationState.isRunning = true;

    // simulationState is still used for currentIndex / process tracking
    simulationState = {
      processes: processes,
      currentIndex: 0,
      results: {},
      stats: { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 },
    };

    initializeSegmentationUI(segmentationState.memory, processes);

  } else {
    if (isDynamicPartitionMode()) {
      preSimBlockState = getBlockSizes().slice();
    }

    simulationState = {
      processes: processes,
      memoryHead: memorySimulator.createLinkedMemory(blocks),
      currentIndex: 0,
      results: {},
      stats: { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 },
    };
  }

  if (!sidebar.classList.contains("close")) {
    toggleSideBar();
  }

  // Stamp the original size on every block element NOW, before any step shrinks them.
  // resetBlocksUI reads this to restore the display on reset.
  if (!isPaging && !isSegmentation && simulationContainer) {
    simulationContainer.querySelectorAll(".block").forEach((block) => {
      const sizeEl =
        block.querySelector(".block-size-value") || block.querySelector("h2");
      if (sizeEl) {
        block.dataset.originalSize = parseInt(sizeEl.textContent, 10) || 0;
      }
    });
  }

  resetConsole();
  appendConsoleMessage("Simulation ready. Use Next or Play.");

  if (isPaging) {
    const totalMemory =
      simulationState.memoryFrames.count *
      simulationState.memoryFrames.frameSize;
    updateStatistics({
      allocatedSize: 0,
      totalFree: memorySimulator.totalFreeMemory(simulationState.memoryFrames),
      intFragmentation: 0,
      externalFragmentation: 0,
      memoryUtilization: 0,
      successRate: 0,
    });
    setTotalMemoryDisplay(totalMemory);
    initializePagingUI(simulationState.memoryFrames, processes);
  } else if (isSegmentation) {
    updateSegmentationStatistics();
  } else {
    setTotalMemoryDisplay(
      memorySimulator.totalMemory(simulationState.memoryHead),
    );
    updateStatistics(
      memorySimulator.computeStats(
        simulationState.memoryHead,
        simulationState.processes,
        simulationState.results,
        simulationState.stats,
      ),
    );
    resetBlocksUI();
  }

  currentStep = 0;
  highlightCurrentProcess();

  // Only disable controls for standard fixed/dynamic partition modes
  if (!isPaging && !isSegmentation) {
    const addBtn = document.getElementById('add-block-btn');
    if (addBtn) addBtn.style.display = 'none';

    const randomizeBtn = document.getElementById('randomize-value');
    if (randomizeBtn) randomizeBtn.disabled = true;
    const addProcessBtn = document.getElementById('add-process-btn');
    if (addProcessBtn) addProcessBtn.disabled = true;

    document.querySelectorAll('.process-action').forEach((action) => (action.style.display = 'none'));
    disableMemoryBlockControls();
  }
  return true;
};

const insertFixedWasteSplitAfter = (
  allocatedEl,
  processSizeKb,
  wasteSizeKb,
  blockId,
  bgColor,
  borderColor,
) => {
  // 1. Update the original block display immediately
  const sizeDisplay = allocatedEl.querySelector(".block-size-value");
  if (sizeDisplay) sizeDisplay.textContent = processSizeKb;

  // 2. Create the "Internal Frag" block
  const wasteEl = document.createElement("div");
  wasteEl.className = "block block--fixed-waste";
  wasteEl.id = `block-${blockId}-waste`;
  wasteEl.style.marginLeft = `-10px`;
  wasteEl.style.borderRadius = `0px 12px 12px 0px`;
  // wasteEl.style.color = `$`
  // Store colors so updateBlockVisuals can re-apply them on refresh
  if (bgColor) wasteEl.dataset.hatchBg = bgColor;
  if (borderColor) wasteEl.dataset.hatchBorder = borderColor;

  // Inherit the parent block's label (e.g. "Block 2 - Internal Frag")
  const parentLabel = allocatedEl.querySelector("p")
    ? allocatedEl.querySelector("p").textContent.trim()
    : `Block ${blockId}`;

  wasteEl.innerHTML = `
        <p></p>
        <div class="block-content">
            <div class="block-status">Unusable</div>
            <div class="block-size">
                <h2><span class="block-size-value">${wasteSizeKb}</span></h2>
                <h2>&nbsp;KB</h2>
            </div>
        </div>
    `;

  // 3. Apply hatch pattern using the process color
  if (bgColor && borderColor) {
    const hatchPattern = `repeating-linear-gradient(
            45deg,
            ${bgColor}75,
            ${bgColor}75 5px,
            #2c2c2c 5px,
            #2c2c2c 10px
        )`;
    wasteEl.style.background = hatchPattern;
    wasteEl.style.borderBottom = `8px solid ${borderColor}`;
  }

  // 4. Place it after the allocated block
  allocatedEl.after(wasteEl);

  if (typeof resizeBlocks === "function") resizeBlocks();
};

/**
 * STEP 1: Ensures all block labels match their actual position in the DOM.
 * This prevents "Block 7" from appearing when only 3 blocks exist.
 * Called AFTER recreating blocks from memory linked list.
 */
const ensureBlockLabelsMatchDOM = () => {
  if (!simulationContainer) return;

  const blocks = Array.from(simulationContainer.querySelectorAll(".block")).filter(
    (b) => !b.classList.contains("block--split-free") && !b.classList.contains("block--fixed-waste")
  );

  blocks.forEach((block, index) => {
    const newBlockId = index + 1;
    // Update the block's id attribute
    block.id = `block-${newBlockId}`;
    // Update the block's data attribute
    block.dataset.partitionLabel = String(newBlockId);
    // Update the visible label
    const labelEl = block.querySelector("p");
    if (labelEl) {
      labelEl.textContent = `Block ${newBlockId}`;
    }
  });
};

/**
 * STEP 2: Synchronizes result data to match the renumbered blocks.
 * This ensures "Process 4" points to the correct Block ID in the data state.
 * Must be called AFTER renumbering linked list nodes and recreating DOM blocks.
 */

/**
 * Helper: Apply block grouping and hide labels for non-first blocks in a group.
 * Hides labels on any block that follows another block with the same partition label.
 * Call this whenever blocks are recreated or when the DOM updates.
 */
const applyBlockGrouping = () => {
  if (!simulationContainer) return;

  const blocks = Array.from(simulationContainer.querySelectorAll(".block")).filter(
    (b) => !b.classList.contains("block--split-free") && !b.classList.contains("block--fixed-waste") && !b.id.startsWith("block-split-")
  );

  // Classify block positions in groups
  blocks.forEach((block, index) => {
    block.classList.remove("block-group-first", "block-group-middle", "block-group-last", "block-group-single");

    const currentLabel = block.dataset.partitionLabel;
    const prevLabel = index > 0 ? blocks[index - 1].dataset.partitionLabel : null;
    const nextLabel = index < blocks.length - 1 ? blocks[index + 1].dataset.partitionLabel : null;

    // Categorize block position in group
    if (currentLabel === prevLabel) {
      // Block follows another with same label - not first
      if (currentLabel === nextLabel) {
        block.classList.add("block-group-middle");
      } else {
        block.classList.add("block-group-last");
      }
    } else if (currentLabel === nextLabel) {
      // Block is first in a group
      block.classList.add("block-group-first");
    } else {
      // Block is standalone
      block.classList.add("block-group-single");
    }
  });

  // Hide labels for non-first blocks in groups
  blocks.forEach((block) => {
    const titleEl = block.querySelector("p");
    if (titleEl) {
      // Only show label if this is the first or only block in its group
      if (block.classList.contains("block-group-middle") || block.classList.contains("block-group-last")) {
        titleEl.textContent = ""; // Hide label for split blocks
      }
    }
  });
};

const updateResultBlockIds = (blockIdMapping) => {
  if (!simulationState) return;

  // Count actual blocks in the simulation
  let actualBlockCount = 0;
  let node = simulationState.memoryHead;
  while (node) {
    actualBlockCount++;
    node = node.next;
  }

  // Update all results to use the new sequential block IDs
  Object.entries(simulationState.results).forEach(([processKey, result]) => {
    if (result.status === "Allocated" && result.block !== "None") {
      const oldBlockId = parseInt(result.block, 10);
      let newBlockId = oldBlockId;

      // Use the mapping if available
      if (!Number.isNaN(oldBlockId) && blockIdMapping && blockIdMapping[oldBlockId]) {
        newBlockId = blockIdMapping[oldBlockId];
      }

      // CRITICAL SAFETY CHECK: Ensure block ID doesn't exceed actual block count
      if (newBlockId > actualBlockCount) {
        console.warn(`Block ID ${newBlockId} exceeds actual block count ${actualBlockCount}, clamping to ${actualBlockCount}`);
        newBlockId = actualBlockCount;
      }

      result.block = String(newBlockId);
    }
  });
};

/**
 * STEP 3: Recreates memory blocks from linked list AND ensures labels sync with DOM position.
 * This is the master function that maintains consistency across all three layers:
 * 1. Linked list data (simulationState.memoryHead)
 * 2. DOM elements (.block)
 * 3. Result state (simulationState.results)
 */
const recreateBlocksFromMemory = () => {
  const container = simulationContainer;
  container.querySelectorAll(".block").forEach((b) => b.remove());

  // Note: After compaction, linked list nodes already have sequential IDs (1, 2, 3...)
  // Do NOT renumber them here - that would break the result.block mapping

  // FLATTEN: Extract all nodes from linked list
  let node = simulationState.memoryHead;
  let blockIndex = 0;

  let prevLogicalId = null;

  while (node) {
    const logicalId = String(node.originalLabel || node.parentId || node.id);
    const nextLogicalId = node.next ? String(node.next.originalLabel || node.next.parentId || node.next.id) : null;

    const isFirstInGroup = (logicalId !== prevLogicalId);
    const isLastInGroup = (logicalId !== nextLogicalId);

    // Create block with the node's current ID (already sequential after compaction)
    const blockEl = createBlockElement(node.id, node.size, { isSplitFree: node.isSplit });

    if (node.status === "Occupied") {
      const statusLabel = blockEl.querySelector(".block-status");
      if (statusLabel) statusLabel.textContent = "Allocated";
      blockEl.classList.add("allocated");
    } else if (node.isSplit) {
      const statusLabel = blockEl.querySelector(".block-status");
      if (statusLabel) statusLabel.textContent = "Hole";
    }

    if (isFirstInGroup && !isLastInGroup) {
      blockEl.style.borderRadius = "12px 0px 0px 12px";
    } else if (!isFirstInGroup && !isLastInGroup) {
      blockEl.style.borderRadius = "0px 0px 0px 0px";
      blockEl.style.marginLeft = "-10px";
    } else if (!isFirstInGroup && isLastInGroup) {
      blockEl.style.borderRadius = "0px 12px 12px 0px";
      blockEl.style.marginLeft = "-10px";
    }

    blockEl.dataset.originalSize = String(node.size);
    blockEl.dataset.linkedListId = String(node.id);
    blockEl.dataset.linkedListNodeId = String(node.id); // Store node ID for matching
    blockEl.dataset.logicalId = logicalId;
    container.appendChild(blockEl);
    blockIndex++;
    prevLogicalId = logicalId;
    node = node.next;
  }

  // CONSOLIDATE & RE-INDEX: Force DOM positions to be the source of truth
  ensureBlockLabelsMatchDOM();

  // SYNC LOGS: Update results to use final block IDs
  // Note: blockIdMapping was already applied in runStep() before this is called
  // REMOVED: updateResultBlockIds(blockIdMapping);

  // CRITICAL: Apply displayBlock values from results to UI block labels
  // This ensures UI shows the logical parent block even if it's a split allocation
  const blocks = Array.from(container.querySelectorAll(".block")).filter(
    (b) => !b.classList.contains("block--split-free") && !b.classList.contains("block--fixed-waste")
  );

  blocks.forEach((block, index) => {
    const blockPosition = index + 1;
    const linkedListNodeId = parseInt(block.dataset.linkedListNodeId, 10);

    // Find which result owns this node by matching the internal node ID
    // Results should have their block field set to this node's ID
    const matchingResult = Object.values(simulationState.results).find(
      (r) => r.status === "Allocated" && parseInt(r.block, 10) === linkedListNodeId
    );

    if (matchingResult && matchingResult.displayBlock) {
      // Store displayBlock but don't set label yet - we'll do it after grouping
      block.dataset.partitionLabel = String(matchingResult.displayBlock);
      block.dataset.displayBlock = String(matchingResult.displayBlock);
    } else if (block.dataset.logicalId) {
      block.dataset.partitionLabel = String(block.dataset.logicalId);
      block.dataset.displayBlock = String(block.dataset.logicalId);
      const titleEl = block.querySelector("p");
      if (titleEl) {
        titleEl.textContent = `Block ${block.dataset.logicalId}`;
      }
    }
  });

  // Apply grouping to hide labels on non-first blocks
  applyBlockGrouping();

  resizeBlocks();
  disableMemoryBlockControls();
};

const remapCompactedResults = (idMapping) => {
  if (!idMapping) return;
  Object.entries(simulationState.results).forEach(([processKey, result]) => {
    const oldBlockId = parseInt(result.block, 10);
    if (!Number.isNaN(oldBlockId) && idMapping[oldBlockId]) {
      result.block = String(idMapping[oldBlockId]);
    }
  });
};

/**
 * Helper function: Get the ACTUAL block ID from the DOM for a specific allocation.
 * This ensures the log always shows the correct block number, not a stale data value.
 * @param {string} processId - e.g., "Process 1"
 * @param {object} result - The allocation result object
 * @returns {string} The block ID to display in logs
 */
const getAccurateBlockIdFromDOM = (processId, result) => {
  if (result.status !== "Allocated" || result.block === "None") {
    return result.block;
  }

  if (!simulationContainer) {
    // Fallback to result data if DOM unavailable
    return result.block;
  }

  // Get all actual blocks in the DOM (in order)
  const blocks = Array.from(simulationContainer.querySelectorAll(".block")).filter(
    (b) => !b.classList.contains("block--split-free") && !b.classList.contains("block--fixed-waste")
  );

  // After recreation, blocks are numbered 1, 2, 3, ... sequentially
  // Find which block index contains an allocated process (any process, not just this one yet)
  // Then sync back to the result

  // Get the actual block label from the DOM (which should be sequential 1, 2, 3...)
  if (blocks.length > 0) {
    // Check the first block's label to see if block IDs are already set correctly
    const firstBlockLabel = blocks[0].dataset.partitionLabel || blocks[0].id.replace("block-", "");

    // If blocks are properly numbered, just verify result.block is in valid range
    const maxBlockId = blocks.length;
    const resultBlockId = parseInt(result.block, 10);

    if (!Number.isNaN(resultBlockId) && resultBlockId >= 1 && resultBlockId <= maxBlockId) {
      // The block ID is valid, return it
      return String(resultBlockId);
    }
  }

  // Fallback: use result's block ID if validation passes
  return result.block;
};

const getVisibleBlockNumber = (blockId) => {
  if (!simulationState || !simulationState.memoryHead) return String(blockId);
  let node = simulationState.memoryHead;
  let index = 1;
  while (node) {
    if (node.id === blockId) {
      return String(index);
    }
    node = node.next;
    index += 1;
  }
  return String(blockId);
};

const runStep = () => {
  if (!simulationState) {
    if (!prepareSimulation()) return;
  }

  if (simulationState.currentIndex >= simulationState.processes.length) {
    appendConsoleMessage("All processes have already been run.");
    return false;
  }
  currentStep = simulationState.currentIndex;
  highlightCurrentProcess();

  const size = simulationState.processes[simulationState.currentIndex];
  const processId = `Process ${simulationState.currentIndex + 1}`;
  const isPaging = isPagingMode();
  const isSegmentation = isSegmentationMode();

  // --- Segmentation mode: delegate to segmentationState allocator ---
  if (isSegmentation) {
    if (segmentationState.currentProcessIndex >= segmentationState.processQueue.length) {
      appendConsoleMessage("All processes have already been allocated.");
      return false;
    }

    const didAllocate = allocateNextProcess();
    const result = segmentationState.results[processId];
    const statusMsg = result ? result.status : (didAllocate ? 'Allocated' : 'Unallocated');
    appendConsoleMessage(`${processId} (${size} KB) -> ${statusMsg}`);

    simulationState.currentIndex += 1;

    if (simulationState.currentIndex >= simulationState.processes.length) {
      appendConsoleMessage("Simulation complete.");
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        togglePlayStop();
      }
      reEnableSimulationButtons();
      return false;
    }
    return true;
  }


  if (isPaging) {
    const { pageSize } = getPagingInputs();
    if (Number.isNaN(pageSize) || pageSize <= 0) {
      appendConsoleMessage("Enter a valid page/frame size.");
      return false;
    }

    // Initialize page allocation tracking for this process
    if (!simulationState.pageAllocationIndex) {
      simulationState.pageAllocationIndex = 0;
    }

    // Calculate pages needed for this process
    const pagesNeeded = Math.ceil(size / pageSize);

    // Check if we've already allocated all pages for this process
    if (simulationState.pageAllocationIndex >= pagesNeeded) {
      // Move to next process
      simulationState.pageAllocationIndex = 0;
      simulationState.currentIndex += 1;
      if (simulationState.currentIndex >= simulationState.processes.length) {
        appendConsoleMessage("Simulation complete");
        if (playInterval) {
          clearInterval(playInterval);
          playInterval = null;
          togglePlayStop();
        }
        // reEnableSimulationButtons();
        return false;
      }
      // Continue with next process in next runStep call
      return true;
    }

    // Allocate one page at a time
    const stepResult = memorySimulator.pagingStepSingle(
      simulationState.memoryFrames,
      size,
      pageSize,
      processId,
      simulationState.pageAllocationIndex,
    );

    // Check if allocation failed (no free frames)
    if (stepResult.result.status === "Unallocated") {
      // Store failed result
      if (!simulationState.results[processId]) {
        simulationState.results[processId] = {
          size,
          pagesNeeded,
          frameIds: {},
          status: "Unallocated",
          pagesAllocated: simulationState.pageAllocationIndex,
          internalFragmentation: 0,
        };
      } else {
        simulationState.results[processId].status = "Unallocated";
      }

      appendConsoleMessage(
        `${processId} Page ${simulationState.pageAllocationIndex} - No free frames available`,
      );

      // Move to next process since current one can't be allocated
      simulationState.pageAllocationIndex = 0;
      simulationState.currentIndex += 1;

      if (simulationState.currentIndex >= simulationState.processes.length) {
        appendConsoleMessage("Simulation complete");
        if (playInterval) {
          clearInterval(playInterval);
          playInterval = null;
          togglePlayStop();
        }
        reEnableSimulationButtons();
        return false;
      }
      return true;
    }

    if (stepResult.frames) simulationState.memoryFrames = stepResult.frames;

    // Store result with process ID
    if (!simulationState.results[processId]) {
      simulationState.results[processId] = {
        size,
        pagesNeeded,
        frameIds: {},
        status: "Allocated",
        pagesAllocated: 0,
        internalFragmentation: stepResult.result.internalFragmentation || 0,
      };
    }

    // Merge frame allocations
    simulationState.results[processId].frameIds = {
      ...simulationState.results[processId].frameIds,
      ...stepResult.result.frameIds,
    };
    simulationState.results[processId].pagesAllocated = simulationState.pageAllocationIndex + 1;

    // Update stats on first allocation
    if (simulationState.pageAllocationIndex === 0) {
      simulationState.stats.allocatedSize += size;
      simulationState.stats.successfulAllocations += 1;
      simulationState.stats.intFragmentation += stepResult.result.internalFragmentation || 0;
    }

    const totalMemory =
      simulationState.memoryFrames.count *
      simulationState.memoryFrames.frameSize;
    const totalFree = memorySimulator.totalFreeMemory(
      simulationState.memoryFrames,
    );
    const memoryUtilization = totalMemory
      ? ((totalMemory - totalFree) / totalMemory) * 100
      : 0;
    const successRate =
      simulationState.processes.length > 0
        ? (simulationState.stats.successfulAllocations /
          simulationState.processes.length) *
        100
        : 0;

    const pagingStats = {
      allocatedSize: simulationState.stats.allocatedSize,
      totalFree,
      intFragmentation: simulationState.stats.intFragmentation,
      externalFragmentation: 0,
      memoryUtilization,
      successRate,
    };

    updateStatistics(pagingStats);
    setTotalMemoryDisplay(totalMemory);
    updatePagingUI(simulationState.memoryFrames);

    const allocatedFrameId = Object.keys(stepResult.result.frameIds)[0];
    if (allocatedFrameId) {
      followAllocatedFrame(allocatedFrameId);
    }

    appendConsoleMessage(
      `${processId} Page ${simulationState.pageAllocationIndex} allocated`,
    );

    // Increment page allocation index
    simulationState.pageAllocationIndex += 1;

    // Check if all pages allocated for this process
    if (simulationState.pageAllocationIndex >= pagesNeeded) {
      appendConsoleMessage(`${processId} fully allocated`);
      simulationState.pageAllocationIndex = 0;
      simulationState.currentIndex += 1;

      if (simulationState.currentIndex >= simulationState.processes.length) {
        appendConsoleMessage("Simulation complete");
        if (playInterval) {
          clearInterval(playInterval);
          playInterval = null;
          togglePlayStop();
        }
        return false;
      }
    }

    return true;
  }

  const isFixed = !isDynamicPartitionMode();

  const allocationFn = isFixed
    ? memorySimulator.allocateFixedStep
    : memorySimulator.allocateDynamicStep;

  const stepResult =
    typeof allocationFn === "function"
      ? allocationFn.call(memorySimulator, simulationState.memoryHead, size)
      : {
        result: { size, block: "None", status: "Unallocated" },
        allocatedSize: 0,
        successfulAllocations: 0,
      };

  // CRITICAL: Attach the process size to the result
  stepResult.result.size = size;

  if (stepResult.newMemoryHead)
    simulationState.memoryHead = stepResult.newMemoryHead;

  // CRITICAL: Apply idMapping to previous results ONLY
  if (stepResult.idMapping) {
    remapCompactedResults(stepResult.idMapping);
  }

  // IMPORTANT: Store result FIRST (will be corrected later if compaction occurred)
  simulationState.results[processId] = stepResult.result;
  simulationState.stats.allocatedSize += stepResult.allocatedSize;
  simulationState.stats.successfulAllocations +=
    stepResult.successfulAllocations;
  simulationState.stats.intFragmentation +=
    stepResult.result.fragmentation || 0;

  const compiledStats = memorySimulator.computeStats(
    simulationState.memoryHead,
    simulationState.processes,
    simulationState.results,
    simulationState.stats,
  );
  updateStatistics(compiledStats);
  setTotalMemoryDisplay(compiledStats.totalMemory);

  // CRITICAL FIX: If compaction happened, recreate blocks FIRST, then sync results
  if (stepResult.ifCompacted) {
    recreateBlocksFromMemory();
    // After recreation with renumbered linked list, results should all be accurate
  }

  if (!stepResult.ifCompacted && stepResult.result.status === "Allocated") {
    let blockEl = document.getElementById(`block-split-${stepResult.result.block}`);
    if (!blockEl) {
      blockEl = document.getElementById(`block-${stepResult.result.block}`);
    }
    const leftover = stepResult.result.fragmentation || 0;

    if (leftover > 0 && blockEl) {
      if (!isFixed && stepResult.newFreeId != null) {
        insertDynamicFreeSplitAfter(
          blockEl,
          size,
          leftover,
          stepResult.newFreeId,
          stepResult.result.block,
        );
      } else if (isFixed) {
        const colorIndex = simulationState.currentIndex % processColors.length;
        const { bg: procBg, border: procBorder } = processColors[colorIndex];
        blockEl.style.borderRadius = "12px 0px 0px 12px";
        insertFixedWasteSplitAfter(
          blockEl,
          size,
          leftover,
          stepResult.result.block,
          procBg,
          procBorder,
        );
      }
    }

    if (blockEl) {
      const isSplitBlock = blockEl.classList.contains("block--split-free");
      const displayBlockId = stepResult.result.displayBlock || simulationState.results[processId]?.displayBlock;
      if (displayBlockId) {
        const titleEl = blockEl.querySelector("p");
        if (titleEl) titleEl.textContent = isSplitBlock ? "" : `Block ${displayBlockId}`;
        blockEl.dataset.parentPartitionLabel = String(displayBlockId);
        blockEl.dataset.partitionLabel = String(displayBlockId);
      }
      blockEl.classList.remove("block--split-free");
      const label = blockEl.querySelector(".block-status");
      if (label) label.textContent = `${processId}`;

      const sizeValueEl = blockEl.querySelector(".block-size-value");
      if (sizeValueEl) sizeValueEl.textContent = size;
    }
  }

  // Refresh all visuals
  updateBlockVisuals(simulationState.results);

  // Apply block grouping to hide labels on non-first blocks (works before and after compaction)
  applyBlockGrouping();

  // CRITICAL: After updateBlockVisuals, if compaction occurred, sync results with DOM labels
  if (stepResult.ifCompacted) {
    const blocks = Array.from(simulationContainer.querySelectorAll(".block")).filter(
      (b) => !b.classList.contains("block--split-free") && !b.classList.contains("block--fixed-waste")
    );

    // For each DOM block, check what process it's allocated to (if any)
    // and update that process result to have the correct block ID
    blocks.forEach((block, index) => {
      const blockId = index + 1; // Sequential block ID (1, 2, 3...)
      const statusLabel = block.querySelector(".block-status");

      if (statusLabel && statusLabel.textContent.includes("Process")) {
        // This block has a process allocated to it
        const processKey = statusLabel.textContent.trim();
        if (simulationState.results[processKey]) {
          simulationState.results[processKey].block = String(blockId);
        }
      }
    });
  }

  // Console logging with FINAL result block ID (from simulationState, now using displayBlock if present)
  const finalResult = simulationState.results[processId];
  const displayBlockId = finalResult?.displayBlock || (finalResult && finalResult.block !== "None" ? finalResult.block : "None");
  appendConsoleMessage(
    `${processId} (${size} KB) -> ${finalResult?.status || stepResult.result.status}${displayBlockId !== "None" ? ` to Block ${displayBlockId}` : ""}`,
  );

  simulationState.currentIndex += 1;
  if (simulationState.currentIndex >= simulationState.processes.length) {
    appendConsoleMessage("Simulation complete");
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
      togglePlayStop();
    }
    return false;
  }
  return true;
};

const getStepDelay = () => {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');

  let activeView = null;
  if (standardView && standardView.style.display === 'grid') activeView = standardView;
  if (pagingView && pagingView.style.display === 'grid') activeView = pagingView;
  if (segmentationView && segmentationView.style.display === 'grid') activeView = segmentationView;

  const slider = activeView ? activeView.querySelector("#slider") : null;
  const value = parseFloat(slider ? slider.value : 1) || 1;
  const maxDelay = 1200;
  const minDelay = 250;
  const normalized = (value - 1) / 2; // 1..3 => 0..1
  return maxDelay - normalized * (maxDelay - minDelay);
};

const togglePlayStop = () => {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');

  let activeView = null;
  if (standardView && standardView.style.display === 'grid') activeView = standardView;
  if (pagingView && pagingView.style.display === 'grid') activeView = pagingView;
  if (segmentationView && segmentationView.style.display === 'grid') activeView = segmentationView;

  if (!activeView) return;

  const playBtn = activeView.querySelector("#play-btn");
  const stopBtn = activeView.querySelector("#stop-btn");

  if (playInterval) {
    if (stopBtn) stopBtn.style.display = `flex`;
    if (playBtn) playBtn.style.display = `none`;
  } else {
    if (playBtn) playBtn.style.display = `flex`;
    if (stopBtn) stopBtn.style.display = `none`;
  }
}

const runPlay = () => {
  try {
    const isFirstPlay = !simulationState;
    if (isFirstPlay) {
      if (!prepareSimulation()) return;
    }

    if (playInterval) {
      clearTimeout(playInterval);
      clearInterval(playInterval);
      playInterval = null;
    }

    const standardView = document.getElementById('standard-view');
    const pagingView = document.getElementById('paging-view');
    const activeView = (pagingView && pagingView.style.display === 'grid') ? pagingView : standardView;

    const playBtn = document.querySelector("#play-btn");
    const stopBtn = document.querySelector("#stop-btn");

    playBtn.style.display = `none`;
    stopBtn.style.display = `flex`;

    const startAllocation = () => {
      const delay = getStepDelay();
      const didRun = runStep();
      if (!didRun) {
        togglePlayStop();
        reEnableSimulationButtons();
        return;
      }

      playInterval = setInterval(() => {
        if (!runStep()) {
          clearTimeout(playInterval);
          clearInterval(playInterval);
          playInterval = null;
          togglePlayStop();
          reEnableSimulationButtons();
        }
      }, delay);
    };

    if (isFirstPlay && isPagingMode()) {
      const delay = getStepDelay();
      playInterval = setTimeout(() => {
        startAllocation();
      }, delay);
      togglePlayStop();
    } else {
      startAllocation();
    }
  } catch (error) {
    console.error("runPlay error:", error);
    appendConsoleMessage(`Simulation error: ${error.message}`);
  }
};

const runStop = () => {
  if (playInterval) {
    clearTimeout(playInterval);
    clearInterval(playInterval);
    playInterval = null;
  }
  togglePlayStop();
  appendConsoleMessage("Simulation stopped.");
};

const runReset = () => {
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }

  const isDynamic = isDynamicPartitionMode();
  const isSegmentation = isSegmentationMode();

  simulationState = null;
  currentStep = 0;

  if (isSegmentation) {
    resetSegmentation();
  } else {
    resetBlocksUI();
  }
  resetConsole();

  if (!isSegmentation && isDynamic && preSimBlockState && preSimBlockState.length) {
    restorePreSimulationBlocks();
  }

  if (isPagingMode()) {
    resetPagingUI();
  }

  updateStatistics({
    allocatedSize: 0,
    totalFree: 0,
    intFragmentation: 0,
    externalFragmentation: 0,
    memoryUtilization: 0,
    successRate: 0,
  });
  updateTotalMemory();
  togglePlayStop();
  appendConsoleMessage("Simulation reset.");

  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');

  let activeView = null;
  if (standardView && standardView.style.display === 'grid') activeView = standardView;
  if (pagingView && pagingView.style.display === 'grid') activeView = pagingView;
  if (segmentationView && segmentationView.style.display === 'grid') activeView = segmentationView;

  if (activeView) {
    activeView.querySelectorAll(".process").forEach((p) => p.classList.remove("current"));

    const addBtn = activeView.querySelector("#add-block-btn");
    if (addBtn) {
      addBtn.style.display = "flex";
    }

    const randomizeBtn = activeView.querySelector("#randomize-value");
    if (randomizeBtn) {
      randomizeBtn.disabled = false;
      randomizeBtn.style.display = "";
    }

    const addProcessBtn = document.querySelector("#add-process-btn");
    if (addProcessBtn) {
        addProcessBtn.disabled = false;
    }

    activeView.querySelectorAll(".process-action").forEach((action) => (action.style.display = ""));
  }

  document
    .querySelectorAll(".process-action")
    .forEach((action) => (action.style.display = ""));
  document
    .querySelectorAll(".edit-block-btn")
    .forEach((btn) => (btn.disabled = false));
  document
    .querySelectorAll(".delete-block-btn")
    .forEach((btn) => (btn.disabled = false));

  attachSimulationListeners();

};



function reEnableSimulationButtons() {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');

  let activeView = null;
  if (standardView && standardView.style.display === 'grid') activeView = standardView;
  if (pagingView && pagingView.style.display === 'grid') activeView = pagingView;
  if (segmentationView && segmentationView.style.display === 'grid') activeView = segmentationView;

  if (!activeView) return;

  // Re-enable randomize button
  const randomizeBtn = activeView.querySelector('#randomize-value');
  if (randomizeBtn) {
    randomizeBtn.disabled = false;
    randomizeBtn.style.opacity = "1";
    randomizeBtn.style.cursor = "pointer";
  }

  // Note: add block button is NOT re-enabled here - it only reappears when reset is clicked

  // Re-enable process action buttons
  activeView.querySelectorAll('.process-action').forEach(btn => {
    btn.style.display = "";
    btn.disabled = false;
  });

  // Re-enable edit/delete buttons
  activeView.querySelectorAll('.edit-block-btn, .delete-block-btn').forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });

  const addProcessBtn = document.getElementById('add-process-btn');
  if (addProcessBtn) addProcessBtn.disabled = false;

  // Re-attach listeners to ensure they work
  attachSimulationListeners();
}

function attachSimulationListeners(viewType) {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');

  let activeView = null;
  if (standardView && standardView.style.display === 'grid') activeView = standardView;
  if (pagingView && pagingView.style.display === 'grid') activeView = pagingView;
  if (segmentationView && segmentationView.style.display === 'grid') activeView = segmentationView;

  if (!activeView) {
    console.error('No active view found.');
    return;
  }

  console.log('Attaching listeners to:', activeView.id || 'unknown view');

  const playBtn = activeView.querySelector('#play-btn');
  const stopBtn = activeView.querySelector('#stop-btn');
  const nextBtn = activeView.querySelector('#next-btn');
  const resetBtn = activeView.querySelector('#reset-btn');
  const slider = activeView.querySelector('#slider');

  console.log('Buttons found:', { playBtn: !!playBtn, stopBtn: !!stopBtn, nextBtn: !!nextBtn, resetBtn: !!resetBtn });

  if (playBtn) {
    const newPlayBtn = playBtn.cloneNode(true);
    playBtn.parentNode.replaceChild(newPlayBtn, playBtn);
    newPlayBtn.addEventListener("click", runPlay);
  }

  if (stopBtn) {
    const newStopBtn = stopBtn.cloneNode(true);
    stopBtn.parentNode.replaceChild(newStopBtn, stopBtn);
    newStopBtn.addEventListener("click", runStop);
  }

  if (nextBtn) {
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener("click", runStep);
  }

  if (resetBtn) {
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    newResetBtn.addEventListener("click", runReset);
  }

  if (slider) {
    slider.addEventListener("input", function () {
      speed = parseFloat(this.value);
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = setInterval(() => {
          if (!runStep()) {
            clearInterval(playInterval);
            playInterval = null;
            togglePlayStop();
            reEnableSimulationButtons();
          }
        }, getStepDelay());
      }
    });
  }

  const toggleBtn = activeView.querySelector("#toggle-btn");
  if (toggleBtn) {

    console.log('Attaching toggle listener to:', toggleBtn);
    toggleBtn.removeAttribute('onclick');

    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

    newToggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleSideBar();
    });
  }

  attachProcessListeners();
}

if (simulationContainer) {
  updateTotalMemory();
}

function startSimulation(event) {
  event.preventDefault();

  const algo = document.querySelector('input[name="algo"]:checked');
  if (!algo) {
    alert("Please select an algorithm.");
    return;
  }

  let algoWhat = algo.value;
  sessionStorage.setItem('selectedAlgo', algo.value);

  const isDynamic = document.querySelector('.toggle-partition input').checked;
  sessionStorage.setItem('selectedPartition', isDynamic ? "dynamic" : "fixed");

  if (algoWhat === "Paging") {
    sessionStorage.setItem('selectedPartition', "paging");
  }

  if (algoWhat === "Segmentation") {
    sessionStorage.setItem('selectedPartition', "segmentation");
  }

  const toggle = document.querySelector('.toggle-partition input[type="checkbox"]');
  const whatAlgo = toggle.checked;
  const algoParam = `${algoWhat}-${whatAlgo ? "dynamic" : "fixed"}`;

  if (["first-fit", "next-fit", "best-fit", "worst-fit"].includes(algoWhat.toLowerCase())) {
    window.location.href = `algorithm/index.html?algorithm=${algoParam}`;
  } else {
    switch (algoWhat) {
      case "Paging": window.location.href = `algorithm/index.html?algorithm=paging`;
        break;
      case "Segmentation": window.location.href = `algorithm/index.html?algorithm=segmentation`;
        break;
    }
  }
}

function formatAlgorithmName(algo) {
  if (!algo) return 'OS-MV';
  return algo.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function simulatorLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  let urlAlgo = urlParams.get('algorithm');
  let urlPartition = null;

  if (urlAlgo && (urlAlgo.endsWith('-fixed') || urlAlgo.endsWith('-dynamic'))) {
    if (urlAlgo.endsWith('-fixed')) {
      urlPartition = 'fixed';
      urlAlgo = urlAlgo.replace('-fixed', '');
    } else if (urlAlgo.endsWith('-dynamic')) {
      urlPartition = 'dynamic';
      urlAlgo = urlAlgo.replace('-dynamic', '');
    }
    sessionStorage.setItem('selectedAlgo', urlAlgo);
    sessionStorage.setItem('selectedPartition', urlPartition);
  }

  const selectedAlgo = urlAlgo || sessionStorage.getItem('selectedAlgo');
  const selectedPartition = urlPartition || sessionStorage.getItem('selectedPartition');

  // Set the page title based on the algorithm
  if (selectedAlgo) {
    let titleSuffix = "";
    if (selectedPartition && selectedAlgo.toLowerCase() !== 'paging' && selectedAlgo.toLowerCase() !== 'segmentation') {
      titleSuffix = " " + formatAlgorithmName(selectedPartition);
    }
    document.title = 'OS-MV ' + formatAlgorithmName(selectedAlgo) + titleSuffix;
  }

  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');

  if (standardView) standardView.style.display = 'none';
  if (pagingView) pagingView.style.display = 'none';
  if (segmentationView) segmentationView.style.display = 'none';

  if (selectedAlgo && selectedAlgo.toLowerCase() === "paging") {
    if (pagingView) {
      pagingView.style.display = 'grid';

      loadPagingScript(function () {
        attachSimulationListeners();
        initPagingConsole();
        if (typeof initializePagingUI === 'function') {
          initializePagingUI();
        }
      });
    }
  } else if (selectedAlgo && selectedAlgo.toLowerCase() === "segmentation") {
    if (segmentationView) {
      segmentationView.style.display = 'grid';

      loadSegmentationScript(function () {
        attachSimulationListeners();
        initSegmentationConsole();
        if (typeof initializeSegmentationUI === 'function') {
          initializeSegmentationUI();
        }
      });
    }
  } else {
    if (standardView) {
      standardView.style.display = 'grid';
      attachSimulationListeners();
    }
    loadDefaultScript(selectedAlgo, selectedPartition);
  }
}

function loadPagingScript(callback) {
  if (window.pagingScriptLoaded) {
    console.log("Paging script already loaded");
    if (callback) callback();
    return;
  }

  let loadedCount = 0;
  const totalScripts = 2;

  const checkLoaded = function () {
    loadedCount++;
    console.log('Script loaded:', loadedCount, 'of', totalScripts);
    if (loadedCount === totalScripts) {
      window.pagingScriptLoaded = true;
      attachSimulationListeners();
      if (callback) callback();
    }
  };

  const script1 = document.createElement('script');
  script1.src = "../util/algos/paging.js";
  script1.onload = checkLoaded;
  script1.onerror = function () {
    console.error("Failed to load paging.js");
    checkLoaded();
  };

  const script2 = document.createElement('script');
  script2.src = "../util/pagingUI.js";
  script2.onload = checkLoaded;
  script2.onerror = function () {
    console.error("Failed to load pagingUI.js");
    checkLoaded();
  };

  document.head.appendChild(script1);
  document.head.appendChild(script2);
}

function loadSegmentationScript(callback) {
  if (window.segmentationScriptLoaded) {
    console.log("Segmentation script already loaded");
    if (callback) callback();
    return;
  }

  const script = document.createElement('script');
  script.src = "../util/algos/segmentation.js";
  script.onload = function () {
    window.segmentationScriptLoaded = true;
    attachSimulationListeners();
    if (callback) callback();
  };
  script.onerror = function () {
    console.error("Failed to load segmentation.js");
    if (callback) callback();
  };
  document.head.appendChild(script);
}

function loadDefaultScript(selectedAlgo, selectedPartition) {
  const algoDescription = document.getElementById('algo-description');
  let scriptSrc = "";

  if (selectedPartition === "dynamic") {
    document.body.setAttribute('data-partition-mode', 'dynamic');
  } else {
    document.body.removeAttribute('data-partition-mode');
  }

  switch (selectedAlgo.toLowerCase()) {
    case "first-fit":
      algoDescription.textContent = "First Fit Algorithm - Fixed Partition";
      if (selectedPartition === "dynamic") {
        algoDescription.textContent = "First Fit Algorithm - Dynamic Partition";
      }
      scriptSrc = "../util/algos/firstfit.js";
      break;
    case "next-fit":
      algoDescription.textContent = "Next Fit Algorithm - Fixed Partition";
      if (selectedPartition === "dynamic") {
        algoDescription.textContent = "Next Fit Algorithm - Dynamic Partition";
      }
      scriptSrc = "../util/algos/nextfit.js";
      break;
    case "best-fit":
      algoDescription.textContent = "Best Fit Algorithm - Fixed Partition";
      if (selectedPartition === "dynamic") {
        algoDescription.textContent = "Best Fit Algorithm - Dynamic Partition";
      }
      scriptSrc = "../util/algos/bestfit.js";
      break;
    case "worst-fit":
      algoDescription.textContent = "Worst Fit Algorithm - Fixed Partition";
      if (selectedPartition === "dynamic") {
        algoDescription.textContent = "Worst Fit Algorithm - Dynamic Partition";
      }
      scriptSrc = "../util/algos/worstfit.js";
      break;
    default:
      algoDescription.textContent = "";
      scriptSrc = "";
  }

  if (scriptSrc && !window.defaultLoaded) {
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.defer = true;
    document.head.appendChild(script);
    window.defaultLoaded = true;
  }
}

function hub() {
  sessionStorage.removeItem('selectedAlgo');
  sessionStorage.removeItem('selectedPartition');
  sessionStorage.removeItem('loaderLoaded');
}