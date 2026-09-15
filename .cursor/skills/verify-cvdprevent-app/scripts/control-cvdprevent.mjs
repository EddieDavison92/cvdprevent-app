#!/usr/bin/env node
/**
 * Drive a verification instance of CVDPREVENT Explorer.
 * Run from the repo root. Requires CVDPREVENT_VERIFY_RUN and CVDPREVENT_VERIFY_URL.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer';

const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH
  || process.env.CHROME_PATH
  || '/usr/local/bin/google-chrome';

function runDir() {
  const dir = process.env.CVDPREVENT_VERIFY_RUN;
  if (!dir) {
    throw new Error('Set CVDPREVENT_VERIFY_RUN to this run’s scratch directory. Refusing to drive a shared instance.');
  }
  return dir;
}

function verifyUrl() {
  const url = process.env.CVDPREVENT_VERIFY_URL;
  if (!url) {
    throw new Error('Set CVDPREVENT_VERIFY_URL to the instance this run launched. Refusing to guess localhost:3000.');
  }
  return url.replace(/\/$/, '');
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) flags[key] = true;
      else {
        flags[key] = next;
        i += 1;
      }
    } else positional.push(token);
  }
  return { flags, positional };
}

function readPid(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const value = Number.parseInt(fs.readFileSync(filePath, 'utf8').trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function parentPid(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const close = stat.lastIndexOf(')');
    const rest = stat.slice(close + 2).split(' ');
    return Number.parseInt(rest[1], 10);
  } catch {
    return null;
  }
}

function pidOwnsAncestor(listenerPid, rootPid) {
  let current = listenerPid;
  for (let hops = 0; hops < 40 && current && current > 1; hops += 1) {
    if (current === rootPid) return true;
    current = parentPid(current);
  }
  return current === rootPid;
}

function listeningPids(port) {
  try {
    const output = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -n -P -t`, { encoding: 'utf8' });
    return [...new Set(output.trim().split('\n').filter(Boolean).map(Number))];
  } catch {
    return [];
  }
}

function portFromUrl(url) {
  return Number(new URL(url).port || (url.startsWith('https') ? 443 : 80));
}

async function fetchText(url, timeoutMs = 8000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: '*/*' } });
  return { status: response.status, body: await response.text() };
}

function paths(dir) {
  return {
    nextPid: path.join(dir, 'next.pid'),
    browserPid: path.join(dir, 'browser.pid'),
    browserWs: path.join(dir, 'browser.ws'),
    profile: path.join(dir, 'chrome-profile'),
  };
}

async function doctor() {
  const dir = runDir();
  const url = verifyUrl();
  const files = paths(dir);
  const nextPid = readPid(files.nextPid);
  const lines = [];
  const fail = (message) => {
    console.error(`fail ${message}`);
    process.exitCode = 1;
  };

  if (!nextPid || !pidAlive(nextPid)) {
    fail(`next pid missing or dead (${files.nextPid})`);
    return;
  }
  lines.push(`ok pid=${nextPid} alive`);

  const port = portFromUrl(url);
  const listeners = listeningPids(port);
  if (listeners.length === 0) {
    fail(`nothing listening on ${port}`);
    return;
  }
  const owned = listeners.some((pid) => pid === nextPid || pidOwnsAncestor(pid, nextPid));
  if (!owned) {
    fail(`port ${port} is not owned by pid ${nextPid} (listeners: ${listeners.join(',')})`);
    return;
  }
  lines.push(`ok port=${port} owned_by=${listeners.join(',')}`);

  const home = await fetchText(`${url}/`);
  if (home.status !== 200 || !home.body.includes('CVDPREVENT')) {
    fail(`home status=${home.status} missing CVDPREVENT identity`);
    return;
  }
  if (!home.body.includes('Unofficial data explorer') && !home.body.includes('CVDPREVENT Data Explorer')) {
    fail('home HTML does not look like this app');
    return;
  }
  lines.push(`ok url=${url} identity=CVDPREVENT`);

  const relay = await fetchText(`${url}/api/cvdprevent`);
  if (relay.status !== 200 || !relay.body.includes('CVDPREVENT agent API')) {
    fail(`relay status=${relay.status} not the agent index`);
    return;
  }
  lines.push('ok relay=/api/cvdprevent');

  const periods = await fetchText(`${url}/api/cvdprevent/timePeriod`);
  if (periods.status !== 200) {
    fail(`upstream timePeriod status=${periods.status}`);
    return;
  }
  let count = 0;
  try {
    const json = JSON.parse(periods.body);
    count = Array.isArray(json.timePeriodList) ? json.timePeriodList.length : 0;
  } catch {
    fail('upstream timePeriod was not JSON');
    return;
  }
  if (count < 1) {
    fail('upstream timePeriodList empty');
    return;
  }
  lines.push(`ok upstream=timePeriod count=${count}`);
  for (const line of lines) console.log(line);
}

