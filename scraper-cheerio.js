const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWithCheerio(url) {
    try {
        console.log(`🔍 Scraping: ${url}\n`);
        
        // Fetch the HTML
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        // Load HTML into cheerio
        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();
        
        // Extract title
        const title = $('title').text().trim() || $('h1').first().text().trim();
        
        // Extract main content (try multiple selectors)
        let content = '';
        const contentSelectors = [
            'article',
            'main',
            '[role="main"]',
            '.post-content',
            '.article-content',
            '.entry-content',
            '#content',
            '.content'
        ];
        
        for (const selector of contentSelectors) {
            if ($(selector).length > 0) {
                content = $(selector).first().text();
                break;
            }
        }
        
        // Fallback to body if no main content found
        if (!content) {
            content = $('body').text();
        }
        
        // Clean up whitespace
        content = content
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();
        
        // Extract meta description
        const description = $('meta[name="description"]').attr('content') || '';
        
        // Extract all paragraphs (alternative approach)
        const paragraphs = [];
        $('p').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 50) { // Only meaningful paragraphs
                paragraphs.push(text);
            }
        });
        
        return {
            success: true,
            url: url,
            title: title,
            description: description,
            content: content.substring(0, 5000), // First 5000 chars
            paragraphs: paragraphs.slice(0, 10), // First 10 paragraphs
            contentLength: content.length,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            success: false,
            url: url,
            error: error.message,
            errorType: error.code || 'UNKNOWN'
        };
    }
}

// Test it
const testUrl = process.argv[2] || 'https://en.wikipedia.org/wiki/Web_scraping';

scrapeWithCheerio(testUrl).then(result => {
    console.log('📊 RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${result.success}`);
    
    if (result.success) {
        console.log(`📰 Title: ${result.title}`);
        console.log(`📝 Description: ${result.description}`);
        console.log(`📏 Content Length: ${result.contentLength} characters`);
        console.log(`\n📄 First 500 characters of content:`);
        console.log('-'.repeat(60));
        console.log(result.content.substring(0, 500));
        console.log('-'.repeat(60));
        console.log(`\n📋 First 3 paragraphs:`);
        result.paragraphs.slice(0, 3).forEach((p, i) => {
            console.log(`\n${i + 1}. ${p.substring(0, 200)}...`);
        });
    } else {
        console.log(`❌ Error: ${result.error}`);
    }
});

module.exports = { scrapeWithCheerio };