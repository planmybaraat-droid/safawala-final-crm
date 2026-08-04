const puppeteer = require('puppeteer-core');
require('dotenv').config({ path: '.env.local' });

async function run() {
  console.log("This will work because Puppeteer interceptors can modify request headers before they go out.");
}
run();
