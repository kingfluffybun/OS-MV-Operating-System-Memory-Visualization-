// ========== PARTITION VALIDATION FUNCTIONS ==========

/**
 * Get the total memory size from global settings
 * @returns {number} Total memory in KB
 */
const getTotalMemorySize = () => {
  const globalSetting = document.querySelector('.global-setting-input div:first-child input');
  return globalSetting ? parseInt(globalSetting.value, 10) || 0 : 0;
};

/**
 * Get the page size / frame size from global settings
 * @returns {number} Page size in KB
 */
const getPageSize = () => {
  const pageSizeInput = document.querySelector('.global-setting-input div:last-child input');
  return pageSizeInput ? parseInt(pageSizeInput.value, 10) || 1 : 1;
};

/**
 * Update the total memory info bar display
 */
const updateMemoryInfoBar = () => {
  const totalMemory = getTotalMemorySize();
  const pageSize = getPageSize();
  const frames = pageSize > 0 ? Math.floor(totalMemory / pageSize) : 0;

  const infoBar = document.querySelector('.total-memory-info-bar p');
  if (infoBar) {
    infoBar.textContent = `${totalMemory} KB ÷ ${pageSize} KB per Pages = ${frames} Frames`;
  }
};

/**
 * Update the total partition size display when total memory changes
 */
const updateTotalPartitionDisplay = () => {
  const stats = getPartitionStatistics();
  const totalPartitionDisplay = document.querySelector('.partition-setting .total-partition div p:last-child');
  const progressBar = document.querySelector('.partition-setting .partition-fill');

  if (totalPartitionDisplay) {
    totalPartitionDisplay.textContent = `${stats.currentSum} / ${stats.totalMemory} KB (${stats.percentage.toFixed(1)}%)`;
  }

  if (progressBar) {
    progressBar.style.width = `${stats.percentage}%`;
  }
};

/**
 * Get all block sizes from the partition setting
 * @returns {number[]} Array of block sizes in KB
 */
const getPartitionBlockSizes = () => {
  const partitionContainer = document.querySelector('.partition-setting .process-container');
  if (!partitionContainer) return [];

  return Array.from(partitionContainer.querySelectorAll('.process'))
    .map((block) => {
      const sizeEl = block.querySelector('.process-content p:nth-child(2)');
      const size = sizeEl ? parseInt(sizeEl.textContent, 10) : NaN;
      return Number.isNaN(size) ? null : size;
    })
    .filter((size) => size !== null && size > 0);
};

/**
 * Calculate the current sum of all blocks
 * @returns {number} Current total in KB
 */
const getCurrentPartitionSum = () => {
  return getPartitionBlockSizes().reduce((sum, size) => sum + size, 0);
};

/**
 * VALIDATION: Check the partition sum status
 * @returns {Object} { status: 'LESS' | 'EQUAL' | 'GREATER', currentSum: number, totalMemory: number, gap: number }
 */
const validatePartitionSum = () => {
  const totalMemory = getTotalMemorySize();
  const currentSum = getCurrentPartitionSum();
  const gap = totalMemory - currentSum;

  let status = 'LESS';
  if (currentSum === totalMemory) status = 'EQUAL';
  else if (currentSum > totalMemory) status = 'GREATER';

  return {
    status,
    currentSum,
    totalMemory,
    gap,
  };
};

/**
 * INPUT HANDLING: Check if adding a block would exceed total memory
 * @param {number} blockSize - Size of the block to add in KB
 * @returns {Object} { canAdd: boolean, reason: string, remaining: number }
 */
const canAddBlock = (blockSize) => {
  const totalMemory = getTotalMemorySize();
  const currentSum = getCurrentPartitionSum();
  const newSum = currentSum + blockSize;

  if (newSum > totalMemory) {
    return {
      canAdd: false,
      reason: `Adding ${blockSize} KB would exceed total memory. Maximum allowed: ${totalMemory - currentSum} KB`,
      remaining: totalMemory - currentSum,
    };
  }

  return {
    canAdd: true,
    reason: `Block can be added. Remaining after: ${totalMemory - newSum} KB`,
    remaining: totalMemory - newSum,
  };
};

/**
 * INPUT HANDLING: Validate and process block size input
 * @param {string|number} inputValue - The user's input value
 * @returns {Object} { isValid: boolean, value: number, message: string }
 */
