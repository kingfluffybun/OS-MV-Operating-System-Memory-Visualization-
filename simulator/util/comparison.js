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
  const addBlockBtn = document.querySelector('.partition-setting #add-process-btn');
  const blockSizeInput = document.querySelector('.partition-setting #process-size');
  const randomizeBtn = document.querySelector('.partition-setting #randomize-value');
  const partitionContainer = document.querySelector('.partition-setting .process-container');

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

  const addProcessBtn = processSettingSection.querySelector('#add-process-btn');
  const processSizeInput = processSettingSection.querySelector('#process-size');
  const randomizeBtn = processSettingSection.querySelector('#randomize-value');
  const processContainer = processSettingSection.querySelector('.process-container');

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

// ========== SIMULATION FUNCTIONS ==========
function startSimulationCompare(event) {
  event.preventDefault();

  const readiness = handleSimulationStart();
  if (!readiness.proceed) {
    if (readiness.action === 'PROMPT_AUTO_FILL') {
      const fillResult = autoFillFinalBlock();
      if (!fillResult.success) {
        alert(readiness.message);
        return;
      }
    } else {
      alert(readiness.message);
      return;
    }
  }

  const inputs = {
    totalMemory: getTotalMemorySize(),
    pageSize: getPageSize(),
    processes: getProcessSettingsSizes(),
    partitions: getPartitionBlockSizes(),
  };

  sessionStorage.setItem('compareInputs', JSON.stringify(inputs));
  sessionStorage.setItem('compareMode', 'true');

  window.location.href = 'simulation/index.html';
}

const ALL_ALGORITHMS = [
  { 
    id: 'first-fit-fixed',
    name: 'First-Fit', 
    type: 'Fixed', 
    category: 'contiguous', 
    script: '../util/algos/firstfit.js' 
  },
  {
    id: 'first-fit-dynamic',
    name: 'First-Fit', 
    type: 'Dynamic', 
    category: 'contiguous', 
    script: '../util/algos/firstfit.js'
  },
  {
    id: 'next-fit-fixed',
    name: 'Next-Fit', 
    type: 'Fixed', 
    category: 'contiguous', 
    script: '../util/algos/nextfit.js'
  },
  {
    id: 'next-fit-dynamic',
    name: 'Next-Fit', 
    type: 'Dynamic', 
    category: 'contiguous', 
    script: '../util/algos/nextfit.js'
  },
  {
    id: 'best-fit-fixed',
    name: 'Best-Fit', 
    type: 'Fixed', 
    category: 'contiguous', 
    script: '../util/algos/bestfit.js'
  },
  {
    id: 'best-fit-dynamic',
    name: 'Best-Fit', 
    type: 'Dynamic', 
    category: 'contiguous', 
    script: '../util/algos/bestfit.js'
  },
  {
    id: 'worst-fit-fixed',
    name: 'Worst-Fit', 
    type: 'Fixed', 
    category: 'contiguous', 
    script: '../util/algos/worstfit.js'
  },
  {
    id: 'worst-fit-dynamic',
    name: 'Worst-Fit', 
    type: 'Dynamic', 
    category: 'contiguous', 
    script: '../util/algos/worstfit.js'
  },
  {
    id: 'paging',
    name: 'Paging', 
    type: 'Paging', 
    category: 'non-contiguous', 
    script: '../util/algos/paging.js'
  },
  {
    id: 'segmentation',
    name: 'Segmentation', 
    type: 'Segmentation', 
    category: 'non-contiguous', 
    script: '../util/algos/segmentation.js'
  },
  {
    id: 'segmentation-paging',
    name: 'Segmentation + Paging', 
    type: 'Segmentation+Paging', 
    category: 'non-contiguous', 
    script: '../util/algos/paging-segment.js'
  }
];

let compareInstances = [];
let sharedInputs = null;

function compareSimulationLoad() {
  const stored = sessionStorage.getItem('compareInputs');
  if (!stored) {
    alert('No simulation data found.');
    window.location.href = 'index.html';
    return;
  }

  sharedInputs = JSON.parse(stored);

  buildCompareGrid();

  loadAllAlgorithmScripts().then(() => {
    initAllInstances();
    setupGlobalControls();
  });
}

function buildCompareGrid() {
  const container = document.getElementById('compare-instances');
  if (!container) return;

  container.innerHTML = '';

  ALL_ALGORITHMS.forEach((algo, index) => {
    const card = createAlgorithmCard(algo, index);
    container.appendChild(card);
  });
}

