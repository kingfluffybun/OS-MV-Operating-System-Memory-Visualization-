// ========== COMPARISON SIMULATION CONTROLLER ==========

const processColorsto = [
    { bg: "#FFADAD", border: "#BF8282" },
    { bg: "#FFD6A5", border: "#BFA07C" },
    { bg: "#FDFFB6", border: "#BEBF88" },
    { bg: "#CAFFBF", border: "#98BF8F" },
    { bg: "#9BF6FF", border: "#7DC6CE" },
    { bg: "#A0C4FF", border: "#7893BF" },
    { bg: "#BDB2FF", border: "#8E85BF" },
    { bg: "#FFC6FF", border: "#BF94BF" }
];

const ALGO_CONFIG = [
    { id: 'first-fit-fixed', name: 'First Fit', type: 'fixed', category: 'contiguous', stepFn: 'firstFitFixedStep' },
    { id: 'first-fit-dynamic', name: 'First Fit', type: 'dynamic', category: 'contiguous', stepFn: 'firstFitDynamicStep' },
    { id: 'next-fit-fixed', name: 'Next Fit', type: 'fixed', category: 'contiguous', stepFn: 'nextFitFixedStep' },
    { id: 'next-fit-dynamic', name: 'Next Fit', type: 'dynamic', category: 'contiguous', stepFn: 'nextFitDynamicStep' },
    { id: 'best-fit-fixed', name: 'Best Fit', type: 'fixed', category: 'contiguous', stepFn: 'bestFitFixedStep' },
    { id: 'best-fit-dynamic', name: 'Best Fit', type: 'dynamic', category: 'contiguous', stepFn: 'bestFitDynamicStep' },
    { id: 'worst-fit-fixed', name: 'Worst Fit', type: 'fixed', category: 'contiguous', stepFn: 'worstFitFixedStep' },
    { id: 'worst-fit-dynamic', name: 'Worst Fit', type: 'dynamic', category: 'contiguous', stepFn: 'worstFitDynamicStep' },
    { id: 'paging', name: 'Paging', type: 'paging', category: 'non-contiguous' },
    { id: 'segmentation', name: 'Segmentation', type: 'segmentation', category: 'non-contiguous' },
    { id: 'segmentation-paging', name: 'Segmentation with Paging', type: 'segmentation-paging', category: 'non-contiguous' }
];

let comparisonData = null;
let algoInstances = {};
let isitPlaying = false;
let playtheInterval = null;

function initComparisonPage() {
    comparisonSimLoad();
}

function comparisonSimLoad() {
    const stored = sessionStorage.getItem('comparisonData');
    if (!stored) {
        alert('No comparison data found. Redirecting...');
        window.location.href = 'index.html';
        return;
    }

    comparisonData = JSON.parse(stored);

    // Initialize all algorithms
    ALGO_CONFIG.forEach(function(config) {
        initAlgorithm(config);
    });

    // Render shared process queue to all containers
    renderSharedProcessQueue();

    // Setup controls
    setupComparisonControls();
    updateSummaryTable();
}

function initAlgorithm(config) {
    const container = document.querySelector('#' + config.id + ' .contiguous-container');
    const processQueue = document.querySelector('#' + config.id + ' .contiguous-process-queue');

    if (!container) return;

    if (config.category === 'contiguous') {
        // Create memory blocks from partitions
        const blocks = comparisonData.partitions.map(function(size, i) {
            return { id: i + 1, size: size, status: 'Free' };
        });

        // Create linked list
        let head = null;
        let tail = null;
        blocks.forEach(function(block) {
            const node = {
                id: block.id,
                size: block.size,
                status: block.status,
                processId: null,
                next: null
            };
            if (!tail) head = node;
            else tail.next = node;
            tail = node;
        });

        // Store instance state
        algoInstances[config.id] = {
            config: config,
            memoryHead: head,
            processes: comparisonData.processes.slice(),
            currentIndex: 0,
            lastBlock: null,
            results: {},
            stats: {
                allocatedSize: 0,
                successfulAllocations: 0,
                intFragmentation: 0
            }
        };

        if (config.id.includes('next-fit') && typeof memorySimulator !== 'undefined') {
            memorySimulator._nextLastBlock = null;
        }

        // Render initial blocks
        renderBlocks(config.id);
    }
}

