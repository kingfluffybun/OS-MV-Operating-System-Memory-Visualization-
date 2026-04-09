// ========== SIDEBAR ==========
// Load sidebar
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar().then(() => {
    sidebarLinks();
    showMenu();
    initSidebarFunctions();
    loadCurrentUser();
  });
});

async function loadSidebar() {
  // console.log("loadSidebar function called");
  const container = document.getElementById("sidebar-container");

  if (!container) {
    console.error("Sidebar container not found");
    return;
  }

  try {
    const response = await fetch("../../sidebar/sidebar.html");
    const data = await response.text();
    container.innerHTML = data;
    console.log("Sidebar loaded successfully");
  } catch (error) {
    console.error("Error loading sidebar:", error);
  }
}

// Basically ginagawan nya ng base path para pag iba ung current path nya, pumupunta parin sya sa tamang link,
// either dadagdagan ng ../ or ./ (kase need sya relative pathing)
const getBasePath = () => {
  // console.log("getBasePath function called");
  const path = window.location.pathname;
  
  if (path.includes('/admin-dashboard/')) return '../';
  if (path.includes('/simulator/algorithm/')) return '../../';
  if (path.includes('/simulator/')) return '../';
  return './';
}

// Ito naman, since nakuha na ung base path (which is ../ or ./). ito ung dudugtong sa url.
const sidebarLinks = () => {
  // console.log("sidebarLinks function called");
  const base = getBasePath();

  const linkMap = [
    {id: 'menu-dashboard', path: 'simulator/index.html'},
    {id: 'menu-admin-dashboard', path: 'admin-dashboard/index.html'},
    {id: 'menu-back-simulator', path: 'simulator/index.html'}, // for admin dashboard
  ];

  linkMap.forEach(item => {
    const link = document.getElementById(item.id);
    if(!link) return;

    const anchor = link.querySelector('a');
    if (!anchor) return;

    anchor.setAttribute('href', base + item.path);
  });
}

// Initialize sidebar functions
function initSidebarFunctions() {
  // console.log("initSidebarFunctions function called");
  const toggleButton = document.getElementById("toggle-btn");
  const sidebar = document.getElementById("sidebar");
  const logo = document.getElementById("logo");
  const logoH1 = document.getElementById("h1");

  if (!sidebar) {
    console.error("Sidebar not found");
    return;
  }

  // Store elements in the global scope
  window.sidebar = sidebar;
  window.toggleButton = toggleButton;
  window.logo = logo;
  window.logoH1 = logoH1;

  console.log("Sidebar elements found: ", {
    toggleButton: !!toggleButton,
    sidebar: !!sidebar,
    logo: !!logo,
    logoH1: !!logoH1
  });

  if (toggleButton) {
    toggleButton.addEventListener("click", toggleSideBar);
  }
}

const toggleSideBar = () => {
  // console.log("toggleSideBar function called");
  const sidebar = window.sidebar || document.getElementById("sidebar");
  const toggleButton = window.toggleButton || document.getElementById("toggle-btn");
  const logo = window.logo || document.getElementById("logo");
  const logoH1 = window.logoH1 || document.getElementById("h1");

  sidebar.classList.toggle("close");
  toggleButton.classList.toggle("rotate");
  logo.classList.toggle("hidden");
  logoH1.classList.toggle("hidden");
};

const toggleSubMenu = (button) => {
  console.log("toggleSubMenu function called");
  const sidebar = window.sidebar || document.getElementById("sidebar");

  if (sidebar.classList.contains("close")) {
    toggleSideBar();
  }

  button.nextElementSibling.classList.toggle("show");
  button.classList.toggle("rotate");
};

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
  }
}

// Display username
function loadCurrentUser() {
  const stored = JSON.parse(sessionStorage.getItem("currentUser"));
  const username = document.getElementById("username");

  if (stored && stored.username) {
    username.textContent = stored.username;
  } else {
    username.textContent = "Guest";
  }
}