const validateBlockInput = (inputValue) => {
  const parsed = parseInt(inputValue, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return {
      isValid: false,
      value: 0,
      message: 'Block size must be a positive number.',
    };
  }

  const validation = canAddBlock(parsed);
  if (!validation.canAdd) {
    return {
      isValid: false,
      value: parsed,
      message: validation.reason,
    };
  }

  return {
    isValid: true,
    value: parsed,
    message: `Block size valid. ${validation.reason}`,
  };
};

/**
 * UI FEEDBACK: Calculate progress bar percentage
 * @returns {number} Percentage (0-100) of memory used
 */
const calculateProgressPercentage = () => {
  const totalMemory = getTotalMemorySize();
  const currentSum = getCurrentPartitionSum();

  if (totalMemory === 0) return 0;
  const percentage = (currentSum / totalMemory) * 100;
  return Math.min(percentage, 100); // Cap at 100%
};

/**
 * UI FEEDBACK: Calculate remaining memory space
 * @returns {number} Remaining memory in KB
 */
const calculateRemainingSpace = () => {
  const totalMemory = getTotalMemorySize();
  const currentSum = getCurrentPartitionSum();
  return Math.max(totalMemory - currentSum, 0);
};

/**
 * UI FEEDBACK: Get detailed partition statistics
 * @returns {Object} Statistics object for UI display
 */
const getPartitionStatistics = () => {
  const totalMemory = getTotalMemorySize();
  const currentSum = getCurrentPartitionSum();
  const remaining = calculateRemainingSpace();
  const percentage = calculateProgressPercentage();
  const validation = validatePartitionSum();

  return {
    totalMemory,
    currentSum,
    remaining,
    percentage,
    status: validation.status,
    isReady: validation.status === 'EQUAL',
  };
};

/**
 * UI FEEDBACK: Update progress bar display
 */
const updatePartitionProgressBar = () => {
  const stats = getPartitionStatistics();
  const progressBar = document.querySelector('.partition-setting .partition-fill');
  const totalPartitionDisplay = document.querySelector('.partition-setting .total-partition p:last-child');

  if (progressBar) {
    progressBar.style.width = `${stats.percentage}%`;
  }

  if (totalPartitionDisplay) {
    totalPartitionDisplay.textContent = `${stats.currentSum} / ${stats.totalMemory} KB (${stats.percentage.toFixed(1)}%)`;
  }
};

/**
 * INPUT HANDLING: Automatically create a "Final Block" to fill remaining space
 * @returns {Object} { success: boolean, message: string, blockSize: number }
 */
const autoFillFinalBlock = () => {
  const stats = getPartitionStatistics();

  if (stats.remaining === 0) {
    return {
      success: true,
      message: 'Memory is already full. No final block needed.',
      blockSize: 0,
    };
  }

  if (stats.remaining < 0) {
    return {
      success: false,
      message: 'Cannot create final block. Current allocation exceeds total memory.',
      blockSize: 0,
    };
  }

  // Create final block
  const finalBlockSize = stats.remaining;
  const partitionContainer = document.querySelector('.partition-setting .process-container');

  if (!partitionContainer) {
    return {
      success: false,
      message: 'Partition container not found.',
      blockSize: 0,
    };
  }

  const blockCount = partitionContainer.querySelectorAll('.process').length + 1;
  const finalBlock = createPartitionBlockElement(blockCount, finalBlockSize);
  partitionContainer.appendChild(finalBlock);

  updatePartitionProgressBar();

  return {
    success: true,
    message: `Final block of ${finalBlockSize} KB created to fill remaining space.`,
    blockSize: finalBlockSize,
  };
};

/**
 * Create a partition block element for display
 * @param {number} blockNumber - Block number/ID
 * @param {number} sizeKb - Block size in KB
 * @returns {HTMLElement} The block element
 */
