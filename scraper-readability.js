const axios = require('axios');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

async function scrapeWithReadability(url) {
    try {
        console.log(`📖 Fetching article from: ${url}\n`);
        
        // Fetch HTML
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Parse with JSDOM
        const dom = new JSDOM(response.data, { url: url });
        
        // Use Readability to extract article
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        
        if (!article) {
            return {
                success: false,
                url: url,
                error: 'Could not extract article content'
            };
        }
        
        // Strip HTML tags from content
        const textContent = article.textContent
            .replace(/\s+/g, ' ')
            .trim();
        
        return {
            success: true,
            url: url,
            title: article.title,
            byline: article.byline || 'Unknown author',
            excerpt: article.excerpt,
            content: textContent,
            htmlContent: article.content,
            length: article.length,
            readingTime: Math.ceil(article.length / 1000), // Rough estimate in minutes
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            success: false,
            url: url,
            error: error.message
        };
    }
}

// Test it
const testUrl = process.argv[2] || 'https://medium.com/@example/some-article';

scrapeWithReadability(testUrl).then(result => {
    console.log('📊 READABILITY RESULTS:');
    console.log('='.repeat(60));
    
    if (result.success) {
        console.log(`✅ Article extracted successfully!`);
        console.log(`📰 Title: ${result.title}`);
        console.log(`✍️  Author: ${result.byline}`);
        console.log(`📏 Word Count: ${result.length} words`);
        console.log(`⏱️  Reading Time: ~${result.readingTime} minutes`);
        console.log(`\n📝 Excerpt:`);
        console.log(result.excerpt);
        console.log(`\n📄 Content Preview (first 800 characters):`);
        console.log('-'.repeat(60));
        console.log(result.content.substring(0, 800));
        console.log('-'.repeat(60));
    } else {
        console.log(`❌ Error: ${result.error}`);
    }
});

module.exports = { scrapeWithReadability };