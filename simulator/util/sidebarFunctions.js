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

function showMenu() {
  const currentPath = window.location.pathname;
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

  const isAdminUser = currentUser && currentUser.user_role === "admin";

  const Menus = [
    "menu-dashboard",
    "menu-simulation",
    "menu-usermanagement",
    "menu-back-simulator",
    "menu-admin-dashboard",
  ];

  // Hide all menus for now
  Menus.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "none";
      el.classList.remove("active");
    }
  });

  // Check which page is user on
  const isAdminPage = currentPath.includes("/admin-dashboard/");
  const isSimulator = currentPath.includes("/simulator/algorithm/");
  const isComparisonPage = currentPath.includes("/simulator/comparison/");
  const isSingleMode = currentPath.includes("/simulator/single-mode.html")
  const isFrontPage =
    currentPath.includes("/simulator/index.html") ||
    currentPath.endsWith("/simulator/");

  // Admin Menu
  if (isAdminUser) {
    const adminMenu = document.getElementById("menu-admin-dashboard");
    if (!isAdminPage) adminMenu.style.display = "";

    if (isAdminPage) {
      document.getElementById("menu-usermanagement").style.display = "";
      document.getElementById("menu-usermanagement").classList.add("active");
      document.getElementById("menu-back-simulator").style.display = "";
    }
  }

  // If on simulator page
  if (!isAdminPage) {
    document.getElementById("menu-dashboard").style.display = "";
    document.getElementById("menu-simulation").style.display = "";

    if (isFrontPage) {
      document.getElementById("menu-dashboard").classList.add("active");
    }

    if (isSimulator || isSingleMode) {
      document.getElementById("single-mode").classList.add("active");
    }

    if (isComparisonPage) {
      document.getElementById("comparison-mode").classList.add("active");
    }
  }
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
    document.body.classList.add("sidebar-closed");
    if (toggleButton) toggleButton.classList.add("rotate");
    if (logo) logo.classList.add("hidden");
    if (logoH1) logoH1.classList.add("hidden");
    if (logoP) logoP.classList.add("hidden");
    console.log("Sidebar restored as closed");
  } else {
    if (sidebar) sidebar.classList.remove("close");
    document.body.classList.remove("sidebar-closed");
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

  document.body.classList.add("sidebar-ready");
  if (sidebar) sidebar.classList.toggle("close");
  document.body.classList.toggle("sidebar-closed");
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

// Display username
function loadCurrentUser() {
  const stored = JSON.parse(sessionStorage.getItem("currentUser"));
  const username = document.getElementById("username");

  if (stored && stored.username) {
    username.textContent = stored.username;
    document.getElementById("in-out-icon").innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out-icon lucide-log-out"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`;
    document.getElementById("in-out").innerHTML = "Logout";
  } else {
    username.textContent = "Guest";
    document.getElementById("in-out-icon").innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-in-icon lucide-log-in"><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>`;
    document.getElementById("in-out").innerHTML = "Login";
  }
}