/**
 * Google Apps Script Backend: Multi-Language Cloud Engine
 * 
 * Supports:
 * - Custom GAS (DSL)
 * - Native JavaScript
 * - Python (Simulated/Transpiled)
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('VS Code Clone - Pro IDE')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Main entry point for code execution.
 */
function compileAndRun(sourceCode, lang = 'custom') {
  if (lang === 'javascript') {
    return executeJS(sourceCode);
  } else if (lang === 'python') {
    return executePython(sourceCode);
  } else {
    return executeCustom(sourceCode);
  }
}

/**
 * Executes Native JavaScript in a sandboxed-ish way.
 */
function executeJS(code) {
  const output = [];
  const mockConsole = {
    log: (...args) => output.push(args.map(String).join(' ')),
    error: (...args) => output.push("[ERROR] " + args.map(String).join(' '))
  };

  try {
    // Create a function with console redirected
    const runner = new Function('console', `"use strict"; ${code}`);
    runner(mockConsole);
    return output.join('\n') || "[SUCCESS] JS execution completed with no output.";
  } catch (err) {
    return `[JS RUNTIME ERROR]: ${err.message}`;
  }
}

/**
 * Simulated Python Execution (Transpilation Lite)
 */
function executePython(code) {
  // Real Python doesn't run in GAS, so we simulate the 'print' and simple logic
  // to show multi-language capability.
  let jsCode = code
    .replace(/print\((.*?)\)/g, 'console.log($1)')
    .replace(/def\s+(\w+)\((.*?)\):/g, 'function $1($2) {')
    .replace(/elif\s+(.*?):/g, '} else if ($1) {')
    .replace(/if\s+(.*?):/g, 'if ($1) {')
    .replace(/else:/g, '} else {')
    .replace(/while\s+(.*?):/g, 'while ($1) {');
  
  // Note: This is a VERY primitive simulator for demo purposes.
  return "> Interpreting Python as JS...\n" + executeJS(jsCode);
}

/**
 * Custom DSL Execution Engine
 */
function executeCustom(sourceCode) {
  const lines = sourceCode.split('\n');
  const variables = {};
  const output = [];
  let index = 0;
  const loopStack = [];

  const evaluate = (expr) => {
    try {
      const varNames = Object.keys(variables);
      const varValues = Object.values(variables);
      const fn = new Function(...varNames, `"use strict"; return (${expr});`);
      return fn(...varValues);
    } catch (e) {
      throw new Error(`Evaluation Error: "${expr}" - ${e.message}`);
    }
  };

  try {
    while (index < lines.length) {
      let line = lines[index].trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        index++; continue;
      }

      if (line.startsWith('LET ')) {
        const match = line.match(/^LET\s+([a-zA-Z_]\w*)\s*=\s*(.+)$/);
        if (!match) throw new Error(`Syntax Error: Invalid LET format`);
        variables[match[1]] = evaluate(match[2]);
      }
      else if (line.startsWith('ADD ')) {
        const parts = line.split(/\s+/);
        if (parts.length < 3) throw new Error(`Syntax Error: Invalid ADD format`);
        const val = evaluate(parts.slice(2).join(' '));
        variables[parts[1]] = (variables[parts[1]] || 0) + val;
      }
      else if (line.startsWith('PRINT ')) {
        const content = line.substring(6).trim();
        output.push(content.startsWith('"') ? content.slice(1, -1) : evaluate(content));
      }
      else if (line.startsWith('WHILE ')) {
        if (evaluate(line.substring(6).trim())) {
          loopStack.push(index);
        } else {
          let depth = 1;
          while (index++ < lines.length && depth > 0) {
            if (lines[index].trim().startsWith('WHILE ')) depth++;
            if (lines[index].trim() === 'ENDWHILE') depth--;
          }
        }
      }
      else if (line === 'ENDWHILE') {
        if (loopStack.length > 0) index = loopStack.pop() - 1;
        else throw new Error(`Unexpected ENDWHILE`);
      }
      index++;
    }
  } catch (err) {
    return `[CUSTOM ENGINE ERROR] Line ${index + 1}: ${err.message}`;
  }
  return output.join('\n') || "[SUCCESS]";
}