async function waitReady() {
  const url = verifyUrl();
  const timeoutMs = Number(process.env.CVDPREVENT_VERIFY_READY_MS || 120_000);
  const started = Date.now();
  let lastError = 'not tried';
  while (Date.now() - started < timeoutMs) {
    try {
      const home = await fetchText(`${url}/`, 4000);
      if (home.status === 200 && home.body.includes('CVDPREVENT')) {
        console.log(`ok ready url=${url} after_ms=${Date.now() - started}`);
        return;
      }
      lastError = `status=${home.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(1000);
  }
  throw new Error(`App was not ready at ${url} within ${timeoutMs}ms (${lastError})`);
}

async function ensureBrowser() {
  const files = paths(runDir());
  fs.mkdirSync(files.profile, { recursive: true });

  if (fs.existsSync(files.browserWs)) {
    const endpoint = fs.readFileSync(files.browserWs, 'utf8').trim();
    try {
      const browser = await puppeteer.connect({ browserWSEndpoint: endpoint });
      return { browser, reconnect: true };
    } catch {
      for (const leftover of [files.browserWs, files.browserPid]) {
        try { fs.unlinkSync(leftover); } catch { /* ignore */ }
      }
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    userDataDir: files.profile,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,800'],
  });
  fs.writeFileSync(files.browserWs, browser.wsEndpoint());
  const proc = browser.process();
  if (proc?.pid) fs.writeFileSync(files.browserPid, String(proc.pid));
  return { browser, reconnect: false };
}

async function withPage(fn) {
  const { browser, reconnect } = await ensureBrowser();
  try {
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    if (!reconnect && page.url() === 'about:blank') {
      await page.goto(`${verifyUrl()}/`, { waitUntil: 'domcontentloaded' });
    }
    return await fn(page);
  } finally {
    browser.disconnect();
  }
}

async function findByRole(page, role, name, exact = false) {
  const handle = await page.evaluateHandle((wantedRole, wantedName, wantExact) => {
    const compact = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const matches = (value) => {
      if (!wantedName) return true;
      const hay = compact(value).toLowerCase();
      const needle = compact(wantedName).toLowerCase();
      return wantExact ? compact(value) === compact(wantedName) : hay.includes(needle);
    };
    const accessibleName = (node) => {
      if (node.getAttribute('aria-label')) return node.getAttribute('aria-label');
      const labelledBy = node.getAttribute('aria-labelledby');
      if (labelledBy) {
        return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ');
      }
      if (node.labels && node.labels[0]) return node.labels[0].textContent;
      return node.innerText || node.textContent || '';
    };
    const implicitRole = (node) => {
      const explicit = node.getAttribute('role');
      if (explicit) return explicit;
      if (node.tagName === 'A' && node.hasAttribute('href')) return 'link';
      if (node.tagName === 'BUTTON') return 'button';
      if (node.tagName === 'INPUT') {
        const type = (node.getAttribute('type') || 'text').toLowerCase();
        if (type === 'search') return 'searchbox';
        return 'textbox';
      }
      if (node.tagName === 'TEXTAREA') return 'textbox';
      if (/^H[1-6]$/.test(node.tagName)) return 'heading';
      return null;
    };
    const optionTitle = (node) => node.querySelector('span.block.truncate.text-sm')?.textContent || '';

    for (const node of document.querySelectorAll('*')) {
      if (implicitRole(node) !== wantedRole) continue;
      if (wantedRole === 'option' && wantExact && wantedName) {
        if (compact(optionTitle(node)) !== compact(wantedName)) continue;
        return node.querySelector('button') || node;
      }
      if (!matches(accessibleName(node))) continue;
      return node;
    }
    return null;
  }, role, name, exact);

  const element = handle.asElement();
  if (!element) throw new Error(`No ${role}${name ? ` named "${name}"` : ''} found`);
  return element;
}

async function locate(page, flags) {
  if (flags.selector) {
    const handle = await page.$(flags.selector);
    if (!handle) throw new Error(`No node for selector ${flags.selector}`);
    return handle;
  }
  if (!flags.role) throw new Error('Provide --role and --name, or --selector');
  return findByRole(page, flags.role, flags.name || '', Boolean(flags.exact));
}

function serialiseAria(node, indent = 0) {
  if (!node) return '';
  const name = node.name ? ` "${node.name}"` : '';
  const line = `${'  '.repeat(indent)}${node.role}${name}`;
  const children = (node.children || []).map((child) => serialiseAria(child, indent + 1)).filter(Boolean);
  return [line, ...children].join('\n');
}

async function setInputValue(page, handle, value) {
  await handle.evaluate((node, next) => {
    node.focus();
    const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(node, next);
    else node.value = next;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

function killTree(pid) {
  if (!pid || !pidAlive(pid)) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ }
  }
}

async function browserCommand(subcommand, flags, positional) {
  if (subcommand === 'close') {
    const files = paths(runDir());
    if (fs.existsSync(files.browserWs)) {
      try {
        const browser = await puppeteer.connect({
          browserWSEndpoint: fs.readFileSync(files.browserWs, 'utf8').trim(),
        });
        await browser.close();
      } catch {
        const pid = readPid(files.browserPid);
        if (pid && pidAlive(pid)) process.kill(pid, 'SIGTERM');
      }
    }
    for (const leftover of [files.browserWs, files.browserPid]) {
      try { fs.unlinkSync(leftover); } catch { /* ignore */ }
    }
    console.log('ok browser closed');
    return;
  }

  await withPage(async (page) => {
    if (subcommand === 'goto') {
      const target = positional[0];
      if (!target) throw new Error('browser goto <path-or-url>');
      const url = target.startsWith('http') ? target : `${verifyUrl()}${target.startsWith('/') ? '' : '/'}${target}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.log(`ok url=${page.url()}`);
      return;
    }

    if (subcommand === 'click') {
      const node = await locate(page, flags);
      await node.click();
      console.log('ok clicked');
      return;
    }

    if (subcommand === 'fill') {
      const node = await locate(page, flags);
      await setInputValue(page, node, flags.value ?? '');
      console.log(`ok filled value=${JSON.stringify(flags.value ?? '')}`);
      return;
    }

    if (subcommand === 'press') {
      const key = flags.key || positional[0];
      if (!key) throw new Error('browser press --key <key>');
      await page.keyboard.press(key);
      console.log(`ok pressed ${key}`);
      return;
    }

    if (subcommand === 'wait') {
      const timeout = Number(flags.timeout || 60_000);
      if (flags.url) {
        await page.waitForFunction((needle) => location.href.includes(needle), { timeout }, flags.url);
        console.log(`ok url=${page.url()}`);
        return;
      }
      if (flags.text) {
        await page.waitForFunction((needle) => document.body.innerText.includes(needle), { timeout }, flags.text);
        console.log(`ok text=${JSON.stringify(flags.text)}`);
        return;
      }
      if (flags.role) {
        const started = Date.now();
        while (Date.now() - started < timeout) {
          try {
            await findByRole(page, flags.role, flags.name || '', Boolean(flags.exact));
            console.log(`ok role=${flags.role} name=${JSON.stringify(flags.name || '')}`);
            return;
          } catch {
            await delay(250);
          }
        }
        throw new Error(`Timed out waiting for ${flags.role} ${flags.name || ''}`);
      }
      throw new Error('browser wait needs --text, --url, or --role');
    }

    if (subcommand === 'url') {
      console.log(page.url());
      return;
    }

    if (subcommand === 'title') {
      console.log(await page.title());
      return;
    }

    if (subcommand === 'snapshot') {
      const tree = await page.accessibility.snapshot({ interestingOnly: true });
      const body = [`url: ${page.url()}`, `title: ${await page.title()}`, serialiseAria(tree)].join('\n');
      if (flags.path) {
        fs.mkdirSync(path.dirname(flags.path), { recursive: true });
        fs.writeFileSync(flags.path, `${body}\n`);
        console.log(`ok snapshot ${flags.path}`);
      } else console.log(body);
      return;
    }

    if (subcommand === 'screenshot') {
      if (!flags.path) throw new Error('browser screenshot --path <file>');
      fs.mkdirSync(path.dirname(flags.path), { recursive: true });
      await page.screenshot({ path: flags.path, fullPage: false });
      console.log(`ok screenshot ${flags.path}`);
      return;
    }

    throw new Error(`Unknown browser command: ${subcommand}`);
  });
}

async function cleanup() {
  const dir = runDir();
  const files = paths(dir);
  await browserCommand('close', {}, []).catch(() => {});
  const nextPid = readPid(files.nextPid);
  killTree(nextPid);
  await delay(400);
  if (nextPid && pidAlive(nextPid)) {
    try { process.kill(-nextPid, 'SIGKILL'); } catch {
      try { process.kill(nextPid, 'SIGKILL'); } catch { /* ignore */ }
    }
  }
  fs.rmSync(files.profile, { recursive: true, force: true });
  console.log(`ok cleanup run=${dir} evidence retained`);
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const [command, subcommand, ...rest] = positional;

try {
  if (command === 'doctor') await doctor();
  else if (command === 'wait-ready') await waitReady();
  else if (command === 'cleanup') await cleanup();
  else if (command === 'browser') await browserCommand(subcommand, flags, rest);
  else {
    console.error('Usage: control-cvdprevent <doctor|wait-ready|cleanup|browser> …');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`fail ${error.message}`);
  process.exitCode = 1;
}
