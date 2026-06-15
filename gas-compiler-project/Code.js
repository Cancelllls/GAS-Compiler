/**
 * Google Apps Script Backend: Custom Zero-Dependency Engine
 * 
 * This engine parses, transpiles, and executes multi-language code
 * within the GAS V8 environment. It supports a persistent Virtual File System
 * utilizing PropertiesService and implements interactive prompt execution.
 */

const VFS_INDEX_KEY = 'VFS_INDEX_V1';
const VFS_FILE_PREFIX = 'VFS_FILE_V1_';

/**
 * Serves the web application.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('GAS Zero-Dependency IDE')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Gets the VFS Index, seeding default files if empty.
 */
function getVFSIndex() {
  const props = PropertiesService.getUserProperties();
  const indexStr = props.getProperty(VFS_INDEX_KEY);
  if (indexStr) {
    try {
      const parsed = JSON.parse(indexStr);
      if (Array.isArray(parsed)) return parsed;
    } catch(e) {
      // Clear corrupt property
      props.deleteProperty(VFS_INDEX_KEY);
    }
  }

  // Seed default files
  const defaults = ["main.js", "script.py", "loop.cpp", "index.html"];
  props.setProperty(VFS_INDEX_KEY, JSON.stringify(defaults));
  
  props.setProperty(VFS_FILE_PREFIX + "main.js", JSON.stringify({
    content: '// JavaScript Example\nlet x = 10;\nlet y = 20;\nconsole.log("Sum of x and y is:", x + y);\n',
    language: 'javascript'
  }));
  props.setProperty(VFS_FILE_PREFIX + "script.py", JSON.stringify({
    content: '# Python Example with Interactive Inputs\nname = input("Enter your name: ")\nprint("Hello, " + name)\n\nprint("Running a range loop:")\nfor i in range(1, 4):\n    print("Step number:", i)\n',
    language: 'python'
  }));
  props.setProperty(VFS_FILE_PREFIX + "loop.cpp", JSON.stringify({
    content: '// C++ Example with Input and Loops\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Enter how many times to repeat: " << endl;\n    int count;\n    cin >> count;\n    for (int i = 0; i < count; i++) {\n        cout << "Iteration: " << i << endl;\n    }\n    return 0;\n}\n',
    language: 'cpp'
  }));
  props.setProperty(VFS_FILE_PREFIX + "index.html", JSON.stringify({
    content: '<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body {\n      background: radial-gradient(circle, #1a1a1c 0%, #0d0d0e 100%);\n      color: #00ff66;\n      font-family: \'Courier New\', monospace;\n      text-align: center;\n      padding-top: 50px;\n      text-shadow: 0 0 5px #00ff66;\n    }\n    h1 { color: #ffffff; text-shadow: 0 0 10px #007acc; }\n    .box { border: 1px solid #00ff66; padding: 20px; display: inline-block; border-radius: 5px; box-shadow: 0 0 15px rgba(0,255,102,0.3); }\n  </style>\n</head>\n<body>\n  <div class="box">\n    <h1>HTML live preview</h1>\n    <p>This is a live iframe update!</p>\n    <p>Try editing the file index.html.</p>\n  </div>\n</body>\n</html>\n',
    language: 'html'
  }));
  
  return defaults;
}

/**
 * VFS: List all files in properties.
 */
function vfsListFiles() {
  const index = getVFSIndex();
  const files = [];
  const props = PropertiesService.getUserProperties();
  for (const filename of index) {
    const dataStr = props.getProperty(VFS_FILE_PREFIX + filename);
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        files.push({
          name: filename,
          language: data.language || 'javascript'
        });
      } catch(e) {
        files.push({
          name: filename,
          language: 'javascript'
        });
      }
    } else {
      files.push({
        name: filename,
        language: 'javascript'
      });
    }
  }
  return files;
}

/**
 * VFS: Fetch all files and their contents.
 */
function vfsGetAllFiles() {
  const index = getVFSIndex();
  const result = {};
  const props = PropertiesService.getUserProperties();
  for (const filename of index) {
    const dataStr = props.getProperty(VFS_FILE_PREFIX + filename);
    if (dataStr) {
      try {
        result[filename] = JSON.parse(dataStr);
      } catch(e) {
        result[filename] = { content: "", language: "javascript" };
      }
    } else {
      result[filename] = { content: "", language: "javascript" };
    }
  }
  return result;
}

/**
 * VFS: Read a file from properties.
 */