function renderBlocks(algoId) {
    const container = document.querySelector('#' + algoId + ' .contiguous-container');
    if (!container) return;

    const instance = algoInstances[algoId];
    if (!instance || !instance.memoryHead) return;

    container.innerHTML = '';

    let node = instance.memoryHead;
    let prevLogicalId = null;

    while (node) {
        const logicalId = String(node.originalLabel || node.parentId || node.id);
        const nextLogicalId = node.next
            ? String(node.next.originalLabel || node.next.parentId || node.next.id)
            : null;

        const isFirstInGroup = logicalId !== prevLogicalId;
        const isLastInGroup = logicalId !== nextLogicalId;

        const block = document.createElement('div');
        block.className = 'block';
        block.id = 'block-' + node.id;
        block.dataset.partitionLabel = String(node.id);

        const widthPercent = comparisonData.totalMemory > 0 ? (node.size / comparisonData.totalMemory * 100) : 0;
        block.style.width = widthPercent + '%';

        // Apply "together blocks" visual grouping
        if (!isFirstInGroup || !isLastInGroup) {
            if (isFirstInGroup && !isLastInGroup) {
                block.style.borderRadius = "12px 0px 0px 12px";
            } else if (!isFirstInGroup && !isLastInGroup) {
                block.style.borderRadius = "0px 0px 0px 0px";
                block.style.marginLeft = "-10px";
                block.style.zIndex = "1";
            } else if (!isFirstInGroup && isLastInGroup) {
                block.style.borderRadius = "0px 12px 12px 0px";
                block.style.marginLeft = "-10px";
                block.style.zIndex = "1";
            }
        }

        let bgColor, borderColor;
        if (node.status === 'Free') {
            bgColor = '#e0e0e0';
            borderColor = 'rgba(0, 0, 0, 0.25)';
        } else {
            const colorIndex = ((node.processId || 1) - 1) % processColorsto.length;
            const colorPair = processColorsto[colorIndex];
            bgColor = colorPair.bg;
            borderColor = colorPair.border;
        }
        block.style.backgroundColor = bgColor;
        block.style.borderBottomColor = borderColor;

        // Only show "Block X" label for the first block in a group
        const statusText = node.status === 'Free' ? (node.isSplit ? 'Hole' : 'Free') : (node.processId ? 'Process ' + node.processId : 'Allocated');
        const titleText = isFirstInGroup ? 'Block ' + logicalId : '';

        block.innerHTML = `
            <p>${titleText}</p>
            <div class="block-content">
                <div>
                    <p class="block-status">${statusText}</p>
                </div>
                <div class="block-size">
                    <h2><span class="block-size-value">${node.size}</span></h2>
                    <h2>&nbsp;KB</h2>
                </div>
            </div>
            <div></div>
        `;
        container.appendChild(block);
        
        prevLogicalId = logicalId;
        node = node.next;
    }
}

function renderSharedProcessQueue() {
    const processes = comparisonData.processes;

    ALGO_CONFIG.forEach(function(algo) {
        const queue = document.querySelector('#' + algo.id + ' .contiguous-process-queue');
        if (!queue) return;

        queue.innerHTML = '';
        processes.forEach(function(size, i) {
            const process = document.createElement('div');
            process.className = 'process';
            process.id = 'process-' + (i + 1);

            const colorIndex = i % processColorsto.length;
            const colorPair = processColorsto[colorIndex];
            process.style.backgroundColor = colorPair.bg;
            process.style.borderBottomColor = colorPair.border;

            process.innerHTML = `
                <div class="process-content">
                    <p>Process ${i + 1}</p>
                    <p>${size}</p>
                    <p>&nbsp;KB</p>
                </div>
            `;
            queue.appendChild(process);
        });
    });
}

function stepAlgorithm(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return false;

    console.log('Step algorithm:', algoId);
    console.log('Config stepFn:', instance.config.stepFn);
    console.log('memorySimulator[stepFn]:', typeof memorySimulator !== 'undefined' ? typeof memorySimulator[instance.config.stepFn] : 'memorySimulator undefined');

    if (instance.currentIndex >= instance.processes.length) return false;

    const processSize = instance.processes[instance.currentIndex];
    const processId = instance.currentIndex + 1;

    if (instance.config.category === 'contiguous') {
        const stepFnName = instance.config.stepFn;
        let stepFn = null;

        // Primary: memorySimulator (where your algos are defined)
        if (typeof memorySimulator !== 'undefined' && typeof memorySimulator[stepFnName] === 'function') {
            stepFn = memorySimulator[stepFnName].bind(memorySimulator);
        } 
        // Fallback: global window
        else if (typeof window[stepFnName] === 'function') {
            stepFn = window[stepFnName];
        }

        if (!stepFn) {
            console.error('Step function missing:', stepFnName);
            console.error('memorySimulator keys:', typeof memorySimulator !== 'undefined' ? Object.keys(memorySimulator).filter(k => k.includes('Fit') || k.includes('Step')) : 'undefined');
            alert('No step function found for ' + instance.config.name);
            instance.currentIndex++;
            return false;
        }

        // Sync Next Fit pointer for this instance
        if (typeof memorySimulator !== 'undefined') {
            memorySimulator._nextLastBlock = instance.lastBlock;
        }

        const result = stepFn(instance.memoryHead, processSize);

        // Save back Next Fit pointer
        if (typeof memorySimulator !== 'undefined') {
            instance.lastBlock = memorySimulator._nextLastBlock;
        }

        if (result.newMemoryHead) {
            instance.memoryHead = result.newMemoryHead;
        }

        if (result.result && result.result.status === 'Allocated') {
            // Find the block and update it
            let node = instance.memoryHead;
            while (node) {
                if (node.id === result.result.block) {
                    node.status = 'Occupied';
                    node.processId = processId;
                    break;
                }
                node = node.next;
            }

            instance.stats.allocatedSize += result.allocatedSize || 0;
            instance.stats.successfulAllocations += result.successfulAllocations || 0;
            instance.stats.intFragmentation += result.result.fragmentation || 0;
        }

        instance.results[processId] = result.result;
        instance.currentIndex++;
        renderBlocks(algoId);
        updateAlgorithmStats(algoId);
    }

    return true;
}

