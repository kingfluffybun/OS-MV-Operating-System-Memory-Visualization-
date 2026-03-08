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

const toggleModalForm = () => {
    const modalForm = document.getElementById('modal-form');
    const openBtn = document.getElementById('open-form');
    const closeBtn = document.getElementById('close-form');
    const isOpen = modalForm.classList.toggle('show');

    if (isOpen) {
        openBtn.classList.add('hide');
        closeBtn.classList.add('show');
    } else {
        openBtn.classList.remove('hide');
        closeBtn.classList.remove('show');
    }
}