function vfsReadFile(filename) {
  const props = PropertiesService.getUserProperties();
  const dataStr = props.getProperty(VFS_FILE_PREFIX + filename);
  if (dataStr) {
    try {
      return JSON.parse(dataStr);
    } catch(e) {
      return { content: "", language: "javascript" };
    }
  }
  return { content: "", language: "javascript" };
}

/**
 * VFS: Write or update a file.
 */
function vfsWriteFile(filename, content, language) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(VFS_FILE_PREFIX + filename, JSON.stringify({
    content: content,
    language: language
  }));
  
  const index = getVFSIndex();
  if (!index.includes(filename)) {
    index.push(filename);
    props.setProperty(VFS_INDEX_KEY, JSON.stringify(index));
  }
  return { success: true };
}

/**
 * VFS: Delete a file.
 */
function vfsDeleteFile(filename) {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(VFS_FILE_PREFIX + filename);
  
  let index = getVFSIndex();
  index = index.filter(f => f !== filename);
  props.setProperty(VFS_INDEX_KEY, JSON.stringify(index));
  return { success: true };
}

/**
 * C++ Transpiler.
 */
function transpileCPP(code) {
  const lines = code.split('\n');
  let jsCode = "";
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();
    
    if (trimmed.startsWith('#include') || trimmed.startsWith('using namespace')) {
      jsCode += "// " + trimmed + "\n";
      continue;
    }
    
    let transpiledLine = line;
    transpiledLine = transpiledLine.replace(/\b(?:int|double|float|char|bool|std::string|string)\s+([a-zA-Z_]\w*)\b/g, 'let $1');
    
    if (trimmed.includes('cout')) {
      const match = transpiledLine.match(/(?:std::)?cout\s*<<\s*(.*?);/);
      if (match) {
        const expr = match[1];
        const parts = expr.split('<<').map(x => {
          const p = x.trim();
          if (p === 'endl' || p === 'std::endl') return '"\\n"';
          return p;
        });
        transpiledLine = `console.log(${parts.join(', ')});`;
      }
    }
    
    if (trimmed.includes('cin')) {
      const match = transpiledLine.match(/(?:std::)?cin\s*>>\s*(.*?);/);
      if (match) {
        const vars = match[1].split('>>').map(x => x.trim());
        const cinStmts = vars.map(v => `${v} = prompt("Enter ${v}:");`).join(' ');
        transpiledLine = cinStmts;
      }
    }
    
    if (trimmed.startsWith('int main(') || trimmed.startsWith('void main(') || trimmed.match(/^main\s*\(/)) {
      transpiledLine = transpiledLine.replace(/\b(int|void)?\s*main\s*\(([^)]*)\)/, 'function main($2)');
    }
    
    jsCode += transpiledLine + "\n";
  }
  
  if (jsCode.includes('function main(')) {
    jsCode += "\nmain();\n";
  }
  return jsCode;
}

/**
 * Python Transpiler.
 */
