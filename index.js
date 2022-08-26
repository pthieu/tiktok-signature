const { createCipheriv } = require("crypto");
const url = require("url");
const chromium = require('chrome-aws-lambda');
const Utils = require("./utils");
const iPhone11 = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'webkit'
}
  
class Signer {
  userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36";
  args = [
    "--disable-blink-features",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--window-size=1920,1080",
    "--start-maximized",
  ];
  // Default TikTok loading page
  default_url = "https://www.tiktok.com/@rihanna?lang=en";

  // Password for xttparams AES encryption
  password = "webapp1.0+202106";

  constructor(default_url, userAgent, browser) {
    if (default_url) {
      this.default_url = default_url;
    }
    if (userAgent) {
      this.userAgent = userAgent;
    }

    if (browser) {
      this.browser = browser;
      this.isExternalBrowser = true;
    }

    this.args.push(`--user-agent="${this.userAgent}"`);

    this.options = {
      headless: true,
      args: this.args,
      ignoreDefaultArgs: ["--mute-audio", "--hide-scrollbars"],
      ignoreHTTPSErrors: true,
    };
  }

  async init() {
    if (!this.browser) {
      const execPath = await chromium.executablePath;
      const options = {
        ...this.options,
        executablePath: execPath,
      }
      this.browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
      });
    }

    // let emulateTemplate = {
    //   ...iPhone11,
    //   locale: "en-US",
    //   deviceScaleFactor: Utils.getRandomInt(1, 3),
    //   isMobile: Math.random() > 0.5,
    //   hasTouch: Math.random() > 0.5,
    //   userAgent: this.userAgent,
    // };
    // emulateTemplate.viewport.width = Utils.getRandomInt(320, 1920);
    // emulateTemplate.viewport.height = Utils.getRandomInt(320, 1920);

    // this.context = await this.browser.newContext({
    //   ...emulateTemplate,
    // });

    // this.context = await this.browser.createIncognitoBrowserContext();
    this.page = await this.browser.newPage();
    await this.page.goto(this.default_url);

    let LOAD_SCRIPTS = ["signer.js", "webmssdk.js"];
    LOAD_SCRIPTS.forEach(async (script) => {
      await this.page.addScriptTag({
        path: `${__dirname}/javascript/${script}`,
      });
      // console.log("[+] " + script + " loaded");
    });

    await this.page.evaluate(() => {
      window.generateSignature = function generateSignature(url) {
        if (typeof window.byted_acrawler.sign !== "function") {
          throw "No signature function found";
        }
        return window.byted_acrawler.sign({ url: url });
      };

      window.generateBogus = function generateBogus(params) {
        if (typeof window._0x32d649 !== "function") {
          throw "No X-Bogus function found";
        }
        return window._0x32d649(params);
      };
      return this;
    });
  }

  async navigator() {
    // Get the "viewport" of the page, as reported by the page.
    const info = await this.page.evaluate(() => {
      return {
        deviceScaleFactor: window.devicePixelRatio,
        user_agent: window.navigator.userAgent,
        browser_language: window.navigator.language,
        browser_platform: window.navigator.platform,
        browser_name: window.navigator.appCodeName,
        browser_version: window.navigator.appVersion,
      };
    });
    return info;
  }
  async sign(link) {
    // generate valid verifyFp
    let verify_fp = Utils.generateVerifyFp();
    let newUrl = link + "&verifyFp=" + verify_fp;
    let token = await this.page.evaluate(`generateSignature("${newUrl}")`);
    let signed_url = newUrl + "&_signature=" + token;
    let queryString = new URL(signed_url).searchParams.toString();
    let bogus = await this.page.evaluate(`generateBogus("${queryString}")`);
    signed_url += "&X-Bogus=" + bogus;


    return {
      signature: token,
      verify_fp: verify_fp,
      signed_url: signed_url,
      "x-tt-params": this.xttparams(queryString),
      "x-bogus": bogus,
    };
  }

  xttparams(query_str) {
    query_str += "&is_encryption=1";

    // Encrypt query string using aes-128-cbc
    const cipher = createCipheriv("aes-128-cbc", this.password, this.password);
    return Buffer.concat([cipher.update(query_str), cipher.final()]).toString(
      "base64"
    );
  }

  async close() {
    if (this.browser && !this.isExternalBrowser) {
      await this.browser.close();
      this.browser = null;
    }
    if (this.page) {
      this.page = null;
    }
  }
}

module.exports = Signer;
