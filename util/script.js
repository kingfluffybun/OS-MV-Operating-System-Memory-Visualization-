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

const processContainer = document.querySelector('.process-container');
let processIdCounter = processContainer ? processContainer.querySelectorAll('.process').length + 1 : 1;

const createProcessElement = (id, sizeKb) => {
    const process = document.createElement('div');
    process.className = 'process';
    process.id = `process-${id}`;
    process.innerHTML = `
        <div class="process-content">
            <p>Process ${id}</p>
            <p>${sizeKb} KB</p>
        </div>
        <div class="process-action">
            <button type="button" class="edit-process-btn"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></button>
            <button type="button" class="delete-process-btn"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
    `;
    return process;
};

const simulationContainer = document.querySelector('.simulation .container');
let blockIdCounter = simulationContainer ? simulationContainer.querySelectorAll('.block').length + 1 : 1;

const createBlockElement = (id, sizeKb) => {
    const block = document.createElement('div');
    block.className = 'block';
    block.id = `block-${id}`;
    block.style.width = '120px';
    block.style.position = 'relative';
    block.innerHTML = `
        <p>Block ${id}</p>
        <h2>${sizeKb} KB</h2>
        <div></div>
        <div class="process-action">
            <button type="button" class="edit-block-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></button>
            <button type="button" class="delete-block-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
    `;
    return block;
};

const add_process_btn = document.getElementById('add-process-btn');
add_process_btn.addEventListener('click', () => {
    const processSizeInput = document.getElementById('process-size');
    const processSize = parseInt(processSizeInput.value, 10);

    if (!processContainer || Number.isNaN(processSize) || processSize <= 0) {
        return;
    }

    const newProcess = createProcessElement(processIdCounter, processSize);
    processContainer.appendChild(newProcess);
    processIdCounter += 1;
    processSizeInput.value = '';
});

const add_block_btn = document.getElementById('add-block-btn');
if (add_block_btn) {
    add_block_btn.addEventListener('click', () => {
        if (!simulationContainer) {
            return;
        }

        const newBlock = createBlockElement(blockIdCounter, 100);
        simulationContainer.insertBefore(newBlock, add_block_btn);
        blockIdCounter += 1;
    });
}

if (simulationContainer) {
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