const processColors = [
  { bg: "#FFADAD", border: "#BF8282" }, // Powder Blush
  { bg: "#FFD6A5", border: "#BFA07C" }, // Apricot Cream
  { bg: "#FDFFB6", border: "#BEBF88" }, // Cream
  { bg: "#CAFFBF", border: "#98BF8F" }, // Tea Green
  { bg: "#9BF6FF", border: "#7DC6CE" }, // Electric Aqua
  { bg: "#A0C4FF", border: "#7893BF" }, // Baby Blue Ice
  { bg: "#BDB2FF", border: "#8E85BF" }, // Periwinkle
  { bg: "#FFC6FF", border: "#BF94BF" }, // Mavue
];

const processContainer = document.querySelector(".process-container");
let processIdCounter = processContainer
  ? processContainer.querySelectorAll(".process").length + 1
  : 1;

// Simulation state
let currentStep = 0;
let isPlaying = false;
let speed = 1;

const scrollDown = () => {
  if (processContainer) {
    processContainer.scrollTo({
      top: processContainer.scrollHeight,
      behavior: "smooth",
    });
  }
};

const highlightCurrentProcess = () => {
  document
    .querySelectorAll(".process")
    .forEach((p) => p.classList.remove("current"));
  const processes = document.querySelectorAll(".process");
  if (currentStep < processes.length) {
    const activeProcess = processes[currentStep];
    activeProcess.classList.add("current");
    activeProcess.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }
};

const createProcessElement = (id, sizeKb) => {
  const process = document.createElement("div");
  process.className = "process";
  process.id = `process-${id}`;

  const colorIndex = (id - 1) % processColors.length;
  const colorPair = processColors[colorIndex];
  process.setAttribute("data-bg", colorPair.bg);
  process.setAttribute("data-border", colorPair.border);
  process.style.backgroundColor = colorPair.bg;
  process.style.borderBottomColor = colorPair.border;

  process.innerHTML = `
        <div class="process-content">
            <p>Process ${id}</p>
            <p>${sizeKb}</p>
            <p>&nbsp;KB</p>
        </div>
        <div class="process-action">
            <button type="button" class="edit-process-btn"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></button>
            <button type="button" class="delete-process-btn"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
    `;
  return process;
};

const simulationContainer =
  document.querySelector(".simulation .simulation-scroll-track") ||
  document.querySelector(".simulation .container") ||
  document.querySelector(".simulation-paging .container");
const totalMemoryValue = document.getElementById("total-memory-value");

let preSimBlockState = null;

const isDynamicPartitionMode = () =>
  document.body.dataset.partitionMode === "dynamic";

const isPagingMode = () =>
  !!document.querySelector(".main-grid paging") ||
  window.location.pathname.endsWith("simulation-Paging.html");

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

  // For visual
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

  // For visual
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

const add_process_btn = document.getElementById("add-process-btn");
add_process_btn.addEventListener("click", () => {
  const processSizeInput = document.getElementById("process-size");
  const processSize = parseInt(processSizeInput.value, 10);

  // --- NEW VALIDATION CHECK START ---
  // This prevents the user from adding a process that is larger than the total memory.
  if (isPagingMode()) {
    const { memorySize } = getPagingInputs();
    if (processSize > memorySize) {
      alert(`Process size (${processSize} KB) cannot exceed total memory (${memorySize} KB)!`);
      return; // Stops the function here so the massive process isn't added
    }
  }
  // --- NEW VALIDATION CHECK END ---

  if (!processContainer || Number.isNaN(processSize) || processSize <= 0) {
    return;
  }

  const nextProcessId =
    processContainer.querySelectorAll(".process").length + 1;
  const newProcess = createProcessElement(nextProcessId, processSize);
  processContainer.appendChild(newProcess);
  processSizeInput.value = "";
  scrollDown();
});

const randomize_value = document.getElementById("randomize-value");

randomize_value.addEventListener("click", () => {
  const pagingBtn = document.querySelector(".paging-btn"); 
  let min, max;

  if (isPagingMode()) {
    min = 3;
    max = 6;
  } else {
    min = 4;
    max = 8;
  }

  const processSize = Math.pow(
    2, Math.floor(Math.random() * (max - min + 1)) + min,
  );

  const nextProcessId = processContainer.querySelectorAll(".process").length + 1;
  const newProcess = createProcessElement(nextProcessId, processSize);
  processContainer.appendChild(newProcess);
  scrollDown();
});

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

