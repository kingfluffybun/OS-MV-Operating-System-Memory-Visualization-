// ========== SIDEBAR ==========
// Load sidebar
// document.addEventListener("DOMContentLoaded", () => {
//   loadSidebar().then(() => {
//     sidebarLinks();
//     showMenu();
//     initSidebarFunctions();
//     loadCurrentUser();
//   });
// });

if (document.readyState !== 'loading') {
  loadSidebar().then(() => {
    sidebarLinks();
    showMenu();
    initSidebarFunctions();
    loadCurrentUser();
  });
}

async function loadSidebar() {
  const container = document.getElementById("sidebar-container");

  if (!container) {
    console.error("Sidebar container not found");
    return;
  }

  try {
    const response = await fetch("../../sidebar/sidebar.html");
    const data = await response.text();
    container.innerHTML = data;
    console.log("Sidebar loaded successfully");
  } catch (error) {
    console.error("Error loading sidebar:", error);
  }
}

const getBasePath = () => {
  const path = window.location.pathname;

  if (path.includes('/admin-dashboard/')) return '../';
  if (path.includes('/simulator/algorithm/')) return '../../';
  if (path.includes('/simulator/comparison/')) return '../../../../';
  if (path.includes('/simulator/')) return '../';
  if (path.includes('/simulator/single-mode.html')) return '../';
  return './';
}

const sidebarLinks = () => {
  const base = getBasePath();

  const linkMap = [
    {id: 'menu-dashboard', path: 'simulator/index.html'},
    {id: 'menu-admin-dashboard', path: 'admin-dashboard/index.html'},
    {id: 'menu-back-simulator', path: 'simulator/index.html'}, // for admin dashboard
    {id: 'comparison-mode', path: 'simulator/comparison/index.html'}, // for comparison mode
    {id: 'single-mode', path: 'simulator/single-mode.html'}, // for single mode
  ];

  linkMap.forEach(item => {
    const link = document.getElementById(item.id);
    if(!link) return;

    const anchor = link.querySelector('a');
    if (!anchor) return;

    anchor.setAttribute('href', base + item.path);
  });
}

function initSidebarFunctions() {
  const toggleButtons = document.querySelectorAll("#toggle-btn");
  const sidebar = document.getElementById("sidebar");
  const logo = document.getElementById("logo");
  const logoH1 = document.getElementById("h1");

  window.sidebar = sidebar;
  window.toggleButtons = toggleButtons;
  window.logo = logo;
  window.logoH1 = logoH1;

  console.log("Sidebar elements found: ", {
    toggleButtonCount: toggleButtons.length,
    sidebar: !!sidebar,
    logo: !!logo,
    logoH1: !!logoH1
  });

  // Restore sidebar state from localStorage
  restoreSidebarState();

  // Attach event listener to ALL toggle buttons
  toggleButtons.forEach(button => {
    button.addEventListener("click", toggleSideBar);
  });
}

const restoreSidebarState = () => {
  const sidebar = document.getElementById("sidebar");
  const toggleButton = document.getElementById("toggle-btn");
  const logo = document.getElementById("logo");
  const logoH1 = document.getElementById("h1");
  const logoP = logo && logo.querySelector("p");

  const isClosed = localStorage.getItem("sidebarClosed") === "true";

  if (isClosed && sidebar) {
    sidebar.classList.add("close");
    if (toggleButton) toggleButton.classList.add("rotate");
    if (logo) logo.classList.add("hidden");
    if (logoH1) logoH1.classList.add("hidden");
    if (logoP) logoP.classList.add("hidden");
    console.log("Sidebar restored as closed");
  } else {
    if (sidebar) sidebar.classList.remove("close");
    if (toggleButton) toggleButton.classList.remove("rotate");
    if (logo) logo.classList.remove("hidden");
    if (logoH1) logoH1.classList.remove("hidden");
    if (logoP) logoP.classList.remove("hidden");
    console.log("Sidebar restored as open");
  }
};

const toggleSideBar = () => {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const segmentationView = document.getElementById('segmentation-view');
  const homeView = document.getElementById('home-view');

  // Determine which view is currently visible
  let activeView = null;
  if (segmentationView && segmentationView.style.display !== 'none') {
    activeView = segmentationView;
  } else if (pagingView && pagingView.style.display !== 'none') {
    activeView = pagingView;
  } else if (homeView && homeView.style.display !== 'none') {
    activeView = homeView;
  } else if (standardView && standardView.style.display !== 'none') {
    activeView = standardView;
  }

  // Get the toggle button from the currently visible view
  const toggleButton = activeView ? activeView.querySelector('#toggle-btn') : document.getElementById("toggle-btn");
  const sidebar = window.sidebar || document.getElementById("sidebar");
  const logo = window.logo || document.getElementById("logo");
  const logoH1 = window.logoH1 || document.getElementById("h1");
  const logoP = logo && logo.querySelector("p");

  if (sidebar) sidebar.classList.toggle("close");
  if (toggleButton) toggleButton.classList.toggle("rotate");
  if (logo) logo.classList.toggle("hidden");
  if (logoH1) logoH1.classList.toggle("hidden");
  if (logoP) logoP.classList.toggle("hidden");

  // Save sidebar state to localStorage
  if (sidebar) {
    const isClosed = sidebar.classList.contains("close");
    localStorage.setItem("sidebarClosed", isClosed);
  }

  if (toggleButton && toggleButton.classList.contains("rotate")) {
    console.log("Sidebar is now closed");
  }
};

const toggleSubMenu = (button) => {
  const sidebar = window.sidebar || document.getElementById("sidebar");
  const subMenu = button.nextElementSibling;

  if (sidebar.classList.contains("close")) {
    toggleSideBar();
    subMenu.classList.add("show");
    button.classList.add("rotate");
  } else {
    subMenu.classList.toggle("show");
    button.classList.toggle("rotate");
  }
};
