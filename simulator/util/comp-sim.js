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
                internalFragmentation: 0,
                externalFragmentation: 0
            }
        };

        if (config.id.includes('next-fit') && typeof memorySimulator !== 'undefined') {
            memorySimulator._nextLastBlock = null;
        }

        // Render initial blocks
        renderBlocks(config.id);
    } else if (config.id === 'paging') {
        const pageSize = comparisonData.pageSize;
        const totalMemory = comparisonData.totalMemory;
        const numFrames = Math.floor(totalMemory / pageSize);
        
        // Initialize memory frames
        const frames = {};
        for (let i = 1; i <= numFrames; i++) {
            frames[i] = { id: i, size: pageSize, status: 'Free', process: null, page: null, used: 0 };
        }
        
        algoInstances[config.id] = {
            config: config,
            memoryFrames: { frames: frames, count: numFrames, frameSize: pageSize },
            processes: comparisonData.processes.slice(),
            currentIndex: 0,
            stats: {
                allocatedSize: 0,
                successfulAllocations: 0,
                internalFragmentation: 0,
                externalFragmentation: 0
            }
        };
        
        initPagingUIInComparison(config.id);
    } else if (config.id === 'segmentation') {
        const totalMemory = comparisonData.totalMemory;
        
        algoInstances[config.id] = {
            config: config,
            memory: memorySimulator.createMemory(totalMemory),
            processes: comparisonData.processes.slice(),
            currentIndex: 0,
            stats: {
                allocatedSize: 0,
                successfulAllocations: 0,
                internalFragmentation: 0,
                externalFragmentation: 0
            }
        };
        
        initSegmentationUIInComparison(config.id);
    } else if (config.id === 'segmentation-paging') {
        const totalMemory = comparisonData.totalMemory;
        const pageSize = comparisonData.pageSize;
        
        algoInstances[config.id] = {
            config: config,
            memory: PagingSegmentSimulator.createFrames(totalMemory, pageSize),
            processes: comparisonData.processes.slice(),
            currentIndex: 0,
            currentSegmentIdx: 0,
            currentPageIdx: 0,
            currentSegments: null,
            results: [],
            stats: {
                allocatedSize: 0,
                successfulAllocations: 0,
                internalFragmentation: 0,
                externalFragmentation: 0
            }
        };
        
        initSegmentationPagingUIInComparison(config.id);
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
        const nextLogicalId = node.next ? String(node.next.originalLabel || node.next.parentId || node.next.id) : null;

        const colorIndex = node.status === 'Occupied' ? ((node.processId || 1) - 1) % processColorsto.length : -1;
        const colorPair = colorIndex >= 0 ? processColorsto[colorIndex] : { bg: '#e0e0e0', border: 'rgba(0, 0, 0, 0.25)' };

        const blockEl = renderMemoryNode(node, {
            isFirstInGroup: logicalId !== prevLogicalId,
            isLastInGroup: logicalId !== nextLogicalId,
            logicalId: logicalId,
            widthPercent: comparisonData.totalMemory > 0 ? (node.size / comparisonData.totalMemory * 100) : 0,
            bgColor: colorPair.bg,
            borderColor: colorPair.border,
            isFixed: instance.config.type === 'fixed'
        });

        container.appendChild(blockEl);
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
                    node.fragmentation = (instance.config.type === 'fixed') ? (result.result.fragmentation || 0) : 0;
                    break;
                }
                node = node.next;
            }

            instance.stats.allocatedSize += result.allocatedSize || 0;
            instance.stats.successfulAllocations += result.successfulAllocations || 0;
            
            if (instance.config.type === 'fixed') {
                instance.stats.internalFragmentation += result.result.fragmentation || 0;
            }
        }

        instance.results[processId] = result.result;
        instance.currentIndex++;
        renderBlocks(algoId);
        updateAlgorithmStats(algoId);
    } else if (instance.config.id === 'paging') {
        if (typeof memorySimulator === 'undefined' || typeof memorySimulator.pagingStep !== 'function') {
            console.error('pagingStep function missing');
            return false;
        }

        const pageSize = comparisonData.pageSize;
        const result = memorySimulator.pagingStep(instance.memoryFrames, processSize, pageSize, `Process ${processId}`);
        
        instance.memoryFrames = result.frames;
        
        if (result.result && result.result.status === 'Allocated') {
            instance.stats.allocatedSize += processSize;
            instance.stats.successfulAllocations += 1;
            instance.stats.internalFragmentation += result.result.internalFragmentation || 0;
        }
        
        instance.currentIndex++;
        updatePagingUIInComparison(algoId);
        updateAlgorithmStats(algoId);
    } else if (instance.config.id === 'segmentation') {
        if (typeof memorySimulator === 'undefined' || typeof memorySimulator.segmentationStep !== 'function') {
            console.error('segmentationStep function missing');
            return false;
        }

        const result = memorySimulator.segmentationStep(instance.memory, `Process ${processId}`, processSize);
        
        if (result.result && result.result.status === 'Allocated') {
            instance.stats.allocatedSize += processSize;
            instance.stats.successfulAllocations += 1;
        }
        
        instance.currentIndex++;
        updateSegmentationUIInComparison(algoId);
        updateAlgorithmStats(algoId);
    } else if (instance.config.id === 'segmentation-paging') {
        if (typeof PagingSegmentSimulator === 'undefined') {
            console.error('PagingSegmentSimulator missing');
            return false;
        }

        const pageSize = comparisonData.pageSize;

        // If we don't have current segments for this process, create them
        if (!instance.currentSegments) {
            const processSize = instance.processes[instance.currentIndex];
            const breakdown = PagingSegmentSimulator.breakdownSize(processSize);
            const segmentTypes = ['Code', 'Heap', 'Data', 'Stack'];
            
            instance.currentSegments = segmentTypes.map(type => {
                const size = breakdown[type.toLowerCase()];
                const { pages, internalFragmentation } = PagingSegmentSimulator.segmentToPages(size, pageSize);
                return { type, size, pages, internalFragmentation };
            }).filter(s => s.size > 0);
            
            instance.currentSegmentIdx = 0;
            instance.currentPageIdx = 0;
            
            // Check if we can fit the whole process at once (simple check)
            // But we step page by page anyway
        }

        const segment = instance.currentSegments[instance.currentSegmentIdx];
        const page = segment.pages[instance.currentPageIdx];
        const processName = `Process ${instance.currentIndex + 1}`;

        const result = PagingSegmentSimulator.allocatePageStepSingle(instance.memory.frames, processName, segment.type, page);

        if (result.success) {
            instance.stats.allocatedSize += page.size;
            // Internal fragmentation only added when a segment starts or when we finish it? 
            // Actually it's per page allocation in this case.
        }

        instance.currentPageIdx++;
        if (instance.currentPageIdx >= segment.pages.length) {
            instance.stats.internalFragmentation += segment.internalFragmentation;
            instance.currentPageIdx = 0;
            instance.currentSegmentIdx++;
        }

        if (instance.currentSegmentIdx >= instance.currentSegments.length) {
            instance.stats.successfulAllocations++;
            instance.currentIndex++;
            instance.currentSegments = null;
        }

        updateSegmentationPagingUIInComparison(algoId);
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
    if (intfragEl) intfragEl.textContent = instance.stats.internalFragmentation + ' KB';
    if (successEl) successEl.textContent = success + '%';
}