function transpilePython(code) {
  const lines = code.split('\n');
  let jsCode = "";
  const indentStack = [0];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      jsCode += "\n";
      continue;
    }
    if (trimmed.startsWith('#')) {
      jsCode += trimmed.replace('#', '//') + "\n";
      continue;
    }
    
    const indent = line.length - line.trimStart().length;
    
    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      jsCode += "}\n";
    }
    
    let transpiledLine = trimmed;
    let startsBlock = false;
    if (trimmed.endsWith(':')) {
      startsBlock = true;
      transpiledLine = trimmed.slice(0, -1).trim();
    }
    
    if (transpiledLine.startsWith('def ')) {
      transpiledLine = transpiledLine.replace(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/, 'function $1($2)');
    } else if (transpiledLine.startsWith('if ')) {
      transpiledLine = `if (${transpiledLine.substring(3).trim()})`;
    } else if (transpiledLine.startsWith('elif ')) {
      transpiledLine = `else if (${transpiledLine.substring(5).trim()})`;
    } else if (transpiledLine === 'else') {
      transpiledLine = `else`;
    } else if (transpiledLine.startsWith('while ')) {
      transpiledLine = `while (${transpiledLine.substring(6).trim()})`;
    } else if (transpiledLine.startsWith('for ') && transpiledLine.includes(' in ')) {
      const forMatch = transpiledLine.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+(.+)$/);
      if (forMatch) {
        const varName = forMatch[1];
        const iterable = forMatch[2].trim();
        if (iterable.startsWith('range(') && iterable.endsWith(')')) {
          const rangeArgs = iterable.substring(6, iterable.length - 1).split(',').map(x => x.trim());
          let start = "0", end = "0", step = "1";
          if (rangeArgs.length === 1) {
            end = rangeArgs[0];
          } else if (rangeArgs.length === 2) {
            start = rangeArgs[0];
            end = rangeArgs[1];
          } else if (rangeArgs.length === 3) {
            start = rangeArgs[0];
            end = rangeArgs[1];
            step = rangeArgs[2];
          }
          const stepOp = step.startsWith('-') ? `-=` : `+=`;
          const stepVal = step.startsWith('-') ? step.substring(1) : step;
          if (stepVal === "1") {
            transpiledLine = `for (let ${varName} = ${start}; ${varName} < ${end}; ${varName}++)`;
          } else {
            transpiledLine = `for (let ${varName} = ${start}; ${varName} < ${end}; ${varName} ${stepOp} ${stepVal})`;
          }
        } else {
          transpiledLine = `for (let ${varName} of ${iterable})`;
        }
      }
    }
    
    transpiledLine = transpiledLine.replace(/\bprint\(([^)]*)\)/g, 'console.log($1)');
    transpiledLine = transpiledLine.replace(/\bprint\s+(.+)$/g, 'console.log($1)');
    transpiledLine = transpiledLine.replace(/\binput\(([^)]*)\)/g, 'prompt($1)');
    
    if (startsBlock) {
      jsCode += transpiledLine + " {\n";
      indentStack.push(indent + 1);
    } else {
      jsCode += transpiledLine + ";\n";
    }
  }
  
  while (indentStack.length > 1) {
    indentStack.pop();
    jsCode += "}\n";
  }
  return jsCode;
}

/**
 * Java Transpiler.
 */
