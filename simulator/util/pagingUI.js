// ===== PAGING STATE TRACKING =====
let pagingState = {
  allPages: {}, // { procName: { pageNum: { status, frameId } } }
  currentProcessQueue: [], // Queue of processes to allocate
  currentProcessIndex: 0, // Which process we're on
  currentPageIndex: 0, // Which page of current process we're allocating
};

const getPagingInputs = () => {
  const pageSizeInput = document.getElementById("page-frame-size");
  const memorySizeInput = document.getElementById("memory-size");
  const pageSize = pageSizeInput ? parseInt(pageSizeInput.value, 10) : NaN;
  const memorySize = memorySizeInput ? parseInt(memorySizeInput.value, 10) : NaN;
  return { pageSize, memorySize };
};

const getPagingFrameCount = () => {
  const { pageSize, memorySize } = getPagingInputs();
  if (Number.isNaN(pageSize) || pageSize <= 0) return 0;
  if (Number.isNaN(memorySize) || memorySize <= 0) return 0;
  return Math.floor(memorySize / pageSize);
};

const resetPagingUI = () => {
  const pagesContainer = document.querySelector(".pages-container");
  const framesContainer = document.querySelector(".frames-container");
  const pageTableBody = document.querySelector("#page-table-body");
  if (pagesContainer) pagesContainer.innerHTML = "";
  if (framesContainer) framesContainer.innerHTML = "";
  if (pageTableBody) pageTableBody.innerHTML = "";
  
  // Reset paging state
  pagingState = {
    allPages: {},
    currentProcessQueue: [],
    currentProcessIndex: 0,
    currentPageIndex: 0,
  };
};

const initializePagingUI = (memoryFrames, processes = []) => {
  const pagesContainer = document.querySelector(".pages-container");
  const framesContainer = document.querySelector(".frames-container");

  // 1. Initialize frames container - show all frames as Free
  if (framesContainer) {
    framesContainer.innerHTML = "";
    Object.values(memoryFrames.frames).forEach((frame) => {
      const frameEl = document.createElement("div");
      frameEl.className = "frame";
      frameEl.id = `frame-${frame.id}`;

      const statusLabel = "Free";
      const usageInfo = `<p>${frame.size} KB</p>`;

      frameEl.innerHTML = `
        <p id="frame-number">F${frame.id}</p>
        <div class="frame-content">
          <p>${statusLabel}</p>
          ${usageInfo}
        </div>
      `;
      framesContainer.appendChild(frameEl);
    });
  }

  // 2. Pre-display all pages upfront for each process
  if (pagesContainer) {
    pagesContainer.innerHTML = "";
    
    // Get process sizes and page size
    const { pageSize } = getPagingInputs();
    
    if (!processes || processes.length === 0 || !pageSize || pageSize <= 0) {
      pagesContainer.innerHTML = `<div class="page page--placeholder"><p>Waiting for allocation</p></div>`;
      return;
    }

    // Create pages for each process
    processes.forEach((processSize, processIndex) => {
      const processId = `Process ${processIndex + 1}`;
      const pagesNeeded = Math.ceil(processSize / pageSize);
      const colors = getProcessColor(processId);

      for (let i = 0; i < pagesNeeded; i++) {
        const pageEl = document.createElement("div");
        pageEl.className = "page";
        pageEl.id = `page-${processId}-${i}`;

        pageEl.innerHTML = `
          <p id="page-number">P${i}</p>
          <div class="page-content">
            <p>${processId}</p>
            <p>&nbsp;(Waiting for allocation)</p>
          </div>
        `;
        const contentDiv = pageEl.querySelector(".page-content");
        if (contentDiv) {
          contentDiv.style.backgroundColor = colors.bg;
          contentDiv.style.borderBottom = `4px solid ${colors.border}`;
        }
        pagesContainer.appendChild(pageEl);
      }

      if (processIndex < processes.length - 1) {
        const spacer = document.createElement("div");
        spacer.style.gridColumn = "1 / -1";
        spacer.style.minHeight = "12px";
        pagesContainer.appendChild(spacer);
      }

    });
  }
};

/** * Helper to get the color object based on process name.
 * Extracts the number from strings like "Process 1" or "process_1".
 */
const getProcessColor = (procName) => {
  if (!procName) return { bg: "transparent", border: "transparent" };
  const id = parseInt(String(procName).replace(/\D/g, "")) || 0;
  const colorIndex = (id - 1) % processColors.length;
  return processColors[colorIndex];
};