function updateAlgorithmStats(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const algoDiv = document.getElementById(algoId);
    if (!algoDiv) return;

    const utilEl = algoDiv.querySelector('.contiguous-statistics .stat-container:nth-child(1) p:last-child');
    const intfragEl = algoDiv.querySelector('.contiguous-statistics .stat-container:nth-child(2) p:last-child');
    const successEl = algoDiv.querySelector('.contiguous-statistics .stat-container:nth-child(3) p:last-child');

    const totalMem = comparisonData.totalMemory;
    const util = totalMem > 0 ? (instance.stats.allocatedSize / totalMem * 100).toFixed(1) : 0;
    const success = instance.processes.length > 0 ? (instance.stats.successfulAllocations / instance.processes.length * 100).toFixed(1) : 0;

    if (utilEl) utilEl.textContent = util + '%';
    if (intfragEl) intfragEl.textContent = instance.stats.intFragmentation + ' KB';
    if (successEl) successEl.textContent = success + '%';
}

function updateSummaryTable() {
    const tbody = document.getElementById('summary-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    ALGO_CONFIG.filter(a => a.category === 'contiguous').forEach(function(config) {
        const instance = algoInstances[config.id];
        if (!instance) return;

        const row = document.createElement('tr');
        const totalMem = comparisonData.totalMemory;
        const util = totalMem > 0 ? (instance.stats.allocatedSize / totalMem * 100).toFixed(1) : 0;
        const success = instance.processes.length > 0 ? (instance.stats.successfulAllocations / instance.processes.length * 100).toFixed(1) : 0;

        row.innerHTML =
            '<td>' + config.name + ' - ' + config.type + '</td>' +
            '<td>' + util + '%</td>' +
            '<td>' + instance.stats.intFragmentation + ' KB</td>' +
            '<td>0 KB</td>' +
            '<td>' + success + '%</td>';
        tbody.appendChild(row);
    });
}

function setupComparisonControls() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const nextBtn = document.getElementById('next-btn');

    if (playBtn) {
        playBtn.addEventListener('click', function() {
            isitPlaying = true;
            playBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'flex';
            startAllSimulations();
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            isitPlaying = false;
            stopBtn.style.display = 'none';
            if (playBtn) playBtn.style.display = 'flex';
            stopAllSimulations();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            isitPlaying = false;
            if (stopBtn) stopBtn.style.display = 'none';
            if (playBtn) playBtn.style.display = 'flex';
            resetAllSimulations();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            stepAllSimulations();
        });
    }
}

function startAllSimulations() {
    const delay = getComparisonStepDelay();

    playtheInterval = setInterval(function() {
        const allDone = stepAllSimulations();
        if (allDone) {
            stopAllSimulations();
            const stopBtn = document.getElementById('stop-btn');
            const playBtn = document.getElementById('play-btn');
            if (stopBtn) stopBtn.style.display = 'none';
            if (playBtn) playBtn.style.display = 'flex';
        }
    }, delay);
}

function stopAllSimulations() {
    if (playtheInterval) {
        clearInterval(playtheInterval);
        playtheInterval = null;
    }
    isitPlaying = false;
}

function stepAllSimulations() {
    let allDone = true;

    ALGO_CONFIG.filter(a => a.category === 'contiguous').forEach(function(config) {
        const hadMore = stepAlgorithm(config.id);
        if (hadMore && algoInstances[config.id] && algoInstances[config.id].currentIndex < algoInstances[config.id].processes.length) {
            allDone = false;
        }
    });

    updateSummaryTable();
    return allDone;
}

function resetAllSimulations() {
    stopAllSimulations();

    ALGO_CONFIG.forEach(function(config) {
        if (config.category === 'contiguous') {
            initAlgorithm(config);
            updateAlgorithmStats(config.id);
        }
    });

    updateSummaryTable();
}

function getComparisonStepDelay() {
    const slider = document.getElementById('slider');
    const value = parseFloat(slider ? slider.value : 1) || 1;
    const maxDelay = 1200;
    const minDelay = 250;
    const normalized = (value - 1) / 2;
    return maxDelay - normalized * (maxDelay - minDelay);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparisonPage);
} else {
    initComparisonPage();
}

