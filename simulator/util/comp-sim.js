// ========== COMPARISON SIMULATION CONTROLLER ==========

// Algorithm configurations
const ALGO_CONFIG = [
    // Contiguous - Fixed
    { id: 'first-fit-fixed', name: 'First Fit', type: 'fixed', category: 'contiguous', script: '../util/algos/firstfit.js' },
    { id: 'first-fit-dynamic', name: 'First Fit', type: 'dynamic', category: 'contiguous', script: '../util/algos/firstfit.js' },
    { id: 'next-fit-fixed', name: 'Next Fit', type: 'fixed', category: 'contiguous', script: '../util/algos/nextfit.js' },
    { id: 'next-fit-dynamic', name: 'Next Fit', type: 'dynamic', category: 'contiguous', script: '../util/algos/nextfit.js' },
    { id: 'best-fit-fixed', name: 'Best Fit', type: 'fixed', category: 'contiguous', script: '../util/algos/bestfit.js' },
    { id: 'best-fit-dynamic', name: 'Best Fit', type: 'dynamic', category: 'contiguous', script: '../util/algos/bestfit.js' },
    { id: 'worst-fit-fixed', name: 'Worst Fit', type: 'fixed', category: 'contiguous', script: '../util/algos/worstfit.js' },
    { id: 'worst-fit-dynamic', name: 'Worst Fit', type: 'dynamic', category: 'contiguous', script: '../util/algos/worstfit.js' },
    // Non-contiguous
    { id: 'paging', name: 'Paging', type: 'paging', category: 'non-contiguous', script: '../util/algos/paging.js' },
    { id: 'segmentation', name: 'Segmentation', type: 'segmentation', category: 'non-contiguous', script: '../util/algos/segmentation.js' },
    { id: 'segmentation-paging', name: 'Segmentation with Paging', type: 'segmentation-paging', category: 'non-contiguous', script: '../util/algos/paging-segment.js' }
];

let comparisonData = null;
let algoInstances = [];
let isPlaying = false;
// let playInterval = null;

function comparisonSimLoad() {
    // Load comparison data from sessionStorage
    const stored = sessionStorage.getItem('comparisonData');
    if (!stored) {
        alert('No comparison data found. Redirecting...');
        window.location.href = 'index.html';
        return;
    }

    comparisonData = JSON.parse(stored);
    
    // Build algorithm grids
    buildContiguousGrid();
    buildNonContiguousGrid();
    
    // Load algorithm scripts
    loadAlgorithmScripts().then(() => {
        initAllAlgorithms();
        setupComparisonControls();
        updateSummaryTable();
    });
}

