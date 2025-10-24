const puppeteer = require('puppeteer');

async function scrapeWithPuppeteer(url) {
    let browser;
    
    try {
        console.log(`🚀 Launching browser for: ${url}\n`);
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new', // Use new headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Navigate to URL
        console.log('⏳ Loading page...');
        await page.goto(url, {
            waitUntil: 'networkidle2', // Wait until network is idle
            timeout: 30000
        });
        
        console.log('✅ Page loaded, extracting content...\n');
        
        // Extract content
        const data = await page.evaluate(() => {
            // Remove unwanted elements
            const unwantedSelectors = [
                'script', 'style', 'nav', 'footer', 
                'header', 'aside', '.ad', '.advertisement',
                'iframe', 'noscript'
            ];
            
            unwantedSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => el.remove());
            });
            
            // Get title
            const title = document.title || 
                         document.querySelector('h1')?.innerText || 
                         'No title found';
            
            // Get meta description
            const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
            
            // Get main content
            let mainContent = '';
            const contentSelectors = [
                'article', 'main', '[role="main"]',
                '.post-content', '.article-content', 
                '.entry-content', '#content', '.content'
            ];
            
            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    mainContent = element.innerText;
                    break;
                }
            }
            
            // Fallback to body
            if (!mainContent) {
                mainContent = document.body.innerText;
            }
            
            // Get all paragraphs
            const paragraphs = Array.from(document.querySelectorAll('p'))
                .map(p => p.innerText.trim())
                .filter(text => text.length > 50);
            
            // Get all headings
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                .map(h => ({
                    level: h.tagName,
                    text: h.innerText.trim()
                }))
                .filter(h => h.text.length > 0);
            
            return {
                title,
                metaDescription,
                mainContent: mainContent.replace(/\s+/g, ' ').trim(),
                paragraphs: paragraphs.slice(0, 15),
                headings: headings.slice(0, 10),
                bodyText: document.body.innerText.substring(0, 10000)
            };
        });
        
        await browser.close();
        
        return {
            success: true,
            url: url,
            ...data,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        if (browser) {
            await browser.close();
        }
        
        return {
            success: false,
            url: url,
            error: error.message
        };
    }
}

// Test it
const testUrl = process.argv[2] || 'https://example.com';

scrapeWithPuppeteer(testUrl).then(result => {
    console.log('📊 PUPPETEER RESULTS:');
    console.log('='.repeat(60));
    
    if (result.success) {
        console.log(`✅ Success!`);
        console.log(`📰 Title: ${result.title}`);
        console.log(`📝 Meta: ${result.metaDescription}`);
        console.log(`📏 Content Length: ${result.mainContent.length} characters`);
        
        console.log(`\n🔤 Headings Found:`);
        result.headings.forEach(h => {
            console.log(`  ${h.level}: ${h.text}`);
        });
        
        console.log(`\n📄 First 600 characters:`);
        console.log('-'.repeat(60));
        console.log(result.mainContent.substring(0, 600));
        console.log('-'.repeat(60));
        
        console.log(`\n📋 First 3 paragraphs:`);
        result.paragraphs.slice(0, 3).forEach((p, i) => {
            console.log(`\n${i + 1}. ${p.substring(0, 200)}...`);
        });
    } else {
        console.log(`❌ Error: ${result.error}`);
    }
});

module.exports = { scrapeWithPuppeteer };