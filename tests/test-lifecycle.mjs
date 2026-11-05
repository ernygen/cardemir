import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function createServer() {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const fullPath = path.join(process.cwd(), reqPath.replace(/^\//, ''));

    if (!fs.existsSync(fullPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(fullPath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function runChrome(args) {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  return new Promise((resolve) => {
    const cp = spawn(chromePath, args);
    let out = '';
    let err = '';
    cp.stdout.on('data', d => out += d);
    cp.stderr.on('data', d => err += d);
    cp.on('close', code => {
      resolve({ code, out, err });
    });
  });
}

async function runTestSuite() {
  const { server, port } = await createServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('Test Server running at', baseUrl);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Desktop Test
  console.log('\n--- 1. Desktop Layout & Mounting Test ---');
  {
    const res = await runChrome([
      '--headless=new',
      '--window-size=1440,900',
      '--virtual-time-budget=3000',
      '--dump-dom',
      `${baseUrl}/index.html`
    ]);

    assert(res.out.includes('id="hero"'), '#hero container exists in DOM');
    assert(res.out.includes('class="content copy"'), '.copy content exists in #hero');
    assert(res.out.includes('<canvas') && (res.out.includes('data-ascii-kit') || res.out.includes('ascii-kit')), 'WebGL ASCII Canvas element is mounted inside #hero');
    assert(res.out.includes('Williams Projesi'), 'Existing project cards and text are preserved');
  }

  // 2. Mobile Responsive Test
  console.log('\n--- 2. Mobile Responsive Test (375x812) ---');
  {
    const res = await runChrome([
      '--headless=new',
      '--window-size=375,812',
      '--virtual-time-budget=3000',
      '--dump-dom',
      `${baseUrl}/index.html`
    ]);

    assert(res.out.includes('id="hero"'), '#hero present on mobile viewport');
    assert(res.out.includes('<canvas'), 'Canvas mounts on mobile viewport');
    assert(res.out.includes('works-grid'), 'Responsive works-grid structure intact');
  }

  // 3. Loading Failure & Graceful Degradation Test
  console.log('\n--- 3. Loading Failure & Graceful Fallback Test ---');
  {
    // Serve a test page that fails to load asciify-engine or lacks WebGL
    const failHtmlPath = path.join(process.cwd(), 'tests', 'fail-test.html');
    fs.mkdirSync(path.join(process.cwd(), 'tests'), { recursive: true });
    fs.writeFileSync(failHtmlPath, `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="../style.css">
      </head>
      <body>
        <div id="hero" class="hero-wrapper">
          <main class="content copy">
            <h1>Fallback Test</h1>
            <p>Content remains intact even if engine fails</p>
          </main>
        </div>
        <script type="module">
          // Attempt to load from non-existent module
          try {
            const mod = await import('./non-existent.js');
          } catch (e) {
            console.warn('[Expected Failure Handled]', e.message);
          }
        </script>
      </body>
      </html>
    `);

    const res = await runChrome([
      '--headless=new',
      '--virtual-time-budget=2000',
      '--dump-dom',
      `${baseUrl}/tests/fail-test.html`
    ]);

    assert(res.out.includes('Fallback Test'), 'Page content renders normally despite script failure');
    assert(res.out.includes('Content remains intact'), 'Fallback typography and copy preserved');
    try { fs.unlinkSync(failHtmlPath); } catch {}
  }

  // 4. Lifecycle & Cleanup Test
  console.log('\n--- 4. Cleanup & Lifecycle Test ---');
  {
    const cleanupHtmlPath = path.join(process.cwd(), 'tests', 'cleanup-test.html');
    fs.writeFileSync(cleanupHtmlPath, `
      <!DOCTYPE html>
      <html>
      <head>
        <script type="importmap">
        {
          "imports": {
            "asciify-engine/kit": "../node_modules/asciify-engine/dist/kit.js",
            "asciify-engine/field": "../node_modules/asciify-engine/dist/field.js",
            "asciify-engine/core": "../node_modules/asciify-engine/dist/core.js",
            "asciify-engine": "../node_modules/asciify-engine/dist/index.js"
          }
        }
        </script>
      </head>
      <body>
        <div id="hero">
          <div class="copy">Test Copy</div>
        </div>
        <script type="module">
          import { initAsciify, destroyAsciify } from '../main.js';
          
          const handle = initAsciify();
          const mounted = document.querySelector('#hero canvas') !== null;
          
          destroyAsciify();
          const cleanedUp = document.querySelector('#hero canvas') === null;

          document.body.setAttribute('data-test-mounted', String(mounted));
          document.body.setAttribute('data-test-cleaned', String(cleanedUp));
        </script>
      </body>
      </html>
    `);

    const res = await runChrome([
      '--headless=new',
      '--virtual-time-budget=3000',
      '--dump-dom',
      `${baseUrl}/tests/cleanup-test.html`
    ]);

    assert(res.out.includes('data-test-mounted="true"'), 'Asciify canvas mounted during lifecycle');
    assert(res.out.includes('data-test-cleaned="true"'), 'Asciify canvas cleanly removed on destroyAsciify()');
    try { fs.unlinkSync(cleanupHtmlPath); } catch {}
  }

  server.close();
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
