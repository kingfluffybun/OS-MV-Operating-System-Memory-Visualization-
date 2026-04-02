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

const highlightCurrentProcess = () => {
    document.querySelectorAll('.process').forEach(p => p.classList.remove('current'));
    const processes = document.querySelectorAll('.process');
    if (currentStep < processes.length) {
        processes[currentStep].classList.add('current');
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

const simulationContainer = document.querySelector('.simulation .container');
const totalMemoryValue = document.getElementById('total-memory-value');

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

const ALGORITHM_DEFINITIONS = {
    'first-fit': { moduleName: 'firstFit', displayName: 'First Fit', fixed: 'firstFitFixedStep', dynamic: 'firstFitDynamicStep' },
    'firstfit': { moduleName: 'firstFit', displayName: 'First Fit', fixed: 'firstFitFixedStep', dynamic: 'firstFitDynamicStep' },
    'next-fit': { moduleName: 'nextFit', displayName: 'Next Fit', fixed: 'nextFitFixedStep', dynamic: 'nextFitDynamicStep' },
    'nextfit': { moduleName: 'nextFit', displayName: 'Next Fit', fixed: 'nextFitFixedStep', dynamic: 'nextFitDynamicStep' },
    'best-fit': { moduleName: 'bestFit', displayName: 'Best Fit', fixed: 'bestFitFixedStep', dynamic: 'bestFitDynamicStep' },
    'bestfit': { moduleName: 'bestFit', displayName: 'Best Fit', fixed: 'bestFitFixedStep', dynamic: 'bestFitDynamicStep' },
    'worst-fit': { moduleName: 'worstFit', displayName: 'Worst Fit', fixed: 'worstFitFixedStep', dynamic: 'worstFitDynamicStep' },
    'worstfit': { moduleName: 'worstFit', displayName: 'Worst Fit', fixed: 'worstFitFixedStep', dynamic: 'worstFitDynamicStep' }
};

const getQueryParam = (key) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
};

const normalizeAlgorithmKey = key => (key || '').toString().trim().toLowerCase().replace(/[\s_-]+/g, '');
const getSelectedAlgorithmKey = () => getQueryParam('algo') || getQueryParam('algo[]') || localStorage.getItem('selectedAlgorithm') || 'best-fit';
const getSelectedPartitionMode = () => getQueryParam('mode') || localStorage.getItem('selectedPartitionMode') || 'fixed';
const getSelectedAlgorithmDefinition = () => {
    const selectedKey = getSelectedAlgorithmKey();
    const normalizedKey = normalizeAlgorithmKey(selectedKey);
    return ALGORITHM_DEFINITIONS[selectedKey] || ALGORITHM_DEFINITIONS[normalizedKey] || ALGORITHM_DEFINITIONS['best-fit'];
};

const debugMemorySimulators = () => {
    const definition = getSelectedAlgorithmDefinition();
    console.log('Location search:', window.location.search);
    console.log('Selected algorithm key:', getSelectedAlgorithmKey());
    console.log('Selected algorithm definition:', definition);
    console.log('Selected partition mode:', getSelectedPartitionMode());
    console.log('LocalStorage selectedAlgorithm:', localStorage.getItem('selectedAlgorithm'));
    console.log('Available memorySimulators:', window.memorySimulators ? Object.keys(window.memorySimulators) : []);
};

window.memorySimulators = window.memorySimulators || {};

const getSelectedSimulator = () => {
    const definition = getSelectedAlgorithmDefinition();
    const selectedKey = getSelectedAlgorithmKey();
    const normalizedSelectedKey = normalizeAlgorithmKey(selectedKey);
    const normalizedModuleKey = normalizeAlgorithmKey(definition.moduleName);
    const simulators = window.memorySimulators || {};

    const candidateKeys = [
        definition.moduleName,
        selectedKey,
        normalizedSelectedKey,
        normalizedModuleKey
    ];

    let simulator;
    for (const candidate of candidateKeys) {
        if (!candidate) continue;
        simulator = simulators[candidate] || simulators[candidate.toLowerCase()];
        if (simulator) {
            console.log('Selected simulator resolved from key:', candidate);
            break;
        }
    }

    if (!simulator) {
        const fallbackEntry = Object.entries(simulators).find(([key]) => {
            const normalizedKey = normalizeAlgorithmKey(key);
            return normalizedKey === normalizedModuleKey || normalizedKey === normalizedSelectedKey;
        });
        if (fallbackEntry) {
            simulator = fallbackEntry[1];
            console.warn('Using fallback simulator module for', definition.moduleName, 'found', fallbackEntry[0]);
        } else {
            console.warn('Missing simulator module for', definition.moduleName, 'with available keys:', Object.keys(simulators));
        }
    }

    return simulator;
};

const totalMemory = head => {
    let total = 0;
    for (let node = head; node; node = node.next) {
        total += node.size;
    }
    return total;
};

const totalFreeSize = head => {
    let total = 0;
    for (let node = head; node; node = node.next) {
        if (node.status === 'Free') total += node.size;
    }
    return total;
};

const externalFragmentation = (head, results) => {
    const entries = Array.isArray(results) ? results : Object.values(results);
    const unallocatedSizes = entries.filter(r => r.status === 'Unallocated').map(r => r.size);
    if (!unallocatedSizes.length) return 0;
    const smallestUnallocated = Math.min(...unallocatedSizes);
    let fragmentation = 0;
    for (let node = head; node; node = node.next) {
        if (node.status === 'Free' && node.size < smallestUnallocated) {
            fragmentation += node.size;
        }
    }
    return fragmentation;
};

const computeStats = (head, processes, results, stats) => {
    const total = totalMemory(head);
    const totalFree = totalFreeSize(head);
    const memoryUtilization = total > 0 ? (stats.allocatedSize / total) * 100 : 0;
    const successRate = processes.length > 0 ? (stats.successfulAllocations / processes.length) * 100 : 0;

    return {
        totalMemory: total,
        allocatedSize: stats.allocatedSize,
        totalFree,
        intFragmentation: stats.intFragmentation,
        externalFragmentation: externalFragmentation(head, results),
        memoryUtilization,
        successRate
    };
};

const renumberBlocks = () => {
    const blocks = simulationContainer ? simulationContainer.querySelectorAll('.block') : [];
    blocks.forEach((block, index) => {
        const label = block.querySelector('p');
        if (label) {
            label.textContent = `Block ${index + 1}`;
        }
        block.id = `block-${index + 1}`;
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

const createBlockElement = (id, sizeKb) => {
    const block = document.createElement('div');
    block.className = 'block';
    block.id = `block-${id}`;
    block.style.width = '120px';
    block.style.position = 'relative';
    block.innerHTML = `
        <p>Block ${id}</p>
        <div class="block-content">
            <div>
                <p id="block-status"></p>
            </div>
            <div class="block-size">
                <h2>${sizeKb}</h2>
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
});

const randomize_value = document.getElementById('randomize-value');
randomize_value.addEventListener('click', () => {
    const min = 3;
    const max = 7;
    const processSize = Math.pow(2, Math.floor(Math.random() * (max - min + 1)) + min)

    const nextProcessId = processContainer.querySelectorAll('.process').length + 1;
    const newProcess = createProcessElement(nextProcessId, processSize);
    processContainer.appendChild(newProcess);
    processSizeInput.value = '';
});

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

const editBlock = block => {
    const sizeEl = block.querySelector('h2');
    startInlineEdit(sizeEl, parsedSize => {
        block.style.width = `${Math.max(100, parsedSize)}px`;
        updateTotalMemory();
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
        const blockId = parseInt(block.id.replace('block-', ''), 10);
        const blockSizeEl = block.querySelector('h2');
        const blockSize = blockSizeEl ? parseInt(blockSizeEl.textContent, 10) : 0;
        let bgColor = 'var(--primary-color)';
        let borderColor = 'transparent';
        
        // Calculate total allocated size for this block
        let totalAllocated = 0;
        Object.entries(results).forEach(([processKey, result]) => {
            if (result.status === 'Allocated' && result.block === blockId) {
                const processIndex = parseInt(processKey.replace('Process ', ''), 10) - 1;
                const processElem = document.getElementById(`process-${processIndex + 1}`);
                if (processElem) {
                    bgColor = processElem.getAttribute('data-bg');
                    borderColor = processElem.getAttribute('data-border');
                }

                if (simulationState && simulationState.processes[processIndex]) {
                    totalAllocated += simulationState.processes[processIndex];
                }
            }
        });
        
        if (totalAllocated > 0 && blockSize > 0) {
            const percentage = Math.min(100, (totalAllocated / blockSize) * 100);
            block.style.background = `linear-gradient(to right, ${bgColor} 0%,  ${bgColor} ${percentage}%, white ${percentage}%, white 100%)`; //ITO yung color ng block, pwede mo palitan yan
            block.style.borderBottomColor = `${borderColor}`;
            const hatchColor =  `${bgColor}`; 
            const hatchPattern = `repeating-linear-gradient(
                45deg, 
                ${hatchColor}, 
                ${hatchColor} 5px, 
                transparent 5px, 
                transparent 10px
            )`;

            block.style.background = `
                linear-gradient(to right, ${bgColor} ${percentage}%, transparent ${percentage}%),
                ${hatchPattern}
            `;
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
    simulationContainer.querySelectorAll('.block').forEach(block => {
        block.style.background = '';
        block.style.borderColor = '';
        const bId = block.id.replace('block-', '');
        const text = block.querySelector('p');
        const size = block.querySelector('h2');
        const process = block.querySelector('#block-status');
        process.textContent = "";
        if (text && size) text.textContent = `Block ${bId}`;
    });
};

const prepareSimulation = () => {
    debugMemorySimulators();
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

    const selectedSimulator = getSelectedSimulator();
    if (!selectedSimulator || typeof selectedSimulator.createLinkedMemory !== 'function') {
        appendConsoleMessage('Selected algorithm is not available.');
        return false;
    }

    simulationState = {
        processes,
        memoryHead: selectedSimulator.createLinkedMemory(blocks),
        currentIndex: 0,
        results: {},
        stats: { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 },
        lastBlock: null,
        nextSplitId: 0
    };

    simulationState.lastBlock = simulationState.memoryHead;
    simulationState.nextSplitId = (() => {
        let maxId = 0;
        for (let node = simulationState.memoryHead; node; node = node.next) {
            maxId = Math.max(maxId, node.id);
        }
        return maxId + 1;
    })();

    resetConsole();
    appendConsoleMessage('Simulation ready. Use Next or Play.');
    setTotalMemoryDisplay(totalMemory(simulationState.memoryHead));
    updateStatistics(computeStats(simulationState.memoryHead, simulationState.processes, simulationState.results, simulationState.stats));
    resetBlocksUI();
    currentStep = 0;
    highlightCurrentProcess();

    const algoDescriptionEl = document.getElementById('algo-description');
    if (algoDescriptionEl) {
        const definition = getSelectedAlgorithmDefinition();
        const mode = getSelectedPartitionMode() === 'dynamic' ? 'Dynamic' : 'Fixed';
        algoDescriptionEl.textContent = `${definition.displayName} Algorithm - ${mode} Partition`;
    }

    // Disable buttons during simulation
    document.getElementById('add-block-btn').disabled = true;
    document.getElementById('add-process-btn').disabled = true;
    document.getElementById('randomize-value').disabled = true;
    document.getElementsByClassName('add-block').disabled = true;
    document.getElementsByClassName('input-prcs').disabled = true;
    document.querySelectorAll('.process-action').forEach(action => action.style.display = 'none');
    document.querySelectorAll('.edit-block-btn').forEach(btn => btn.disabled = true);
    document.querySelectorAll('.delete-block-btn').forEach(btn => btn.disabled = true);

    return true;
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
    const isFixed = getSelectedPartitionMode() !== 'dynamic';

    const definition = getSelectedAlgorithmDefinition();
    const selectedSimulator = getSelectedSimulator();
    const methodName = isFixed ? definition.fixed : definition.dynamic;
    const stepMethod = selectedSimulator?.[methodName];

    if (typeof stepMethod !== 'function') {
        appendConsoleMessage(`The ${definition.displayName} implementation does not support this mode.`);
        return false;
    }

    const args = [simulationState.memoryHead, size];
    if (!isFixed) {
        args.push(simulationState.lastBlock, simulationState.nextSplitId);
    }

    const stepResult = stepMethod.apply(selectedSimulator, args);
    if (stepResult.newHead) simulationState.memoryHead = stepResult.newHead;
    if (stepResult.lastBlock) simulationState.lastBlock = stepResult.lastBlock;
    if (typeof stepResult.nextSplitId === 'number') simulationState.nextSplitId = stepResult.nextSplitId;

    simulationState.results[processId] = stepResult.result;
    simulationState.stats.allocatedSize += stepResult.allocatedSize;
    simulationState.stats.successfulAllocations += stepResult.successfulAllocations;
    simulationState.stats.intFragmentation += stepResult.result.fragmentation || 0;

    const compiledStats = computeStats(simulationState.memoryHead, simulationState.processes, simulationState.results, simulationState.stats);
    updateStatistics(compiledStats);
    setTotalMemoryDisplay(compiledStats.totalMemory);
    updateBlockVisuals(simulationState.results);

    appendConsoleMessage(`${processId} (${size} KB) -> ${stepResult.result.status}${stepResult.result.block !== 'None' ? ` to Block ${stepResult.result.block}` : ''}`);

    if (stepResult.result.status === 'Allocated') {
        const blockEl = document.getElementById(`block-${stepResult.result.block}`);
        if (blockEl) {
            const label = blockEl.querySelector('#block-status');
            if (label) label.textContent = `${processId}`;
        }
    }

    simulationState.currentIndex += 1;

    if (simulationState.currentIndex >= simulationState.processes.length) {
        appendConsoleMessage('Simulation complete');
        clearInterval(playInterval);
        playInterval = null;
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
};

const runReset = () => {
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }

    simulationState = null;
    currentStep = 0;
    highlightCurrentProcess();
    resetConsole();
    resetBlocksUI();
    updateStatistics({ allocatedSize: 0, totalFree: 0, intFragmentation: 0, externalFragmentation: 0, memoryUtilization: 0, successRate: 0 });
    setTotalMemoryDisplay(0);
    appendConsoleMessage('Simulation reset.');

    // Enable buttons after reset
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

    const algoDescriptionEl = document.getElementById('algo-description');
    if (algoDescriptionEl) {
        const definition = getSelectedAlgorithmDefinition();
        const mode = getSelectedPartitionMode() === 'dynamic' ? 'Dynamic' : 'Fixed';
        algoDescriptionEl.textContent = `${definition.displayName} Algorithm - ${mode} Partition`;
    }