const updatePagingUI = (memoryFrames) => {
  const pagesContainer = document.querySelector(".pages-container");
  const framesContainer = document.querySelector(".frames-container");
  const tableContainer = document.querySelector("#page-table-body");
  
  if (!memoryFrames) return;

  const getNum = (val) => parseInt(String(val).replace(/\D/g, "")) || 0;

  // 1. Update Physical Frames (Right Side)
  if (framesContainer) {
    framesContainer.innerHTML = "";
    Object.values(memoryFrames.frames).forEach((frame) => {
      const frameEl = document.createElement("div");
      frameEl.className = "frame";
      frameEl.id = `frame-${frame.id}`;

      let statusLabel = "Free";
      let usageInfo = `<p>${frame.size} KB</p>`;

      if (frame.status === "Occupied") {
        const pageIndex = Number.isFinite(frame.page) ? frame.page - 1 : "";
        statusLabel = `${frame.process}`;
        const colors = getProcessColor(frame.process);
        // usageInfo = `<p><strong>${frame.used}</strong>&nbsp;/&nbsp;${frame.size} KB</p>`;
        
        frameEl.innerHTML = `
          <p id="frame-number">F${frame.id}</p>
          <div class="frame-content" style="grid-template-columns: repeat(3, 1fr);">
            <p>${statusLabel}</p>
            <p>Page ${pageIndex}</p>
            ${usageInfo}
          </div>
        `;
        
        const contentDiv = frameEl.querySelector(".frame-content");
        if (contentDiv) {
          contentDiv.style.backgroundColor = colors.bg;
          contentDiv.style.borderBottom = `4px solid ${colors.border}`;
        }
      } else {
        frameEl.innerHTML = `
          <p id="frame-number">F${frame.id}</p>
          <div class="frame-content">
            <p>${statusLabel}</p>
            ${usageInfo}
          </div>
        `;
      }
      
      framesContainer.appendChild(frameEl);
    });
  }

  // 2. Update Virtual Pages (Left Side) - Show frame assignments as they happen
  if (pagesContainer) {
    const pageElements = pagesContainer.querySelectorAll(".page");
    
    pageElements.forEach((pageEl) => {
      const pageId = pageEl.id; // format: "page-process_1-0"
      if (!pageId) return;
      
      const parts = pageId.replace("page-", "").split("-");
      const pageNumStr = parts[parts.length - 1];
      const procName = pageId.replace("page-", "").replace(`-${pageNumStr}`, "");
      const pageNum = parseInt(pageNumStr);

      // Find the frame that has this process and page
      let allocatedFrame = null;
      Object.values(memoryFrames.frames).forEach((frame) => {
        if (frame.process === procName && frame.page === pageNum + 1) {
          allocatedFrame = frame;
        }
      });

      if (allocatedFrame) {
        // Page has been allocated - show process name and memory usage
        const { pageSize } = getPagingInputs();
        
        pageEl.innerHTML = `
          <p id="page-number">P${pageNum}</p>
          <div class="page-content">
            <p>${procName}</p>
            <p>${allocatedFrame.used}KB</p>
          </div>
        `;
        
        const colors = getProcessColor(procName);
        const contentDiv = pageEl.querySelector(".page-content");
        if (contentDiv) {
          contentDiv.style.backgroundColor = colors.bg;
          contentDiv.style.borderBottom = `4px solid ${colors.border}`;
        }
      }
    });
  }

  // 3. Update Page Table
  if (tableContainer) {
    tableContainer.innerHTML = "";

    const frameToPageMap = {};
    const getNum = (val) => parseInt(String(val).replace(/\D/g, "")) || 0;
    

    Object.values(memoryFrames.frames).forEach((frame) => {
      if (frame.status === "Occupied") {
        frameToPageMap[frame.id] = { proc: frame.process, page: frame.page - 1 };
      }
    });

    Object.entries(frameToPageMap)
      .sort((a, b) => {
        const procA = getNum(a[1].proc);
        const procB = getNum(b[1].proc);
        if (procA !== procB) return procA - procB;
        return a[1].page - b[1].page;
      })
      .forEach(([frameId, data]) => {
        const rowEl = document.createElement("tr");
        rowEl.className = "page-table-row";
        const colors = getProcessColor(data.proc);
        rowEl.style.borderLeft = `8px solid ${colors.bg}`;

        rowEl.innerHTML = `
          <td class="table-column proc-id">${data.proc}</td>
          <td class="table-column page-num">Page ${data.page}</td>
          <td class="table-column frame-num">Frame ${frameId}</td>
        `;
        tableContainer.appendChild(rowEl);
      });
  }
};


const followAllocatedFrame = (frameId) => {
  if (!frameId) return;
  const frameEl = document.getElementById(`frame-${frameId}`);
  if (!frameEl) return;

  document
    .querySelectorAll(".frames-container .frame .frame-content.current, .pages-container .page .frame-content.current")
    .forEach((content) => content.classList.remove("current"));

  const contentEl = frameEl.querySelector(".frame-content");
  if (contentEl) {
    contentEl.classList.add("current");
    contentEl.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }

  const pageMatch = contentEl
    ? contentEl.querySelector("p")?.textContent?.trim().match(/^(.+?)\s*-\s*Page\s*(\d+)$/)
    : null;

  if (pageMatch) {
    const procName = pageMatch[1];
    const pageNum = Number(pageMatch[2]);
    const pageEl = document.getElementById(`page-${procName}-${pageNum}`);
    if (pageEl) {
      const pageContent = pageEl.querySelector(".frame-content");
      if (pageContent) {
        pageContent.classList.add("current");
        pageEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    }
  } else if (frameEl.scrollIntoView) {
    frameEl.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
};

// Synchronous scrolling
// const pagesContainer = document.querySelector('.pages-container');
// const framesContainer = document.querySelector('.frames-container');

// pagesContainer.addEventListener('scroll', () => {
//     framesContainer.scrollTop = pagesContainer.scrollTop;
// });

// framesContainer.addEventListener('scroll', () => {
//     pagesContainer.scrollTop = framesContainer.scrollTop;
// });
