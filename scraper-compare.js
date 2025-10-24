const { scrapeWithCheerio } = require('./scraper-cheerio');
const { scrapeWithPuppeteer } = require('./scraper-puppeteer');
const { scrapeWithReadability } = require('./scraper-readability');

async function compareScrapers(url) {
    console.log(`\n🔬 TESTING ALL SCRAPERS ON: ${url}\n`);
    console.log('='.repeat(80));
    
    const results = {};
    
    // Test Cheerio
    console.log('\n1️⃣  Testing Cheerio (Fast & Lightweight)...\n');
    const start1 = Date.now();
    results.cheerio = await scrapeWithCheerio(url);
    results.cheerio.executionTime = Date.now() - start1;
    
    console.log(`\n✅ Cheerio completed in ${results.cheerio.executionTime}ms`);
    console.log(`   Content extracted: ${results.cheerio.success ? results.cheerio.contentLength + ' chars' : 'FAILED'}`);
    
    // Test Readability
    console.log('\n2️⃣  Testing Readability (Best for Articles)...\n');
    const start2 = Date.now();
    results.readability = await scrapeWithReadability(url);
    results.readability.executionTime = Date.now() - start2;
    
    console.log(`\n✅ Readability completed in ${results.readability.executionTime}ms`);
    console.log(`   Content extracted: ${results.readability.success ? results.readability.length + ' words' : 'FAILED'}`);
    
    // Test Puppeteer
    console.log('\n3️⃣  Testing Puppeteer (JavaScript Support)...\n');
    const start3 = Date.now();
    results.puppeteer = await scrapeWithPuppeteer(url);
    results.puppeteer.executionTime = Date.now() - start3;
    
    console.log(`\n✅ Puppeteer completed in ${results.puppeteer.executionTime}ms`);
    console.log(`   Content extracted: ${results.puppeteer.success ? results.puppeteer.mainContent.length + ' chars' : 'FAILED'}`);
    
    // Summary
    console.log('\n\n📊 COMPARISON SUMMARY:');
    console.log('='.repeat(80));
    console.log(`
    Method       | Success | Speed         | Content Length | Best For
    -------------|---------|---------------|----------------|------------------
    Cheerio      | ${results.cheerio.success ? '✅' : '❌'}     | ${results.cheerio.executionTime}ms        | ${results.cheerio.success ? results.cheerio.contentLength : 'N/A'}           | Static sites
    Readability  | ${results.readability.success ? '✅' : '❌'}     | ${results.readability.executionTime}ms       | ${results.readability.success ? results.readability.length + ' words' : 'N/A'}    | News/Blogs
    Puppeteer    | ${results.puppeteer.success ? '✅' : '❌'}     | ${results.puppeteer.executionTime}ms      | ${results.puppeteer.success ? results.puppeteer.mainContent.length : 'N/A'}           | JS-heavy sites
    `);
    
    // Recommendation
    console.log('\n💡 RECOMMENDATION:');
    if (results.readability.success) {
        console.log('   → Use Readability for clean article extraction');
    } else if (results.cheerio.success) {
        console.log('   → Use Cheerio for fast, lightweight scraping');
    } else if (results.puppeteer.success) {
        console.log('   → Use Puppeteer (site requires JavaScript)');
    } else {
        console.log('   → Try ScraperAPI or a different approach');
    }
    
    return results;
}

// Test it
const testUrl = process.argv[2] || 'https://techcrunch.com';
compareScrapers(testUrl);