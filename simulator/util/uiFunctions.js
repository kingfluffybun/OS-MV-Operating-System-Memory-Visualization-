// ========== UI HELPERS ==========
function appendConsoleMessage(message) {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const activeView = (pagingView && pagingView.style.display === 'grid') ? pagingView : standardView;

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
  const pagingView = document.getElementById('paging-view');
  if (!pagingView) return;

  const consoleContainer = pagingView.querySelector('.console .container');
  if (!consoleContainer) return;

  consoleContainer.innerHTML = '';

  appendConsoleMessage("System Ready. Add processes/partitions or click Start.");
}

const getProcessSizes = () => {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const activeView = (pagingView && pagingView.style.display === 'grid') ? pagingView : standardView;

  const activeProcessContainer = activeView ? activeView.querySelector(".process-container") : processContainer;

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
      const blockPos = Array.from(simulationContainer.querySelectorAll(".block"))
        .filter((b) => !b.classList.contains("block--split-free") && !b.classList.contains("block--fixed-waste"))
        .indexOf(block) + 1;
      
      currentAllocation = Object.entries(results).find(
        ([_, res]) => res.status === "Allocated" && parseInt(res.block, 10) === blockPos,
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
          if (!block.classList.contains("block-group-middle") && !block.classList.contains("block-group-last")) {
            titleEl.textContent = `Block ${result.displayBlock}`;
          } else {
            titleEl.textContent = "";
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

const updateStatistics = (stats) => {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const activeView = (pagingView && pagingView.style.display === "grid") ? pagingView : standardView;

  const query = (id) => {
    const el = activeView ? activeView.querySelector('#' + id) : document.getElementById(id);
    return el || document.getElementById(id);
  };

  const allocatedEl = query('allocated-value');
  const totalFreeEl = query('total-free-value');
  const internalFragEl = query('internal-frag-value');
  const externalFragEl = query('external-frag-value');
  const utilEl = query('util-value');
  const successEl = query('success-rate-value');

  if (allocatedEl)
    allocatedEl.textContent = `${Math.round(stats.allocatedSize)} KB`;
  if (totalFreeEl)
    totalFreeEl.textContent = `${Math.round(stats.totalFree)} KB`;
  if (internalFragEl)
    internalFragEl.textContent = `${Math.round(stats.intFragmentation)} KB`;
  if (externalFragEl)
    externalFragEl.textContent = `${Math.round(stats.externalFragmentation)} KB`;
  if (utilEl) utilEl.textContent = `${stats.memoryUtilization.toFixed(1)}%`;
  if (successEl) successEl.textContent = `${stats.successRate.toFixed(1)}%`;
};

const setTotalMemoryDisplay = (total) => {
  const totalMemoryEl = document.getElementById("total-memory-value");
  if (totalMemoryEl) totalMemoryEl.textContent = `${Math.round(total)} KB`;
};

function resetConsole() {
  const standardView = document.getElementById("standard-view");
  const pagingView = document.getElementById("paging-view");
  const activeView = (pagingView && pagingView.style.display === "grid") ? pagingView : standardView;

  const consoleContainer = activeView.querySelector(".console .container");

  if (!consoleContainer) return;
  consoleContainer.innerHTML = "";
}
