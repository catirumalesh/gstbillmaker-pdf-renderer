const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const CHROMIUM_TAR_URL = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.x64.tar';

module.exports = async (req, res) => {
	  const allowOrigin = process.env.ALLOW_ORIGIN || '*';
	  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
	  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
	  res.setHeader('Access-Control-Max-Age', '86400');

	  if (req.method === 'OPTIONS') return res.status(204).end();
	  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

	  const expected = process.env.SHARED_TOKEN;
	  const provided = req.headers['x-auth-token'];
	  if (expected && provided !== expected) return res.status(401).json({ error: 'Unauthorized' });

	  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
	  const html = body.html;
	  const filename = body.filename || 'invoice.pdf';
	  const opts = body.options || {};
	  if (!html) return res.status(400).json({ error: 'Body must contain html string.' });

	  let browser;
	  try {
		      browser = await puppeteer.launch({
				        args: [...chromium.args, '--hide-scrollbars'],
				        defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
				        executablePath: await chromium.executablePath(CHROMIUM_TAR_URL),
				        headless: chromium.headless,
			  });
		      const page = await browser.newPage();
		      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 9000 });
		      await page.emulateMediaType('print');
		      const pdfBuffer = await page.pdf({
				        format: opts.format || 'A4',
				        printBackground: true,
				        margin: opts.margin || { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
				        preferCSSPageSize: opts.preferCSSPageSize !== false,
				        displayHeaderFooter: false,
			  });
		      res.setHeader('Content-Type', 'application/pdf');
		      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
		      res.setHeader('Cache-Control', 'no-store');
		      return res.status(200).send(Buffer.from(pdfBuffer));
	  } catch (err) {
		      console.error('PDF render error:', err);
		      return res.status(500).json({ error: err.message || 'Render failed' });
	  } finally {
		      if (browser) { try { await browser.close(); } catch (e) {} }
	  }
};
