# OS-MV: Operating System Memory Visualizer

![Status](https://img.shields.io/badge/STATUS-COMPLETED-success?style=for-the-badge)
![Frontend](https://img.shields.io/badge/FRONTEND-HTML--CSS--JS-blue?style=for-the-badge)
![Storage](https://img.shields.io/badge/STORAGE-SQLITE-orange?style=for-the-badge)
![Security](https://img.shields.io/badge/SECURITY-BIP--39-informational?style=for-the-badge)

> [!NOTE]
> **Project Status:** Development is officially complete; however, the codebase remains open for future enhancements and community-driven changes.

**OS-MV** is a premium, interactive web-based visualization tool designed to help students and educators master the complexities of Operating System Memory Management. Through dynamic simulations and a sleek, modern interface, OS-MV brings abstract allocation algorithms to life.

---

## 🚀 Key Features

### 🧠 Memory Allocation Algorithms
OS-MV supports a wide range of industry-standard allocation strategies:

*   **Contiguous Allocation (Fixed & Dynamic Partitioning)**
    *   **First Fit**: Allocates the first available block that is large enough.
    *   **Next Fit**: Similar to First Fit, but starts searching from the last allocated position.
    *   **Best Fit**: Minimizes internal fragmentation by choosing the smallest block that fits.
    *   **Worst Fit**: Chooses the largest available block, leaving the largest possible remainder.
*   **Non-Contiguous Allocation**
    *   **Paging**: Fixed-size memory division to eliminate external fragmentation.
    *   **Segmentation**: Logical division of processes into Code, Stack, Heap, etc.
    *   **Segmentation with Paging**: A hybrid approach combining the benefits of both.

### 📊 Simulation Modes
*   **Single Mode**: Deep dive into a specific algorithm's behavior.
*   **Comparison Mode**: Run multiple algorithms side-by-side with the same workload to analyze performance differences in real-time.

### 🛠️ Interactive Dashboard
*   **Live Simulation**: Play, pause, and step through (Next) allocations.
*   **Custom Workloads**: Add processes with specific or randomized sizes.
*   **Real-time Analytics**: Visualize memory blocks, internal/external fragmentation, and process states.
*   **Speed Control**: Adjust the simulation pace to suit your learning speed.

### 🔐 Advanced User System
*   **Secure Authentication**: Personalized accounts with SHA-256 password hashing.
*   **BIP-39 Recovery**: Industry-standard 12-word mnemonic phrase for account recovery.
*   **Admin Dashboard**: Centralized management for users, roles (Admin/User), and system monitoring.
*   **Persistent Data**: Powered by **SQL.js** (SQLite WebAssembly) with LocalStorage persistence.

---

## 🎨 Design Philosophy

OS-MV features a **Premium UI/UX** designed to provide a professional and engaging experience:
*   **Glassmorphism & Shimmer Effects**: Modern aesthetic with subtle depth and movement.
*   **Responsive Layout**: Fully functional on both desktop and tablet views.
*   **Dynamic Loaders**: Custom transitions and shimmers for a seamless feel.
*   **SVG Iconography**: Clean, scalable icons for intuitive navigation.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla JavaScript (ES6+) |
| **Styling** | Vanilla CSS3 (Custom Design System) |
| **Database** | SQL.js (SQLite Wasm), LocalStorage |
| **Security** | Web Crypto API (SHA-256), BIP-39 |
| **Icons** | Lucide-style SVG |

---

## 🏁 Getting Started

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/kingfluffybun/OS-MV-Operating-System-Memory-Visualization-.git
    ```
2.  **Run Locally**:
    Simply open `index.html` in any modern web browser. No backend server is required as the database runs entirely in-browser!
3.  **Sign Up**:
    Create an account, securely save your 12-word recovery phrase, and start visualizing.

---

## 👥 The Team (Group 3 BSIT-22)

| Name | Role |
| :--- | :--- |
| **[kingfluffybun](https://github.com/kingfluffybun)** | Master Coder |
| **[harB33](https://github.com/harB33)** | Developer  |
| **[GaZeRnG](https://github.com/GaZeRnG)** | Developer  |
| **[jomariwamil1012-ai](https://github.com/jomariwamil1012-ai)** | Developer  |
| **[henrykashlie-sketch](https://github.com/henrykashlie-sketch)** | Developer  |
| **[kevenluistro7-gif](https://github.com/kevenluistro7-gif)** | Developer  |

*Full member list available in the application dashboard.*

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Created with ❤️ by Group 3 BSIT-22*
