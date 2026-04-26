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
    { id: 'paging', name: 'Paging', type: 'paging', category: 'non-contiguous', stepFn: 'pagingStep' },
    { id: 'segmentation', name: 'Segmentation', type: 'segmentation', category: 'non-contiguous', stepFn: 'segmentationStep' },
    { id: 'segmentation-paging', name: 'Segmentation with Paging', type: 'segmentation-paging', category: 'non-contiguous', stepFn: 'segmentationPagingStep' }
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
    if (config.category === 'contiguous') {
        initContiguousAlgorithm(config);
    } else {
        initNonContiguousAlgorithm(config);
    }
}

function initContiguousAlgorithm(config) {
    const container = document.querySelector('#' + config.id + ' .contiguous-container');
    if (!container) return;

    const blocks = comparisonData.partitions.map(function(size, i) {
        return { id: i + 1, size: size, status: 'Free' };
    });

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
            internalFragmentation: 0
        }
    };

    if (config.id.includes('next-fit') && typeof window.memorySimulator !== 'undefined') {
        window.memorySimulator._nextLastBlock = null;
    }

    renderBlocks(config.id);
}

function initNonContiguousAlgorithm(config) {
    const frameCount = Math.floor(comparisonData.totalMemory / comparisonData.pageSize);
    
    algoInstances[config.id] = {
        config: config,
        processes: comparisonData.processes.slice(),
        currentIndex: 0,
        results: {},
        stats: {
            allocatedSize: 0,
            successfulAllocations: 0,
            internalFragmentation: 0
        },
        // Paging state
        frames: [],
        pageTable: {},
        // Segmentation state
        segments: [],
        segmentTable: {}
    };

    // Initialize frames for paging
    if (config.type === 'paging' || config.type === 'segmentation-paging') {
        for (let i = 0; i < frameCount; i++) {
            algoInstances[config.id].frames.push({
                id: i,
                size: comparisonData.pageSize,
                status: 'Free',
                processId: null,
                pageId: null
            });
        }
    }

    // Initialize physical memory for segmentation
    if (config.type === 'segmentation') {
        algoInstances[config.id].physicalMemory = {
            totalSize: comparisonData.totalMemory,
            usedSize: 0,
            blocks: []
        };
    }

    renderNonContiguousInitial(config.id);
}

function renderNonContiguousInitial(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const container = document.querySelector('#' + algoId + ' .non-contiguous-container');
    if (!container) return;

    if (instance.config.type === 'paging') {
        renderPagingFrames(algoId);
        renderPagingPages(algoId);
    } else if (instance.config.type === 'segmentation') {
        renderSegmentationMemory(algoId);
        renderSegmentationSegments(algoId);
    } else if (instance.config.type === 'segmentation-paging') {
        renderSegmentationPaging(algoId);
        renderSegmentationPagingSegments(algoId);
    }
}

