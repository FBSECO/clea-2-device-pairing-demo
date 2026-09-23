const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    // Use locally installed Chrome when the optional Playwright browser has not been downloaded.
    browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => {
      throw error;
    });
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const device = await context.newPage();
  const platform = await context.newPage();
  const errors = [];
  for (const page of [device, platform])
    page.on('pageerror', (error) => errors.push(error.message));
  fs.mkdirSync('artifacts', { recursive: true });

  await context.request.post('http://127.0.0.1:2001/api/demo/reset', { data: {} });
  await device.goto('http://127.0.0.1:3000');
  await device.locator('.boot-logo').waitFor();
  await device.getByRole('button', { name: /Device Pairing/ }).waitFor({ timeout: 12000 });
  await device.getByRole('button', { name: /Device Pairing/ }).click();
  await device.getByRole('button', { name: 'Generate pairing code' }).click();
  const code = await device.locator('.dark-code-value').innerText({ timeout: 10000 });
  assert.match(code, /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
  await device.waitForTimeout(900);
  await device.screenshot({ path: 'artifacts/device-code.png', fullPage: true });

  await platform.goto('http://127.0.0.1:2001');
  await platform.getByRole('heading', { name: 'Devices', exact: true }).waitFor();
  await platform.getByRole('button', { name: 'Add device', exact: true }).click();
  const dialog = platform.getByRole('dialog');
  await dialog.getByRole('heading', { name: 'Choose how to connect' }).waitFor();
  assert.ok(await platform.getByRole('heading', { name: 'Devices', exact: true }).isVisible());
  await dialog.getByRole('button', { name: /Pair with a code/ }).click();
  await dialog.getByLabel('Pairing code').fill(code);
  await dialog.getByRole('button', { name: 'Find device' }).click();
  await dialog.getByRole('heading', { name: 'Confirm your device' }).waitFor();
  await dialog.getByLabel('Device name').fill('Meeting Room Kit');
  await dialog.getByRole('button', { name: 'Pair device' }).click();
  await dialog.getByRole('heading', { name: 'Device connected' }).waitFor({ timeout: 15000 });
  await dialog.screenshot({ path: 'artifacts/platform-success-modal.png' });
  await dialog.getByRole('button', { name: 'View device list' }).click();
  await platform.getByText('Meeting Room Kit', { exact: true }).waitFor();
  await platform.screenshot({ path: 'artifacts/platform-list.png', fullPage: true });
  await device.getByRole('heading', { name: 'Device online' }).waitFor({ timeout: 15000 });

  await device.getByRole('button', { name: 'Reset demo' }).click();
  await device.locator('.boot-logo').waitFor();
  await device.getByRole('button', { name: /Device Pairing/ }).waitFor({ timeout: 12000 });
  await device.getByRole('button', { name: /Device Pairing/ }).click();
  await device.getByRole('button', { name: 'Generate pairing code' }).click();
  const secondCode = await device.locator('.dark-code-value').innerText({ timeout: 10000 });
  const [login] = await Promise.all([
    context.waitForEvent('page'),
    device.getByRole('link', { name: /localhost:2001\/login/ }).click(),
  ]);
  login.on('pageerror', (error) => errors.push(error.message));
  await login.getByRole('heading', { name: 'Sign in to continue' }).waitFor();
  assert.equal(await login.getByLabel('Email').inputValue(), 'demo@clea.local');
  assert.ok((await login.getByLabel('Password').inputValue()).length > 0);
  await login.screenshot({ path: 'artifacts/login.png', fullPage: true });
  await login.getByRole('button', { name: 'Sign in' }).click();
  await login.getByRole('dialog').getByRole('heading', { name: 'Enter pairing code' }).waitFor();
  await login.getByRole('dialog').getByLabel('Pairing code').fill(secondCode);
  await login.getByRole('dialog').getByRole('button', { name: 'Find device' }).click();
  await login.getByRole('dialog').getByRole('heading', { name: 'Confirm your device' }).waitFor();
  await login.getByRole('dialog').getByRole('button', { name: 'Pair device' }).click();
  await login
    .getByRole('dialog')
    .getByRole('heading', { name: 'Device connected' })
    .waitFor({ timeout: 15000 });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: device boot, app launch, code, modal steps, online list, link, prefilled login and deep-linked modal',
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
