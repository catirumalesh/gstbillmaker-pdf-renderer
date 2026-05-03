// GST Bill Maker — Puppeteer PDF Renderer
// Vercel serverless function. Receives invoice HTML, returns vector PDF
// rendered by real headless Chromium. Output identical to browser print.

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
	// ===== CORS =====
	// Allow your WordPress site to call this endpoint from the browser.
	const allowOrigin = process.env.ALLOW_ORIGIN || '*';
	res.setHeader('Access-Control-Allow-Origin', allowOrigin);
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
	res.setHeader('Access-Control-Max-Age', '86400');

	if (req.method === 'OPTIONS') {
		return res.status(204).end();
	}
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed. Use POST.' });
	}

	// ===== Auth =====
	// Shared-secret token. Set SHARED_TOKEN as an Environment Variable in Vercel.
	const expected = process.env.SHARED_TOKEN;
	const provided = req.headers['x-auth-token'];
	if (expected && provided !== expected) {
		return res.status(401).json({ error: 'Unauthorized — bad or missing X-Auth-Token header.' });
	}

	// ===== Parse body =====
	const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
	const html = body.html;
	const filename = body.filename || 'invoice.pdf';
	const pageOptions = body.options || {};

	if (!html || typeof html !== 'string') {
		return res.status(400).json({ error: 'Body must contain `html` string.' });
	}

	// ===== Render =====
	let browser;
	try {
		browser = await puppeteer.launch({
			args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
			defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 }, // A4 @ 96 DPI
			executablePath: await chromium.executablePath(),
			headless: chromium.headless,
		});

		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: 'networkidle0', timeout: 9000 });

		// Use print media so any @media print CSS rules apply (matches browser print)
		await page.emulateMediaType('print');

		const pdfBuffer = await page.pdf({
			format: pageOptions.format || 'A4',
			printBackground: true,
			margin: pageOptions.margin || { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
			preferCSSPageSize: pageOptions.preferCSSPageSize !== false,
			displayHeaderFooter: false,
		});

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
		res.setHeader('Cache-Control', 'no-store');
		return res.status(200).send(Buffer.from(pdfBuffer));

	} catch (err) {
		console.error('PDF render error:', err);
		return res.status(500).json({ error: err.message || 'Render failed', stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
	} finally {
		if (browser) {
			try { await browser.close(); } catch (e) { /* ignore */ }
		}
	}
};