function renderPagingPages(algoId) {
    const instance = algoInstances[algoId];
    const container = document.getElementById(algoId);
    if (!container) return;

    const pagesContainer = container.querySelector('.pages-container');
    if (!pagesContainer) return;

    pagesContainer.innerHTML = '';
    const pageSize = comparisonData.pageSize;

    instance.processes.forEach((size, i) => {
        const pagesNeeded = Math.ceil(size / pageSize);
        const colorIndex = i % processColorsto.length;
        const colors = processColorsto[colorIndex];

        for (let j = 0; j < pagesNeeded; j++) {
            const pageEl = document.createElement('div');
            pageEl.className = 'page';
            pageEl.id = `page-${algoId}-${i}-${j}`;
            pageEl.innerHTML = `
                <div class="page-content" style="background-color: white; border-bottom: 2px solid #eee; color: #666;">
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

function renderSegmentationSegments(algoId) {
    const instance = algoInstances[algoId];
    const container = document.getElementById(algoId);
    if (!container) return;

    const segContainer = container.querySelector('.segmentation-container');
    if (!segContainer) return;

    segContainer.innerHTML = '';

    instance.processes.forEach((size, i) => {
        const colorIndex = i % processColorsto.length;
        const colors = processColorsto[colorIndex];
        const breakdown = SegmentationMemory.breakdownSize(size);

        const procDiv = document.createElement('div');
        procDiv.className = 'segmentation';
        procDiv.innerHTML = `<h4>Process ${i + 1}</h4>`;

        const types = ['code', 'heap', 'data', 'stack'];
        types.forEach((type, idx) => {
            const segSize = breakdown[type];
            if (segSize > 0) {
                const segEl = document.createElement('div');
                segEl.className = 'segments-container';
                segEl.id = `seg-list-${algoId}-${i}-${type}`;
                segEl.innerHTML = `
                    <div id="segment-number">S${idx}</div>
                    <div class="segments" style="background-color: white; border-bottom: 2px solid #eee; color: #666;">
                        <p class="segment-type">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                        <p id="segment-size">${segSize} KB</p>
                    </div>
                `;
                procDiv.appendChild(segEl);
            }
        });
        segContainer.appendChild(procDiv);
    });
}

function renderSegmentationPagingSegments(algoId) {
    const instance = algoInstances[algoId];
    const container = document.getElementById(algoId);
    if (!container) return;

    const segPagingContainer = container.querySelector('.segmentation-paging-container');
    if (!segPagingContainer) return;

    segPagingContainer.innerHTML = '';
    const pageSize = comparisonData.pageSize;

    instance.processes.forEach((size, i) => {
        const colorIndex = i % processColorsto.length;
        const colors = processColorsto[colorIndex];
        const breakdown = PagingSegmentSimulator.breakdownSize(size);

        const procDiv = document.createElement('div');
        procDiv.className = 'segmentation-paging-group';
        procDiv.innerHTML = `<h4 style="font-size: 11px; color: #666; margin: 12px 0 6px 0;">Process ${i + 1}</h4>`;

        const types = ['code', 'heap', 'data', 'stack'];
        types.forEach((type, idx) => {
            const segSize = breakdown[type];
            if (segSize > 0) {
                const { pages } = PagingSegmentSimulator.segmentToPages(segSize, pageSize);
                
                const segCard = document.createElement('div');
                segCard.className = 'segments-paging-container';
                
                const pagesHtml = pages.map(p => `
                    <div class="page" id="page-seg-${algoId}-${i}-${type}-${p.pageIndex}">
                        <div class="page-content" style="background-color: white; border-bottom: 2px solid #eee; color: #666;">
                            <p>P${i + 1} - ${type.charAt(0).toUpperCase()} - Page ${p.pageIndex}</p>
                        </div>
                    </div>
                `).join('');

                segCard.innerHTML = `
                    <div id="segment-number">S${idx}</div>
                    <div class="segments-paging" style="border-color: #eee;">
                        <div class="segment-paging-header" style="background-color: #f8f9fa; color: #666;">
                            <div><p class="segment-type" style="font-weight: 600;">${type.charAt(0).toUpperCase() + type.slice(1)}</p></div>
                            <div><p style="font-weight: 600;">${segSize} KB</p></div>
                        </div>
                        <div class="segment-pages">${pagesHtml}</div>
                    </div>
                `;
                procDiv.appendChild(segCard);
            }
        });
        segPagingContainer.appendChild(procDiv);
    });
}

function renderPagingFrames(algoId) {
    const instance = algoInstances[algoId];
    const framesContainer = document.querySelector('#' + algoId + ' .frames-container');
    if (!framesContainer) return;

    framesContainer.innerHTML = '';

    instance.frames.forEach(function(frame) {
        const frameEl = document.createElement('div');
        frameEl.className = 'frame';
        
        if (frame.status === 'Occupied') {
            const colorIndex = (frame.processId - 1) % processColorsto.length;
            const colorPair = processColorsto[colorIndex];
            frameEl.innerHTML = `
                <div class="frame-content" style="background-color: ${colorPair.bg}; border-bottom: 4px solid ${colorPair.border}">
                    <p style="font-weight: 600;">P${frame.processId} - Page ${frame.pageId}</p>
                    <p>${frame.size} KB</p>
                </div>
            `;

            // Highlight in pages-container or segmentation-paging list
            if (instance.config.type === 'paging') {
                const pageId = `page-${algoId}-${frame.processId - 1}-${frame.pageId}`;
                const pageEl = document.getElementById(pageId);
                if (pageEl) {
                    const content = pageEl.querySelector('.page-content');
                    if (content) {
                        content.style.backgroundColor = colorPair.bg;
                        content.style.borderBottomColor = colorPair.border;
                        content.style.color = '#333';
                    }
                }
            } else if (instance.config.type === 'segmentation-paging') {
                // For segmentation-paging, we need to know the segment type.
                // In our simplified stepPaging used by seg-paging, we don't have segment type in frame yet.
                // But we can find the page by searching for the ID that matches.
                const pageIdPattern = `page-seg-${algoId}-${frame.processId - 1}-`;
                const allPages = document.querySelectorAll(`[id^="${pageIdPattern}"]`);
                allPages.forEach(pEl => {
                    if (pEl.id.endsWith(`-${frame.pageId}`)) {
                        const content = pEl.querySelector('.page-content');
                        if (content) {
                            content.style.backgroundColor = colorPair.bg;
                            content.style.borderBottomColor = colorPair.border;
                            content.style.color = '#333';
                        }
                    }
                });
            }
        } else {
            frameEl.innerHTML = '<div class="frame-content"><p>Frame ' + frame.id + '</p><p>' + frame.size + ' KB</p></div>';
        }
        framesContainer.appendChild(frameEl);
    });
}

function renderSegmentationMemory(algoId) {
    const instance = algoInstances[algoId];
    const physContainer = document.querySelector('#' + algoId + ' .physical-memory-container');
    if (!physContainer) return;

    physContainer.innerHTML = '';

    const totalMem = comparisonData.totalMemory;
    const freeSpace = totalMem - instance.stats.allocatedSize;
    const usedPercent = totalMem > 0 ? (instance.stats.allocatedSize / totalMem * 100) : 0;

    const usedBlock = document.createElement('div');
    usedBlock.className = 'memory-block used';
    usedBlock.style.width = usedPercent + '%';
    usedBlock.style.backgroundColor = '#4CAF50';
    usedBlock.innerHTML = '<span>Used: ' + instance.stats.allocatedSize + ' KB</span>';

    const freeBlock = document.createElement('div');
    freeBlock.className = 'memory-block free';
    freeBlock.style.width = (100 - usedPercent) + '%';
    freeBlock.style.backgroundColor = '#e0e0e0';
    freeBlock.innerHTML = '<span>Free: ' + freeSpace + ' KB</span>';

    if (instance.stats.allocatedSize > 0) physContainer.appendChild(usedBlock);
    if (freeSpace > 0) physContainer.appendChild(freeBlock);

    // Update highlights in segmentation list
    instance.segments.forEach(seg => {
        const colorIndex = (seg.processId - 1) % processColorsto.length;
        const colorPair = processColorsto[colorIndex];
        const types = ['code', 'heap', 'data', 'stack'];
        
        // In our simplified stepSegmentation, we allocate one big segment.
        // We'll highlight all segment types for this process.
        types.forEach(type => {
            const segEl = document.getElementById(`seg-list-${algoId}-${seg.processId - 1}-${type}`);
            if (segEl) {
                const content = segEl.querySelector('.segments');
                if (content) {
                    content.style.backgroundColor = colorPair.bg;
                    content.style.borderBottomColor = colorPair.border;
                    content.style.color = '#333';
                }
            }
        });
    });
}

function renderSegmentationPaging(algoId) {
    renderPagingFrames(algoId);
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
            widthPx: 40 + (node.size * 0.5), // Same calculation as single mode: minWidth + (blockSize * pxPerKb)
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
                    <p>P${i + 1}</p>
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

    if (instance.currentIndex >= instance.processes.length) return false;

    const processSize = instance.processes[instance.currentIndex];
    const processId = instance.currentIndex + 1;

    if (instance.config.category === 'contiguous') {
        return stepContiguousAlgorithm(algoId, processSize, processId);
    } else {
        return stepNonContiguousAlgorithm(algoId, processSize, processId);
    }
}

function stepContiguousAlgorithm(algoId, processSize, processId) {
    const instance = algoInstances[algoId];
    const stepFnName = instance.config.stepFn;
    
    // Assign step function from window.memorySimulator
    let stepFn = (typeof window.memorySimulator !== 'undefined') ? window.memorySimulator[stepFnName] : null;

    if (!stepFn) {
        console.error('Step function missing:', stepFnName);
        console.log('window.memorySimulator exists:', typeof window.memorySimulator !== 'undefined');
        if (typeof window.memorySimulator !== 'undefined') {
            console.log('window.memorySimulator keys:', Object.keys(window.memorySimulator));
            console.log('Is stepFnName in window.memorySimulator?', stepFnName in window.memorySimulator);
            console.log('Value of window.memorySimulator[stepFnName]:', window.memorySimulator[stepFnName]);
        }
        instance.currentIndex++;
        return false;
    }

    // Sync Next Fit pointer for this instance
    if (typeof window.memorySimulator !== 'undefined') {
        window.memorySimulator._nextLastBlock = instance.lastBlock;
    }

    const result = stepFn.call(window.memorySimulator, instance.memoryHead, processSize);

    // Save back Next Fit pointer
    if (typeof window.memorySimulator !== 'undefined') {
        instance.lastBlock = window.memorySimulator._nextLastBlock;
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
    return true;
}



function stepNonContiguousAlgorithm(algoId, processSize, processId) {
    const instance = algoInstances[algoId];
    const config = instance.config;

    if (config.type === 'paging') {
        return stepPaging(algoId, processSize, processId);
    } else if (config.type === 'segmentation') {
        return stepSegmentation(algoId, processSize, processId);
    } else if (config.type === 'segmentation-paging') {
        return stepSegmentationPaging(algoId, processSize, processId);
    }

    return false;
}

function stepPaging(algoId, processSize, processId) {
    const instance = algoInstances[algoId];
    const pageSize = comparisonData.pageSize;
    const pagesNeeded = Math.ceil(processSize / pageSize);
    const lastPageSize = processSize % pageSize || pageSize;
    let pagesAllocated = 0;
    let internalFrag = 0;

    // Find free frames
    const freeFrames = instance.frames.filter(function(f) { return f.status === 'Free'; });

    if (freeFrames.length < pagesNeeded) {
        instance.results[processId] = { status: 'Failed', reason: 'Not enough frames' };
        instance.currentIndex++;
        updateAlgorithmStats(algoId);
        return true;
    }

    // Allocate pages to frames
    instance.pageTable[processId] = [];
    
    for (let i = 0; i < pagesNeeded; i++) {
        const frame = freeFrames[i];
        frame.status = 'Occupied';
        frame.processId = processId;
        frame.pageId = i;
        
        const actualSize = (i === pagesNeeded - 1) ? lastPageSize : pageSize;
        const frag = pageSize - actualSize;
        internalFrag += frag;

        instance.pageTable[processId].push({
            pageId: i,
            frameId: frame.id,
            size: actualSize
        });
        
        pagesAllocated++;
    }

    instance.results[processId] = { status: 'Allocated', pages: pagesAllocated, fragmentation: internalFrag };
    
    // Update statistics
    instance.stats.allocatedSize += processSize;
    instance.stats.successfulAllocations++;
    instance.stats.internalFragmentation += internalFrag;

    instance.currentIndex++;

    renderPagingFrames(algoId);
    updateAlgorithmStats(algoId);
    return true;
}

function stepSegmentation(algoId, processSize, processId) {
    const instance = algoInstances[algoId];
    const totalMem = comparisonData.totalMemory;
    const remainingSpace = totalMem - instance.stats.allocatedSize;

    if (processSize > remainingSpace) {
        instance.results[processId] = { status: 'Failed', reason: 'Not enough memory' };
        instance.currentIndex++;
        updateAlgorithmStats(algoId);
        return true;
    }

    // Create segment
    const segment = {
        id: instance.segments.length + 1,
        processId: processId,
        size: processSize,
        base: instance.stats.allocatedSize
    };

    instance.segments.push(segment);
    instance.segmentTable[processId] = segment;
    instance.results[processId] = { status: 'Allocated', segmentId: segment.id, size: processSize };
    
    // Update statistics
    instance.stats.allocatedSize += processSize;
    instance.stats.successfulAllocations++;

    instance.currentIndex++;

    renderSegmentationMemory(algoId);
    updateAlgorithmStats(algoId);
    return true;
}

function stepSegmentationPaging(algoId, processSize, processId) {
    // Simplified: treat as paging with larger "pages" (segments divided into pages)
    return stepPaging(algoId, processSize, processId);
}

function updateAlgorithmStats(algoId) {
    const instance = algoInstances[algoId];
    if (!instance) return;

    const algoDiv = document.getElementById(algoId);
    if (!algoDiv) return;

    const statContainers = algoDiv.querySelectorAll('.contiguous-statistics .stat-container');
    if (statContainers.length < 3) return;

    const utilEl = statContainers[0].querySelector('p:last-child');
    const intfragEl = statContainers[1].querySelector('p:last-child');
    const successEl = statContainers[2].querySelector('p:last-child');

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
            if (typeof window.memorySimulator !== 'undefined' && typeof window.memorySimulator.externalFragmentation === 'function') {
                extFrag = window.memorySimulator.externalFragmentation(instance.memoryHead, instance.results);
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

    ALGO_CONFIG.forEach(function(config) {
        const hadMore = stepAlgorithm(config.id);
        const instance = algoInstances[config.id];
        if (hadMore && instance && instance.currentIndex < instance.processes.length) {
            allDone = false;
        }
    });

    updateSummaryTable();
    return allDone;
}

function resetAllSimulations() {
    stopAllSimulations();

    ALGO_CONFIG.forEach(function(config) {
        initAlgorithm(config);
        updateAlgorithmStats(config.id);
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

const containers = document.querySelectorAll('.contiguous-container');

containers.forEach(container => {
  container.addEventListener('scroll', () => {
    containers.forEach(target => {
      if (target !== container) {
        target.scrollLeft = container.scrollLeft;
      }
    });
  });
});

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

