/**
 * Google Apps Script Backend: High-Fidelity Multi-Language Engine
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('VS Code Pro - Ultimate Cloud IDE')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Main entry point for code execution.
 */
function compileAndRun(sourceCode, lang = 'javascript') {
  switch (lang) {
    case 'javascript':
    case 'html':
    case 'css':
      return executeJS(sourceCode);
    case 'custom':
      return executeCustom(sourceCode);
    default:
      return simulateExecution(sourceCode, lang);
  }
}

/**
 * Executes Native JavaScript.
 */
function executeJS(code) {
  const output = [];
  const mockConsole = {
    log: (...args) => output.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    error: (...args) => output.push("[ERROR] " + args.join(' '))
  };
  try {
    const runner = new Function('console', `"use strict"; ${code}`);
    runner(mockConsole);
    return output.join('\n') || "[SUCCESS] Execution completed.";
  } catch (err) {
    return `[RUNTIME ERROR]: ${err.message}`;
  }
}

/**
 * Robust Execution Simulator for Non-Native Languages (Java, C++, etc.)
 */
function simulateExecution(code, lang) {
  let result = `> Running ${lang.toUpperCase()} Environment (Cloud Simulation)...\n\n`;
  const lines = code.split('\n');
  lines.forEach(line => {
    const l = line.trim();
    const patterns = [
      /System\.out\.println\("(.*?)"\)/,
      /print\("(.*?)"\)/,
      /printf\("(.*?)"\)/,
      /console\.log\("(.*?)"\)/,
      /cout\s*<<\s*"(.*?)"/,
      /fmt\.Println\("(.*?)"\)/,
      /println!\("(.*?)"\)/,
      /puts\s*"(.*?)"/
    ];
    for (let p of patterns) {
      const m = l.match(p);
      if (m) { result += m[1] + "\n"; break; }
    }
  });
  result += `\n[FINISH] ${lang.toUpperCase()} process exited with code 0.`;
  return result;
}

/**
 * Custom DSL Engine
 */
function executeCustom(sourceCode) {
  const lines = sourceCode.split('\n'), variables = {}, output = [], loopStack = [];
  let index = 0;
  const evalExpr = (e) => new Function(...Object.keys(variables), `"use strict"; return (${e});`)(...Object.values(variables));
  try {
    while (index < lines.length) {
      let l = lines[index].trim();
      if (!l || l.startsWith('//')) { index++; continue; }
      if (l.startsWith('LET ')) {
        const m = l.match(/^LET\s+([a-zA-Z_]\w*)\s*=\s*(.+)$/);
        variables[m[1]] = evalExpr(m[2]);
      } else if (l.startsWith('PRINT ')) {
        const c = l.substring(6).trim();
        output.push(c.startsWith('"') ? c.slice(1,-1) : evalExpr(c));
      } else if (l.startsWith('WHILE ')) {
        if (evalExpr(l.substring(6))) loopStack.push(index);
        else {
          let d = 1;
          while (index++ < lines.length && d > 0) {
            if (lines[index].trim().startsWith('WHILE ')) d++;
            if (lines[index].trim() === 'ENDWHILE') d--;
          }
        }
      } else if (l === 'ENDWHILE') {
        index = loopStack.pop() - 1;
      }
      index++;
    }
  } catch (e) { return `[ERROR] Line ${index+1}: ${e.message}`; }
  return output.join('\n') || "[SUCCESS]";
}

/**
 * Persistence Layer
 */
function saveFile(filename, content) {
  const props = PropertiesService.getUserProperties();
  let ws = JSON.parse(props.getProperty('workspace') || '{}');
  ws[filename] = { content: content, date: new Date().getTime() };
  props.setProperty('workspace', JSON.stringify(ws));
  return `File ${filename} saved.`;
}

function deleteFile(filename) {
  const props = PropertiesService.getUserProperties();
  let ws = JSON.parse(props.getProperty('workspace') || '{}');
  delete ws[filename];
  props.setProperty('workspace', JSON.stringify(ws));
  return `File ${filename} removed.`;
}

function getWorkspace() {
  const props = PropertiesService.getUserProperties();
  const ws = props.getProperty('workspace');
  return ws ? JSON.parse(ws) : {"main.js": {content: "console.log('Hello World');"}};
}
