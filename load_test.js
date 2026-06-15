const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const projectDir = '/workspaces/GAS-Compiler/gas-compiler-project';

try {
  // Read components
  let indexHtml = fs.readFileSync(path.join(projectDir, 'Index.html'), 'utf8');
  const cssHtml = fs.readFileSync(path.join(projectDir, 'CSS.html'), 'utf8');
  const jsHtml = fs.readFileSync(path.join(projectDir, 'JS.html'), 'utf8');

  // Simulate GAS server-side template replacement
  indexHtml = indexHtml.replace("<?!= HtmlService.createHtmlOutputFromFile('CSS').getContent(); ?>", cssHtml);
  indexHtml = indexHtml.replace("<?!= HtmlService.createHtmlOutputFromFile('JS').getContent(); ?>", jsHtml);

  console.log("Combined HTML template size:", indexHtml.length, "bytes.");

  // Mock google.script.run for JSDOM
  const virtualConsole = new JSDOM('').window.console;
  
  const dom = new JSDOM(indexHtml, {
    runScripts: "dangerously",
    resources: "usable",
    beforeParse(window) {
      // Mock Google Apps Script client API
      window.google = {
        script: {
          run: {
            withSuccessHandler(success) {
              const self = this;
              return {
                withFailureHandler(failure) {
                  return {
                    vfsGetAllFiles() {
                      // Return mock file list
                      setTimeout(() => {
                        success({
                          "main.js": { content: "console.log('hello');", language: "javascript" }
                        });
                      }, 10);
                    }
                  };
                }
              };
            }
          }
        }
      };
      
      // Capture uncaught exceptions
      window.addEventListener('error', (event) => {
        console.error("UNCAUGHT RUNTIME EXCEPTION IN BROWSER:", event.error ? event.error.message : event.message);
        console.error(event.error ? event.error.stack : "");
        process.exit(1);
      });
    }
  });

  console.log("Parsing and loading DOM...");
  
  // Wait a bit to let DOMContentLoaded and initial callbacks run
  setTimeout(() => {
    const document = dom.window.document;
    console.log("DOM Loaded successfully!");
    console.log("Checking status bar left element text:", document.getElementById('status-left').innerText);
    console.log("Checking if active class is set on first file item...");
    const fileItems = document.querySelectorAll('.file-item');
    console.log("File items found count:", fileItems.length);
    process.exit(0);
  }, 200);

} catch (err) {
  console.error("Load test failed:", err.stack);
  process.exit(1);
}
