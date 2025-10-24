const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================
// SCRAPER 1: CHEERIO
// ============================================
async function scrapeWithCheerio(url) {
    const startTime = Date.now();
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();
        
        const title = $('title').text().trim() || $('h1').first().text().trim();
        const description = $('meta[name="description"]').attr('content') || '';
        
        // Try multiple content selectors
        let content = '';
        const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
        for (const selector of selectors) {
            if ($(selector).length > 0) {
                content = $(selector).first().text();
                break;
            }
        }
        
        if (!content) content = $('body').text();
        content = content.replace(/\s+/g, ' ').trim();
        
        const paragraphs = [];
        $('p').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 50) paragraphs.push(text);
        });
        
        return {
            success: true,
            method: 'Cheerio',
            executionTime: Date.now() - startTime,
            data: {
                title,
                description,
                content: content, // FULL CONTENT - no substring
                contentLength: content.length,
                paragraphCount: paragraphs.length,
                paragraphs: paragraphs // ALL PARAGRAPHS
            }
        };
    } catch (error) {
        return {
            success: false,
            method: 'Cheerio',
            executionTime: Date.now() - startTime,
            error: error.message
        };
    }
}

// ============================================
// SCRAPER 2: READABILITY
// ============================================
async function scrapeWithReadability(url) {
    const startTime = Date.now();
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        const dom = new JSDOM(response.data, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        
        if (!article) {
            return {
                success: false,
                method: 'Readability',
                executionTime: Date.now() - startTime,
                error: 'Could not parse article'
            };
        }
        
        const textContent = article.textContent.replace(/\s+/g, ' ').trim();
        
        return {
            success: true,
            method: 'Readability',
            executionTime: Date.now() - startTime,
            data: {
                title: article.title,
                byline: article.byline || 'Unknown',
                excerpt: article.excerpt,
                content: textContent, // FULL CONTENT
                htmlContent: article.content, // Also include HTML version
                contentLength: textContent.length,
                wordCount: article.length,
                readingTime: Math.ceil(article.length / 200)
            }
        };
    } catch (error) {
        return {
            success: false,
            method: 'Readability',
            executionTime: Date.now() - startTime,
            error: error.message
        };
    }
}

// ============================================
// SCRAPER 3: PUPPETEER
// ============================================
async function scrapeWithPuppeteer(url) {
    const startTime = Date.now();
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        const data = await page.evaluate(() => {
            const unwanted = ['script', 'style', 'nav', 'footer', 'header', 'aside', '.ad'];
            unwanted.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => el.remove());
            });
            
            const title = document.title || document.querySelector('h1')?.innerText || '';
            const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
            
            let mainContent = '';
            const selectors = ['article', 'main', '[role="main"]', '.content'];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) {
                    mainContent = el.innerText;
                    break;
                }
            }
            if (!mainContent) mainContent = document.body.innerText;
            
            const paragraphs = Array.from(document.querySelectorAll('p'))
                .map(p => p.innerText.trim())
                .filter(t => t.length > 50);
            
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                .map(h => ({ level: h.tagName, text: h.innerText.trim() }))
                .filter(h => h.text.length > 0);
            
            return {
                title,
                metaDesc,
                mainContent: mainContent.replace(/\s+/g, ' ').trim(),
                paragraphs: paragraphs, // ALL PARAGRAPHS
                headings: headings // ALL HEADINGS
            };
        });
        
        await browser.close();
        
        return {
            success: true,
            method: 'Puppeteer',
            executionTime: Date.now() - startTime,
            data: {
                title: data.title,
                description: data.metaDesc,
                content: data.mainContent, // FULL CONTENT
                contentLength: data.mainContent.length,
                paragraphs: data.paragraphs,
                headings: data.headings
            }
        };
    } catch (error) {
        if (browser) await browser.close();
        return {
            success: false,
            method: 'Puppeteer',
            executionTime: Date.now() - startTime,
            error: error.message
        };
    }
}

// ============================================
// API ENDPOINTS
// ============================================

app.post('/api/scrape/:method', async (req, res) => {
    const { method } = req.params;
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    let result;
    
    switch (method) {
        case 'cheerio':
            result = await scrapeWithCheerio(url);
            break;
        case 'readability':
            result = await scrapeWithReadability(url);
            break;
        case 'puppeteer':
            result = await scrapeWithPuppeteer(url);
            break;
        default:
            return res.status(400).json({ error: 'Invalid method' });
    }
    
    res.json(result);
});

app.post('/api/scrape-all', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`\n🔍 Scraping: ${url}`);
    
    const results = await Promise.allSettled([
        scrapeWithCheerio(url),
        scrapeWithReadability(url),
        scrapeWithPuppeteer(url)
    ]);
    
    res.json({
        url,
        timestamp: new Date().toISOString(),
        results: {
            cheerio: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason.message },
            readability: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason.message },
            puppeteer: results[2].status === 'fulfilled' ? results[2].value : { success: false, error: results[2].reason.message }
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Scraper API is running' });
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🚀 Web Scraper Testing Server                      ║
║                                                           ║
║       Server running on: http://localhost:${PORT}        ║
║       Open in browser to test!                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});