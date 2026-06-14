# GAS Cloud IDE: VS Code Clone

A 100% self-contained, zero-dependency cloud programming workspace deployed as a Google Apps Script Web App. This project mimics the VS Code experience entirely through native HTML, CSS, and Vanilla JavaScript, requiring zero external libraries or CDNs.

## 🚀 Live Demo
[**Access the IDE Here**](https://script.google.com/macros/s/AKfycbzHoq6fCQz0XK1Cw2wM96rdiaR6YSVvshSGvRqjcJ6oe0lyHO_1QwUIVOJ5FSpzAN85/exec)

## ✨ Features

- **Full Fidelity UI**: Mimics VS Code Dark+ mode with an activity bar, sidebar, editor pane, and terminal.
- **Multi-Language Support**:
  - **Native JavaScript**: Execute JS code directly in the browser environment.
  - **Python (Simulated)**: A lightweight transpilation layer for Python-like logic.
  - **Custom GAS DSL**: A robust, line-by-line custom language engine.
- **Advanced Syntax Highlighting**: Regex-based highlighting engine built from scratch.
- **Theme Engine**: Support for multiple themes including Dark+, Monokai, and Solarized.
- **Custom Text Editor**:
  - Dynamic line numbers.
  - Tab interception (2-space indentation).
  - Synced scrolling between line numbers and code.
  - Real-time Ln/Col status tracking.
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

*Built with ❤️ using Gemini CLI*