function transpileJava(code) {
  const lines = code.split('\n');
  let jsCode = "";
  let braceDepth = 0;
  
  const classStack = [];
  let expectingClassBrace = false;
  let hasCommentedMainClass = false;
  let activeClassFields = [];

  function cleanParams(paramsStr) {
    if (!paramsStr || !paramsStr.trim()) return "";
    return paramsStr.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      return parts[parts.length - 1];
    }).join(', ');
  }

  // Inject Java Concurrency Mocks at the top of transpiled output
  const mocks = `
  // Java Concurrency & Utility Mocks
  const UUID = {
    randomUUID: function() {
      return {
        toString: function() {
          return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
      };
    }
  };

  function AtomicInteger(initialValue) { this.value = initialValue || 0; }
  AtomicInteger.prototype.get = function() { return this.value; };
  AtomicInteger.prototype.set = function(v) { this.value = v; };
  AtomicInteger.prototype.incrementAndGet = function() { return ++this.value; };
  AtomicInteger.prototype.getAndIncrement = function() { return this.value++; };

  function LinkedBlockingQueue() { this.queue = []; }
  LinkedBlockingQueue.prototype.put = function(item) { this.queue.push(item); };
  LinkedBlockingQueue.prototype.poll = function(timeout, timeUnit) { return this.queue.shift() || null; };
  const BlockingQueue = LinkedBlockingQueue;

  function MockExecutorService() {}
  MockExecutorService.prototype.submit = function(runnable) { runnable(); };
  MockExecutorService.prototype.shutdown = function() {};
  MockExecutorService.prototype.awaitTermination = function(timeout, unit) { return true; };
  const Executors = {
    newFixedThreadPool: function(n) { return new MockExecutorService(); },
    newSingleThreadExecutor: function() { return new MockExecutorService(); }
  };
  const ExecutorService = MockExecutorService;

  const TimeUnit = {
    MILLISECONDS: {
      sleep: function(ms) {
        const start = Date.now();
        while (Date.now() - start < ms) {}
      }
    },
    SECONDS: {
      sleep: function(s) {
        const start = Date.now();
        const ms = s * 1000;
        while (Date.now() - start < ms) {}
      }
    }
  };

  const Thread = {
    currentThread: function() {
      return { interrupt: function() {} };
    }
  };

  function printf(format, ...args) {
    let res = format;
    for (let arg of args) {
      res = res.replace(/%s|%d/i, arg);
    }
    res = res.replace(/%n/g, '\\n');
    if (res.endsWith('\\n')) {
      res = res.slice(0, -1);
    }
    console.log(res);
  }

  const System = {
    out: {
      println: function(...args) { console.log(...args); },
      print: function(...args) { console.log(...args); },
      printf: printf
    },
    err: {
      println: function(...args) { console.error(...args); },
      print: function(...args) { console.error(...args); },
      printf: printf
    },
    currentTimeMillis: function() { return Date.now(); }
  };
  \n`;

  jsCode += mocks;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('import ') || trimmed.startsWith('package ')) {
      jsCode += "// " + trimmed + "\n";
      continue;
    }

    let transpiledLine = line;

    // Replace Java lambdas "->" with JS arrow functions "=>"
    transpiledLine = transpiledLine.replace(/->/g, '=>');

    // Replace generic diamonds <...> in object instantiation (new ClassName<>() -> new ClassName())
    transpiledLine = transpiledLine.replace(/\bnew\s+([a-zA-Z_]\w*)\s*<[^>]*>\s*\(/g, 'new $1(');

    // Replace Java array declarations like String[] mockSkus = {"A", "B"}; with let mockSkus = ["A", "B"];
    transpiledLine = transpiledLine.replace(/\b[a-zA-Z_]\w*\[\]\s+([a-zA-Z_]\w*)\s*=\s*\{([^}]*)\}/g, 'let $1 = [$2]');

    // Replace (int) cast with Math.floor
    transpiledLine = transpiledLine.replace(/\(int\)\s*\(([^)]+)\)/g, 'Math.floor($1)');
    transpiledLine = transpiledLine.replace(/\(int\)\s*(\b[a-zA-Z0-9_.]+\b)/g, 'Math.floor($1)');

    // Replace catch parameter types (catch (Exception e) -> catch (e))
    transpiledLine = transpiledLine.replace(/\bcatch\s*\(\s*[a-zA-Z_]\w*(?:<[^>]+>)?\s+([a-zA-Z_]\w*)\s*\)/g, 'catch ($1)');

    // Strip access modifiers globally
    transpiledLine = transpiledLine.replace(/\b(?:private|public|protected|final|volatile|transient)\b\s*/g, '');

    // Detect class declarations (modifiers class ClassName)
    const classDeclRegex = /\b(?:static)?\s*class\s+([a-zA-Z_]\w*)/;
    const classMatch = trimmed.match(classDeclRegex);
    if (classMatch) {
      const className = classMatch[1];
      classStack.push({ name: className, braceDepth: braceDepth });
      
      if (!hasCommentedMainClass) {
        // First class (Main Class) - Comment out
        transpiledLine = "// " + line;
        hasCommentedMainClass = true;
        if (trimmed.includes('{')) {
          braceDepth++;
          classStack[classStack.length - 1].braceDepth = braceDepth - 1;
        } else {
          expectingClassBrace = true;
        }
      } else {
        // Nested class - Keep as standard JS class
        transpiledLine = transpiledLine.replace(/\b(?:static)?\s*class\s+([a-zA-Z_]\w*)/, 'class $1');
        if (trimmed.includes('{')) {
          braceDepth++;
          classStack[classStack.length - 1].braceDepth = braceDepth - 1;
        } else {
          expectingClassBrace = true;
        }
      }
      jsCode += transpiledLine + "\n";
      continue;
    }

    // Expecting class opening brace
    if (expectingClassBrace && trimmed.includes('{')) {
      if (classStack.length === 1) {
        // Main Class opening brace - Comment out
        transpiledLine = "// " + line;
      }
      braceDepth++;
      classStack[classStack.length - 1].braceDepth = braceDepth - 1;
      expectingClassBrace = false;
      jsCode += transpiledLine + "\n";
      continue;
    }

    // Replace System.out calls
    transpiledLine = transpiledLine.replace(/System\.out\.println\(([^)]*)\)/g, 'console.log($1)');
    transpiledLine = transpiledLine.replace(/System\.out\.print\(([^)]*)\)/g, 'console.log($1)');
    transpiledLine = transpiledLine.replace(/System\.out\.println\(\)/g, 'console.log()');
    transpiledLine = transpiledLine.replace(/System\.out\.printf\(([^)]*)\)/g, 'printf($1)');
    transpiledLine = transpiledLine.replace(/System\.err\.println\(([^)]*)\)/g, 'console.error($1)');
    
    // Comment out Scanner definitions
    if (transpiledLine.includes('Scanner ')) {
      transpiledLine = "// " + transpiledLine.trim();
    }
    transpiledLine = transpiledLine.replace(/\b[a-zA-Z_]\w*\.next(?:Int|Double|Float|Line|Boolean)?\(\)/g, 'prompt("Enter input:")');
    
    // Replace variable declarations in global scope (classStack.length <= 1)
    if (classStack.length <= 1) {
      transpiledLine = transpiledLine.replace(/\b(?!(?:return|throw|new|class|public|private|protected|static|final|import|package|else|if|for|while|do)\b)[a-zA-Z_]\w*(?:<[^>]+>)?\s+([a-zA-Z_]\w*)\s*(?==|;)/g, 'let $1 ');
      // Strip static modifier on global variables
      transpiledLine = transpiledLine.replace(/\bstatic\b\s*/g, '');
    }

    const methodRegex = /\b(?:static\s+)?\b(?:void|int|double|float|char|boolean|String|[a-zA-Z_]\w*(?:<[^>]+>)?)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?:throws\s+[a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*\s*)?(?=\{|\n|$)/;
    const methodMatch = transpiledLine.match(methodRegex);

    if (classStack.length > 1) {
      // Inside a nested JS class structure
      const activeClass = classStack[classStack.length - 1];

      // Detect class fields at class level (depth === activeClass.braceDepth + 1)
      const fieldRegex = /\b(?!(?:return|throw|new|class|constructor|public|private|protected|static|final)\b)[a-zA-Z_]\w*(?:<[^>]+>)?\s+([a-zA-Z_]\w*)\s*(?:=.*|;)/;
      if (braceDepth === activeClass.braceDepth + 1 && fieldRegex.test(trimmed) && !methodMatch) {
        const fieldMatch = trimmed.match(fieldRegex);
        if (fieldMatch) {
          activeClassFields.push(fieldMatch[1]);
        }
        // Comment out field declarations from class body (handled in constructor in JS)
        transpiledLine = "// " + line;
      }

      // Check constructor
      const constructorRegex = new RegExp(`\\b${activeClass.name}\\s*\\(([^)]*)\\)`);
      if (trimmed.match(constructorRegex)) {
        transpiledLine = transpiledLine.replace(constructorRegex, (match, p1) => {
          return "constructor(" + cleanParams(p1) + ")";
        });
      }

      // Check method declarations inside class
      if (methodMatch) {
        const methodName = methodMatch[1];
        const params = cleanParams(methodMatch[2]);
        const isStatic = trimmed.includes('static');
        transpiledLine = transpiledLine.replace(methodRegex, `${isStatic ? 'static ' : ''}${methodName}(${params})`);
      }

      // Map return variable; to return this.variable; for local getters
      if (activeClassFields.length > 0) {
        const fieldOptions = activeClassFields.join('|');
        transpiledLine = transpiledLine.replace(new RegExp(`\\breturn\\s+(${fieldOptions})\\b`), 'return this.$1');
      }
    } else {
      // In global scope (main class commented out)
      if (methodMatch) {
        const methodName = methodMatch[1];
        const params = cleanParams(methodMatch[2]);
        transpiledLine = transpiledLine.replace(methodRegex, `function ${methodName}(${params})`);
      }
    }

    // Brace tracking and class ending checks
    if (classStack.length > 0) {
      const cleanLine = transpiledLine
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
        .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '');
      const lineOpenBraces = (cleanLine.match(/\{/g) || []).length;
      const lineCloseBraces = (cleanLine.match(/\}/g) || []).length;
      
      braceDepth += lineOpenBraces - lineCloseBraces;

      if (classStack.length > 0) {
        const activeClass = classStack[classStack.length - 1];
        if (braceDepth <= activeClass.braceDepth) {
          if (classStack.length === 1) {
            transpiledLine = "// " + transpiledLine;
          } else {
            // Popping nested class, clear field registry
            activeClassFields = [];
          }
          classStack.pop();
        }
      }
    }

    jsCode += transpiledLine + "\n";
  }

  jsCode += "\nif (typeof main !== 'undefined') { main([]); }\n";
  return jsCode;
}