function createAlgorithmCard(algo, index) {
  const card = document.createElement('div');
  card.className = 'compare-instance';
  card.setAttribute('data-algo', algo.id);
  card.setAttribute('data-index', index);

  const isPaging = algo.category === 'non-contiguous';
  const isSegmentation = algo.category === 'non-contiguous' && algo.type === 'Segmentation';
  const isSegmentationPaging = algo.category === 'non-contiguous' && algo.type === 'Segmentation+Paging';

  card.innerHTML = `
    <div class="instance-header">
      <div>
        <h3>${algo.name}</h3>
        <span class="type-badge ${algo.type.toLowerCase().replace('+', '-')}">${algo.type}</span>
      </div>
      <span class="status-badge" id="status-${index}">Ready</span>
    </div>
    <div class="instance-simulation-area" id="sim-area-${index}">
      ${isPaging ? getPagingHTML(index) : getStandardHTML(index)}
    </div>
    <div class="instance-stats">
      <div><p>Total</p><h4 id="total-${index}">0 KB</h4></div>
      <div><p>Allocated</p><h4 id="allocated-${index}">0 KB</h4></div>
      <div><p>Free</p><h4 id="free-${index}">0 KB</h4></div>
      <div><p>Util</p><h4 id="util-${index}">0%</h4></div>
      <div><p>Success</p><h4 id="success-${index}">0%</h4></div>
      ${algo.type === 'Fixed' ? `<div><p>Int. Frag</p><h4 id="internal-frag-${index}">0 KB</h4></div>` : ''}
      ${algo.type === 'Dynamic' ? `<div><p>Ext. Frag</p><h4 id="external-frag-${index}">0 KB</h4></div>` : ''}
    </div>
    <div class="instance-console" id="console-${index}">
      <p class="console-placeholder">Ready to simulate...</p>
    </div>
  `;
    
  return card;
}

function getStandardHTML(index) {
    return `<div class="simulation-scroll-track" id="sim-track-${index}"></div>`;
}

function getPagingHTML(index) {
    return `
        <div class="paging-layout">
            <div class="paging-section">
                <h4>Virtual Memory (Pages)</h4>
                <div class="pages-container" id="pages-${index}"></div>
            </div>
            <div class="paging-section">
                <h4>Physical Memory (Frames)</h4>
                <div class="frames-container" id="frames-${index}"></div>
            </div>
        </div>
        <div class="page-table-wrapper">
            <table class="page-table-info">
                <thead><tr><th>PID</th><th>Page</th><th>Frame</th></tr></thead>
                <tbody id="page-table-${index}"></tbody>
            </table>
        </div>
    `;
}

// ========== ALGORITHM SCRIPT LOADING ==========

function loadAllAlgorithmScripts() {
    const scripts = [
        '../../util/algos/firstfit.js',
        '../../util/algos/bestfit.js',
        '../../util/algos/worstfit.js',
        '../../util/algos/paging.js',
        '../../util/algos/segmentation.js',
        '../../util/algos/paging-segment.js'
    ];
    
    const promises = scripts.map(src => {
        return new Promise((resolve) => {
            // Check if already loaded
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing || window[src + 'Loaded']) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                window[src + 'Loaded'] = true;
                resolve();
            };
            script.onerror = () => {
                console.warn('Failed to load:', src);
                resolve(); // Continue even if one fails
            };
            document.head.appendChild(script);
        });
    });
    
    return Promise.all(promises);
}

// ========== INSTANCE MANAGEMENT ==========

function initAllInstances() {
    compareInstances = ALL_ALGORITHMS.map((algo, index) => {
        return createInstance(algo, index);
    });
}