function buildContiguousGrid() {
    const grid = document.getElementById('contiguous-grid');

    grid.innerHTML = '';

    const contiguousAlgos = ALGO_CONFIG.filter(a => a.category === 'contiguous');

    contiguousAlgos.forEach(algo => {
        const div = document.createElement('div');
        div.className = 'contiguous-algorithm';
        div.id = algo.id;

        const typeLabel = algo.type.charAt(0).toUpperCase() + algo.type.slice(1);

        div.innerHTML = `
            <div class="algorithm-header">
                <h3>${algo.name}</h3>
                <div class="partition-pill" id="${algo.type}"><p>${typeLabel}</p></div>
            </div>
            <div style="display: flex; flex-direction: column; grid-row: span 2;">
                <p style="margin-bottom: 8px; font-weight: bold; font-size: 12px;">Process Queue</p>
                <div class="contiguous-process-queue" id="queue-${algo.id}"></div>
            </div>
            <div class="contiguous-container" id="container-${algo.id}"></div>
            <div class="contiguous-statistics" id="stats-${algo.id}">
                <div class="stat-container">
                    <p>Utilization</p>
                    <p id="util-${algo.id}">0%</p>
                </div>
                <div class="stat-container">
                    <p>Internal Frag.</p>
                    <p id="intfrag-${algo.id}">0 KB</p>
                </div>
                <div class="stat-container">
                    <p>Success Rate</p>
                    <p id="success-${algo.id}">0%</p>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}

function buildNonContiguousGrid() {
    const grid = document.getElementById('non-contiguous-grid');
    
    grid.innerHTML = '';

    const nonContiguousAlgos = ALGO_CONFIG.filter(a => a.category === 'non-contiguous');

    nonContiguousAlgos.forEach(algo => {
        const div = document.createElement('div');
        div.className = 'non-contiguous-algorithm';
        div.id = algo.id;
        
        div.innerHTML = `
            <h3>${algo.name}</h3>
            <div class="non-contiguous-container" id="container-${algo.id}"></div>
            <div class="non-contiguous-stats" id="stats-${algo.id}"></div>
        `;
        grid.appendChild(div);
    });
}

function loadAlgorithmScripts() {
    const scriptsToLoad = [...new Set(ALGO_CONFIG.map(a => a.script))];
    const promises = scriptsToLoad.map(src => {
        return new Promise((resolve) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => {
                console.error('Failed to load:', src);
                resolve(); // Continue even if one fails
            };
            document.head.appendChild(script);
        });
    });
    return Promise.all(promises);
}

function initAllAlgorithms() {
    const { processes, partitions, totalMemory, pageSize } = comparisonData;

    algoInstances = ALGO_CONFIG.map(config => {
        const instance = createAlgoInstance(config, {
            processes: [...processes],
            partitions: config.category === 'contiguous' ? [...partitions] : null,
            totalMemory: totalMemory,
            pageSize: pageSize
        });
        return instance;
    });

    // Render initial process queues
    renderSharedProcessQueue();
}

function createAlgoInstance(config, data) {
    return {
        config: config,
        data: data,
        state: null,
        currentStep: 0,
        results: {},
        stats: {
            allocatedSize: 0,
            successfulAllocations: 0,
            intFragmentation: 0
        },

        init: function() {
            // Initialize based on algorithm type
            if (this.config.category === 'contiguous') {
                this.initContiguous();
            } else {
                this.initNonContiguous();
            }
        },

        initContiguous: function() {
            // Create memory structure from partitions
            const blocks = this.data.partitions.map((size, i) => ({
                id: i + 1,
                size: size,
                status: 'Free'
            }));
            
            this.state = {
                memoryHead: memorySimulator.createLinkedMemory(blocks),
                processes: [...this.data.processes],
                currentIndex: 0
            };
            
            // Render initial blocks
            this.renderBlocks();
        },

        initNonContiguous: function() {
            if (this.config.type === 'paging') {
                const frameCount = Math.floor(this.data.totalMemory / this.data.pageSize);
                this.state = {
                    frames: memorySimulator.createFrames(frameCount, this.data.pageSize),
                    processes: [...this.data.processes],
                    currentIndex: 0
                };
            }
            // Segmentation and segmentation-paging similar...
        },

        step: function() {
            if (this.currentStep >= this.data.processes.length) return false;

            const processSize = this.data.processes[this.currentStep];
            const processId = 'Process ' + (this.currentStep + 1);

            if (this.config.category === 'contiguous') {
                return this.stepContiguous(processSize, processId);
            } else {
                return this.stepNonContiguous(processSize, processId);
            }
        },

        stepContiguous: function(processSize, processId) {
            const isFixed = this.config.type === 'fixed';
            const stepFn = isFixed ? 
                memorySimulator.allocateFixedStep : 
                memorySimulator.allocateDynamicStep;

            const result = stepFn.call(memorySimulator, this.state.memoryHead, processSize);
            
            if (result.newMemoryHead) {
                this.state.memoryHead = result.newMemoryHead;
            }

            this.results[processId] = result.result;
            this.stats.allocatedSize += result.allocatedSize;
            this.stats.successfulAllocations += result.successfulAllocations;
            this.stats.intFragmentation += result.result.fragmentation || 0;

            this.currentStep++;
            this.updateUI();
            return true;
        },

        stepNonContiguous: function(processSize, processId) {
            // Paging step logic
            if (this.config.type === 'paging') {
                const pagesNeeded = Math.ceil(processSize / this.data.pageSize);
                const stepResult = memorySimulator.pagingStepSingle(
                    this.state.frames,
                    processSize,
                    this.data.pageSize,
                    processId,
                    0
                );
                
                if (stepResult.frames) {
                    this.state.frames = stepResult.frames;
                }
                
                this.results[processId] = stepResult.result;
                this.currentStep++;
                this.updateUI();
                return true;
            }
            return false;
        },

        reset: function() {
            this.currentStep = 0;
            this.results = {};
            this.stats = { allocatedSize: 0, successfulAllocations: 0, intFragmentation: 0 };
            this.init();
            this.updateUI();
        },

        renderBlocks: function() {
            const container = document.getElementById('container-' + this.config.id);
            if (!container) {
                console.error('Container not found for algorithm:', this.config.id);
                return;
            };
            
            container.innerHTML = '';

            if (!this.state || !this.state.memoryHead) {
                console.error('Memory head not found for algorithm:', this.config.id);
                return;
            }
            
            // Render memory blocks from linked list
            let node = this.state.memoryHead;
            while (node) {
                const block = document.createElement('div');
                block.className = 'block';
                const widthPercent = this.data.totalMemory > 0 ? (node.size / this.data.totalMemory * 100) : 0;
                block.style.width = widthPercent + '%';
                block.style.backgroundColor = node.status === 'Free' ? '#e0e0e0' : getProcessColor(node.processId);
                block.innerHTML = '<span>' + node.size + 'KB</span>';
                container.appendChild(block);
                node = node.next;
            }
        },

        updateUI: function() {
            // Update stats display
            const utilEl = document.getElementById('util-' + this.config.id);
            const intfragEl = document.getElementById('intfrag-' + this.config.id);
            const successEl = document.getElementById('success-' + this.config.id);

            if (utilEl) {
                const totalMem = this.data.totalMemory;
                const util = totalMem > 0 ? (this.stats.allocatedSize / totalMem * 100).toFixed(1) : 0;
                utilEl.textContent = util + '%';
            }

            if (intfragEl) {
                intfragEl.textContent = this.stats.intFragmentation + ' KB';
            }

            if (successEl) {
                const total = this.data.processes.length;
                const rate = total > 0 ? (this.stats.successfulAllocations / total * 100).toFixed(1) : 0;
                successEl.textContent = rate + '%';
            }

            // Update visualization
            if (this.config.category === 'contiguous') {
                this.renderBlocks();
            }
        }
    };
}

function renderSharedProcessQueue() {
    const processes = comparisonData.processes;
    
    ALGO_CONFIG.filter(a => a.category === 'contiguous').forEach(algo => {
        const queue = document.getElementById('queue-' + algo.id);
        if (!queue) return;
        
        queue.innerHTML = '';
        processes.forEach((size, i) => {
            const div = document.createElement('div');
            div.className = 'process-item';
            div.style.backgroundColor = getProcessColor(i);
            div.innerHTML = `<span>P${i+1}</span><span>${size}KB</span>`;
            queue.appendChild(div);
        });
    });
}

function setupComparisonControls() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const nextBtn = document.getElementById('next-btn');

    playBtn.addEventListener('load', () => {
        isPlaying = true;
        playBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
        startAllSimulations();
    });

    stopBtn.addEventListener('click', () => {
        isPlaying = false;
        stopBtn.style.display = 'none';
        playBtn.style.display = 'flex';
        stopAllSimulations();
    });

    resetBtn.addEventListener('click', () => {
        isPlaying = false;
        stopBtn.style.display = 'none';
        playBtn.style.display = 'flex';
        resetAllSimulations();
    });

    nextBtn.addEventListener('click', () => {
        stepAllSimulations();
    });
}

function startAllSimulations() {
    const delay = getComparisonStepDelay();
    
    playInterval = setInterval(() => {
        const allDone = stepAllSimulations();
        if (allDone) {
            stopAllSimulations();
            document.getElementById('stop-btn').style.display = 'none';
            document.getElementById('play-btn').style.display = 'flex';
        }
    }, delay);
}

function stopAllSimulations() {
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    isPlaying = false;
}

function stepAllSimulations() {
    let allDone = true;
    
    algoInstances.forEach(instance => {
        const hasMore = instance.step();
        if (hasMore) allDone = false;
    });
    
    updateSummaryTable();
    return allDone;
}

function resetAllSimulations() {
    stopAllSimulations();
    algoInstances.forEach(instance => instance.reset());
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

function updateSummaryTable() {
    const tbody = document.getElementById('summary-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    algoInstances.forEach(instance => {
        const row = document.createElement('tr');
        const totalMem = instance.data.totalMemory;
        const util = totalMem > 0 ? (instance.stats.allocatedSize / totalMem * 100).toFixed(1) : 0;
        const success = instance.data.processes.length > 0 ? 
            (instance.stats.successfulAllocations / instance.data.processes.length * 100).toFixed(1) : 0;
        
        row.innerHTML = `
            <td>${instance.config.name} - ${instance.config.type}</td>
            <td>${util}%</td>
            <td>${instance.stats.intFragmentation} KB</td>
            <td>0 KB</td>
            <td>${success}%</td>
        `;
        tbody.appendChild(row);
    });
}

function getProcessColor(index) {
    const colors = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];
    return colors[index % colors.length];
}

window.addEventListener('load', comparisonSimLoad);