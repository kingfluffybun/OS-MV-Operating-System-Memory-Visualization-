// ========== COMPARISON SIMULATION CONTROLLER ==========

const processColorsto = [
    { bg: "#FFADAD", border: "#BF8282", text: "#791F1F" },
    { bg: "#FFD6A5", border: "#BFA07C", text: "#633806" },
    { bg: "#FDFFB6", border: "#BEBF88", text: "#444441" },
    { bg: "#CAFFBF", border: "#98BF8F", text: "#27500A" },
    { bg: "#9BF6FF", border: "#7DC6CE", text: "#085041" },
    { bg: "#A0C4FF", border: "#7893BF", text: "#042C53" },
    { bg: "#BDB2FF", border: "#8E85BF", text: "#26215C" },
    { bg: "#FFC6FF", border: "#BF94BF", text: "#4B1528" }
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
let currentSort = {
    column: 'utilization',
    direction: 1 // default: desc
};

function initComparisonPage() {
    comparisonSimLoad();
    setupTableSorting();
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
        segmentIndex: 0, // Track current segment being allocated (0-3: code, heap, data, stack)
        // Highlight state
        lastAllocated: {
            procIndex: -1,
            pageIndex: -1,
            frameId: -1,
            type: null, // 'code', 'heap', etc. for segmentation
            segmentId: -1
        }
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
        if (typeof window !== 'undefined' && typeof window.memorySimulator !== 'undefined' && typeof window.memorySimulator.createMemory === 'function') {
            instance.memory = window.memorySimulator.createMemory(comparisonData.totalMemory);
        } else if (typeof SegmentationMemory !== 'undefined') {
            instance.memory = new SegmentationMemory(comparisonData.totalMemory);
        } else {
            instance.memory = {
                totalSize: comparisonData.totalMemory,
                usedSize: 0,
                blocks: [],
                getStatus: function() { return { allocated: this.blocks, free: [{ size: this.totalSize - this.usedSize }] }; },
                allocateSegment: function(name, type, size) {
                    const seg = { id: this.blocks.length + 1, name, type, size, base: this.usedSize, end: this.usedSize + size - 1 };
                    this.blocks.push(seg);
                    this.usedSize += size;
                    return seg;
                }
            };
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
        const processIdStr = `P${i + 1}`;
        const pagesNeeded = Math.ceil(size / pageSize);
        const colors = processColorsto[i % processColorsto.length];

        for (let j = 0; j < pagesNeeded; j++) {
            const pageEl = document.createElement('div');
            pageEl.className = 'page';
            pageEl.id = `page-${algoId}-${i}-${j}`;
            
            const isCurrent = instance.lastAllocated.procIndex === i && instance.lastAllocated.pageIndex === j;
            const currentClass = isCurrent ? ' current' : '';

            pageEl.innerHTML = `
                <p id="page-number">P${j}</p>
                <div class="page-content${currentClass}" style="background-color: ${colors.bg}; border-bottom: 4px solid ${colors.border}; color: ${colors.text};">
                    <p>${processIdStr}</p>
                    <p>&nbsp;(Waiting for allocation)</p>
                </div>
            `;
            pagesContainer.appendChild(pageEl);

            if (isCurrent) {
                scrollToHighlight(pagesContainer, pageEl);
            }
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
                
                const isCurrent = instance.lastAllocated.procIndex === i && instance.lastAllocated.type === type;
                const currentClass = isCurrent ? ' current' : '';

                segEl.innerHTML = `
                    <div id="segment-number">S${idx}</div>
                    <div class="segments${currentClass}" style="background-color: ${colors.bg}; border-bottom: 4px solid ${colors.border}; color: ${colors.text};">
                        <p class="segment-type">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                        <p id="segment-size">${segSize} KB</p>
                    </div>
                `;
                procDiv.appendChild(segEl);

                if (isCurrent) {
                    scrollToHighlight(segContainer, segEl);
                }
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
        procDiv.innerHTML = `<h4 style="font-size: 11px; color: #666; margin: 8px 0; font-weight:500;">Process ${i + 1}</h4>`;

        const types = ['code', 'heap', 'data', 'stack'];
        types.forEach((type, idx) => {
            const segSize = breakdown[type];
            if (segSize > 0) {
                const { pages } = PagingSegmentSimulator.segmentToPages(segSize, pageSize);
                
                const segCard = document.createElement('div');
                segCard.className = 'segments-paging-container';
                
                let segmentHasHighlight = false;
                const pagesHtml = pages.map(p => {
                    const pageIsCurrent = instance.lastAllocated.procIndex === i && 
                                        instance.lastAllocated.type === type && 
                                        instance.lastAllocated.pageIndex === p.pageIndex;
                    if (pageIsCurrent) segmentHasHighlight = true;
                    return `
                        <div class="page" id="page-seg-${algoId}-${i}-${type}-${p.pageIndex}">
                            <div class="page-content${pageIsCurrent ? ' current' : ''}" style="background-color: ${colors.bg}; border-bottom: 4px solid ${colors.border}; color: ${colors.text};">
                                <p>P${i + 1} - ${type.charAt(0).toUpperCase()} - Page ${p.pageIndex}</p>
                            </div>
                        </div>
                    `;
                }).join('');

                segCard.innerHTML = `
                    <div id="segment-number">S${idx}</div>
                    <div class="segments-paging" style="border:4px solid ${colors.bg};">
                        <div class="segment-paging-header" style="background-color: ${colors.bg}; color: ${colors.text};">
                            <div><p class="segment-type" style="font-weight: 600;">${type.charAt(0).toUpperCase() + type.slice(1)}</p></div>
                            <div><p style="font-weight: 600;">${segSize} KB</p></div>
                        </div>
                        <div class="segment-pages">${pagesHtml}</div>
                    </div>
                `;
                procDiv.appendChild(segCard);

                if (segmentHasHighlight) {
                    scrollToHighlight(segPagingContainer, segCard);
                }
            }
        });
        segPagingContainer.appendChild(procDiv);
    });
}

function renderPagingFrames(algoId) {
    const instance = algoInstances[algoId];
    const framesContainer = document.querySelector('#' + algoId + ' .frames-container');
    if (!framesContainer || (!instance.memoryFrames && !instance.memory)) return;

    // Support both memoryFrames (paging) and memory (segmentation-paging)
    const memObj = instance.memoryFrames || instance.memory;
    const frames = memObj.frames;
    const frameSize = memObj.frameSize || memObj.pageSize || comparisonData.pageSize;

    // Clear previous highlights in virtual memory list
    const container = document.getElementById(algoId);
    if (!container) return;
    // Clear previous highlights in virtual memory list
    const virtualMemoryContainer = container.querySelector('.pages-container') || 
                                 container.querySelector('.segmentation-paging-container') ||
                                 container.querySelector('.segmentation-container');
    if (virtualMemoryContainer) {
        virtualMemoryContainer.style.position = 'relative';
        virtualMemoryContainer.querySelectorAll('.current').forEach(el => el.classList.remove('current'));
    }

    if (framesContainer) framesContainer.style.position = 'relative';
    framesContainer.innerHTML = '';

    const framesArray = Array.isArray(frames) ? frames : Object.values(frames);

    framesArray.forEach(function(frame) {
        const frameEl = document.createElement('div');
        frameEl.className = 'frame';
        const fId = frame.frameId || frame.id;
        frameEl.id = `frame-${algoId}-${fId}`;

        if (frame.status === 'Occupied') {
            // Harmonize frame data (paging uses frame.process, seg-paging uses frame.processName)
            const procName = frame.processName || frame.process || "process_1";
            const procNum = parseInt(procName.replace(/\D/g, '')) || 1;
            const procIndex = procNum - 1;
            const colorPair = processColorsto[procIndex % processColorsto.length];
            const pageIndex = (frame.pageIndex !== undefined && frame.pageIndex !== null) ? frame.pageIndex : (frame.page - 1);
            const segmentType = frame.segmentType || "";
            const typeInfo = segmentType ? ` - ${segmentType.charAt(0).toUpperCase()}` : '';

            const isCurrentFrame = instance.lastAllocated.frameId === fId;
            const currentClass = isCurrentFrame ? ' current' : '';

            frameEl.innerHTML = `
                <p id="frame-number">F${fId}</p>
                <div class="frame-content${currentClass}" style="background-color: ${colorPair.bg}; border-bottom: 4px solid ${colorPair.border}; color: ${colorPair.text}; grid-template-columns: repeat(3, 1fr);">
                    <p>P${procNum}${typeInfo}</p>
                    <p>Page ${pageIndex}</p>
                    <p>${frame.used || frameSize}KB</p>
                </div>
            `;

            if (isCurrentFrame) {
                scrollToHighlight(framesContainer, frameEl);
            }

            if (instance.config.type === 'paging') {
                const pageId = `page-${algoId}-${procIndex}-${pageIndex}`;
                const pageEl = document.getElementById(pageId);
                if (pageEl) {
                    const content = pageEl.querySelector('.page-content');
                    if (content) {
                        content.innerHTML = `
                            <p>Process ${procNum}</p>
                            <p>${frame.used || frameSize}KB</p>
                        `;
                        content.style.backgroundColor = colorPair.bg;
                        content.style.borderBottomColor = colorPair.border;
                        content.style.color = colorPair.text;

                        if (isCurrentFrame) {
                            content.classList.add('current');
                            scrollToHighlight(virtualMemoryContainer, pageEl);
                        }
                    }
                }
            } else if (instance.config.type === 'segmentation-paging') {
                const type = segmentType.toLowerCase();
                const pageId = `page-seg-${algoId}-${procIndex}-${type}-${pageIndex}`;
                const pageEl = document.getElementById(pageId);
                if (pageEl) {
                    const content = pageEl.querySelector('.page-content');
                    if (content) {
                        if (isCurrentFrame) {
                            content.classList.add('current');
                            scrollToHighlight(virtualMemoryContainer, pageEl);
                        }
                        content.style.backgroundColor = colorPair.bg;
                        content.style.borderBottomColor = colorPair.border;
                        content.style.color = colorPair.text;
                    }
                }
            }
        } else {
            frameEl.innerHTML = `
                <p id="frame-number">F${fId}</p>
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

    // Clear previous highlights in segmentation list
    const segContainer = document.querySelector('#' + algoId + ' .segmentation-container');
    if (segContainer) {
        segContainer.style.position = 'relative';
        segContainer.querySelectorAll('.current').forEach(el => el.classList.remove('current'));
    }

    if (physContainer) physContainer.style.position = 'relative';
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
            segDiv.style.color = colorPair.text;
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
            
            const isCurrent = instance.lastAllocated.procIndex === (procNum - 1) && instance.lastAllocated.type === seg.type.toLowerCase();
            if (isCurrent) {
                segDiv.classList.add('current');
            }

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
                    content.style.color = colorPair.text;

                    if (isCurrent) {
                        content.classList.add('current');
                        scrollToHighlight(segContainer, segEl);
                    }
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
            widthPx: 80 + (node.size * 0.5), // Same calculation as single mode: minWidth + (blockSize * pxPerKb)
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
            process.style.color = colorPair.text;

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
        
        // Update last allocated for highlight
        instance.lastAllocated = {
            procIndex: processId - 1,
            pageIndex: instance.pageAllocationIndex,
            frameId: parseInt(Object.keys(result.result.frameIds)[0])
        };

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
    const procIdStr = `Process ${processId}`;

    if (!instance.memory) {
        instance.memory = new SegmentationMemory(comparisonData.totalMemory);
    }
    if (instance.segmentIndex === undefined) {
        instance.segmentIndex = 0;
    }

    const breakdown = SegmentationMemory.breakdownSize(processSize);
    const types = ['code', 'heap', 'data', 'stack'];
    
    // Find the next non-zero segment to allocate
    let currentType = null;
    while (instance.segmentIndex < types.length) {
        const type = types[instance.segmentIndex];
        if (breakdown[type] > 0) {
            currentType = type;
            break;
        }
        instance.segmentIndex++;
    }

    if (!currentType) {
        // No more segments for this process
        instance.currentIndex++;
        instance.segmentIndex = 0;
        return true;
    }

    const segSize = breakdown[currentType];

    if (typeof window.memorySimulator === 'undefined' || typeof window.memorySimulator.segmentationStepSingle !== 'function') {
        // Fallback to simplified allocation
        instance.stats.allocatedSize += processSize;
        instance.stats.successfulAllocations++;
        instance.currentIndex++;
        return true;
    }

    // Call segmentationStepSingle
    const result = window.memorySimulator.segmentationStepSingle(instance.memory, procIdStr, currentType, segSize);

    if (result.result.status === 'Allocated') {
        const segment = {
            id: result.result.segment.id,
            processId: processId,
            type: currentType,
            size: segSize,
            base: result.result.segment.base
        };

        instance.segments.push(segment);
        instance.segmentTable[`${processId}-${currentType}`] = segment;
        
        if (instance.segmentIndex === 0) {
            instance.results[processId] = { status: 'Allocated', size: processSize };
            instance.stats.successfulAllocations++;
        }
        
        instance.stats.allocatedSize += segSize;

        // Update last allocated for highlight
        instance.lastAllocated = {
            procIndex: processId - 1,
            type: currentType,
            segmentId: result.result.segment.id
        };

        instance.segmentIndex++;

        // Check if finished with all segments
        let hasMore = false;
        for (let i = instance.segmentIndex; i < types.length; i++) {
            if (breakdown[types[i]] > 0) {
                hasMore = true;
                break;
            }
        }

        if (!hasMore) {
            instance.currentIndex++;
            instance.segmentIndex = 0;
        }
    } else {
        instance.results[processId] = { status: 'Failed', reason: 'Not enough memory' };
        instance.currentIndex++;
        instance.segmentIndex = 0;
    }
    renderSegmentationMemory(algoId);
    updateAlgorithmStats(algoId);
    return true;
}

function stepSegmentationPaging(algoId, processSize, processId) {
    const instance = algoInstances[algoId];
    const pageSize = comparisonData.pageSize;
    const procIdStr = `process_${processId}`;

    if (!instance.memory) {
        instance.memory = PagingSegmentSimulator.createFrames(comparisonData.totalMemory, pageSize);
    }

    if (typeof window.PagingSegmentSimulator === 'undefined') {
        return stepPaging(algoId, processSize, processId);
    }

    if (instance.pageAllocationIndex === undefined) {
        instance.pageAllocationIndex = 0;
    }

    const breakdown = window.PagingSegmentSimulator.breakdownSize(processSize);
    const types = ['code', 'heap', 'data', 'stack'];
    
    // Flatten segments into pages
    const allPages = [];
    types.forEach(type => {
        const segSize = breakdown[type];
        if (segSize > 0) {
            const { pages } = window.PagingSegmentSimulator.segmentToPages(segSize, pageSize);
            pages.forEach(p => {
                allPages.push({ type, page: p });
            });
        }
    });

    if (instance.pageAllocationIndex >= allPages.length) {
        instance.currentIndex++;
        instance.pageAllocationIndex = 0;
        return true;
    }

    const currentPageInfo = allPages[instance.pageAllocationIndex];
    
    // Call allocatePageStepSingle
    const result = window.PagingSegmentSimulator.allocatePageStepSingle(
        instance.memory.frames, 
        procIdStr, 
        currentPageInfo.type, 
        currentPageInfo.page
    );

    if (result.success) {
        if (instance.pageAllocationIndex === 0) {
            instance.results[processId] = { status: 'Allocated', pages: allPages.length, pagesAllocated: 0 };
            instance.stats.successfulAllocations++;
            
            // Calculate total internal fragmentation for the whole process once
            let totalFrag = 0;
            types.forEach(t => {
                const sSize = breakdown[t];
                if (sSize > 0) {
                    totalFrag += (Math.ceil(sSize / pageSize) * pageSize) - sSize;
                }
            });
            instance.stats.internalFragmentation += totalFrag;
        }
        
        instance.stats.allocatedSize += currentPageInfo.page.size;
        instance.results[processId].pagesAllocated++;

        // Update last allocated for highlight
        instance.lastAllocated = {
            procIndex: processId - 1,
            type: currentPageInfo.type,
            pageIndex: currentPageInfo.page.pageIndex,
            frameId: result.allocation.frameId
        };

        instance.pageAllocationIndex++;
        
        if (instance.pageAllocationIndex >= allPages.length) {
            instance.currentIndex++;
            instance.pageAllocationIndex = 0;
        }
    } else {
        instance.results[processId] = { status: 'Failed', reason: 'Not enough frames' };
        instance.currentIndex++;
        instance.pageAllocationIndex = 0;
    }
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
    
    // Conditional Fragmentation logic for Algorithm Cards
    if (intfragEl) {
        const label = intfragEl.previousElementSibling;
        const type = instance.config.type;
        const category = instance.config.category;

        if (type === 'fixed' || type === 'paging' || type === 'segmentation-paging') {
            // Show Internal Fragmentation
            if (label) label.textContent = 'Internal Fragmentation';
            intfragEl.textContent = (instance.stats.internalFragmentation || 0) + ' KB';
        } else if (type === 'dynamic' || type === 'segmentation') {
            // Show External Fragmentation instead of Internal for these types
            if (label) label.textContent = 'External Fragmentation';
            
            let extFrag = 0;
            if (type === 'dynamic') {
                if (typeof window.memorySimulator !== 'undefined' && typeof window.memorySimulator.externalFragmentation === 'function') {
                    extFrag = window.memorySimulator.externalFragmentation(instance.memoryHead, instance.results);
                }
            } else if (type === 'segmentation' && instance.memory && typeof instance.memory.getStatus === 'function') {
                const status = instance.memory.getStatus();
                extFrag = status.free.reduce((a, f) => a + f.size, 0);
            }
            intfragEl.textContent = extFrag + ' KB';
        }
    }

    if (successEl) successEl.textContent = success + '%';
}

function updateSummaryTable() {
    const tbody = document.getElementById('summary-body');
    if (!tbody) return;

    // Collect data for all algorithms
    const tableData = ALGO_CONFIG.map(function(config) {
        const instance = algoInstances[config.id];
        if (!instance) return null;

        const totalMem = comparisonData.totalMemory;
        const util = totalMem > 0 ? (instance.stats.allocatedSize / totalMem * 100) : 0;
        const success = instance.processes.length > 0 ? (instance.stats.successfulAllocations / instance.processes.length * 100) : 0;
        const type = config.type;

        let intFrag = 0;
        let extFrag = 0;

        if (type === 'fixed' || type === 'paging' || type === 'segmentation-paging') {
            intFrag = (instance.stats.internalFragmentation || 0);
        }

        if (type === 'dynamic' || type === 'segmentation') {
            if (type === 'dynamic') {
                if (typeof window.memorySimulator !== 'undefined' && typeof window.memorySimulator.externalFragmentation === 'function') {
                    extFrag = window.memorySimulator.externalFragmentation(instance.memoryHead, instance.results);
                }
            } else if (type === 'segmentation' && instance.memory && typeof instance.memory.getStatus === 'function') {
                const status = instance.memory.getStatus();
                extFrag = status.free.reduce((a, f) => a + f.size, 0);
            }
        }

        return {
            config: config,
            displayName: config.name + (config.type && config.type !== config.id ? ' - ' + config.type : ''),
            utilization: util,
            intFrag: intFrag,
            extFrag: extFrag,
            success: success,
            originalIndex: ALGO_CONFIG.indexOf(config)
        };
    }).filter(d => d !== null);

    // Apply sorting
    if (currentSort.column && currentSort.direction !== 0) {
        tableData.sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];
            
            if (currentSort.direction === 1) { // Descending
                return valB - valA;
            } else { // Ascending
                return valA - valB;
            }
        });
    } else if (currentSort.direction === 0) {
        // Default sorting by original order
        tableData.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    tbody.innerHTML = '';

    tableData.forEach(function(row) {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td><p>' + row.displayName + '</p></td>' +
            '<td><p>' + row.utilization.toFixed(1) + '%</p></td>' +
            '<td><p>' + row.intFrag + ' KB</p></td>' +
            '<td><p>' + row.extFrag + ' KB</p></td>' +
            '<td><p>' + row.success.toFixed(1) + '%</p></td>';
        tbody.appendChild(tr);
    });

    updateSortIndicators();
}

function setupTableSorting() {
    const table = document.getElementById('summary-table-body');
    if (!table) return;

    const headers = table.querySelectorAll('thead th');
    const columnMap = {
        1: 'utilization',
        2: 'intFrag',
        3: 'extFrag',
        4: 'success'
    };

    headers.forEach((header, index) => {
        if (index === 0) return; // Skip Algorithm name for now or add if wanted

        const columnName = columnMap[index];
        if (!columnName) return;

        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            if (currentSort.column === columnName) {
                currentSort.direction = (currentSort.direction + 1) % 3;
            } else {
                currentSort.column = columnName;
                currentSort.direction = 1; // Start with Descending
            }
            updateSummaryTable();
        });
    });
}

function updateSortIndicators() {
    const table = document.getElementById('summary-table-body');
    if (!table) return;

    const headers = table.querySelectorAll('thead th');
    const columnMap = {
        1: 'utilization',
        2: 'intFrag',
        3: 'extFrag',
        4: 'success'
    };

    headers.forEach((header, index) => {
        const columnName = columnMap[index];
        // Remove existing indicators
        const existingIndicator = header.querySelector('.sort-indicator');
        if (existingIndicator) existingIndicator.remove();

        if (columnName) {
            const span = document.createElement('span');
            span.className = 'sort-indicator';
            span.style.marginLeft = '5px';
            
            if (currentSort.column === columnName) {
                if (currentSort.direction === 1) span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-icon lucide-arrow-down"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
                else if (currentSort.direction === 2) span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-icon lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
                else span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-icon lucide-minus"><path d="M5 12h14"/></svg>';
            } else {
                span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-icon lucide-minus"><path d="M5 12h14"/></svg>';
            }
            header.appendChild(span);
        }
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

    const slider = document.getElementById('slider');
    if (slider) {
        slider.addEventListener('input', function() {
            // Update the display text if there was one (e.g., "1.5x")
            const speedText = slider.parentElement.querySelector('p:nth-child(2)');
            if (speedText) {
                speedText.textContent = slider.value + 'x';
            }

            // If playing, restart the timer with new delay immediately
            if (isitPlaying) {
                if (playtheInterval) clearTimeout(playtheInterval);
                startAllSimulations();
            }
        });
    }
}

function startAllSimulations() {
    if (playtheInterval) clearTimeout(playtheInterval);

    function runStep() {
        if (!isitPlaying) return;

        const allDone = stepAllSimulations();
        if (allDone) {
            stopAllSimulations();
            const stopBtn = document.getElementById('stop-btn');
            const playBtn = document.getElementById('play-btn');
            if (stopBtn) stopBtn.style.display = 'none';
            if (playBtn) playBtn.style.display = 'flex';
        } else {
            const delay = getComparisonStepDelay();
            playtheInterval = setTimeout(runStep, delay);
        }
    }

    const delay = getComparisonStepDelay();
    playtheInterval = setTimeout(runStep, delay);
}

function stopAllSimulations() {
    if (playtheInterval) {
        clearTimeout(playtheInterval);
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

function scrollToHighlight(container, element) {
    if (!container || !element) return;
    
    // Use setTimeout to ensure the element is in the DOM and layout is complete
    setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Calculate the relative position of the element within the container's visible area
        const relativeTop = elementRect.top - containerRect.top;
        
        // targetScroll = currentScroll + relativeTop - (containerHeight / 2) + (elementHeight / 2)
        // This centers the element within the scrollable container
        const targetScroll = container.scrollTop + relativeTop - (container.clientHeight / 2) + (element.offsetHeight / 2);
        
        if (container.scrollTo) {
            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        } else {
            container.scrollTop = targetScroll;
        }
    }, 100);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparisonPage);
} else {
    initComparisonPage();
}

