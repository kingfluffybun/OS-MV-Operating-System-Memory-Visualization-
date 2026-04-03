const toggleButton = document.getElementById('toggle-btn');
const sidebar = document.getElementById('sidebar');
const logo = document.getElementById('logo');
const logoH1 = document.getElementById('h1');

const toggleSideBar = () => {
    sidebar.classList.toggle('close');
    toggleButton.classList.toggle('rotate');
    logo.classList.toggle('hidden');
    logoH1.classList.toggle('hidden');

    Array.from(sidebar.getElementsByClassName('show')).forEach(element => {
        element.classList.remove('show');
        element.previousElementSibling.classList.remove('rotate');
    });
}

const toggleSubMenu = button => {
    if(sidebar.classList.contains('close')) {
        toggleSideBar();
    }
    
    button.nextElementSibling.classList.toggle('show');
    button.classList.toggle('rotate');
}

const processColors = [
    { bg: "#FFADAD", border: "#BF8282" }, // Powder Blush
    { bg: "#FFD6A5", border: "#BFA07C" }, // Apricot Cream
    { bg: "#FDFFB6", border: "#BEBF88" }, // Cream
    { bg: "#CAFFBF", border: "#98BF8F" }, // Tea Green
    { bg: "#9BF6FF", border: "#7DC6CE" },  // Electric Aqua
    { bg: "#A0C4FF", border: "#7893BF" }, // Baby Blue Ice
    { bg: "#BDB2FF", border: "#8E85BF" }, // Periwinkle
    { bg: "#FFC6FF", border: "#BF94BF" }  // Mavue
];

const processContainer = document.querySelector('.process-container');
let processIdCounter = processContainer ? processContainer.querySelectorAll('.process').length + 1 : 1;

// Simulation state
let currentStep = 0;
let isPlaying = false;
let speed = 1;

