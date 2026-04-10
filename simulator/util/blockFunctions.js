// ========== BLOCK FUNCTIONS ==========
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
  const urlAlgo = urlParams.get("algo");

  return isPaging || selectedAlgo === "Paging" || urlAlgo === "Paging";
}

/** Lock edit/delete on memory blocks (including Fragmented splits added mid-run). */
const disableMemoryBlockControls = () => {
  if (!simulationContainer) return;
  simulationContainer
    .querySelectorAll(".block .process-action")
    .forEach((action) => {
      action.style.display = "none";
    });
  simulationContainer
    .querySelectorAll(".block .edit-block-btn")
    .forEach((btn) => {
      btn.disabled = true;
    });
  simulationContainer
    .querySelectorAll(".block .delete-block-btn")
    .forEach((btn) => {
      btn.disabled = true;
    });
};

const updateTotalMemory = () => {
  const blocks = simulationContainer
    ? simulationContainer.querySelectorAll(".block h2")
    : [];
  const total = Array.from(blocks).reduce((sum, sizeElement) => {
    const parsed = parseInt(sizeElement.textContent, 10);
    return sum + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);
  if (totalMemoryValue) {
    totalMemoryValue.textContent = `${total} KB`;
  }
};

const renumberBlocks = () => {
  const blocks = simulationContainer
    ? simulationContainer.querySelectorAll(".block")
    : [];
  let blockNumber = 1;
  blocks.forEach((block) => {
    const isSplitFree = block.classList.contains("block--split-free");
    const label = block.querySelector("p");
    if (isSplitFree) {
      if (label) label.textContent = "";
      block.dataset.partitionLabel = "";
      return;
    }
    if (label) {
      label.textContent = `Block ${blockNumber}`;
    }
    block.id = `block-${blockNumber}`;
    block.dataset.partitionLabel = String(blockNumber);
    blockNumber++;
  });
};

const renumberProcesses = () => {
  const processes = processContainer
    ? processContainer.querySelectorAll(".process")
    : [];
  processes.forEach((process, index) => {
    const label = process.querySelector(".process-content p:first-child");
    const newId = index + 1;
    if (label) {
      label.textContent = `Process ${index + 1}`;
    }
    process.id = `process-${newId}`;

    const colorIndex = index % processColors.length;
    const colorPair = processColors[colorIndex];

    process.setAttribute("data-bg", colorPair.bg);
    process.setAttribute("data-border", colorPair.border);
    process.style.backgroundColor = colorPair.bg;
    process.style.borderBottomColor = colorPair.border;
  });
};

const createBlockElement = (id, sizeKb, options = {}) => {
  const partitionLabel =
    options.partitionLabel != null ? options.partitionLabel : id;
  const block = document.createElement("div");
  block.className = options.isSplitFree ? "block block--split-free" : "block";
  block.id = `block-${id}`;
  block.dataset.partitionLabel = options.isSplitFree
    ? ""
    : String(partitionLabel);
  block.style.width = "120px";
  block.style.position = "relative";
  const titleText = options.isSplitFree ? "" : `Block ${partitionLabel}`;
  block.innerHTML = `
        <p>${titleText}</p>
        <div class="block-content">
            <div>
                <p class="block-status">Free</p>
            </div>
            <div class="block-size">
                <h2><span class="block-size-value">${sizeKb}</span></h2>
                <h2>&nbsp;KB</h2>
            </div>
        </div>
        <div></div>
        <div class="process-action">
            <button type="button" class="edit-block-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></button>
            <button type="button" class="delete-block-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
    `;
  return block;
};

const insertDynamicFreeSplitAfter = (
  allocatedEl,
  allocatedSizeKb,
  freeSizeKb,
  freeNodeId,
  allocatedBlockId,
) => {
  if (!allocatedEl || freeSizeKb <= 0 || freeNodeId == null) {
    return;
  }

  const nameEl = allocatedEl.querySelector("p");
  if (nameEl) {
    const lbl = allocatedEl.dataset.partitionLabel;
    nameEl.textContent = lbl ? `Block ${lbl}` : "";
  }
  allocatedEl.dataset.partitionLabel = String(allocatedBlockId);

  const wasStandaloneHole =
    window.getComputedStyle(allocatedEl).borderTopLeftRadius !== "0px";
  if (wasStandaloneHole) {
    allocatedEl.style.borderRadius = "12px 0px 0px 12px";
  } else {
    allocatedEl.style.borderRadius = "0px 0px 0px 0px";
  }

  const sizeNumEl = allocatedEl.querySelector(".block-size-value");
  if (sizeNumEl) {
    sizeNumEl.textContent = String(allocatedSizeKb);
  }
  const freeEl = createBlockElement(freeNodeId, freeSizeKb, {
    isSplitFree: true,
  });

  freeEl.style.borderRadius = "0px 12px 12px 0px";
  freeEl.style.marginLeft = "-10px";

  allocatedEl.after(freeEl);
  resizeBlocks();
  disableMemoryBlockControls();
};

const removeElement = (button, selector) => {
  const wrapper = button.closest(selector);
  if (wrapper && wrapper.parentElement) {
    wrapper.parentElement.removeChild(wrapper);
  }
};

const resizeBlocks = () => {
  const blocks = Array.from(simulationContainer.querySelectorAll(".block"));
  const pxPerKb = 0.5;
  const minWidth = 80;

  blocks.forEach((block) => {
    const sizeEl = block.querySelector("h2");
    const blockSize = sizeEl ? parseInt(sizeEl.textContent, 10) : 0;

    if (blockSize > 0) {
      const calculatedWidth = blockSize * pxPerKb;
      block.style.width = `${minWidth + calculatedWidth}px`;
      block.style.flex = "0 0 auto";
    }
  });
};

const editBlock = (block) => {
  const sizeEl = block.querySelector(".block-size-value");
  if (!sizeEl) return;

  startInlineEdit(sizeEl, (parsedSize) => {
    updateTotalMemory();
    resizeBlocks();
  });
};
