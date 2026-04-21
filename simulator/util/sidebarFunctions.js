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
  if (path.includes('/simulator/')) return '../';
  return './';
}

const sidebarLinks = () => {
  const base = getBasePath();

  const linkMap = [
    {id: 'menu-dashboard', path: 'simulator/index.html'},
    {id: 'menu-admin-dashboard', path: 'admin-dashboard/index.html'},
    {id: 'menu-back-simulator', path: 'simulator/index.html'}, // for admin dashboard
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
  const toggleButton = document.getElementById("toggle-btn");
  const sidebar = document.getElementById("sidebar");
  const logo = document.getElementById("logo");
  const logoH1 = document.getElementById("h1");

  window.sidebar = sidebar;
  window.toggleButton = toggleButton;
  window.logo = logo;
  window.logoH1 = logoH1;

  console.log("Sidebar elements found: ", {
    toggleButton: !!toggleButton,
    sidebar: !!sidebar,
    logo: !!logo,
    logoH1: !!logoH1
  });

  if (toggleButton) {
    toggleButton.addEventListener("click", toggleSideBar);
  }
}

const toggleSideBar = () => {
  const standardView = document.getElementById('standard-view');
  const pagingView = document.getElementById('paging-view');
  const homeView = document.getElementById('home-view');
  const activeView = (pagingView && pagingView.style.display === 'grid') ? pagingView : (homeView || standardView);

  // Fallback to window references or direct DOM query for admin-dashboard pages
  const sidebar = window.sidebar || (activeView && activeView.getElementById("sidebar")) || document.getElementById("sidebar");
  const toggleButton = window.toggleButton || (activeView && activeView.querySelector('#toggle-btn')) || document.getElementById("toggle-btn");
  const logo = window.logo || (activeView && activeView.getElementById("logo")) || document.getElementById("logo");
  const logoH1 = window.logoH1 || (activeView && activeView.getElementById("h1")) || document.getElementById("h1");
  const logoP = logo && logo.querySelector("p");

  if (sidebar) sidebar.classList.toggle("close");
  if (toggleButton) toggleButton.classList.toggle("rotate");
  if (logo) logo.classList.toggle("hidden");
  if (logoH1) logoH1.classList.toggle("hidden");
  if (logoP) logoP.classList.toggle("hidden");

  if (toggleButton && toggleButton.classList.contains("rotate")) {
    console.log("Sidebar is now closed");
  }
};

const toggleSubMenu = (button) => {
  const sidebar = window.sidebar || document.getElementById("sidebar");

  if (sidebar.classList.contains("close")) {
    toggleSideBar();
  }

  button.nextElementSibling.classList.toggle("show");
  button.classList.toggle("rotate");
};