function createInstance(algo, index) {
    const container = document.querySelector(`.compare-instance[data-index="${index}"]`);
    
    const instance = {
        index: index,
        algo: algo,
        container: container,
        state: null,
        isPlaying: false,
        playInterval: null,
        currentStep: 0,
        
        // Initialize simulation state
        init: function() {
            this.currentStep = 0;
            
            if (algo.category === 'contiguous') {
                this.initContiguous();
            } else {
                this.initNonContiguous();
            }
            
            this.updateStatus('Ready');
        },
        
        initContiguous: function() {
            // Create linked memory from shared partitions
            const blocks = sharedInputs.partitions.map((size, i) => ({
                id: i + 1,
                size: size,
                status: 'Free',
                processId: null
            }));
            
            this.state = {
                memoryHead: this.createLinkedMemory(blocks),
                processes: [...sharedInputs.processes],
                currentIndex: 0,
                results: {},
                stats: {
                    allocatedSize: 0,
                    successfulAllocations: 0,
                    intFragmentation: 0,
                    extFragmentation: 0
                },
                isDynamic: algo.type === 'Dynamic'
            };
            
            this.renderBlocks(blocks);
            this.updateStats();
        },
        
        initNonContiguous: function() {
            const frameCount = Math.floor(sharedInputs.totalMemory / sharedInputs.pageSize);
            
            this.state = {
                frames: this.createFrames(frameCount, sharedInputs.pageSize),
                processes: [...sharedInputs.processes],
                currentIndex: 0,
                results: {},
                stats: {
                    allocatedSize: 0,
                    successfulAllocations: 0,
                    intFragmentation: 0
                },
                pageSize: sharedInputs.pageSize
            };
            
            this.renderFrames();
            this.updateStats();
        },
        
        createLinkedMemory: function(blocks) {
            let head = null;
            let current = null;
            
            blocks.forEach((block, i) => {
                const node = {
                    id: block.id,
                    size: block.size,
                    status: 'Free',
                    processId: null,
                    next: null,
                    prev: current
                };
                
                if (!head) head = node;
                else current.next = node;
                
                current = node;
            });
            
            return head;
        },
        
        createFrames: function(count, size) {
            return {
                count: count,
                frameSize: size,
                frames: Array(count).fill(null).map((_, i) => ({
                    id: i,
                    processId: null,
                    pageId: null,
                    isFree: true
                }))
            };
        },
        
        // Execute one simulation step
        step: function() {
            if (this.state.currentIndex >= this.state.processes.length) {
                this.updateStatus('Complete');
                return false;
            }
            
            const processSize = this.state.processes[this.state.currentIndex];
            const processId = `Process ${this.state.currentIndex + 1}`;
            
            this.updateStatus('Running');
            
            if (algo.category === 'contiguous') {
                return this.stepContiguous(processId, processSize);
            } else {
                return this.stepNonContiguous(processId, processSize);
            }
        },
        
        stepContiguous: function(processId, size) {
            // Use the algorithm from script.js pattern
            // We temporarily set up the environment the algorithm expects
            
            const isFixed = algo.type === 'Fixed';
            const algoName = algo.name.toLowerCase().replace('-', '');
            
            // Call algorithm function (they're loaded globally from algos/*.js)
            let result;
            
            try {
                if (isFixed) {
                    // Fixed partition algorithms
                    switch(algoName) {
                        case 'firstfit':
                            result = firstFitFixed(this.state.memoryHead, size);
                            break;
                        case 'bestfit':
                            result = bestFitFixed(this.state.memoryHead, size);
                            break;
                        case 'worstfit':
                            result = worstFitFixed(this.state.memoryHead, size);
                            break;
                        default:
                            result = { allocated: false };
                    }
                } else {
                    // Dynamic partition algorithms
                    switch(algoName) {
                        case 'firstfit':
                            result = firstFitDynamic(this.state.memoryHead, size);
                            break;
                        case 'bestfit':
                            result = bestFitDynamic(this.state.memoryHead, size);
                            break;
                        case 'worstfit':
                            result = worstFitDynamic(this.state.memoryHead, size);
                            break;
                        default:
                            result = { allocated: false };
                    }
                }
            } catch(e) {
                console.error('Algorithm error:', e);
                result = { allocated: false, error: e.message };
            }
            
            if (result.allocated) {
                // Update state
                this.state.results[processId] = {
                    status: 'Allocated',
                    block: result.blockId,
                    size: size,
                    fragmentation: result.fragmentation || 0
                };
                
                this.state.stats.allocatedSize += size;
                this.state.stats.successfulAllocations++;
                this.state.stats.intFragmentation += result.fragmentation || 0;
                
                if (result.newMemoryHead) {
                    this.state.memoryHead = result.newMemoryHead;
                }
                
                // Update visual
                this.updateBlockVisual(result.blockId, processId, size, result.fragmentation, result.wasteElement);
                this.log(`${processId} (${size}KB) allocated to Block ${result.blockId}`);
            } else {
                this.state.results[processId] = {
                    status: 'Unallocated',
                    block: 'None',
                    size: size
                };
                this.log(`${processId} (${size}KB) FAILED to allocate`);
            }
            
            this.state.currentIndex++;
            this.updateStats();
            
            if (this.state.currentIndex >= this.state.processes.length) {
                this.updateStatus('Complete');
            }
            
            return true;
        },
        
        stepNonContiguous: function(processId, size) {
            const pagesNeeded = Math.ceil(size / this.state.pageSize);
            const frames = this.state.frames;
            const allocatedFrames = [];
            
            // Find free frames
            for (let i = 0; i < frames.frames.length && allocatedFrames.length < pagesNeeded; i++) {
                if (frames.frames[i].isFree) {
                    frames.frames[i].isFree = false;
                    frames.frames[i].processId = processId;
                    frames.frames[i].pageId = allocatedFrames.length;
                    allocatedFrames.push(i);
                }
            }
            
            if (allocatedFrames.length === pagesNeeded) {
                this.state.results[processId] = {
                    status: 'Allocated',
                    frames: allocatedFrames,
                    size: size,
                    pagesNeeded: pagesNeeded
                };
                
                this.state.stats.allocatedSize += size;
                this.state.stats.successfulAllocations++;
                
                const lastPageSize = size % this.state.pageSize || this.state.pageSize;
                const internalFrag = this.state.pageSize - lastPageSize;
                this.state.stats.intFragmentation += internalFrag;
                
                this.updateFrameVisuals(processId, allocatedFrames);
                this.log(`${processId} (${size}KB) -> Frames [${allocatedFrames.join(', ')}]`);
            } else {
                // Rollback
                allocatedFrames.forEach(idx => {
                    frames.frames[idx].isFree = true;
                    frames.frames[idx].processId = null;
                    frames.frames[idx].pageId = null;
                });
                
                this.state.results[processId] = {
                    status: 'Unallocated',
                    frames: [],
                    size: size
                };
                this.log(`${processId} (${size}KB) FAILED - not enough frames`);
            }
            
            this.state.currentIndex++;
            this.updateStats();
            
            if (this.state.currentIndex >= this.state.processes.length) {
                this.updateStatus('Complete');
            }
            
            return true;
        },
        
        // Rendering methods
        renderBlocks: function(blocks) {
            const track = this.container.querySelector(`#sim-track-${this.index}`);
            if (!track) return;
            
            track.innerHTML = '';
            blocks.forEach(block => {
                const div = document.createElement('div');
                div.className = 'block';
                div.id = `block-${this.index}-${block.id}`;
                div.innerHTML = `
                    <p>Block ${block.id}</p>
                    <div class="block-content">
                        <div class="block-status">Free</div>
                        <div class="block-size">
                            <h2><span class="block-size-value">${block.size}</span></h2>
                            <h2>&nbsp;KB</h2>
                        </div>
                    </div>
                `;
                track.appendChild(div);
            });
        },
        
        renderFrames: function() {
            const container = this.container.querySelector(`#frames-${this.index}`);
            if (!container) return;
            
            container.innerHTML = '';
            this.state.frames.frames.forEach(frame => {
                const div = document.createElement('div');
                div.className = 'frame';
                div.id = `frame-${this.index}-${frame.id}`;
                div.textContent = `F${frame.id}`;
                container.appendChild(div);
            });
        },
        
        updateBlockVisual: function(blockId, processId, size, fragmentation, wasteElement) {
            const block = this.container.querySelector(`#block-${this.index}-${blockId}`);
            if (!block) return;
            
            const colorIndex = this.state.currentIndex - 1;
            const color = getProcessColor(colorIndex);
            
            block.style.background = color;
            block.style.borderBottomColor = getProcessBorderColor(colorIndex);
            block.classList.add('allocated');
            
            const statusEl = block.querySelector('.block-status');
            if (statusEl) statusEl.textContent = processId;
            
            const sizeEl = block.querySelector('.block-size-value');
            if (sizeEl) sizeEl.textContent = size;
            
            if (fragmentation > 0 && wasteElement) {
                // Add waste element after block
                block.after(wasteElement);
            }
        },
        
        updateFrameVisuals: function(processId, frameIndices) {
            const colorIndex = this.state.currentIndex - 1;
            const color = getProcessColor(colorIndex);
            
            frameIndices.forEach((frameIdx, pageIdx) => {
                const frame = this.container.querySelector(`#frame-${this.index}-${frameIdx}`);
                if (frame) {
                    frame.style.background = color;
                    frame.textContent = `${this.state.currentIndex}:${pageIdx}`;
                }
            });
            
            // Update page table
            const tbody = this.container.querySelector(`#page-table-${this.index}`);
            if (tbody) {
                frameIndices.forEach((frameIdx, pageIdx) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>P${this.state.currentIndex}</td>
                        <td>${pageIdx}</td>
                        <td>${frameIdx}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        },
        
        updateStats: function() {
            const stats = this.state.stats;
            const total = this.getTotalMemory();
            const free = Math.max(total - stats.allocatedSize, 0);
            const util = total > 0 ? (stats.allocatedSize / total) * 100 : 0;
            const success = this.state.processes.length > 0 ? 
                (stats.successfulAllocations / this.state.processes.length) * 100 : 0;
            
            this.setStat('total', total + ' KB');
            this.setStat('allocated', stats.allocatedSize + ' KB');
            this.setStat('free', free + ' KB');
            this.setStat('util', util.toFixed(1) + '%');
            this.setStat('success', success.toFixed(1) + '%');
            
            if (this.algo.type === 'Fixed') {
                this.setStat('internal-frag', stats.intFragmentation + ' KB');
            }
            if (this.algo.type === 'Dynamic') {
                const extFrag = this.calculateExternalFragmentation();
                this.setStat('external-frag', extFrag + ' KB');
            }
        },
        
        getTotalMemory: function() {
            if (this.algo.category === 'contiguous') {
                return sharedInputs.partitions.reduce((a, b) => a + b, 0);
            }
            return sharedInputs.totalMemory;
        },
        
        calculateExternalFragmentation: function() {
            let totalFree = 0;
            let node = this.state.memoryHead;
            while (node) {
                if (node.status === 'Free') totalFree += node.size;
                node = node.next;
            }
            return totalFree;
        },
        
        setStat: function(id, value) {
            const el = this.container.querySelector(`#${id}-${this.index}`);
            if (el) el.textContent = value;
        },
        
        updateStatus: function(status) {
            const el = this.container.querySelector(`#status-${this.index}`);
            if (el) {
                el.textContent = status;
                el.className = 'status-badge ' + status.toLowerCase().replace(' ', '-');
            }
        },
        
        log: function(message) {
            const consoleEl = this.container.querySelector(`#console-${this.index}`);
            if (!consoleEl) return;
            
            const placeholder = consoleEl.querySelector('.console-placeholder');
            if (placeholder) placeholder.remove();
            
            const time = new Date().toLocaleTimeString();
            const p = document.createElement('p');
            p.innerHTML = `<span class="timestamp">[${time}]</span> ${message}`;
            consoleEl.appendChild(p);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        },
        
        // Playback controls
        play: function() {
            if (this.state.currentIndex >= this.state.processes.length) {
                this.reset();
            }
            
            this.isPlaying = true;
            const delay = this.getDelay();
            
            this.playInterval = setInterval(() => {
                if (!this.step()) {
                    this.stop();
                }
            }, delay);
        },
        
        stop: function() {
            this.isPlaying = false;
            if (this.playInterval) {
                clearInterval(this.playInterval);
                this.playInterval = null;
            }
        },
        
        reset: function() {
            this.stop();
            this.init();
        },
        
        getDelay: function() {
            const slider = document.getElementById('slider');
            const value = parseFloat(slider ? slider.value : 1);
            return Math.round(1200 / value);
        }
    };
    
    instance.init();
    return instance;
}

// ========== GLOBAL CONTROLS ==========

function setupGlobalControls() {
    const playBtn = document.getElementById('play-all-btn');
    const stopBtn = document.getElementById('stop-all-btn');
    const resetBtn = document.getElementById('reset-all-btn');
    const nextBtn = document.getElementById('next-all-btn');
    const slider = document.getElementById('slider');
    
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            playBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'flex';
            compareInstances.forEach(inst => inst.play());
        });
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            stopBtn.style.display = 'none';
            if (playBtn) playBtn.style.display = 'flex';
            compareInstances.forEach(inst => inst.stop());
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            compareInstances.forEach(inst => inst.reset());
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            compareInstances.forEach(inst => inst.step());
        });
    }
    
    if (slider) {
        slider.addEventListener('input', (e) => {
            document.querySelectorAll('.speed-display').forEach(el => {
                el.textContent = e.target.value + 'x';
            });
            
            const isPlaying = compareInstances.some(i => i.isPlaying);
            if (isPlaying) {
                compareInstances.forEach(inst => {
                    if (inst.isPlaying) {
                        inst.stop();
                        inst.play();
                    }
                });
            }
        });
    }
}

// ========== UTILITY ==========

function getProcessColor(index) {
    const colors = [
        '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF',
        '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFB6C1'
    ];
    return colors[index % colors.length];
}

function getProcessBorderColor(index) {
    const borders = [
        '#BF8282', '#BFA07C', '#BEBF88', '#98BF8F',
        '#7DC6CE', '#7893BF', '#8E85BF', '#BF94BF', '#BF82A0'
    ];
    return borders[index % borders.length];
}