const startInlineEdit = (element, onCommit) => {
  const oldText = element.textContent.trim();
  const oldValue = parseInt(oldText, 10);
  element.contentEditable = "true";
  element.dataset.editing = "true";
  element.classList.add("inline-editable");

  const cleanup = (commitValue) => {
    element.removeAttribute("contenteditable");
    element.classList.remove("inline-editable");
    delete element.dataset.editing;
    element.removeEventListener("blur", onBlur);
    element.removeEventListener("keydown", onKeyDown);
    if (commitValue !== null) {
      element.textContent = `${commitValue}`;
      onCommit(commitValue);
    } else {
      element.textContent = `${oldValue}`;
    }
  };

  const onBlur = () => {
    const text = element.textContent.trim();
    const parsed = parseInt(text, 10);
    const valid = !Number.isNaN(parsed) && parsed > 0;
    cleanup(valid ? parsed : null);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      element.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      element.textContent = `${oldValue}`;
      cleanup(null);
    }
  };

  element.addEventListener("blur", onBlur);
  element.addEventListener("keydown", onKeyDown);
  element.focus();

  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

const editProcess = (process) => {
  const sizeEl = process.querySelector(".process-content p:nth-child(2)");
  startInlineEdit(sizeEl, (parsedSize) => {});
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
      // block.style.width = `${Math.max(minWidth, calculatedWidth)}px`;
      block.style.flex = "0 0 auto";
    }
  });
};

const editBlock = (block) => {
  const sizeEl = block.querySelector(".block-size-value"); // ← FIXED: target the span
  if (!sizeEl) return;

  startInlineEdit(sizeEl, (parsedSize) => {
    updateTotalMemory();
    resizeBlocks();
  });
};