const createPartitionBlockElement = (blockNumber, sizeKb) => {
  const block = document.createElement('div');
  block.className = 'process';
  block.id = `partition-block-${blockNumber}`;
  block.style.backgroundColor = 'white';
  block.style.borderBottomColor = 'rgba(0, 0, 0, 0.25)';

  block.innerHTML = `
    <div class="process-content">
      <p>Block ${blockNumber}</p>
      <p>${sizeKb}</p>
      <p>&nbsp;KB</p>
    </div>
    <div class="process-action">
      <button type="button" class="edit-process-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil">
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
          <path d="m15 5 4 4"></path>
        </svg>
      </button>
      <button type="button" class="delete-process-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2">
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
          <path d="M3 6h18"></path>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  return block;
};

/**
 * Handle adding a new partition block
 * @param {number} blockSize - Size of the block to add
 * @returns {Object} { success: boolean, message: string }
 */
const addPartitionBlock = (blockSize) => {
  const validation = validateBlockInput(blockSize);

  if (!validation.isValid) {
    return {
      success: false,
      message: validation.message,
    };
  }

  const partitionContainer = document.querySelector('.partition-setting .process-container');
  if (!partitionContainer) {
    return {
      success: false,
      message: 'Partition container not found.',
    };
  }

  const blockCount = partitionContainer.querySelectorAll('.process').length + 1;
  const newBlock = createPartitionBlockElement(blockCount, validation.value);
  partitionContainer.appendChild(newBlock);

  updatePartitionProgressBar();

  return {
    success: true,
    message: `Block ${blockCount} of ${validation.value} KB added successfully.`,
  };
};

/**
 * Check if simulation can start
 * @returns {Object} { canStart: boolean, message: string, action: string }
 */
const canStartSimulation = () => {
  const stats = getPartitionStatistics();

  if (stats.isReady) {
    return {
      canStart: true,
      message: 'Memory allocation is complete. Simulation ready to start.',
      action: 'START',
    };
  }

  if (stats.remaining > 0) {
    return {
      canStart: false,
      message: `Memory is incomplete. ${stats.remaining} KB remaining. Auto-fill the final block?`,
      action: 'PROMPT_AUTO_FILL',
    };
  }

  if (stats.remaining < 0) {
    return {
      canStart: false,
      message: 'Memory allocation exceeds total. Please remove or resize blocks.',
      action: 'ERROR',
    };
  }

  return {
    canStart: false,
    message: 'Unknown state. Cannot start simulation.',
    action: 'ERROR',
  };
};

/**
 * Handle simulation start with partition validation
 * @returns {Object} { proceed: boolean, message: string }
 */
const handleSimulationStart = () => {
  const readiness = canStartSimulation();

  if (readiness.action === 'START') {
    return {
      proceed: true,
      message: readiness.message,
    };
  }

  if (readiness.action === 'PROMPT_AUTO_FILL') {
    const result = autoFillFinalBlock();
    if (result.success) {
      return {
        proceed: true,
        message: `${readiness.message} -> ${result.message}`,
      };
    }
    return {
      proceed: false,
      message: result.message,
    };
  }

  return {
    proceed: false,
    message: readiness.message,
  };
};

/**
 * Initialize partition event listeners
 */
const initPartitionListeners = () => {
  const addBlockBtn = document.getElementById('add-partition-btn');
  const blockSizeInput = document.getElementById('partition-size-input');
  const randomizeBtn = document.getElementById('randomize-partition-btn');
  const partitionContainer = document.getElementById('partition-container');

  if (addBlockBtn && blockSizeInput) {
    addBlockBtn.addEventListener('click', () => {
      const size = parseInt(blockSizeInput.value, 10);
      const result = addPartitionBlock(size);

      if (result.success) {
        blockSizeInput.value = '';
        appendConsoleMessage(result.message);
      } else {
        appendConsoleMessage(`⚠️ ${result.message}`);
      }
    });
  }

  if (randomizeBtn) {
    randomizeBtn.addEventListener('click', () => {
      const totalMemory = getTotalMemorySize();
      const remaining = calculateRemainingSpace();
      if (remaining <= 0) {
            appendConsoleMessage('⚠️ Memory is already full.');
            return;
        }
        // random value para sa blocks
        const min = 5;
        const max = 8;
        let size = Math.pow(2, Math.floor(Math.random() * (max - min + 1)) + min);
        if (size > remaining) {
            size = remaining;
        }
        const result = addPartitionBlock(size);
        if (result.success) {
            appendConsoleMessage(result.message);
        } else {
            appendConsoleMessage(`⚠️ ${result.message}`);
        }
    });
  }

  if (partitionContainer) {
    partitionContainer.addEventListener('click', (event) => {
      if (event.target.closest('.delete-process-btn')) {
        const block = event.target.closest('.process');
        if (block) {
          block.remove();
          renumberPartitionBlocks();
          updatePartitionProgressBar();
          appendConsoleMessage('Block deleted.');
        }
      }

      if (event.target.closest('.edit-process-btn')) {
        const block = event.target.closest('.process');
        if (block) {
          const sizeEl = block.querySelector('.process-content p:nth-child(2)');
          if (sizeEl) {
            startInlineEditPartition(sizeEl, () => {
              updatePartitionProgressBar();
            });
          }
        }
      }
    });
  }
};

/**
 * Start inline editing for partition block size
 * @param {HTMLElement} element - The element to edit
 * @param {Function} onCommit - Callback after edit
 */
const startInlineEditPartition = (element, onCommit) => {
  const oldText = element.textContent.trim();
  const oldValue = parseInt(oldText, 10);
  element.contentEditable = 'true';
  element.dataset.editing = 'true';
  element.classList.add('inline-editable');

  const cleanup = (commitValue) => {
    element.removeAttribute('contenteditable');
    element.classList.remove('inline-editable');
    delete element.dataset.editing;
    element.removeEventListener('blur', onBlur);
    element.removeEventListener('keydown', onKeyDown);

    if (commitValue !== null) {
      const validation = validateBlockInput(commitValue);
      if (validation.isValid) {
        element.textContent = `${validation.value}`;
        onCommit(validation.value);
      } else {
        element.textContent = `${oldValue}`;
        appendConsoleMessage(`⚠️ ${validation.message}`);
      }
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
    if (event.key === 'Enter') {
      event.preventDefault();
      element.blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cleanup(null);
    }
  };

  element.addEventListener('blur', onBlur);
  element.addEventListener('keydown', onKeyDown);
  element.focus();

  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Get all process sizes from the process setting
 * @returns {number[]} Array of process sizes in KB
 */
const getProcessSettingsSizes = () => {
  const processContainer = document.querySelector('.process-setting .process-container');
  if (!processContainer) return [];

  return Array.from(processContainer.querySelectorAll('.process'))
    .map((process) => {
      const sizeEl = process.querySelector('.process-content p:nth-child(2)');
      const size = sizeEl ? parseInt(sizeEl.textContent, 10) : NaN;
      return Number.isNaN(size) ? null : size;
    })
    .filter((size) => size !== null && size > 0);
};

/**
 * Calculate the current sum of all processes
 * @returns {number} Current total in KB
 */
const getCurrentProcessSum = () => {
  return getProcessSettingsSizes().reduce((sum, size) => sum + size, 0);
};

/**
 * Get the next available process ID
 * @returns {number} Next process ID
 */
const getNextProcessId = () => {
  const processContainer = document.querySelector('.process-setting .process-container');
  if (!processContainer) return 1;

  const processes = processContainer.querySelectorAll('.process');
  return processes.length + 1;
};

/**
 * Create a process element
 * @param {number} processNumber - Process number/ID
 * @param {number} sizeKb - Process size in KB
 * @returns {HTMLElement} The process element
 */
const createProcessSettingElement = (processNumber, sizeKb) => {
  const processColors = [
    { bg: '#FFADAD', border: '#BF8282' },
    { bg: '#FFD6A5', border: '#BFA07C' },
    { bg: '#FDFFB6', border: '#BEBF88' },
    { bg: '#CAFFBF', border: '#98BF8F' },
    { bg: '#9BF6FF', border: '#7DC6CE' },
    { bg: '#A0C4FF', border: '#7893BF' },
    { bg: '#BDB2FF', border: '#8E85BF' },
    { bg: '#FFC6FF', border: '#BF94BF' },
  ];

  const colorIndex = (processNumber - 1) % processColors.length;
  const colorPair = processColors[colorIndex];

  const process = document.createElement('div');
  process.className = 'process';
  process.id = `process-${processNumber}`;
  process.setAttribute('data-bg', colorPair.bg);
  process.setAttribute('data-border', colorPair.border);
  process.style.backgroundColor = colorPair.bg;
  process.style.borderBottomColor = colorPair.border;

  process.innerHTML = `
    <div class="process-content">
      <p>Process ${processNumber}</p>
      <p>${sizeKb}</p>
      <p>&nbsp;KB</p>
    </div>
    <div class="process-action">
      <button type="button" class="edit-process-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil">
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
          <path d="m15 5 4 4"></path>
        </svg>
      </button>
      <button type="button" class="delete-process-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2">
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
          <path d="M3 6h18"></path>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  return process;
};

