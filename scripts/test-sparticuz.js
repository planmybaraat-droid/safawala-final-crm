const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

async function test() {
  try {
    const executablePath = await chromium.executablePath();
    console.log("Executable Path:", executablePath);
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // fallback for local mac
      headless: chromium.headless === true ? true : (chromium.headless === 'new' ? 'new' : true),
    });
    console.log("Browser launched!");
    await browser.close();
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
