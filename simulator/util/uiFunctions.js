// ========== UI HELPERS ==========
function appendConsoleMessage(message) {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const segmentationView = document.getElementById("segmentation-view");
  const segPagingView = document.getElementById("segmentation-paging-view");

  let activeView = null;
  if (segPagingView && segPagingView.style.display === "grid")
    activeView = segPagingView;
  else if (standardView && standardView.style.display === "grid")
    activeView = standardView;
  else if (pagingView && pagingView.style.display === "grid")
    activeView = pagingView;
  else if (segmentationView && segmentationView.style.display === "grid")
    activeView = segmentationView;

  let consoleContainer = null;

  if (activeView) {
    consoleContainer = activeView.querySelector(".console .container");
  }

  if (!consoleContainer) {
    consoleContainer = document.querySelector(".console .container");
  }

  if (!consoleContainer) return;
  const p = document.createElement("p");
  const timestamp = new Date().toLocaleTimeString();
  p.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
  consoleContainer.appendChild(p);
  consoleContainer.scrollTop = consoleContainer.scrollHeight;
}

appendConsoleMessage("System Ready. Add processes/partitions or click Start.");

function initPagingConsole() {
  const pagingView = document.getElementById("paging-view");
  if (!pagingView) return;

  const consoleContainer = pagingView.querySelector(".console .container");
  if (!consoleContainer) return;

  consoleContainer.innerHTML = "";

  appendConsoleMessage(
    "System Ready. Add processes/partitions or click Start.",
  );
}

function initSegmentationConsole() {
  const segmentationView = document.getElementById("segmentation-view");
  if (!segmentationView) return;

  const consoleContainer = segmentationView.querySelector(
    ".console .container",
  );
  if (!consoleContainer) return;

  consoleContainer.innerHTML = "";

  appendConsoleMessage(
    "System Ready. Add processes/partitions or click Start.",
  );
}

const getProcessSizes = () => {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const segmentationView = document.getElementById("segmentation-view");
  const segPagingView = document.getElementById("segmentation-paging-view");
  const mainGrid = document.querySelector(".main-grid");

  let activeProcessContainer = null;

  // Check which view is active - Segmentation (in index.html), Paging, Standard,
  // or standalone simulation-Segmentation.html
  if (segPagingView && segPagingView.style.display === "grid") {
    activeProcessContainer = segPagingView.querySelector(".process-container");
  } else if (segmentationView && segmentationView.style.display === "grid") {
    // Segmentation section inside index.html
    activeProcessContainer =
      segmentationView.querySelector(".process-container");
  } else if (
    mainGrid &&
    mainGrid.classList.contains("segmentation") &&
    !standardView &&
    !pagingView
  ) {
    // Standalone segmentation page (simulation-Segmentation.html)
    activeProcessContainer = mainGrid.querySelector(".process-container");
  } else if (pagingView && pagingView.style.display === "grid") {
    activeProcessContainer = pagingView.querySelector(".process-container");
  } else {
    activeProcessContainer = standardView
      ? standardView.querySelector(".process-container")
      : processContainer;
  }

  if (!activeProcessContainer) return [];

  return Array.from(activeProcessContainer.querySelectorAll(".process"))
    .map((process) => {
      const sizeEl = process.querySelector(".process-content p:nth-child(2)");
      const size = sizeEl ? parseInt(sizeEl.textContent, 10) : NaN;
      return Number.isNaN(size) ? null : size;
    })
    .filter((size) => size !== null);
};

const getBlockSizes = () => {
  if (!simulationContainer) return [];
  return Array.from(simulationContainer.querySelectorAll(".block"))
    .map((block) => {
      const sizeEl = block.querySelector("h2");
      const size = sizeEl ? parseInt(sizeEl.textContent, 10) : NaN;
      return Number.isNaN(size) ? null : size;
    })
    .filter((size) => size !== null);
};

