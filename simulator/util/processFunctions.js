// ========== PROCESS FUNCTIONS ==========
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

// const processContainer = document.querySelector(".process-container");
let processIdCounter = processContainer
  ? processContainer.querySelectorAll(".process").length + 1
  : 1;

// Simulation state shared with the main script
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

const getActiveProcessContainer = () => {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');
  const segPagingView = document.getElementById('segmentation-paging-view');
  const mainGrid = document.querySelector('.main-grid.segmentation');

  const isVisible = (element) => {
    if (!element) return false;
    const display = window.getComputedStyle(element).display;
    return display !== 'none';
  };

  if (segPagingView && isVisible(segPagingView)) {
    return segPagingView.querySelector('.process-container');
  }
  if (segmentationView && isVisible(segmentationView)) {
    return segmentationView.querySelector('.process-container');
  }
  if (pagingView && isVisible(pagingView)) {
    return pagingView.querySelector('.process-container');
  }
  if (standardView && isVisible(standardView)) {
    return standardView.querySelector('.process-container');
  }
  if (mainGrid && isVisible(mainGrid)) {
    return mainGrid.querySelector('.process-container');
  }
  return document.querySelector('.process-container');
};

const highlightCurrentProcess = () => {
  document.querySelectorAll('.process').forEach((p) => p.classList.remove('current'));
  const activeContainer = getActiveProcessContainer();
  if (!activeContainer) return;

  const processes = Array.from(activeContainer.querySelectorAll('.process'));
  if (!processes.length) return;

  let activeProcess = processes[currentStep];
  if (!activeProcess) {
    const expectedLabel = `Process ${currentStep + 1}`;
    activeProcess = processes.find((process) => {
      const label = process.querySelector('.process-content p:first-child');
      return label && label.textContent.trim() === expectedLabel;
    });
  }

  if (!activeProcess) return;
  activeProcess.classList.add('current');
  activeProcess.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'start',
  });
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
    let finalValue = valid ? parsed : null;
    if (finalValue !== null && finalValue > 1000000) {
      finalValue = 1000000;
    }
    cleanup(finalValue);
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
