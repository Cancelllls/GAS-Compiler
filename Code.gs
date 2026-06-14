/**
 * Google Apps Script Backend: Custom Zero-Dependency Engine
 * 
 * This engine parses and executes a custom DSL (Domain Specific Language)
 * natively within the GAS V8 environment.
 */

/**
 * Serves the web application.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GAS Zero-Dependency IDE')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Compiles and runs the custom language source code.
 * Supported Instructions:
 * - LET [var] = [expr]
 * - ADD [var] [value]
 * - PRINT "[string]" or PRINT [var]
 * - WHILE [condition] ... ENDWHILE
 * 
 * @param {string} sourceCode The code to execute.
 * @return {string} Combined output buffer.
 */
function compileAndRun(sourceCode) {
  const lines = sourceCode.split('\n');
  const variables = {};
  const output = [];
  let index = 0;
  const loopStack = []; // To track WHILE loop return indices

  /**
   * Native Evaluator: Uses the Function constructor for scoped execution.
   */
  const evaluate = (expr) => {
    try {
      const varNames = Object.keys(variables);
      const varValues = Object.values(variables);
      // Create a strictly-scoped execution context
      const fn = new Function(...varNames, `"use strict"; return (${expr});`);
      return fn(...varValues);
    } catch (e) {
      throw new Error(`Evaluation Error: "${expr}" - ${e.message}`);
    }
  };

  try {
    while (index < lines.length) {
      let line = lines[index].trim();
      
      // Ignore empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        index++;
        continue;
      }

      // 1. LET [var] = [expr]
      if (line.startsWith('LET ')) {
        const match = line.match(/^LET\s+([a-zA-Z_]\w*)\s*=\s*(.+)$/);
        if (!match) throw new Error(`Syntax Error: Invalid LET format at line ${index + 1}`);
        const varName = match[1];
        const expr = match[2];
        variables[varName] = evaluate(expr);
      }

      // 2. ADD [var] [expr]
      else if (line.startsWith('ADD ')) {
        const parts = line.split(/\s+/);
        if (parts.length < 3) throw new Error(`Syntax Error: Invalid ADD format at line ${index + 1}`);
        const varName = parts[1];
        const expr = parts.slice(2).join(' ');
        const val = evaluate(expr);
        if (variables[varName] === undefined) variables[varName] = 0;
        variables[varName] += val;
      }

      // 3. PRINT [content]
      else if (line.startsWith('PRINT ')) {
        const content = line.substring(6).trim();
        if (content.startsWith('"') && content.endsWith('"')) {
          output.push(content.substring(1, content.length - 1));
        } else {
          output.push(evaluate(content));
        }
      }

      // 4. WHILE [condition]
      else if (line.startsWith('WHILE ')) {
        const condition = line.substring(6).trim();
        if (evaluate(condition)) {
          loopStack.push(index);
        } else {
          // Skip to ENDWHILE
          let depth = 1;
          let searchIdx = index + 1;
          while (searchIdx < lines.length && depth > 0) {
            let searchLine = lines[searchIdx].trim();
            if (searchLine.startsWith('WHILE ')) depth++;
            if (searchLine === 'ENDWHILE') depth--;
            if (depth === 0) break;
            searchIdx++;
          }
          if (depth === 0) {
            index = searchIdx;
          } else {
            throw new Error(`Syntax Error: Missing ENDWHILE at line ${index + 1}`);
          }
        }
      }

      // 5. ENDWHILE
      else if (line === 'ENDWHILE') {
        if (loopStack.length > 0) {
          index = loopStack.pop() - 1; // Return to WHILE (-1 because index++ follows)
        } else {
          throw new Error(`Syntax Error: Unexpected ENDWHILE at line ${index + 1}`);
        }
      }

      else {
        throw new Error(`Syntax Error: Unknown command "${line}" at line ${index + 1}`);
      }

      index++;
    }
  } catch (err) {
    return `[COMPILER ERROR] Line ${index + 1}: ${err.message}`;
  }

  return output.join('\n') || "[SUCCESS] Execution finished.";
}