function updateSummaryTable() {
    const tbody = document.getElementById('summary-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    ALGO_CONFIG.forEach(function(config) {
        const instance = algoInstances[config.id];
        if (!instance) return;

        const row = document.createElement('tr');
        const totalMem = comparisonData.totalMemory;
        const util = totalMem > 0 ? (instance.stats.allocatedSize / totalMem * 100).toFixed(1) : 0;
        const success = instance.processes.length > 0 ? (instance.stats.successfulAllocations / instance.processes.length * 100).toFixed(1) : 0;

        let extFrag = 0;
        if (config.category === 'contiguous') {
            if (typeof memorySimulator !== 'undefined' && typeof memorySimulator.externalFragmentation === 'function') {
                extFrag = memorySimulator.externalFragmentation(instance.memoryHead, instance.results);
            }
        } else if (instance.stats.externalFragmentation !== undefined) {
            extFrag = instance.stats.externalFragmentation;
        } else if (config.id === 'segmentation' && instance.memory && typeof instance.memory.getStatus === 'function') {
            const status = instance.memory.getStatus();
            extFrag = status.free.reduce((a, f) => a + f.size, 0);
        }

        const displayName = config.name + (config.type && config.type !== config.id ? ' - ' + config.type : '');

        row.innerHTML =
            '<td>' + displayName + '</td>' +
            '<td>' + util + '%</td>' +
            '<td>' + (instance.stats.internalFragmentation || 0) + ' KB</td>' +
            '<td>' + extFrag + ' KB</td>' +
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

// ========== PAGING UI HELPERS FOR COMPARISON ==========

function initPagingUIInComparison(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const container = document.getElementById(algoId);
    if (!container) return;

    const pagesContainer = container.querySelector('.pages-container');
    const framesContainer = container.querySelector('.frames-container');
    
    if (framesContainer) {
        framesContainer.innerHTML = '';
        Object.values(instance.memoryFrames.frames).forEach(frame => {
            const frameEl = document.createElement('div');
            frameEl.className = 'frame';
            frameEl.innerHTML = `
                <p id="frame-number">F${frame.id}</p>
                <div class="frame-content">
                    <p>Free</p>
                    <p>${frame.size} KB</p>
                </div>
            `;
            framesContainer.appendChild(frameEl);
        });
    }

    if (pagesContainer) {
        pagesContainer.innerHTML = '';
        const pageSize = comparisonData.pageSize;
        
        instance.processes.forEach((size, i) => {
            const procName = `Process ${i + 1}`;
            const pagesNeeded = Math.ceil(size / pageSize);
            const colorIndex = i % processColorsto.length;
            const colors = processColorsto[colorIndex];

            for (let j = 0; j < pagesNeeded; j++) {
                const pageEl = document.createElement('div');
                pageEl.className = 'page';
                pageEl.id = `page-${algoId}-${i}-${j}`;
                pageEl.innerHTML = `
                    <div class="page-content" style="background-color: ${colors.bg}; border-bottom-color: ${colors.border}; color: ${colors.text};">
                        <p>P${i + 1} - Page ${j}</p>
                    </div>
                `;
                pagesContainer.appendChild(pageEl);
            }

            if (i < instance.processes.length - 1) {
                const spacer = document.createElement('div');
                spacer.style.height = '8px';
                pagesContainer.appendChild(spacer);
            }
        });
    }
}

function updatePagingUIInComparison(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const container = document.getElementById(algoId);
    if (!container) return;

    const pagesContainer = container.querySelector('.pages-container');
    const framesContainer = container.querySelector('.frames-container');

    if (framesContainer) {
        framesContainer.innerHTML = '';
        Object.values(instance.memoryFrames.frames).forEach(frame => {
            const frameEl = document.createElement('div');
            frameEl.className = 'frame';
            
            if (frame.status === 'Occupied') {
                const procId = parseInt(frame.process.split(' ')[1]) - 1;
                const colors = processColorsto[procId % processColorsto.length];
                frameEl.innerHTML = `
                    <p id="frame-number">F${frame.id - 1}</p>
                    <div class="frame-content" style="background-color: ${colors.bg}; border-bottom-color: ${colors.border}; color: ${colors.text};">
                        <p>P${procId + 1} - Page ${frame.page - 1}</p>
                        <p>${frame.used} KB</p>
                    </div>
                `;
            } else {
                frameEl.innerHTML = `
                    <p id="frame-number">F${frame.id - 1}</p>
                    <div class="frame-content">
                        <p>Free</p>
                    </div>
                `;
            }
            framesContainer.appendChild(frameEl);
        });
    }

    if (pagesContainer) {
        // Update waiting labels for allocated pages
        Object.values(instance.memoryFrames.frames).forEach(frame => {
            if (frame.status === 'Occupied') {
                const procId = parseInt(frame.process.split(' ')[1]) - 1;
                const pageNum = frame.page - 1;
                const pageEl = document.getElementById(`page-${algoId}-${procId}-${pageNum}`);
                if (pageEl) {
                    const statusP = pageEl.querySelector('.page-content p:last-child');
                    if (statusP) statusP.textContent = `${frame.used} KB`;
                }
            }
        });
    }
}

// ========== SEGMENTATION UI HELPERS FOR COMPARISON ==========

function initSegmentationUIInComparison(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const container = document.getElementById(algoId);
    if (!container) return;

    const segmentationContainer = container.querySelector('.segmentation-container');
    const physicalMemoryContainer = container.querySelector('.physical-memory-container');
    
    if (physicalMemoryContainer) {
        physicalMemoryContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #999; font-size: 11px;">Empty Memory</div>';
    }

    if (segmentationContainer) {
        segmentationContainer.innerHTML = '';
        
        instance.processes.forEach((size, i) => {
            const procName = `Process ${i + 1}`;
            const colorIndex = i % processColorsto.length;
            const colors = processColorsto[colorIndex];
            const breakdown = SegmentationMemory.breakdownSize(size);

            const procDiv = document.createElement('div');
            procDiv.className = 'segmentation';
            
            const header = document.createElement('h4');
            header.textContent = procName;
            procDiv.appendChild(header);

            const types = ['code', 'heap', 'data', 'stack'];
            types.forEach((type, idx) => {
                const segSize = breakdown[type];
                if (segSize > 0) {
                    const segEl = document.createElement('div');
                    segEl.className = 'segments-container';
                    segEl.innerHTML = `
                        <div id="segment-number">S${idx}</div>
                        <div class="segments" style="background-color: ${colors.bg}; border-bottom-color: ${colors.border}; color: ${colors.text};">
                            <p class="segment-type">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                            <p id="segment-size">${segSize} KB</p>
                        </div>
                    `;
                    procDiv.appendChild(segEl);
                }
            });
            segmentationContainer.appendChild(procDiv);
        });
    }
}

function updateSegmentationUIInComparison(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const container = document.getElementById(algoId);
    if (!container) return;

    const physicalMemoryContainer = container.querySelector('.physical-memory-container');
    const status = instance.memory.getStatus();

    if (physicalMemoryContainer) {
        physicalMemoryContainer.innerHTML = '';
        const memDiv = document.createElement('div');
        memDiv.className = 'physical-memory';

        if (status.allocated.length === 0) {
             physicalMemoryContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #999; font-size: 11px;">Empty Memory</div>';
             return;
        }

        status.allocated.forEach(seg => {
            const procId = parseInt(seg.name.split(' ')[1]) - 1;
            const colors = processColorsto[procId % processColorsto.length];
            
            const segDiv = document.createElement('div');
            segDiv.className = 'allocated-segments';
            segDiv.style.backgroundColor = colors.bg;
            segDiv.style.borderBottomColor = colors.border;
            segDiv.style.marginBottom = '4px';

            segDiv.innerHTML = `
                <div>
                    <p class="process-segment" style="font-size: 10px;">${seg.name}</p>
                    <p class="segment-type" style="font-size: 9px;">${seg.type.charAt(0).toUpperCase() + seg.type.slice(1)}</p>
                </div>
                <div class="segment-base-limit">
                    <p class="segment-base">${seg.base}</p>
                    <p class="segment-limit">${seg.end + 1}</p>
                </div>
            `;
            memDiv.appendChild(segDiv);
        });

        if (status.free && status.free.length > 0) {
            status.free.forEach(free => {
                const freeDiv = document.createElement('div');
                freeDiv.style.padding = '8px';
                freeDiv.style.backgroundColor = '#f0f0f0';
                freeDiv.style.textAlign = 'center';
                freeDiv.style.fontSize = '9px';
                freeDiv.style.color = '#999';
                freeDiv.style.borderRadius = '4px';
                freeDiv.style.marginBottom = '4px';
                freeDiv.textContent = `Free: ${free.size} KB`;
                memDiv.appendChild(freeDiv);
            });
        }

        physicalMemoryContainer.appendChild(memDiv);
    }
}

// ========== SEGMENTATION WITH PAGING UI HELPERS FOR COMPARISON ==========

function initSegmentationPagingUIInComparison(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const container = document.getElementById(algoId);
    if (!container) return;

    const segmentationContainer = container.querySelector('.segmentation-paging-container');
    const framesContainer = container.querySelector('.frames-container');
    
    if (framesContainer) {
        framesContainer.innerHTML = '<div style="padding: 10px; text-align: center; color: #999; font-size: 11px;">Empty Memory</div>';
    }

    if (segmentationContainer) {
        segmentationContainer.innerHTML = '';
        
        instance.processes.forEach((size, i) => {
            const procName = `Process ${i + 1}`;
            const colorIndex = i % processColorsto.length;
            const colors = processColorsto[colorIndex];
            const pageSize = comparisonData.pageSize;
            const breakdown = PagingSegmentSimulator.breakdownSize(size);

            const procDiv = document.createElement('div');
            procDiv.className = 'segmentation-paging-group';
            
            const header = document.createElement('h4');
            header.textContent = procName;
            header.style.fontSize = '11px';
            header.style.color = '#666';
            header.style.margin = '12px 0 6px 0';
            procDiv.appendChild(header);

            const segmentTypes = ['code', 'heap', 'data', 'stack'];
            segmentTypes.forEach((type, idx) => {
                const segSize = breakdown[type];
                if (segSize > 0) {
                    const { pages } = PagingSegmentSimulator.segmentToPages(segSize, pageSize);
                    
                    const segCard = document.createElement('div');
                    segCard.className = 'segments-paging-container';
                    
                    const pagesHtml = pages.map(p => `
                        <div class="page" id="page-${algoId}-${i}-${type}-${p.pageIndex}">
                            <div class="page-content" style="background-color: white; border-bottom-color: #eee; color: #666;">
                                <p>P${i + 1} - ${type.charAt(0).toUpperCase()} - Page ${p.pageIndex}</p>
                            </div>
                        </div>
                    `).join('');

                    segCard.innerHTML = `
                        <div id="segment-number">S${idx}</div>
                        <div class="segments-paging" style="border-color: ${colors.bg};">
                            <div class="segment-paging-header" style="background-color: ${colors.bg}; color: ${colors.text};">
                                <div>
                                    <p class="segment-type" style="font-weight: 600;">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                                </div>
                                <div><p style="font-weight: 600;">${segSize} KB</p></div>
                            </div>
                            <div class="segment-pages">
                                ${pagesHtml}
                            </div>
                        </div>
                    `;
                    procDiv.appendChild(segCard);
                }
            });
            segmentationContainer.appendChild(procDiv);
        });
    }
}

function updateSegmentationPagingUIInComparison(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const container = document.getElementById(algoId);
    if (!container) return;

    const framesContainer = container.querySelector('.frames-container');
    const frames = instance.memory.frames;

    if (framesContainer) {
        framesContainer.innerHTML = '';
        
        frames.forEach(frame => {
            const frameEl = document.createElement('div');
            frameEl.className = 'frame';
            
            if (frame.status === 'Occupied') {
                const procId = parseInt(frame.processName.split(' ')[1]) - 1;
                const colors = processColorsto[procId % processColorsto.length];
                frameEl.innerHTML = `
                    <p id="frame-number">F${frame.frameId - 1}</p>
                    <div class="frame-content" style="background-color: ${colors.bg}; border-bottom-color: ${colors.border}; color: ${colors.text};">
                        <p style="font-size: 9px;">P${procId + 1} - ${frame.segmentType.charAt(0).toUpperCase()} - Page ${frame.pageIndex}</p>
                        <p style="font-size: 9px;">${frame.used} KB</p>
                    </div>
                `;

                // Also update the page in the segmentation list
                const pageId = `page-${algoId}-${procId}-${frame.segmentType.toLowerCase()}-${frame.pageIndex}`;
                const pageEl = document.getElementById(pageId);
                if (pageEl) {
                    const content = pageEl.querySelector('.page-content');
                    if (content) {
                        content.style.backgroundColor = colors.bg;
                        content.style.borderBottomColor = colors.border;
                        content.style.color = colors.text;
                        const statusP = content.querySelector('p:last-child');
                        if (statusP) statusP.textContent = `${frame.used} KB`;
                    }
                }
            } else {
                frameEl.innerHTML = `
                    <p id="frame-number">F${frame.frameId}</p>
                    <div class="frame-content">
                        <p>Free</p>
                        <p>${frame.size} KB</p>
                    </div>
                `;
            }
            framesContainer.appendChild(frameEl);
        });
    }
}


// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparisonPage);
} else {
    initComparisonPage();
}