/**
 * Add a new process to process settings
 * @param {number} processSize - Size of the process to add
 * @returns {Object} { success: boolean, message: string }
 */
const addProcessSetting = (processSize) => {
  const parsed = parseInt(processSize, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return {
      success: false,
      message: 'Process size must be a positive number.',
    };
  }

  const processContainer = document.querySelector('.process-setting .process-container');
  if (!processContainer) {
    return {
      success: false,
      message: 'Process container not found.',
    };
  }

  const processId = getNextProcessId();
  const newProcess = createProcessSettingElement(processId, parsed);
  processContainer.appendChild(newProcess);
  updateProcessSettingsSummary();

  return {
    success: true,
    message: `Process ${processId} of ${parsed} KB added successfully.`,
  };
};

/**
 * Start inline editing for process size
 * @param {HTMLElement} element - The element to edit
 * @param {Function} onCommit - Callback after edit
 */
const startInlineEditProcess = (element, onCommit) => {
  const oldText = element.textContent.trim();
  const oldValue = parseInt(oldText, 10);
  element.contentEditable = 'true';
  element.dataset.editing = 'true';
  element.classList.add('inline-editable');

  const cleanup = (commitValue) => {
    element.removeAttribute('contenteditable');
    element.classList.remove('inline-editable');
    delete element.dataset.editing;
    element.removeEventListener('blur', onBlur);
    element.removeEventListener('keydown', onKeyDown);

    if (commitValue !== null) {
      const parsed = parseInt(commitValue, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        element.textContent = `${parsed}`;
        onCommit(parsed);
      } else {
        element.textContent = `${oldValue}`;
        appendConsoleMessage('⚠️ Process size must be a positive number.');
      }
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
    if (event.key === 'Enter') {
      event.preventDefault();
      element.blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cleanup(null);
    }
  };

  element.addEventListener('blur', onBlur);
  element.addEventListener('keydown', onKeyDown);
  element.focus();

  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Initialize process setting event listeners
 */
const initProcessListeners = () => {
  const processSettingSection = document.querySelector('.process-setting');
  if (!processSettingSection) return;

  const addProcessBtn = document.getElementById('add-process-btn');
  const processSizeInput = document.getElementById('process-size-input');
  const randomizeBtn = document.getElementById('randomize-process-btn');
  const processContainer = document.getElementById('process-container');

  if (addProcessBtn && processSizeInput) {
    addProcessBtn.addEventListener('click', () => {
      const size = parseInt(processSizeInput.value, 10);
      const result = addProcessSetting(size);

      if (result.success) {
        processSizeInput.value = '';
        appendConsoleMessage(result.message);
      } else {
        appendConsoleMessage(`⚠️ ${result.message}`);
      }
    });
  }

  if (randomizeBtn && processSizeInput) {
    randomizeBtn.addEventListener('click', () => {
        // random value para sa processes
        const min = 5;
        const max = 8;
        const size = Math.pow(2, Math.floor(Math.random() * (max - min + 1)) + min);
        const result = addProcessSetting(size);
    });
  }

  if (processContainer) {
    processContainer.addEventListener('click', (event) => {
      if (event.target.closest('.delete-process-btn')) {
        const process = event.target.closest('.process');
        if (process) {
          process.remove();
          renumberProcessesInSettings();
          appendConsoleMessage('Process deleted.');
        }
      }

      if (event.target.closest('.edit-process-btn')) {
        const process = event.target.closest('.process');
        if (process) {
          const sizeEl = process.querySelector('.process-content p:nth-child(2)');
          if (sizeEl) {
            startInlineEditProcess(sizeEl, () => {
              updateProcessSettingsSummary();
            });
          }
        }
      }
    });
  }
};

/**
 * Renumber processes after deletion
 */
const renumberProcessesInSettings = () => {
  const processContainer = document.querySelector('.process-setting .process-container');
  if (!processContainer) return;

  const processColors = [
    { bg: '#FFADAD', border: '#BF8282' },
    { bg: '#FFD6A5', border: '#BFA07C' },
    { bg: '#FDFFB6', border: '#BEBF88' },
    { bg: '#CAFFBF', border: '#98BF8F' },
    { bg: '#9BF6FF', border: '#7DC6CE' },
    { bg: '#A0C4FF', border: '#7893BF' },
    { bg: '#BDB2FF', border: '#8E85BF' },
    { bg: '#FFC6FF', border: '#BF94BF' },
  ];

  const processes = processContainer.querySelectorAll('.process');
  processes.forEach((process, index) => {
    const newId = index + 1;
    const label = process.querySelector('.process-content p:first-child');
    if (label) label.textContent = `Process ${newId}`;

    process.id = `process-${newId}`;

    const colorIndex = index % processColors.length;
    const colorPair = processColors[colorIndex];
    process.setAttribute('data-bg', colorPair.bg);
    process.setAttribute('data-border', colorPair.border);
    process.style.backgroundColor = colorPair.bg;
    process.style.borderBottomColor = colorPair.border;
  });

  updateProcessSettingsSummary();
};

/**
 * Renumber partition blocks after deletion
 */
const renumberPartitionBlocks = () => {
  const partitionContainer = document.querySelector('.partition-setting .process-container');
  if (!partitionContainer) return;

  const blocks = partitionContainer.querySelectorAll('.process');
  blocks.forEach((block, index) => {
    const newId = index + 1;
    const label = block.querySelector('.process-content p:first-child');
    if (label) label.textContent = `Block ${newId}`;
    block.id = `partition-block-${newId}`;
  });
};

/**
 * Update the process count and total size in the summary
 */
const updateProcessSettingsSummary = () => {
  const processContainer = document.querySelector('.process-setting .process-container');
  const totalProcessDiv = document.querySelector('.process-setting .total-process div');

  if (!processContainer || !totalProcessDiv) return;

  const processes = processContainer.querySelectorAll('.process');
  const processCount = processes.length;
  const totalSize = getProcessSettingsSizes().reduce((sum, size) => sum + size, 0);

  const countDisplay = totalProcessDiv.querySelector('p:first-child');
  const sizeDisplay = totalProcessDiv.querySelector('p:last-child');

  if (countDisplay) {
    countDisplay.textContent = `${processCount} ${processCount === 1 ? 'Process' : 'Processes'}`;
  }

  if (sizeDisplay) {
    sizeDisplay.textContent = `${totalSize} KB`;
  }
};

/**
 * Initialize global settings event listeners
 */
const initGlobalSettingsListeners = () => {
  const totalMemoryInput = document.querySelector('.global-setting-input div:first-child input');
  const pageSizeInput = document.querySelector('.global-setting-input div:last-child input');

  const updateAll = () => {
    updateTotalPartitionDisplay();
    updateMemoryInfoBar();
  };

  if (totalMemoryInput) {
    totalMemoryInput.addEventListener('change', updateAll);
    totalMemoryInput.addEventListener('input', updateAll);
  }

  if (pageSizeInput) {
    pageSizeInput.addEventListener('change', updateAll);
    pageSizeInput.addEventListener('input', updateAll);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initGlobalSettingsListeners();
  initPartitionListeners();
  initProcessListeners();
  updatePartitionProgressBar();
  updateTotalPartitionDisplay();
  updateMemoryInfoBar();
});

// Start Comparison
function startComparison(event) {
  event.preventDefault();

  // Validate inputs
    const totalMemory = parseInt(document.getElementById('total-memory').value, 10);
    const pageSize = parseInt(document.getElementById('page-size').value, 10);
    
    // Get processes
    const processElements = document.querySelectorAll('#process-container .process');
    const processes = Array.from(processElements).map(el => {
        const sizeEl = el.querySelector('.process-content p:nth-child(2)');
        return sizeEl ? parseInt(sizeEl.textContent, 10) : 0;
    }).filter(s => s > 0);
    
    if (processes.length === 0) {
        alert('Please add at least one process.');
        return;
    }
    
    // Get partitions
    const partitionElements = document.querySelectorAll('#partition-container .process');
    const partitions = Array.from(partitionElements).map(el => {
        const sizeEl = el.querySelector('.process-content p:nth-child(2)');
        return sizeEl ? parseInt(sizeEl.textContent, 10) : 0;
    }).filter(s => s > 0);
    
    // Validate partition sum equals total memory
    const partitionSum = partitions.reduce((a, b) => a + b, 0);
    if (partitionSum !== totalMemory) {
        // Auto-fill or prompt
        if (partitionSum < totalMemory) {
            const remaining = totalMemory - partitionSum;
            const result = autoFillFinalBlock();
            if (!result.success) {
                alert('Partition allocation incomplete. Please fix.');
                return;
            }
        } else {
            alert('Partition allocation exceeds total memory. Please fix.');
            return;
        }
    }
    
    // Store comparison data
    const comparisonData = {
        totalMemory: totalMemory,
        pageSize: pageSize,
        processes: processes,
        partitions: partitions,
        timestamp: Date.now()
    };
    
    sessionStorage.setItem('comparisonData', JSON.stringify(comparisonData));
    
    // Redirect to simulation page
    window.location.href = '../comparison/comp-sim.html';
}