/**
 * Rust Transpiler.
 */
function transpileRust(code) {
  const lines = code.split('\n');
  let jsCode = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    let transpiledLine = line;
    
    transpiledLine = transpiledLine.replace(/println!\s*\(\s*"(.*?)"\s*,\s*(.*?)\)/g, 'console.log("$1", $2)');
    transpiledLine = transpiledLine.replace(/println!\s*\(\s*"(.*?)"\s*\)/g, 'console.log("$1")');
    transpiledLine = transpiledLine.replace(/print!\s*\(\s*"(.*?)"\s*\)/g, 'console.log("$1")');
    transpiledLine = transpiledLine.replace(/\blet\s+(?:mut\s+)?([a-zA-Z_]\w*)\b/g, 'let $1');
    
    if (trimmed.startsWith('fn main(')) {
      transpiledLine = transpiledLine.replace('fn main(', 'function main(');
    }
    jsCode += transpiledLine + "\n";
  }
  if (jsCode.includes('function main(')) {
    jsCode += "\nmain();\n";
  }
  return jsCode;
}

/**
 * Go Transpiler.
 */
function transpileGo(code) {
  const lines = code.split('\n');
  let jsCode = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('package ') || trimmed.startsWith('import ')) {
      jsCode += "// " + trimmed + "\n";
      continue;
    }
    
    let transpiledLine = line;
    transpiledLine = transpiledLine.replace(/fmt\.Println\(([^)]*)\)/g, 'console.log($1)');
    transpiledLine = transpiledLine.replace(/fmt\.Print\(([^)]*)\)/g, 'console.log($1)');
    transpiledLine = transpiledLine.replace(/\bvar\s+([a-zA-Z_]\w*)\s+\w+\s*=/g, 'let $1 =');
    
    if (trimmed.startsWith('func main(')) {
      transpiledLine = transpiledLine.replace('func main(', 'function main(');
    }
    jsCode += transpiledLine + "\n";
  }
  if (jsCode.includes('function main(')) {
    jsCode += "\nmain();\n";
  }
  return jsCode;
}