if (processContainer) {
  processContainer.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (target.classList.contains("delete-process-btn")) {
      removeElement(target, ".process");
      renumberProcesses();
      return;
    }

    if (target.classList.contains("edit-process-btn")) {
      const process = target.closest(".process");
      if (process) {
        editProcess(process);
      }
    }
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

const consoleContainer = document.querySelector(".console .container");

const appendConsoleMessage = (message) => {
  if (!consoleContainer) return;
  const p = document.createElement("p");
  const timestamp = new Date().toLocaleTimeString();
  p.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
  consoleContainer.appendChild(p);
  consoleContainer.scrollTop = consoleContainer.scrollHeight;
};
appendConsoleMessage("System Ready. Add processes/partitions or click Start.");

const getProcessSizes = () => {
  if (!processContainer) return [];
  return Array.from(processContainer.querySelectorAll(".process"))
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
    // Re-apply hatch pattern on internal frag blocks (colors stored as data attrs)
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

    // Skip dynamic free-hole blocks
    if (block.classList.contains("block--split-free")) {
      return;
    }

    const sizeDisplay = block.querySelector(".block-size-value");

    let bgColor = "";
    let borderColor = "";
    let isAllocated = false;
    let processActualSize = null;

    // CRITICAL FIX: Find allocation by checking the process currently on this block
    // This avoids the mismatch between result.block (remapped sequential ID) and partitionLabel (displayBlock)
    const currentStatusLabel = block.querySelector(".block-status");
    const processTextContent = currentStatusLabel?.textContent?.trim();
    
    let currentAllocation = null;
    if (processTextContent && processTextContent.startsWith("Process")) {
      // The status label already shows which process is on this block - use that
      currentAllocation = [processTextContent, results[processTextContent]];
    }
    
    // Fallback: if status doesn't show process, search by block position
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
        processActualSize = result.size; // This ensures we show the process KB
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
      // Update block label to show displayBlock if available
      const [processKey, result] = currentAllocation;
      if (result.displayBlock) {
        // Set partition label for grouping detection
        block.dataset.partitionLabel = String(result.displayBlock);
        const titleEl = block.querySelector("p");
        if (titleEl) {
          // Only show label if this is NOT a middle or last block in a group
          if (!block.classList.contains("block-group-middle") && !block.classList.contains("block-group-last")) {
            titleEl.textContent = `Block ${result.displayBlock}`;
          } else {
            titleEl.textContent = "";
          }
        }
      }
    } else {
      // Restore to original partition size
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
  const allocatedEl = document.getElementById("allocated-value");
  const totalFreeEl = document.getElementById("total-free-value");
  const internalFragEl = document.getElementById("internal-frag-value");
  const externalFragEl = document.getElementById("external-frag-value");
  const utilEl = document.getElementById("util-value");
  const successEl = document.getElementById("success-rate-value");

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

let playInterval = null;
let simulationState = null;

const setTotalMemoryDisplay = (total) => {
  const totalMemoryEl = document.getElementById("total-memory-value");
  if (totalMemoryEl) totalMemoryEl.textContent = `${Math.round(total)} KB`;
};

const resetConsole = () => {
  if (!consoleContainer) return;
  consoleContainer.innerHTML = "";
};

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
  const blocks = getBlockSizes();
  const isPaging = isPagingMode();

  if (!processes.length) {
    appendConsoleMessage("No processes in queue to allocate.");
    return false;
  }

  if (!isPaging && !blocks.length) {
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
      processes,
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
  } else {
    if (isDynamicPartitionMode()) {
      preSimBlockState = getBlockSizes().slice();
    }

    simulationState = {
      processes,
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
  if (simulationContainer) {
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

  // Disable buttons during simulation
  const addBtn = document.getElementById("add-block-btn");
  if (addBtn) {
    addBtn.style.display = "none";
  }

  const randomizeBtn = document.getElementById("randomize-value");
  if (randomizeBtn) {
    randomizeBtn.disabled = true;
  }

  Array.from(document.getElementsByClassName("add-block")).forEach((el) => {
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
      el.disabled = true;
    }
  });

  Array.from(document.getElementsByClassName("input-prcs")).forEach((el) => {
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
      el.disabled = true;
    }
  });

  document
    .querySelectorAll(".process-action")
    .forEach((action) => (action.style.display = "none"));
  disableMemoryBlockControls();

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
    (b) => !b.classList.contains("block--split-free") && !b.classList.contains("block--fixed-waste")
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
  
  while (node) {
    // Create block with the node's current ID (already sequential after compaction)
    const blockEl = createBlockElement(node.id, node.size);
    
    if (node.status === "Occupied") {
      const statusLabel = blockEl.querySelector(".block-status");
      if (statusLabel) statusLabel.textContent = "Allocated";
      blockEl.classList.add("allocated");
    }
    blockEl.dataset.originalSize = String(node.size);
    blockEl.dataset.linkedListId = String(node.id);
    blockEl.dataset.linkedListNodeId = String(node.id); // Store node ID for matching
    container.appendChild(blockEl);
    blockIndex++;
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
    followAllocatedFrame(allocatedFrameId);

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

  // CRITICAL: Apply idMapping to BOTH previous AND current results
  if (stepResult.idMapping) {
    remapCompactedResults(stepResult.idMapping);
    
    // Also apply mapping to the current result if it needs it
    const oldBlockId = parseInt(stepResult.result.block, 10);
    if (!Number.isNaN(oldBlockId) && stepResult.idMapping[oldBlockId]) {
      stepResult.result.block = String(stepResult.idMapping[oldBlockId]);
    }
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
    const blockEl = document.getElementById(`block-${stepResult.result.block}`);
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
      const displayBlockId = stepResult.result.displayBlock || simulationState.results[processId]?.displayBlock;
      if (displayBlockId) {
        const titleEl = blockEl.querySelector("p");
        if (titleEl) titleEl.textContent = `Block ${displayBlockId}`;
        blockEl.dataset.parentPartitionLabel = String(displayBlockId);
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
  const slider = document.getElementById("slider");
  const value = parseFloat(slider ? slider.value : 1) || 1;
  const maxDelay = 1200;
  const minDelay = 250;
  const normalized = (value - 1) / 2; // 1..3 => 0..1
  return maxDelay - normalized * (maxDelay - minDelay);
};

const togglePlayStop = () => {
  if (playInterval) {
    stopBtn.style.display = `flex`;
    playBtn.style.display = `none`;
  } else {
    playBtn.style.display = `flex`;
    stopBtn.style.display = `none`;
  }
};

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

    const startAllocation = () => {
      const delay = getStepDelay();
      const didRun = runStep();
      if (!didRun) {
        togglePlayStop();
        return;
      }

      playInterval = setInterval(() => {
        if (!runStep()) {
          clearTimeout(playInterval);
          clearInterval(playInterval);
          playInterval = null;
          togglePlayStop();
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

  // Capture the state before nullifying
  const isDynamic = isDynamicPartitionMode();

  simulationState = null;
  currentStep = 0;

  // UI RESET
  resetBlocksUI(); // This now handles removing the "Waste" and "Hole" blocks
  resetConsole();

  // If you use a pre-sim state for Dynamic (like compaction), restore it
  if (isDynamic && preSimBlockState && preSimBlockState.length) {
    restorePreSimulationBlocks();
  }

  if (isPagingMode()) {
    resetPagingUI();
  }

  // Standard Updates
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

  // Resetting Inputs & Buttons
  document
    .querySelectorAll(".process")
    .forEach((p) => p.classList.remove("current"));
  const addBtn = document.getElementById("add-block-btn");
  if (addBtn) {
    addBtn.style.display = "flex";
  }
  const randomizeBtn = document.getElementById("randomize-value");
  if (randomizeBtn) {
    randomizeBtn.disabled = false;
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
};

const playBtn = document.getElementById("play-btn");
if (playBtn) {
  playBtn.addEventListener("click", runPlay);
}

const stopBtn = document.getElementById("stop-btn");
if (stopBtn) {
  stopBtn.addEventListener("click", runStop);
}

const nextBtn = document.getElementById("next-btn");
if (nextBtn) {
  nextBtn.addEventListener("click", runStep);
}

const resetBtn = document.getElementById("reset-btn");
if (resetBtn) {
  resetBtn.addEventListener("click", runReset);
}

const slider = document.getElementById("slider");
if (slider) {
  slider.addEventListener("input", (e) => {
    speed = parseFloat(e.target.value);
  });
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

  // Check if dynamic selected
  const isDynamic = document.querySelector('.toggle-partition input').checked;
  sessionStorage.setItem('selectedPartition', isDynamic ? "dynamic" : "fixed");

  if (algoWhat === "Paging") {
    sessionStorage.setItem('selectedPartition', "paging");
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
    }
  }
}

function simulatorLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlAlgo = urlParams.get('algo');
  const selectedAlgo = urlAlgo || sessionStorage.getItem('selectedAlgo');
  const selectedPartition = sessionStorage.getItem('selectedPartition');
  // const algoDescription = document.getElementById('algo-description');
  // let scriptSrc = "";

  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');

  if (standardView) standardView.style.display = 'none';
  if (pagingView) pagingView.style.display = 'none';

  if (selectedAlgo === "Paging") {
    if (pagingView) pagingView.style.display = 'grid';
    loadPagingScript();
  } else {
    if (standardView) standardView.style.display = 'grid';
    loadDefaultScript(selectedAlgo, selectedPartition);
  }
}

function loadPagingScript(callback) {
  if (window.pagingScriptLoaded) {
    if (callback) callback();
    return;
  };

  let loadedCount = 0;
  const checkLoaded = () => {
    loadedCount++;
    if (loadedCount === 2) {
      window.pagingScriptLoaded = true;
      if (callback) callback();
    }
  }

  const script1 = document.createElement('script');
  script1.src = "../util/algos/paging.js";
  script1.onload = checkLoaded;

  const script2 = document.createElement('script');
  script2.src = "../util/pagingUI.js";
  script2.onload = checkLoaded;

  document.head.appendChild(script1);
  document.head.appendChild(script2);

  // window.pagingScriptLoaded = true;
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
}

// const applyActiveStyles = () => {
//   const activeElements = document.querySelectorAll('.active');
//   activeElements.forEach(el => {
//     const link = el.tagName === 'A' ? el : el.querySelector('a');
//     if (link) {
//       link.style.color = 'white';
//       link.style.backgroundColor = 'var(--primary-color)';
//       link.style.borderRadius = '8px';
//       const svg = link.querySelector('svg');
//       if (svg) {
//         svg.style.stroke = 'white';
//       }
//     }
//   });
// };

// document.addEventListener('DOMContentLoaded', () => {
//   applyActiveStyles();
//   observer.observe(document.body, {
//     attributes: true,
//     subtree: true,
//     attributeFilter: ['class']
//   });
// });