// /c:/OS-MV-Operating-System-Memory-Visualization/util/algos/segmentation.js

class Segment {
    constructor(id, name, base, size, breakdown = { code: 0, heap: 0, stack: 0 }) {
        this.id = id
        this.name = name
        this.base = base
        this.size = size
        this.breakdown = breakdown
    }

    get end() {
        return this.base + this.size - 1
    }
}

class SegmentationMemory {
    constructor(totalSize = 1024) {
        this.totalSize = totalSize
        this.segments = [] // allocated segments sorted by base
        this.nextId = 1
    }

    _findHole(size) {
        if (this.segments.length === 0) return 0
        if (this.segments[0].base >= size) return 0
        for (let i = 0; i < this.segments.length - 1; i++) {
            const currentEnd = this.segments[i].end
            const nextBase = this.segments[i + 1].base
            const hole = nextBase - (currentEnd + 1)
            if (hole >= size) return currentEnd + 1
        }
        const lastEnd = this.segments[this.segments.length - 1].end
        if (this.totalSize - (lastEnd + 1) >= size) return lastEnd + 1
        return -1
    }

    allocate(name, size) {
        if (!name || size <= 0) throw new Error('invalid allocation')
        const base = this._findHole(size)
        if (base < 0) return null

        const breakdown = SegmentationMemory.breakdownSize(size)
        const seg = new Segment(this.nextId++, name, base, size, breakdown)
        this.segments.push(seg)
        this.segments.sort((a, b) => a.base - b.base)
        return seg
    }

    deallocate(nameOrId) {
        const idx = this.segments.findIndex(
            seg =>
                seg.name === nameOrId ||
                seg.id === nameOrId ||
                String(seg.id) === String(nameOrId)
        )
        if (idx < 0) return false
        this.segments.splice(idx, 1)
        return true
    }

    getStatus() {
        const allocated = this.segments.map(seg => ({
            id: seg.id,
            name: seg.name,
            base: seg.base,
            size: seg.size,
            end: seg.end,
            breakdown: seg.breakdown
        }))
        let free = []
        if (allocated.length === 0) {
            free.push({ base: 0, size: this.totalSize, end: this.totalSize - 1 })
        } else {
            if (allocated[0].base > 0) {
                free.push({ base: 0, size: allocated[0].base, end: allocated[0].base - 1 })
            }
            for (let i = 0; i < allocated.length - 1; i++) {
                const gapBase = allocated[i].end + 1
                const gapSize = allocated[i + 1].base - gapBase
                if (gapSize > 0) free.push({ base: gapBase, size: gapSize, end: gapBase + gapSize - 1 })
            }
            const last = allocated[allocated.length - 1]
            if (last.end < this.totalSize - 1) {
                free.push({ base: last.end + 1, size: this.totalSize - last.end - 1, end: this.totalSize - 1 })
            }
        }
        return { totalSize: this.totalSize, allocated, free }
    }

    static breakdownSize(size) {
        if (size <= 0) return { code: 0, heap: 0, stack: 0 }
        if (size < 3) {
            return { code: size, heap: 0, stack: 0 }
        }

        const code = Math.floor(Math.random() * (size - 2)) + 1
        const heap = Math.floor(Math.random() * (size - code - 1)) + 1
        const stack = size - code - heap
        return { code, heap, stack }
    }
}

const memorySimulator = {
    createMemory(totalSize = 1024) {
        return new SegmentationMemory(totalSize)
    },

    allocate(memory, name, size) {
        const segment = memory.allocate(name, size)
        return segment
    },

    deallocate(memory, nameOrId) {
        return memory.deallocate(nameOrId)
    },

    getStatus(memory) {
        return memory.getStatus()
    },

    segmentation(memory, processes) {
        const simMemory = memory instanceof SegmentationMemory ? memory : new SegmentationMemory(memory)
        const results = {}
        let allocatedSize = 0
        let successfulAllocations = 0

        for (const pId in processes) {
            if (!Object.prototype.hasOwnProperty.call(processes, pId)) continue
            const size = processes[pId]
            const segName = pId
            const seg = simMemory.allocate(segName, size)
            if (seg) {
                results[pId] = {
                    size,
                    status: 'Allocated',
                    segment: seg,
                    breakdown: seg.breakdown
                }
                allocatedSize += size
                successfulAllocations++
            } else {
                results[pId] = { size, status: 'Unallocated', segment: null, breakdown: null }
            }
        }

        const stats = {
            totalSize: simMemory.totalSize,
            allocatedSize,
            successfulAllocations,
            externalFragmentation: simMemory.getStatus().free.reduce((a, f) => a + f.size, 0),
            totalSegments: simMemory.segments.length
        }

        return { results, stats, memory: simMemory }
    },

    segmentationStep(memory, processId, processSize) {
        const seg = memory.allocate(processId, processSize)
        const breakdown = seg ? seg.breakdown : { code: 0, heap: 0, stack: 0 }
        return {
            result: {
                id: processId,
                size: processSize,
                status: seg ? 'Allocated' : 'Unallocated',
                segment: seg,
                breakdown
            },
            memory
        }
    }
}

if (typeof window !== 'undefined') {
    window.memorySimulator = memorySimulator
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SegmentationMemory, memorySimulator }
}

// Node simulation demo when run directly (collapsed object view w/ full details)
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('segmentation.js')) {
    const mem = memorySimulator.createMemory(100)
    const procs = { p1: 20, p2: 25, p3: 30, p4: 10, p5: 25 }

    console.log('Initial status:')
    console.dir(memorySimulator.getStatus(mem), { depth: null, colors: true })

    Object.entries(procs).forEach(([k, v]) => {
        const r = memorySimulator.segmentationStep(mem, k, v)
        console.log(`Allocate ${k} (${v}):`, r.result.status)
        console.dir(r.result, { depth: null, colors: true })
    })

    console.log('Final status:')
    console.dir(memorySimulator.getStatus(mem), { depth: null, colors: true })
}
