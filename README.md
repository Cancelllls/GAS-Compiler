<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" width="120" alt="VS Code Logo" />
</p>

<h1 align="center">GAS Cloud IDE: VS Code Clone</h1>

<p align="center">
  <b>Built by <a href="https://github.com/Cancelllls">Cancellls</a></b>
</p>

---

A 100% self-contained, zero-dependency cloud programming workspace deployed as a Google Apps Script Web App. This project mimics the VS Code experience entirely through native HTML, CSS, and Vanilla JavaScript, requiring zero external libraries or CDNs.

## 🚀 Live Demo
[**Access the IDE Here**](https://script.google.com/macros/s/AKfycbzHoq6fCQz0XK1Cw2wM96rdiaR6YSVvshSGvRqjcJ6oe0lyHO_1QwUIVOJ5FSpzAN85/exec)

## ✨ Features

- **Full Fidelity UI**: Mimics VS Code Dark+ mode with an activity bar, sidebar, editor pane, and terminal.
- **Persistent Virtual File System (VFS)**: Native persistent file storage utilizing Google Apps Script's `PropertiesService`, allowing users to create, read, update, and delete files dynamically in the browser (pre-seeded with default demo files).
- **Multi-Language Support**:
  - **Native JavaScript & Custom GAS DSL**: Execute JS code directly in the browser environment with execution instrumentation.
  - **Python**: Transpiles range loops, print statements, and interactive inputs.
  - **C++**: Transpiles `cout`, `cin`, loops, and standard variable declarations.
  - **Java**: Full-fidelity transpilation including simulated concurrency mocks (`AtomicInteger`, `ExecutorService`, `TimeUnit`), lambda arrow functions, constructor parameter cleaning, and console methods.
  - **Rust, Go, Ruby, and SQL**: Simulated engines/transpilers for a variety of programming syntaxes.
  - **HTML/CSS Live Preview**: Direct rendering of HTML/CSS files inside a dedicated live Preview Pane.
- **Advanced Syntax Highlighting**: Regex-based highlighting engine built from scratch.
- **Theme Engine**: Support for multiple themes including Dark+, Monokai, and Solarized.
- **Custom Text Editor**:
  - Dynamic line numbers.
  - Tab interception (2-space indentation).
  - Synced scrolling between line numbers and code.
  - Real-time Ln/Col status tracking.
- **Command Palette & VS Code Shortcuts**: Launch commands, toggle panels, switch themes, find-and-replace, and execute files with professional editor shortcuts (e.g. `Ctrl+Shift+P`, `Ctrl+S`, `Ctrl+J`, `Ctrl+B`).
- **Context Menus**: Native-looking custom right-click menus for the explorer, editor, and view settings.
- **Terminal Interface**: Command-line style output for execution results.

## 🛠 Tech Stack

- **Backend**: Google Apps Script (V8 Runtime).
- **Frontend**: Vanilla HTML5, CSS3 (Variables), and JavaScript (ES6+).
- **Deployment**: Managed via `@google/clasp`.

## 📦 Local Setup & Deployment

1. **Install Clasp**:
   ```bash
   npm install -g @google/clasp
   ```

2. **Login to Google**:
   ```bash
   clasp login
   ```

3. **Clone & Push**:
   ```bash
   cd gas-compiler-project
   clasp push
   ```

4. **Deploy**:
   ```bash
   clasp deploy --description "Production Release"
   ```

## 🔒 Security & Privacy

- **Anonymous Access**: The application is configured for access by "Anyone" (no Google account required).
- **Isolation**: It runs entirely within the script's execution context. It uses no external tracking, no CDNs, and no third-party scripts, ensuring 100% data privacy.

---

