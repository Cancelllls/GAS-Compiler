import sys

with open('/workspaces/GAS-Compiler/gas-compiler-project/Code.js', 'r') as f:
    content = f.read()

index = content.find('function transpileJS(code) {')
if index == -1:
    print("Could not find transpileJS")
    sys.exit(1)

new_code = """function transpileJS(code) {
  let jsCode = "";
  const lines = code.split('\\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    let transpiledLine = line;

    // Comment out ES module imports
    if (trimmed.startsWith('import ') && (trimmed.includes(' from ') || trimmed.includes(' from\\'') || trimmed.includes(' from\\"'))) {
      transpiledLine = "// " + line;
    } else if (trimmed.startsWith('import ') && (trimmed.includes('\\'') || trimmed.includes('\\"'))) {
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

    jsCode += transpiledLine + "\\n";
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
      join: function(...parts) { return parts.join('/').replace(/\\\\/g, '/').replace(/\\/+/g, '/'); },
      basename: function(p) { return p.split('/').pop() || p.split('\\\\').pop(); },
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
      'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      jsCode
    ];
    
    const executor = new Function(...executorArgs);
    
    executor(
      consoleMock, promptMock, requireMock, moduleObj, moduleObj.exports, processMock, BufferMock, '/', '/' + filename,
      timerMocks.setTimeout, timerMocks.setInterval, timerMocks.clearTimeout, timerMocks.clearInterval
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
"""

with open('/workspaces/GAS-Compiler/gas-compiler-project/Code.js', 'w') as f:
    f.write(content[:index] + new_code)
print("Patched Code.js successfully")
