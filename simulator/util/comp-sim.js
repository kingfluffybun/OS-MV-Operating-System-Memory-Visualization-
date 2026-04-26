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
            internalFragmentation: 0,
            externalFragmentation: 0
        },
        // Paging state
        memoryFrames: null,
        pageTable: {},
        pageAllocationIndex: 0, // Track current page being allocated
        // Segmentation state
        memory: null,
        segments: [],
        segmentTable: {},
        segmentIndex: 0 // Track current segment being allocated (0-3: code, heap, data, stack)
    };

    const instance = algoInstances[config.id];

    // Initialize frames for paging
    if (config.type === 'paging') {
        if (typeof window.memorySimulator !== 'undefined' && typeof window.memorySimulator.createFrames === 'function') {
            instance.memoryFrames = window.memorySimulator.createFrames(frameCount, comparisonData.pageSize);
        } else {
            // Fallback if memorySimulator is not available
            const frames = {};
            for (let i = 1; i <= frameCount; i++) {
                frames[i] = {
                    id: i,
                    size: comparisonData.pageSize,
                    status: 'Free',
                    process: null,
                    page: null,
                    used: 0
                };
            }
            instance.memoryFrames = { frames, count: frameCount, frameSize: comparisonData.pageSize };
        }
    }

    // Initialize memory for segmentation
    if (config.type === 'segmentation') {
        if (typeof memorySimulator !== 'undefined' && typeof memorySimulator.createMemory === 'function') {
            instance.memory = memorySimulator.createMemory(comparisonData.totalMemory);
        } else {
            // Fallback if SegmentationMemory is not globally available yet
            instance.memory = new SegmentationMemory(comparisonData.totalMemory);
        }
    }

    // Initialize for segmentation with paging
    if (config.type === 'segmentation-paging') {
        if (typeof PagingSegmentSimulator !== 'undefined') {
            instance.memory = PagingSegmentSimulator.createFrames(comparisonData.totalMemory, comparisonData.pageSize);
        }
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
        const processIdStr = `Process ${i + 1}`;
        const pagesNeeded = Math.ceil(size / pageSize);
        const colors = processColorsto[i % processColorsto.length];

        for (let j = 0; j < pagesNeeded; j++) {
            const pageEl = document.createElement('div');
            pageEl.className = 'page';
            pageEl.id = `page-${algoId}-${i}-${j}`;
            pageEl.innerHTML = `
                <p id="page-number">P${j}</p>
                <div class="page-content" style="background-color: white; border-bottom: 2px solid #eee; color: #666;">
                    <p>${processIdStr}</p>
                    <p>&nbsp;(Waiting for allocation)</p>
                </div>
            `;
            const contentDiv = pageEl.querySelector('.page-content');
            if (contentDiv) {
                contentDiv.style.backgroundColor = colors.bg;
                contentDiv.style.borderBottom = `4px solid ${colors.border}`;
                contentDiv.style.color = colors.text;
            }
            pagesContainer.appendChild(pageEl);
        }

        if (i < instance.processes.length - 1) {
            const spacer = document.createElement('div');
            spacer.style.gridColumn = "1 / -1";
            spacer.style.minHeight = "8px";
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
    if (!framesContainer || !instance.memoryFrames && !instance.memory) return;

    // Support both memoryFrames (paging) and memory (segmentation-paging)
    const memObj = instance.memoryFrames || instance.memory;
    const frames = memObj.frames;
    const frameSize = memObj.frameSize || memObj.pageSize || comparisonData.pageSize;

    framesContainer.innerHTML = '';

    Object.values(frames).forEach(function(frame) {
        const frameEl = document.createElement('div');
        frameEl.className = 'frame';
        frameEl.id = `frame-${algoId}-${frame.frameId || frame.id}`;

        if (frame.status === 'Occupied') {
            // Harmonize frame data (paging uses frame.process, seg-paging uses frame.processName)
            const procName = frame.processName || frame.process;
            const procNum = parseInt(procName.replace(/\D/g, '')) || 1;
            const procIndex = procNum - 1;
            const colorPair = processColorsto[procIndex % processColorsto.length];
            
            // Harmonize page index
            const pageIndex = (frame.pageIndex !== undefined && frame.pageIndex !== null) ? frame.pageIndex : (frame.page - 1);
            
            // For segmentation-paging, show segment type too
            const typeInfo = frame.segmentType ? ` - ${frame.segmentType.charAt(0).toUpperCase()}` : '';

            frameEl.innerHTML = `
                <p id="frame-number">F${frame.frameId || frame.id}</p>
                <div class="frame-content" style="background-color: ${colorPair.bg}; border-bottom: 4px solid ${colorPair.border}; color: ${colorPair.text}; grid-template-columns: repeat(3, 1fr);">
                    <p>P${procNum}${typeInfo}</p>
                    <p>Page ${pageIndex}</p>
                    <p>${frame.used} KB</p>
                </div>
            `;

            // Highlight in pages-container
            if (instance.config.type === 'paging') {
                const pageId = `page-${algoId}-${procIndex}-${pageIndex}`;
                const pageEl = document.getElementById(pageId);
                if (pageEl) {
                    const content = pageEl.querySelector('.page-content');
                    if (content) {
                        content.innerHTML = `
                            <p>Process ${procNum}</p>
                            <p>${frame.used}KB</p>
                        `;
                        content.style.backgroundColor = colorPair.bg;
                        content.style.borderBottomColor = colorPair.border;
                        content.style.color = colorPair.text || '#333';
                    }
                }
            } else if (instance.config.type === 'segmentation-paging') {
                const pageId = `page-seg-${algoId}-${procIndex}-${segmentType.toLowerCase()}-${pageIndex}`;
                const pageEl = document.getElementById(pageId);
                if (pageEl) {
                    const content = pageEl.querySelector('.page-content');
                    if (content) {
                        content.style.backgroundColor = colorPair.bg;
                        content.style.borderBottomColor = colorPair.border;
                        content.style.color = colorPair.text || '#333';
                    }
                }
            } else if (instance.config.type === 'segmentation-paging') {
                const type = frame.segmentType ? frame.segmentType.toLowerCase() : '';
                const pageId = `page-seg-${algoId}-${procIndex}-${type}-${pageIndex}`;
                const pageEl = document.getElementById(pageId);
                if (pageEl) {
                    const content = pageEl.querySelector('.page-content');
                    if (content) {
                        content.style.backgroundColor = colorPair.bg;
                        content.style.borderBottomColor = colorPair.border;
                        content.style.color = colorPair.text;
                    }
                }
            }
        } else {
            frameEl.innerHTML = `
                <p id="frame-number">F${frame.frameId || frame.id}</p>
                <div class="frame-content">
                    <p>Free</p>
                    <p>${frame.size || frameSize} KB</p>
                </div>
            `;
        }
        framesContainer.appendChild(frameEl);
    });
}

function renderSegmentationMemory(algoId) {
    const instance = algoInstances[algoId];
    const physContainer = document.querySelector('#' + algoId + ' .physical-memory-container');
    if (!physContainer || !instance.memory) return;

    physContainer.innerHTML = '';
    const status = instance.memory.getStatus();
    
    const memDiv = document.createElement('div');
    memDiv.className = 'physical-memory';
    memDiv.style.display = 'flex';
    memDiv.style.flexDirection = 'column';
    memDiv.style.width = '100%';

    // Render allocated segments
    if (status && status.allocated) {
        status.allocated.forEach((seg) => {
            const procNum = parseInt(seg.name.replace(/\D/g, '')) || 1;
            const colorPair = processColorsto[(procNum - 1) % processColorsto.length];
            
            const segDiv = document.createElement('div');
            // Scale height for comparison view (smaller than single mode)
            const height = Math.max(30, seg.size * 0.4); 
            segDiv.style.height = `${height}px`;
            segDiv.style.minHeight = '30px';
            segDiv.className = 'allocated-segments';
            segDiv.style.backgroundColor = colorPair.bg;
            segDiv.style.borderBottom = `2px solid ${colorPair.border}`;
            segDiv.style.color = '#333';
            segDiv.style.display = 'flex';
            segDiv.style.flexDirection = 'column';
            segDiv.style.justifyContent = 'center';
            segDiv.style.alignItems = 'center';
            segDiv.style.fontSize = '10px';
            segDiv.style.padding = '2px';
            segDiv.style.margin = '1px 0';
            segDiv.style.borderRadius = '4px';

            segDiv.innerHTML = `
                <span style="font-weight:bold;">P${procNum} - ${seg.type.charAt(0).toUpperCase() + seg.type.slice(1)}</span>
                <span>${seg.size} KB (${seg.base}-${seg.end})</span>
            `;
            memDiv.appendChild(segDiv);

            // Highlight in segmentation list
            const type = seg.type.toLowerCase();
            const segElId = `seg-list-${algoId}-${procNum - 1}-${type}`;
            const segEl = document.getElementById(segElId);
            if (segEl) {
                const content = segEl.querySelector('.segments');
                if (content) {
                    content.style.backgroundColor = colorPair.bg;
                    content.style.borderBottomColor = colorPair.border;
                    content.style.color = '#333';
                }
            }
        });
    }

    // Render free blocks
    if (status && status.free) {
        status.free.forEach((hole) => {
            if (hole.size <= 0) return;
            const holeDiv = document.createElement('div');
            const height = Math.max(20, hole.size * 0.4);
            holeDiv.style.height = `${height}px`;
            holeDiv.style.backgroundColor = '#f0f0f0';
            holeDiv.style.border = '1px dashed #ccc';
            holeDiv.style.display = 'flex';
            holeDiv.style.justifyContent = 'center';
            holeDiv.style.alignItems = 'center';
            holeDiv.style.fontSize = '10px';
            holeDiv.style.color = '#999';
            holeDiv.style.margin = '1px 0';
            holeDiv.style.borderRadius = '4px';
            holeDiv.innerHTML = `Free: ${hole.size} KB`;
            memDiv.appendChild(holeDiv);
        });
    }

    physContainer.appendChild(memDiv);
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
        const colorPair = colorIndex >= 0 ? processColorsto[colorIndex] : { bg: 'white', border: 'rgba(0, 0, 0, 0.25)' };

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
    const procIdStr = `process_${processId}`;

    if (typeof window.memorySimulator === 'undefined' || typeof window.memorySimulator.pagingStepSingle !== 'function') {
        console.error('pagingStepSingle function missing in memorySimulator');
        instance.currentIndex++;
        return false;
    }

    if (instance.pageAllocationIndex === undefined) {
        instance.pageAllocationIndex = 0;
    }

    const pagesNeeded = Math.ceil(processSize / pageSize);

    // Call pagingStepSingle for the current page
    const result = window.memorySimulator.pagingStepSingle(
        instance.memoryFrames, 
        processSize, 
        pageSize, 
        procIdStr, 
        instance.pageAllocationIndex
    );
    
    if (result.result.status === 'Allocated') {
        instance.memoryFrames = result.frames;
        
        // Initialize results for this process if it's the first page
        if (instance.pageAllocationIndex === 0) {
            instance.results[processId] = { 
                status: 'Allocated', 
                pages: pagesNeeded, 
                pagesAllocated: 0,
                fragmentation: result.result.internalFragmentation 
            };
            
            // Initial stats for the process
            instance.stats.successfulAllocations++;
            instance.stats.internalFragmentation += result.result.internalFragmentation;
        }
        
        // Update allocated size per page (approximately) or once per process?
        // Let's do it per page for real-time utility update
        const pageUsed = Math.min(pageSize, processSize - (instance.pageAllocationIndex * pageSize));
        instance.stats.allocatedSize += pageUsed;

        instance.results[processId].pagesAllocated++;
        instance.pageAllocationIndex++;

        // If all pages are allocated, move to next process
        if (instance.pageAllocationIndex >= pagesNeeded) {
            instance.currentIndex++;
            instance.pageAllocationIndex = 0;
        }
    } else {
        // Failed to allocate a page, mark process as failed and move on
        // If we already allocated some pages, we should probably rollback? 
        // But for visualization, maybe just stop.
        instance.results[processId] = { status: 'Failed', reason: 'Not enough frames' };
        instance.currentIndex++;
        instance.pageAllocationIndex = 0;
    }

    renderPagingFrames(algoId);
    updateAlgorithmStats(algoId);
    return true;
}

function stepSegmentation(algoId, processSize, processId) {
    const instance = algoInstances[algoId];
    const processIdStr = `Process ${processId}`;

    if (!instance.memory) {
        instance.memory = new SegmentationMemory(comparisonData.totalMemory);
    }

    const segments = instance.memory.allocate(processIdStr, processSize);

    if (segments && segments.length > 0) {
        instance.results[processId] = { 
            status: 'Allocated', 
            segments: segments, 
            size: processSize 
        };
        
        // Update statistics
        instance.stats.allocatedSize += processSize;
        instance.stats.successfulAllocations++;
        
        // External fragmentation from current memory status
        const status = instance.memory.getStatus();
        instance.stats.externalFragmentation = status.free.reduce((a, f) => a + f.size, 0);
    } else {
        instance.results[processId] = { status: 'Failed', reason: 'Not enough memory for all segments' };
        // Check fragmentation even on failure
        const status = instance.memory.getStatus();
        instance.stats.externalFragmentation = status.free.reduce((a, f) => a + f.size, 0);
    }

    instance.currentIndex++;
    renderSegmentationMemory(algoId);
    updateAlgorithmStats(algoId);
    return true;
}

function stepSegmentationPaging(algoId, processSize, processId) {
    const instance = algoInstances[algoId];
    const processName = `Process ${processId}`;
    const pageSize = comparisonData.pageSize;

    if (!instance.memory) {
        instance.memory = PagingSegmentSimulator.createFrames(comparisonData.totalMemory, pageSize);
    }

    const breakdown = PagingSegmentSimulator.breakdownSize(processSize);
    let allAllocated = true;
    const processAllocations = [];
    let processInternalFrag = 0;

    // Save current memory state for potential rollback
    const originalFrames = JSON.parse(JSON.stringify(instance.memory.frames));

    const segmentTypes = {
        Code: breakdown.code,
        Heap: breakdown.heap,
        Data: breakdown.data,
        Stack: breakdown.stack
    };

    for (const [type, size] of Object.entries(segmentTypes)) {
        if (size <= 0) continue;

        const { pages, internalFragmentation } = PagingSegmentSimulator.segmentToPages(size, pageSize);
        const result = PagingSegmentSimulator.allocatePagesToFrames(instance.memory.frames, processName, type, pages);
        
        if (result.success) {
            processAllocations.push(...result.allocation);
            processInternalFrag += internalFragmentation;
        } else {
            allAllocated = false;
            break;
        }
    }

    if (allAllocated) {
        instance.results[processId] = { 
            status: 'Allocated', 
            allocations: processAllocations,
            internalFragmentation: processInternalFrag
        };
        instance.stats.allocatedSize += processSize;
        instance.stats.successfulAllocations++;
        instance.stats.internalFragmentation += processInternalFrag;
    } else {
        // Rollback
        instance.memory.frames = originalFrames;
        instance.results[processId] = { status: 'Failed', reason: 'Not enough frames' };
    }

    instance.currentIndex++;
    renderPagingFrames(algoId);
    updateAlgorithmStats(algoId);
    return true;
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

function transparentController() {
    const body = document.querySelector(".comparison-grid")
  const header = document.querySelector(".simulation-controls");

  const scrollPos = body.scrollTop; 
  console.log(body.scrollTop);
  if (scrollPos > 150) { 
    console.log("gumana")
    header.classList.add("scrolled-style");
  } else {
    header.classList.remove("scrolled-style");
  }
};

document.querySelector('.comparison-grid').addEventListener('scroll', transparentController);

// ========== PAGING UI HELPERS FOR COMPARISON ==========




// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparisonPage);
} else {
    initComparisonPage();
}