const scrollDown = () => {
    if (processContainer) {
        processContainer.scrollTo({
            top: processContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
};

const highlightCurrentProcess = () => {
    document.querySelectorAll('.process').forEach(p => p.classList.remove('current'));
    const processes = document.querySelectorAll('.process');
    if (currentStep < processes.length) {
        const activeProcess = processes[currentStep];
        activeProcess.classList.add('current');
        activeProcess.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',  
            inline: 'start'
        });
    }
};

const createProcessElement = (id, sizeKb) => {
    const process = document.createElement('div');
    process.className = 'process';
    process.id = `process-${id}`;

    const colorIndex = (id - 1) % processColors.length;
    const colorPair = processColors[colorIndex];
    process.setAttribute('data-bg', colorPair.bg);
    process.setAttribute('data-border', colorPair.border);
    process.style.backgroundColor = colorPair.bg;
    process.style.borderBottomColor =  colorPair.border;

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
    document.querySelector('.simulation .simulation-scroll-track') ||
    document.querySelector('.simulation .container');
const totalMemoryValue = document.getElementById('total-memory-value');

let preSimBlockState = null;

const isDynamicPartitionMode = () => document.body.dataset.partitionMode === 'dynamic';

/** Lock edit/delete on memory blocks (including Fragmented splits added mid-run). */
const disableMemoryBlockControls = () => {
    if (!simulationContainer) return;
    simulationContainer.querySelectorAll('.block .process-action').forEach(action => {
        action.style.display = 'none';
    });
    simulationContainer.querySelectorAll('.block .edit-block-btn').forEach(btn => {
        btn.disabled = true;
    });
    simulationContainer.querySelectorAll('.block .delete-block-btn').forEach(btn => {
        btn.disabled = true;
    });
};

const updateTotalMemory = () => {
    const blocks = simulationContainer ? simulationContainer.querySelectorAll('.block h2') : [];
    const total = Array.from(blocks).reduce((sum, sizeElement) => {
        const parsed = parseInt(sizeElement.textContent, 10);
        return sum + (Number.isNaN(parsed) ? 0 : parsed);
    }, 0);
    if (totalMemoryValue) {
        totalMemoryValue.textContent = `${total} KB`;
    }
};

const renumberBlocks = () => {
    const blocks = simulationContainer ? simulationContainer.querySelectorAll('.block') : [];
    blocks.forEach((block, index) => {
        const newId = index + 1;
        const label = block.querySelector('p');
        if (label) {
            label.textContent = `Block ${newId}`;
        }
        block.id = `block-${newId}`;
        block.dataset.partitionLabel = String(newId);
    });
};

const renumberProcesses = () => {
    const processes = processContainer ? processContainer.querySelectorAll('.process') : [];
    processes.forEach((process, index) => {
        const label = process.querySelector('.process-content p:first-child');
        const newId = index + 1;
        if (label) {
            label.textContent = `Process ${index + 1}`;
        }
        process.id = `process-${newId}`;

        const colorIndex = index % processColors.length;
        const colorPair = processColors[colorIndex];

        process.setAttribute('data-bg', colorPair.bg);
        process.setAttribute('data-border', colorPair.border);
        process.style.backgroundColor = colorPair.bg;
        process.style.borderBottomColor = colorPair.border;
    });
};

const createBlockElement = (id, sizeKb, options = {}) => {
    const partitionLabel = options.partitionLabel != null ? options.partitionLabel : id;
    const block = document.createElement('div');
    block.className = options.isSplitFree ? 'block block--split-free' : 'block';
    block.id = `block-${id}`;
    block.dataset.partitionLabel = options.isSplitFree ? 'Hole' : String(partitionLabel);
    block.style.width = '120px';
    block.style.position = 'relative';
    const titleText = options.isSplitFree ? 'Hole' : `Block ${partitionLabel}`;
    block.innerHTML = `
        <p>${titleText}</p>
        <div class="block-content">
            <div>
                <p class="block-status"></p>
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

const insertDynamicFreeSplitAfter = (allocatedEl, allocatedSizeKb, freeSizeKb, freeNodeId, allocatedBlockId) => {
    if (!allocatedEl || freeSizeKb <= 0 || freeNodeId == null) {
        return;
    }
    
    // Keep the allocated chunk labeled by partition id (e.g. Block 2), not process size in KB.
    const nameEl = allocatedEl.querySelector('p');
    if (nameEl) {
        nameEl.textContent = `Block ${allocatedBlockId}`;
    }
    allocatedEl.dataset.partitionLabel = String(allocatedBlockId);

    const sizeNumEl = allocatedEl.querySelector('.block-size-value');
    if (sizeNumEl) {
        sizeNumEl.textContent = String(allocatedSizeKb);
    }
    const freeEl = createBlockElement(freeNodeId, freeSizeKb, {
        isSplitFree: true
    });
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

const add_process_btn = document.getElementById('add-process-btn');
add_process_btn.addEventListener('click', () => {
    const processSizeInput = document.getElementById('process-size');
    const processSize = parseInt(processSizeInput.value, 10);

    if (!processContainer || Number.isNaN(processSize) || processSize <= 0) {
        return;
    }

    const nextProcessId = processContainer.querySelectorAll('.process').length + 1;
    const newProcess = createProcessElement(nextProcessId, processSize);
    processContainer.appendChild(newProcess);
    processSizeInput.value = '';
    scrollDown();
});

const randomize_value = document.getElementById('randomize-value');
randomize_value.addEventListener('click', () => {
    const min = 3;
    const max = 7;
    const processSize = Math.pow(2, Math.floor(Math.random() * (max - min + 1)) + min)

    const nextProcessId = processContainer.querySelectorAll('.process').length + 1;
    const newProcess = createProcessElement(nextProcessId, processSize);
    processContainer.appendChild(newProcess);
    scrollDown();
});

const scrollToRight = () => {
    if (simulationContainer) {
        simulationContainer.scrollTo({
            left: simulationContainer.scrollWidth,
            behavior: 'smooth'
        });
    }
};

const add_block_btn = document.getElementById('add-block-btn');
if (add_block_btn) {
    add_block_btn.addEventListener('click', () => {
        if (!simulationContainer) {
            return;
        }
        const min = 4;
        const max = 8;
        const nextBlockId = simulationContainer.querySelectorAll('.block').length + 1;
        const newBlock = createBlockElement(nextBlockId, Math.pow(2, Math.floor(Math.random() * (max - min + 1)) + min));
        simulationContainer.insertBefore(newBlock, add_block_btn);
        updateTotalMemory();
        resizeBlocks();
        scrollToRight();
    });
}

const startInlineEdit = (element, onCommit) => {
    const oldText = element.textContent.trim();
    const oldValue = parseInt(oldText, 10);
    element.contentEditable = 'true';
    element.dataset.editing = 'true';
    element.classList.add('inline-editable');

    const cleanup = commitValue => {
        element.removeAttribute('contenteditable');
        element.classList.remove('inline-editable');
        delete element.dataset.editing;
        element.removeEventListener('blur', onBlur);
        element.removeEventListener('keydown', onKeyDown);
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

    const onKeyDown = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            element.blur();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            element.textContent = `${oldValue} KB`;
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

const editProcess = process => {
    const sizeEl = process.querySelector('.process-content p:nth-child(2)');
    startInlineEdit(sizeEl, parsedSize => {
    });
};

const resizeBlocks = () => {
    const blocks = Array.from(simulationContainer.querySelectorAll('.block'));
    const pxPerKb = 0.5; 
    const minWidth = 80;

    blocks.forEach(block => {
        const sizeEl = block.querySelector('h2');
        const blockSize = sizeEl ? parseInt(sizeEl.textContent, 10) : 0;
        
        if (blockSize > 0) {
            const calculatedWidth = blockSize * pxPerKb;
            block.style.width = `${minWidth + calculatedWidth}px`;
            // block.style.width = `${Math.max(minWidth, calculatedWidth)}px`;
            block.style.flex = "0 0 auto"; 
        }
    });
};

const editBlock = block => {
    const sizeEl = block.querySelector('h2');
    startInlineEdit(sizeEl, parsedSize => {
        updateTotalMemory();
        resizeBlocks();
    });
};



if (processContainer) {
    processContainer.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        if (target.classList.contains('delete-process-btn')) {
            removeElement(target, '.process');
            renumberProcesses();
            return;
        }

        if (target.classList.contains('edit-process-btn')) {
            const process = target.closest('.process');
            if (process) {
                editProcess(process);
            }
        }
    });
}

if (simulationContainer) {
    simulationContainer.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        if (target.classList.contains('delete-block-btn')) {
            removeElement(target, '.block');
            renumberBlocks();
            updateTotalMemory();
            return;
        }

        if (target.classList.contains('edit-block-btn')) {
            const block = target.closest('.block');
            if (block) {
                editBlock(block);
            }
            return;
        }
    });

    simulationContainer.addEventListener('mouseover', event => {
        const block = event.target.closest('.block');
        if (block && simulationContainer.contains(block)) {
            block.classList.add('hovered');
        }
    });

    simulationContainer.addEventListener('mouseout', event => {
        const block = event.target.closest('.block');
        const related = event.relatedTarget;
        if (block && (!related || !block.contains(related))) {
            block.classList.remove('hovered');
        }
    });
}

const consoleContainer = document.querySelector('.console .container');

const appendConsoleMessage = message => {
    if (!consoleContainer) return;
    const p = document.createElement('p');
    const timestamp = new Date().toLocaleTimeString();
    p.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    consoleContainer.appendChild(p);
    consoleContainer.scrollTop = consoleContainer.scrollHeight;
};

const getProcessSizes = () => {
    if (!processContainer) return [];
    return Array.from(processContainer.querySelectorAll('.process')).map(process => {
        const sizeEl = process.querySelector('.process-content p:nth-child(2)');
        const size = sizeEl ? parseInt(sizeEl.textContent, 10) : NaN;
        return Number.isNaN(size) ? null : size;
    }).filter(size => size !== null);
};

const getBlockSizes = () => {
    if (!simulationContainer) return [];
    return Array.from(simulationContainer.querySelectorAll('.block')).map(block => {
        const sizeEl = block.querySelector('h2');
        const size = sizeEl ? parseInt(sizeEl.textContent, 10) : NaN;
        return Number.isNaN(size) ? null : size;
    }).filter(size => size !== null);
};

const updateBlockVisuals = results => {
    if (!simulationContainer) return;
    
    simulationContainer.querySelectorAll('.block').forEach(block => {
        // Re-apply hatch pattern on internal frag blocks (colors stored as data attrs)
        if (block.classList.contains('block--fixed-waste')) {
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
                block.style.borderBottom = `4px solid ${hatchBorder}`;
            }
            return;
        }

        // Skip dynamic free-hole blocks
        if (block.classList.contains('block--split-free')) {
            return;
        }

        const blockId = parseInt(block.id.replace('block-', ''), 10);
        const sizeDisplay = block.querySelector('.block-size-value');
        
        let bgColor = '';
        let borderColor = '';
        let isAllocated = false;
        let processActualSize = null;

        // Find the active allocation for this specific block ID
        const currentAllocation = Object.entries(results).find(([_, res]) => 
            res.status === 'Allocated' && parseInt(res.block, 10) === blockId
        );

        if (currentAllocation) {
            const [processKey, result] = currentAllocation;
            const pNum = processKey.match(/\d+/)[0]; 
            const processElem = document.getElementById(`process-${pNum}`);
            
            if (processElem) {
                bgColor = processElem.getAttribute('data-bg');
                borderColor = processElem.getAttribute('data-border');
                isAllocated = true;
                processActualSize = result.size; // This ensures we show the process KB
            }
        }

        if (isAllocated) {
            block.style.background = bgColor;
            block.style.borderBottom = `4px solid ${borderColor}`;
            block.classList.add('allocated');
            if (sizeDisplay && processActualSize !== null) {
                sizeDisplay.textContent = processActualSize;
            }
        } else {
            // Restore to original partition size
            const originalSize = block.dataset.originalSize;
            if (sizeDisplay && originalSize) {
                sizeDisplay.textContent = originalSize;
            }
            block.style.background = '';
            block.style.borderBottom = '';
            block.classList.remove('allocated');
        }
    });
};

const updateStatistics = stats => {
    const allocatedEl = document.getElementById('allocated-value');
    const totalFreeEl = document.getElementById('total-free-value');
    const internalFragEl = document.getElementById('internal-frag-value');
    const externalFragEl = document.getElementById('external-frag-value');
    const utilEl = document.getElementById('util-value');
    const successEl = document.getElementById('success-rate-value');

    if (allocatedEl) allocatedEl.textContent = `${Math.round(stats.allocatedSize)} KB`;
    if (totalFreeEl) totalFreeEl.textContent = `${Math.round(stats.totalFree)} KB`;
    if (internalFragEl) internalFragEl.textContent = `${Math.round(stats.intFragmentation)} KB`;
    if (externalFragEl) externalFragEl.textContent = `${Math.round(stats.externalFragmentation)} KB`;
    if (utilEl) utilEl.textContent = `${stats.memoryUtilization.toFixed(1)}%`;
    if (successEl) successEl.textContent = `${stats.successRate.toFixed(1)}%`;
};

let playInterval = null;
let simulationState = null;

const setTotalMemoryDisplay = total => {
    const totalMemoryEl = document.getElementById('total-memory-value');
    if (totalMemoryEl) totalMemoryEl.textContent = `${Math.round(total)} KB`;
};

const resetConsole = () => {
    if (!consoleContainer) return;
    consoleContainer.innerHTML = '';
};

const resetBlocksUI = () => {
    // 1. Remove all blocks created by splitting logic (waste fragments and dynamic holes)
    simulationContainer.querySelectorAll('.block--split-free, .block--fixed-waste').forEach(extraBlock => {
        extraBlock.remove();
    });

    // 2. Reset the original partitions back to their pre-simulation state
    simulationContainer.querySelectorAll('.block').forEach(block => {
        block.style.background = '';
        block.style.borderColor = '';
        block.style.borderBottom = '';
        block.classList.remove('allocated');

        const bId = block.id.replace('block-', '');
        const labelNum = block.dataset.partitionLabel || bId;
        const text = block.querySelector('p');
        const status = block.querySelector('.block-status');

        if (text) text.textContent = `Block ${labelNum}`;
        if (status) status.textContent = '';

        // Restore the original size that was stamped at prepareSimulation time
        const originalSize = block.dataset.originalSize;
        const sizeDisplay = block.querySelector('.block-size-value');
        if (originalSize && sizeDisplay) {
            sizeDisplay.textContent = originalSize;
        }
    });

    resizeBlocks();
};

const restorePreSimulationBlocks = () => {
    if (!simulationContainer) return;
    const addBtn = document.getElementById('add-block-btn');
    simulationContainer.querySelectorAll('.block').forEach(b => b.remove());
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

    if (!processes.length) {
        appendConsoleMessage('No processes in queue to allocate.');
        return false;
    }

    if (!blocks.length) {
        appendConsoleMessage('No memory blocks defined.');
        return false;
    }

    if (isDynamicPartitionMode()) {
        preSimBlockState = getBlockSizes().slice();
    }

    // Stamp the original size on every block element NOW, before any step shrinks them.
    // resetBlocksUI reads this to restore the display on reset.
    if (simulationContainer) {
        simulationContainer.querySelectorAll('.block').forEach(block => {
            const sizeEl = block.querySelector('.block-size-value') || block.querySelector('h2');
            if (sizeEl) {
                block.dataset.originalSize = parseInt(sizeEl.textContent, 10) || 0;
            }
        });
    }

    simulationState = {
        processes,
        memoryHead: memorySimulator.createLinkedMemory(blocks),
        currentIndex: 0,
        results: {},
        stats: { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 }
    };

    resetConsole();
    appendConsoleMessage('Simulation ready. Use Next or Play.');
    setTotalMemoryDisplay(memorySimulator.totalMemory(simulationState.memoryHead));
    updateStatistics(memorySimulator.computeStats(simulationState.memoryHead, simulationState.processes, simulationState.results, simulationState.stats));
    resetBlocksUI();
    currentStep = 0;
    highlightCurrentProcess();

    // Disable buttons during simulation
    document.getElementById('add-block-btn').disabled = true;
    document.getElementById('add-process-btn').disabled = true;
    document.getElementById('randomize-value').disabled = true;
    document.getElementsByClassName('add-block').disabled = true;
    document.getElementsByClassName('input-prcs').disabled = true;
    document.querySelectorAll('.process-action').forEach(action => action.style.display = 'none');
    disableMemoryBlockControls();

    return true;
};

const insertFixedWasteSplitAfter = (allocatedEl, processSizeKb, wasteSizeKb, blockId, bgColor, borderColor) => {
    // 1. Update the original block display immediately
    const sizeDisplay = allocatedEl.querySelector('.block-size-value');
    if (sizeDisplay) sizeDisplay.textContent = processSizeKb;

    // 2. Create the "Internal Frag" block
    const wasteEl = document.createElement('div');
    wasteEl.className = 'block block--fixed-waste'; 
    wasteEl.id = `block-${blockId}-waste`;
    // Store colors so updateBlockVisuals can re-apply them on refresh
    if (bgColor) wasteEl.dataset.hatchBg = bgColor;
    if (borderColor) wasteEl.dataset.hatchBorder = borderColor;

    // Inherit the parent block's label (e.g. "Block 2 - Internal Frag")
    const parentLabel = allocatedEl.querySelector('p') ? allocatedEl.querySelector('p').textContent.trim() : `Block ${blockId}`;

    wasteEl.innerHTML = `
        <p>${parentLabel}</p>
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
            ${borderColor} 5px,
            ${borderColor} 10px
        )`;
        wasteEl.style.background = hatchPattern;
        wasteEl.style.borderBottom = `4px solid ${borderColor}`;
    }

    // 4. Place it after the allocated block
    allocatedEl.after(wasteEl);
    
    if (typeof resizeBlocks === 'function') resizeBlocks();
};

const runStep = () => {
    if (!simulationState && !prepareSimulation()) return;

    if (simulationState.currentIndex >= simulationState.processes.length) {
        appendConsoleMessage('All processes have already been run.');
        return false;
    }

    currentStep = simulationState.currentIndex;
    highlightCurrentProcess();

    const size = simulationState.processes[simulationState.currentIndex];
    const processId = `Process ${simulationState.currentIndex + 1}`;
    const isFixed = !isDynamicPartitionMode();

    const stepResult = isFixed
        ? memorySimulator.bestFitFixedStep(simulationState.memoryHead, size)
        : memorySimulator.bestFitDynamicStep(simulationState.memoryHead, size);

    // CRITICAL: Attach the process size to the result
    stepResult.result.size = size; 

    simulationState.results[processId] = stepResult.result;
    simulationState.stats.allocatedSize += stepResult.allocatedSize;
    simulationState.stats.successfulAllocations += stepResult.successfulAllocations;
    simulationState.stats.statsIntFragmentation += stepResult.result.fragmentation || 0;

    const compiledStats = memorySimulator.computeStats(simulationState.memoryHead, simulationState.processes, simulationState.results, simulationState.stats);
    updateStatistics(compiledStats);
    setTotalMemoryDisplay(compiledStats.totalMemory);

    if (stepResult.result.status === 'Allocated') {
        const blockEl = document.getElementById(`block-${stepResult.result.block}`);
        const leftover = stepResult.result.fragmentation || 0;

        if (leftover > 0 && blockEl) {
            if (!isFixed && stepResult.newFreeId != null) {
                insertDynamicFreeSplitAfter(blockEl, size, leftover, stepResult.newFreeId, stepResult.result.block);
            } else if (isFixed) {
                const colorIndex = simulationState.currentIndex % processColors.length;
                const { bg: procBg, border: procBorder } = processColors[colorIndex];
                insertFixedWasteSplitAfter(blockEl, size, leftover, stepResult.result.block, procBg, procBorder);
            }
        }

        if (blockEl) {
            blockEl.classList.remove('block--split-free');
            const label = blockEl.querySelector('.block-status');
            if (label) label.textContent = `${processId}`;
            
            const sizeValueEl = blockEl.querySelector('.block-size-value');
            if (sizeValueEl) sizeValueEl.textContent = size;
        }
    }

    // Refresh all visuals
    updateBlockVisuals(simulationState.results);

    // Console logging and index incrementing remains the same...
    const stepRes = stepResult.result;
    appendConsoleMessage(`${processId} (${size} KB) -> ${stepRes.status}${stepRes.block !== 'None' ? ` to Block ${stepRes.block}` : ''}`);

    simulationState.currentIndex += 1;
    if (simulationState.currentIndex >= simulationState.processes.length) {
        appendConsoleMessage('Simulation complete');
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
    const slider = document.getElementById('slider');
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
}

const runPlay = () => {

    if (!simulationState) {
        if (!prepareSimulation()) return;
    } 

    if (playInterval) {
        clearInterval(playInterval);
    }

    runStep();

    const delay = getStepDelay();
    playInterval = setInterval(() => {
        if (!runStep()) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }, delay);

    togglePlayStop();
};

const runStop = () => {
    clearInterval(playInterval);
    playInterval = null;
    togglePlayStop();
    appendConsoleMessage('Simulation stopped.');
}


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

    // Standard Updates
    updateStatistics({ 
        allocatedSize: 0, 
        totalFree: 0, 
        intFragmentation: 0, 
        externalFragmentation: 0, 
        memoryUtilization: 0, 
        successRate: 0 
    });
    updateTotalMemory();
    togglePlayStop();
    appendConsoleMessage('Simulation reset.');

    // Resetting Inputs & Buttons
    document.querySelectorAll('.process').forEach(p => p.classList.remove('current'));
    document.getElementById('add-block-btn').disabled = false;
    document.getElementById('add-process-btn').disabled = false;
    document.getElementById('randomize-value').disabled = false;
    document.querySelectorAll('.process-action').forEach(action => action.style.display = '');
    document.querySelectorAll('.edit-block-btn').forEach(btn => btn.disabled = false);
    document.querySelectorAll('.delete-block-btn').forEach(btn => btn.disabled = false);
};

const playBtn = document.getElementById('play-btn');
if (playBtn) {
    playBtn.addEventListener('click', runPlay);
}

const stopBtn = document.getElementById('stop-btn');
if (stopBtn) {
    stopBtn.addEventListener('click', runStop);
}

const nextBtn = document.getElementById('next-btn');
if (nextBtn) {
    nextBtn.addEventListener('click', runStep);
}

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', runReset);
}

const slider = document.getElementById('slider');
if (slider) {
    slider.addEventListener('input', (e) => {
        speed = parseFloat(e.target.value);
    });
}

if (simulationContainer) {
    updateTotalMemory();
}


function startSimulation(event) {
    // 1. Stop the browser from refreshing/changing the URL
    event.preventDefault(); 

    const form = document.getElementById("simulation-Option");
    
    // 2. Get the selected algorithm
    const selected = form.querySelector('input[name="algo"]:checked');
    
    // 3. Get the toggle state
    const isDynamic = form.querySelector('.checkbox').checked;

    if (selected) {
        const algo = selected.value; // e.g., "first-fit"
        const algoFileSegment = {
            "first-fit": "First-Fit",
            "next-fit": "Next-Fit",
            "Best-Fit": "Best-Fit",
            "Worst-Fit": "Worst-Fit"
        }[algo] || algo;

        let fileName = "simulation-" + algoFileSegment;
        if (isDynamic) {
            fileName += "-Dynamic";
        }

        console.log("Redirecting to: " + fileName + ".html");
        window.location.href = "algorithms/" + fileName + ".html";
    } else {
        alert("Please select an algorithm!");
    }
}