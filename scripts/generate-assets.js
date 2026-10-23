import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHttp(url)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function runCmd(args) {
  return new Promise((resolve, reject) => {
    const fullArgs = ['--cdp', '9222', ...args];
    const p = spawn('agent-browser', fullArgs, { stdio: ['inherit', 'pipe', 'inherit'] });
    let stdout = '';
    p.stdout?.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    p.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`agent-browser ${fullArgs.join(' ')} failed with code ${code}`));
    });
  });
}

async function main() {
  const vitePort = 5173;
  const cdpPort = 9222;
  const viteUrl = `http://localhost:${vitePort}`;
  const cdpUrl = `http://localhost:${cdpPort}/json/version`;

  let viteProcess = null;
  let chromeProcess = null;

  fs.mkdirSync('docs/assets/screenshots', { recursive: true });

  // 1. Ensure Vite is running
  const isViteRunning = await checkHttp(viteUrl);
  if (!isViteRunning) {
    console.log(`Starting Vite dev server on port ${vitePort}...`);
    viteProcess = spawn('pnpm', ['dev', '--port', String(vitePort)], {
      stdio: 'pipe',
      detached: false,
    });
    const ready = await waitForHttp(viteUrl);
    if (!ready) {
      if (viteProcess) viteProcess.kill();
      throw new Error(`Dev server failed to start on ${viteUrl}`);
    }
  }

  // 2. Ensure Chrome CDP is running
  const isCdpRunning = await checkHttp(cdpUrl);
  if (!isCdpRunning) {
    console.log(`Starting headless Chrome on CDP port ${cdpPort}...`);
    const chromePath = '/home/param/.agent-browser/browsers/chrome-156.0.8078.47/chrome';
    chromeProcess = spawn(
      chromePath,
      [
        '--headless=new',
        `--remote-debugging-port=${cdpPort}`,
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
      { stdio: 'ignore', detached: false }
    );
    const ready = await waitForHttp(cdpUrl);
    if (!ready) {
      if (chromeProcess) chromeProcess.kill();
      throw new Error(`Chrome CDP failed to start on port ${cdpPort}`);
    }
  }

  try {
    console.log('\n--- 1. Capturing Dashboard ---');
    await runCmd(['open', viteUrl]);
    await runCmd(['set', 'viewport', '1440', '900']);
    await runCmd(['wait', '1500']);
    await runCmd(['screenshot', 'docs/assets/screenshots/01-dashboard.png']);

    console.log('\n--- 2. Starting Video Recording & Editor Session ---');
    await runCmd(['record', 'restart', 'docs/assets/demo.mp4', '--fps', '30', '--cursor']);

    console.log('\n--- 3. Opening Product Launch Template ---');
    await runCmd(['find', 'text', 'Product Launch Announcement', 'click']);
    await runCmd(['wait', '2000']);
    await runCmd(['screenshot', 'docs/assets/screenshots/02-editor-overview.png']);

    console.log('\n--- 4. Adding Text & Adjusting Typography ---');
    await runCmd(['find', 'text', 'Add a heading', 'click']);
    await runCmd(['wait', '1200']);
    await runCmd(['screenshot', 'docs/assets/screenshots/03-text-properties.png']);

    console.log('\n--- 5. Adding Shape & Vector Customization ---');
    await runCmd(['find', 'text', 'Rounded', 'click']);
    await runCmd(['wait', '1500']);
    await runCmd(['screenshot', 'docs/assets/screenshots/04-shape-properties.png']);

    console.log('\n--- 6. Generating Read-Only Share Link ---');
    await runCmd(['find', 'text', 'Share', 'click']);
    await runCmd(['wait', '1000']);
    await runCmd(['click', '[data-testid="create-share-btn"]']);
    await runCmd(['wait', '1500']);
    await runCmd(['screenshot', 'docs/assets/screenshots/05-share-modal.png']);

    const shareUrlRaw = await runCmd(['get', 'value', '[data-testid="share-url-input"]']);
    const shareUrl = shareUrlRaw.trim().split('\n').pop()?.trim() || '';

    await runCmd(['click', 'button:has(svg.lucide-x)']);
    await runCmd(['wait', '800']);

    if (shareUrl && shareUrl.includes('?share=')) {
      console.log('\n--- 7. Opening Read-Only Recipient View ---');
      await runCmd(['open', shareUrl]);
      await runCmd(['wait', '2000']);
      await runCmd(['screenshot', 'docs/assets/screenshots/06-readonly-view.png']);
    }

    console.log('\n--- 8. Stopping Video Recording ---');
    await runCmd(['record', 'stop']);

    console.log('\n✅ All screenshots and demo.mp4 recorded successfully!');
  } finally {
    if (viteProcess) viteProcess.kill('SIGTERM');
    if (chromeProcess) chromeProcess.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