/**
 * Ruby Transpiler.
 */
function transpileRuby(code) {
  const lines = code.split('\n');
  let jsCode = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      jsCode += "\n";
      continue;
    }
    if (trimmed.startsWith('#')) {
      jsCode += trimmed.replace('#', '//') + "\n";
      continue;
    }
    if (trimmed === 'end') {
      jsCode += "}\n";
      continue;
    }
    
    let startsBlock = false;
    if (trimmed.match(/^(def|class|if|unless|while|until)\b/)) {
      startsBlock = true;
    }
    
    let transpiledLine = trimmed;
    if (trimmed.startsWith('def ')) {
      transpiledLine = trimmed.replace(/^def\s+([a-zA-Z_]\w*)\s*(?:\(([^)]*)\))?/, 'function $1($2)');
    } else if (trimmed.startsWith('puts ')) {
      transpiledLine = `console.log(${trimmed.substring(5)})`;
    } else if (trimmed.startsWith('print ')) {
      transpiledLine = `console.log(${trimmed.substring(6)})`;
    }
    
    if (startsBlock) {
      jsCode += transpiledLine + " {\n";
    } else {
      jsCode += transpiledLine + ";\n";
    }
  }
  return jsCode;
}

/**
 * SQL Transpiler.
 */
function transpileSQL(code) {
  return `console.log("[SQL Simulated Engine] Executing Query: ${code.replace(/\n/g, ' ').replace(/"/g, '\\"')}");`;
}

/**
 * Instruments JS loop code to prevent infinite timeouts.
 */
function instrumentLoops(jsCode) {
  let instrumented = jsCode;
  instrumented = instrumented.replace(/\bwhile\s*\(([^)]*)\)\s*\{/g, 'while ($1) { __loop_check();');
  instrumented = instrumented.replace(/\bfor\s*\(([^;]*;[^;]*;[^)]*)\)\s*\{/g, 'for ($1) { __loop_check();');
  
  instrumented = instrumented.replace(/\bfor\s*\(([^)]+)\)\s*\{/g, (match) => {
    if (match.includes('__loop_check')) return match;
    return match.replace('{', '{ __loop_check();');
  });
  
  instrumented = instrumented.replace(/\bdo\s*\{/g, 'do { __loop_check();');
  
  const header = `
  let __loop_count = 0;
  function __loop_check() {
    if (++__loop_count > 50000) {
      throw new Error("LoopTimeoutException: Infinite loop detected (exceeded 50,000 iterations)");
    }
  }
  `;
  return header + instrumented;
}

/**
 * JavaScript / GAS Preprocessor & Transpiler.
 * Strips ES module imports/exports and injects mock APIs for Node.js compatibility in GAS.
 */
function transpileJS(code) {
  let jsCode = "";
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    let transpiledLine = line;

    // Comment out ES module imports
    if (trimmed.startsWith('import ') && (trimmed.includes(' from ') || trimmed.includes(' from\'') || trimmed.includes(' from\"'))) {
      transpiledLine = "// " + line;
    } else if (trimmed.startsWith('import ') && (trimmed.includes('\'') || trimmed.includes('\"'))) {
      transpiledLine = "// " + line;
    }

    // Comment out exports if any
    if (trimmed.startsWith('export ')) {
      if (trimmed.startsWith('export default ')) {
        transpiledLine = trimmed.replace('export default ', 'module.exports = ');
      } else {
        transpiledLine = trimmed.replace('export ', ''); // naive
      }
    }

    jsCode += transpiledLine + "\n";
  }

  return jsCode;
}