const updateBlockVisuals = (results) => {
  if (!simulationContainer) return;

  simulationContainer.querySelectorAll(".block").forEach((block) => {
    if (block.classList.contains("block--fixed-waste")) {
      const hatchBg = block.dataset.hatchBg;
      const hatchBorder = block.dataset.hatchBorder;
      if (hatchBg && hatchBorder) {
        const hatchPattern = `repeating-linear-gradient(
                    45deg,
                    ${hatchBg}75,
                    ${hatchBg}75 5px,
                    ${hatchBorder} 5px,
                    ${hatchBorder} 10px
                )`;
        block.style.background = hatchPattern;
        block.style.borderBottom = `8px solid ${hatchBorder}`;
      }
      return;
    }

    if (block.classList.contains("block--split-free")) {
      return;
    }

    const sizeDisplay = block.querySelector(".block-size-value");

    let bgColor = "";
    let borderColor = "";
    let isAllocated = false;
    let processActualSize = null;

    const currentStatusLabel = block.querySelector(".block-status");
    const processTextContent = currentStatusLabel?.textContent?.trim();

    let currentAllocation = null;
    if (processTextContent && processTextContent.startsWith("Process")) {
      currentAllocation = [processTextContent, results[processTextContent]];
    }

    if (!currentAllocation) {
      const blockPos =
        Array.from(simulationContainer.querySelectorAll(".block"))
          .filter(
            (b) =>
              !b.classList.contains("block--split-free") &&
              !b.classList.contains("block--fixed-waste") &&
              !b.id.startsWith("block-split-"),
          )
          .indexOf(block) + 1;

      currentAllocation = Object.entries(results).find(
        ([_, res]) =>
          res.status === "Allocated" && parseInt(res.block, 10) === blockPos,
      );
    }

    let allocationProcessKey = null;
    if (currentAllocation) {
      const [processKey, result] = currentAllocation;
      allocationProcessKey = processKey;
      const pNum = processKey.match(/\d+/)[0];
      const processElem = document.getElementById(`process-${pNum}`);

      if (processElem) {
        bgColor = processElem.getAttribute("data-bg");
        borderColor = processElem.getAttribute("data-border");
        isAllocated = true;
        processActualSize = result.size;
      }
    }

    if (isAllocated) {
      block.style.background = bgColor;
      block.style.borderBottom = `8px solid ${borderColor}`;
      block.classList.add("allocated");
      const statusLabel = block.querySelector(".block-status");
      if (statusLabel && allocationProcessKey) {
        statusLabel.textContent = allocationProcessKey;
      }
      if (sizeDisplay && processActualSize !== null) {
        sizeDisplay.textContent = processActualSize;
      }
      const [processKey, result] = currentAllocation;
      if (result.displayBlock) {
        block.dataset.partitionLabel = String(result.displayBlock);
        const titleEl = block.querySelector("p");
        if (titleEl) {
          const isSplit = block.id.startsWith("block-split-");
          if (
            isSplit ||
            block.classList.contains("block-group-middle") ||
            block.classList.contains("block-group-last")
          ) {
            titleEl.textContent = "";
          } else {
            titleEl.textContent = `Block ${result.displayBlock}`;
          }
        }
      }
    } else {
      const originalSize = block.dataset.originalSize;
      if (sizeDisplay && originalSize) {
        sizeDisplay.textContent = originalSize;
      }
      block.style.background = "";
      block.style.borderBottom = "";
      block.classList.remove("allocated");
    }
  });
};

function setFragmentationVisibility() {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const segmentationView = document.getElementById("segmentation-view");
  const segPagingView = document.getElementById("segmentation-paging-view");
  const activeView =
    segPagingView && segPagingView.style.display === "grid"
      ? segPagingView
      : segmentationView && segmentationView.style.display === "grid"
        ? segmentationView
        : pagingView && pagingView.style.display === "grid"
          ? pagingView
          : standardView;

  const query = (id) => {
    const el = activeView.querySelector("#" + id);
    return el;
  };

  const internalFragmentationEl = query("internal-frag-value");
  const externalFragEl = query("external-frag-value");

  const isPaging = typeof isPagingMode === 'function' && isPagingMode();
  const isSegmentation = typeof isSegmentationMode === 'function' && isSegmentationMode();
  const isSegPaging = typeof isSegmentationPagingMode === 'function' && isSegmentationPagingMode();
  const isStandard = !isPaging && !isSegmentation && !isSegPaging;

  if (isStandard) {
    // Contiguous allocation
    const isDynamic = typeof isDynamicPartitionMode === 'function' && isDynamicPartitionMode();
    if (isDynamic) {
      // Dynamic partition: show external fragmentation, hide internal
      if (internalFragmentationEl && internalFragmentationEl.parentElement) {
        internalFragmentationEl.parentElement.style.display = 'none';
      }
      if (externalFragEl && externalFragEl.parentElement) {
        externalFragEl.parentElement.style.display = 'flex';
      }
    } else {
      // Fixed partition: show internal fragmentation, hide external
      if (externalFragEl && externalFragEl.parentElement) {
        externalFragEl.parentElement.style.display = 'none';
      }
      if (internalFragmentationEl && internalFragmentationEl.parentElement) {
        internalFragmentationEl.parentElement.style.display = 'flex';
      }
    }
  } else if (isPaging || isSegPaging) {
    // Paging and Segmentation with Paging: show internal fragmentation, hide external
    if (externalFragEl && externalFragEl.parentElement) {
      externalFragEl.parentElement.style.display = 'none';
    }
    if (internalFragmentationEl && internalFragmentationEl.parentElement) {
      internalFragmentationEl.parentElement.style.display = 'flex';
    }
  } else if (isSegmentation) {
    // Segmentation: show external fragmentation, hide internal
    if (internalFragmentationEl && internalFragmentationEl.parentElement) {
      internalFragmentationEl.parentElement.style.display = 'none';
    }
    if (externalFragEl && externalFragEl.parentElement) {
      externalFragEl.parentElement.style.display = 'flex';
    }
  }
}

