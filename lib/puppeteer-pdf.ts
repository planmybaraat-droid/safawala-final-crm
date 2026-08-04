import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import path from 'path';

async function launchBrowser() {
  const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;

  if (isLocal) {
    const profileDir = path.join(process.cwd(), '.puppeteer-chrome-profile');
    return puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--user-data-dir=${profileDir}`,
        '--remote-debugging-port=0',
      ]
    });
  }

  const executablePath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'
  );

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath || undefined,
    headless: chromium.headless === true ? true : (chromium.headless === 'new' ? 'new' : true),
  });
}

/**
 * Render arbitrary HTML string to a PDF buffer.
 * Used as fallback only.
 */
export async function htmlToPdfBuffer(htmlContent: string): Promise<Buffer> {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('print');

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

/**
 * Navigate to the LIVE invoice page (create-invoice?mode=edit&id=X&print=true)
 * and capture it as PDF — this is the EXACT same PDF the user gets when they
 * click Print Invoice in the browser.
 *
 * @param invoicePageUrl  Full URL e.g. http://localhost:3000/create-invoice?mode=edit&id=...&print=true
 * @param authCookies     Session cookies to authenticate the headless browser (required for SSR pages)
 */
export async function urlToPdfBuffer(
  invoicePageUrl: string,
  authCookies?: Array<{ name: string; value: string; domain: string }>
): Promise<Buffer> {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  // Set cookies so the page loads authenticated
  if (authCookies && authCookies.length > 0) {
    await page.setCookie(...authCookies);
  }

  // Navigate to the actual invoice page
  await page.goto(invoicePageUrl, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait for the invoice content to fully render
  // The print-only sections are `hidden print:block` — emulating print reveals them
  await page.emulateMediaType('print');

  // Wait for async data: QR codes (base64 fetch), company settings, product images
  await new Promise(resolve => setTimeout(resolve, 5000));

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}