/**
 * Compiles and runs source code natively inside GAS V8 sandboxed context.
 */
function compileAndRun(filename, code, language, inputBuffer) {
  if (!inputBuffer) inputBuffer = [];
  const logs = [];
  let jsCode = "";
  
  const consoleMock = {
    log: function(...args) { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
    error: function(...args) { logs.push("[ERROR] " + args.map(a => String(a)).join(' ')); },
    warn: function(...args) { logs.push("[WARN] " + args.map(a => String(a)).join(' ')); },
    info: function(...args) { logs.push("[INFO] " + args.map(a => String(a)).join(' ')); },
    dir: function(obj) { logs.push(JSON.stringify(obj, null, 2)); }
  };
  
  let inputIdx = 0;
  const promptMock = function(msg) {
    if (inputIdx < inputBuffer.length) return inputBuffer[inputIdx++];
    else throw new Error("__WAITING_FOR_INPUT__");
  };

  try {
    if (language === 'javascript' || language === 'gas') {
      jsCode = transpileJS(code);
    } else if (language === 'python') {
      jsCode = transpilePython(code);
    } else if (language === 'cpp') {
      jsCode = transpileCPP(code);
    } else if (language === 'java') {
      jsCode = transpileJava(code);
    } else if (language === 'rust') {
      jsCode = transpileRust(code);
    } else if (language === 'go') {
      jsCode = transpileGo(code);
    } else if (language === 'ruby') {
      jsCode = transpileRuby(code);
    } else if (language === 'sql') {
      jsCode = transpileSQL(code);
    } else if (language === 'html' || language === 'css') {
      return JSON.stringify({ status: "success", logs: ["[SYSTEM] HTML/CSS rendered in Preview Pane."] });
    } else {
      throw new Error("Unsupported execution language: " + language);
    }
    
    jsCode = instrumentLoops(jsCode);
    
    // --- Full Node.js Polyfills Environment ---
    
    const fsMock = {
      readFileSync: function(path, encoding) {
        const file = vfsReadFile(path);
        if (!file.content && file.language === 'javascript' && !getVFSIndex().includes(path)) {
           throw new Error("ENOENT: no such file or directory, open '" + path + "'");
        }
        return file.content;
      },
      writeFileSync: function(path, data) {
        let ext = path.split('.').pop();
        vfsWriteFile(path, data, ext === 'js' ? 'javascript' : ext);
      },
      existsSync: function(path) {
        return getVFSIndex().includes(path);
      },
      promises: {
        readFile: function(path, encoding) { return Promise.resolve(fsMock.readFileSync(path, encoding)); },
        writeFile: function(path, data) { return Promise.resolve(fsMock.writeFileSync(path, data)); }
      }
    };

    const pathMock = {
      join: function(...parts) { return parts.join('/').replace(/\\/g, '/').replace(/\/+/g, '/'); },
      basename: function(p) { return p.split('/').pop() || p.split('\\').pop(); },
      extname: function(p) { const f = pathMock.basename(p); const i = f.lastIndexOf('.'); return i > 0 ? f.slice(i) : ''; },
      dirname: function(p) { const parts = p.split('/'); parts.pop(); return parts.join('/') || '.'; }
    };

    const osMock = {
      platform: function() { return 'linux'; },
      arch: function() { return 'x64'; },
      cpus: function() { return [{model: 'Google Apps Script V8', speed: 2000}]; },
      freemem: function() { return 1024 * 1024 * 512; },
      totalmem: function() { return 1024 * 1024 * 512; },
      homedir: function() { return '/home/gas'; }
    };

    const httpMock = {
      get: function(url, callback) {
        try {
          const res = UrlFetchApp.fetch(url);
          const mockResponse = {
            statusCode: res.getResponseCode(),
            headers: res.getHeaders(),
            on: function(evt, cb) {
              if (evt === 'data') cb(res.getContentText());
              if (evt === 'end') cb();
            }
          };
          if (callback) callback(mockResponse);
          return { on: function() {} };
        } catch (e) {
          return { on: function(evt, cb) { if(evt==='error') cb(e); } };
        }
      }
    };

    const httpsMock = httpMock;

    function EventEmitter() { this._events = {}; }
    EventEmitter.prototype.on = function(event, listener) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(listener);
      return this;
    };
    EventEmitter.prototype.emit = function(event, ...args) {
      if (this._events[event]) {
        this._events[event].forEach(l => { try { l(...args); } catch(e) {} });
      }
      return true;
    };
    
    const eventsMock = { EventEmitter: EventEmitter };

    const BufferMock = {
      from: function(data, enc) { return { toString: () => typeof data === 'string' ? data : JSON.stringify(data) }; },
      isBuffer: function() { return false; }
    };

    const timerMocks = {
      setTimeout: function(cb, ms, ...args) {
        const start = Date.now();
        while(Date.now() - start < ms) {}
        if(cb) cb(...args);
        return 1;
      },
      setInterval: function(cb, ms, ...args) {
        const start = Date.now();
        while(Date.now() - start < ms) {}
        if(cb) cb(...args);
        return 2;
      },
      clearTimeout: function() {},
      clearInterval: function() {}
    };

    const processMock = {
      env: { NODE_ENV: 'development', GAS_ENV: 'true' },
      argv: ['node', filename],
      cwd: function() { return '/'; },
      exit: function(code) { throw new Error("__PROCESS_EXIT__" + (code||0)); },
      platform: 'linux',
      nextTick: function(cb, ...args) { cb(...args); },
      version: 'v20.0.0'
    };

    const cryptoMock = {
      randomBytes: function(size) {
        const arr = [];
        for(let i=0; i<size; i++) arr.push(Math.floor(Math.random() * 256));
        return { toString: (enc) => enc === 'hex' ? arr.map(x=>x.toString(16).padStart(2,'0')).join('') : BufferMock.from(arr).toString() };
      },
      randomUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    };
    
    const randomMock = {
      randint: function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
      random: function() { return Math.random(); },
      choice: function(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    };

    // Advanced require that can load VFS files
    function requireMock(moduleName) {
      if (moduleName === 'fs') return fsMock;
      if (moduleName === 'path') return pathMock;
      if (moduleName === 'os') return osMock;
      if (moduleName === 'http') return httpMock;
      if (moduleName === 'https') return httpsMock;
      if (moduleName === 'events') return eventsMock;
      if (moduleName === 'buffer') return BufferMock;
      if (moduleName === 'process') return processMock;
      if (moduleName === 'crypto') return cryptoMock;
      
      // Try to load from VFS
      let loadPath = moduleName;
      if (loadPath.startsWith('./') || loadPath.startsWith('../')) {
         loadPath = loadPath.replace('./', '').replace('../', '');
      }
      if (!loadPath.endsWith('.js') && !loadPath.endsWith('.json')) {
         loadPath += '.js';
      }
      
      if (fsMock.existsSync(loadPath)) {
         const fileContent = fsMock.readFileSync(loadPath);
         if (loadPath.endsWith('.json')) {
           return JSON.parse(fileContent);
         }
         
         const moduleObj = { exports: {} };
         const rExecutor = new Function('require', 'module', 'exports', 'console', fileContent);
         rExecutor(requireMock, moduleObj, moduleObj.exports, consoleMock);
         return moduleObj.exports;
      }
      
      throw new Error("Cannot find module '" + moduleName + "'");
    }

    const moduleObj = { exports: {} };
    
    const executorArgs = [
      'console', 'prompt', 'require', 'module', 'exports', 'process', 'Buffer', '__dirname', '__filename',
      'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'random',
      jsCode
    ];
    
    const executor = new Function(...executorArgs);
    
    executor(
      consoleMock, promptMock, requireMock, moduleObj, moduleObj.exports, processMock, BufferMock, '/', '/' + filename,
      timerMocks.setTimeout, timerMocks.setInterval, timerMocks.clearTimeout, timerMocks.clearInterval, randomMock
    );
    
    return JSON.stringify({
      status: "success",
      logs: logs
    });
    
  } catch (err) {
    if (err.message && err.message.includes("__WAITING_FOR_INPUT__")) {
      return JSON.stringify({
        status: "waiting_for_input",
        logs: logs,
        inputIndex: inputIdx
      });
    }
    if (err.message && err.message.includes("__PROCESS_EXIT__")) {
      const code = err.message.split("__PROCESS_EXIT__")[1];
      logs.push(`[Process exited with code ${code}]`);
      return JSON.stringify({
        status: "success",
        logs: logs
      });
    }
    return JSON.stringify({
      status: "error",
      message: err.message || String(err),
      logs: logs
    });
  }
}