const updateStatistics = (stats) => {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const segmentationView = document.getElementById("segmentation-view");
  const segPagingView = document.getElementById("segmentation-paging-view");
  const activeView =
    segPagingView && segPagingView.style.display === "grid"
      ? segPagingView
      : segmentationView && segmentationView.style.display === "grid"
        ? segmentationView
        : pagingView && pagingView.style.display === "grid"
          ? pagingView
          : standardView;

  const query = (id) => {
    const el = activeView
      ? activeView.querySelector("#" + id)
      : document.getElementById(id);
    return el || document.getElementById(id);
  };

  const allocatedEl = query("allocated-value");
  const totalFreeEl = query("total-free-value");
  const internalFragmentationEl = query("internal-frag-value");
  const externalFragEl = query("external-frag-value");
  const utilEl = query("util-value");
  const successEl = query("success-rate-value");

  if (allocatedEl)
    allocatedEl.textContent = `${Math.round(stats.allocatedSize)} KB`;
  if (totalFreeEl)
    totalFreeEl.textContent = `${Math.round(stats.totalFree)} KB`;
  if (internalFragmentationEl)
    internalFragmentationEl.textContent = `${Math.round(stats.internalFragmentation)} KB`;
  if (externalFragEl)
    externalFragEl.textContent = `${Math.round(stats.externalFragmentation)} KB`;
  if (utilEl) utilEl.textContent = `${stats.memoryUtilization.toFixed(1)}%`;
  if (successEl) successEl.textContent = `${stats.successRate.toFixed(1)}%`;

  setFragmentationVisibility();
};

const setTotalMemoryDisplay = (total) => {
  // Try to find the element in the active view (paging/segmentation/standard)
  let totalMemoryEl = null;

  // Check if segmentation-paging view is active
  const segmentationPagingView = document.getElementById(
    "segmentation-paging-view",
  );
  if (
    segmentationPagingView &&
    segmentationPagingView.style.display !== "none"
  ) {
    totalMemoryEl = segmentationPagingView.querySelector("#total-memory-value");
  }

  // Check if paging view is active
  if (!totalMemoryEl) {
    const pagingView = document.getElementById("paging-view");
    if (pagingView && pagingView.style.display !== "none") {
      totalMemoryEl = pagingView.querySelector("#total-memory-value");
    }
  }

  // Check if segmentation view is active
  if (!totalMemoryEl) {
    const segmentationView = document.getElementById("segmentation-view");
    if (segmentationView && segmentationView.style.display !== "none") {
      totalMemoryEl = segmentationView.querySelector("#total-memory-value");
    }
  }

  // Check if standard view is active
  if (!totalMemoryEl) {
    const standardView = document.getElementById("standard-view");
    if (standardView && standardView.style.display !== "none") {
      totalMemoryEl = standardView.querySelector("#total-memory-value");
    }
  }

  // Check standalone paging page (simulation-Paging.html)
  if (!totalMemoryEl) {
    const mainGrid = document.querySelector(".main-grid.paging");
    if (mainGrid) {
      totalMemoryEl = mainGrid.querySelector("#total-memory-value");
    }
  }

  // Fallback to global search
  if (!totalMemoryEl) {
    totalMemoryEl = document.getElementById("total-memory-value");
  }

  if (totalMemoryEl) {
    totalMemoryEl.textContent = `${Math.round(total)} KB`;
  }
};

const followAllocatedBlock = (blockId) => {
  if (!blockId || blockId === "None") return;

  // Try finding a split block first, then a regular block
  let blockEl = document.getElementById(`block-split-${blockId}`);
  if (!blockEl) {
    blockEl = document.getElementById(`block-${blockId}`);
  }

  if (blockEl && blockEl.scrollIntoView) {
    blockEl.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
};

function resetConsole() {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const segmentationView = document.getElementById("segmentation-view");
  const segPagingView = document.getElementById("segmentation-paging-view");
  const activeView =
    segPagingView && segPagingView.style.display === "grid"
      ? segPagingView
      : segmentationView && segmentationView.style.display === "grid"
        ? segmentationView
        : pagingView && pagingView.style.display === "grid"
          ? pagingView
          : standardView;

  const consoleContainer = activeView.querySelector(".console .container");

  if (!consoleContainer) return;
  consoleContainer.innerHTML = "";
}
