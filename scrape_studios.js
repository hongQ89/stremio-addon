const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeStudios() {
    try {
        const studios = [];
        const gayKeywords = ['gay', 'male', 'boy', 'man', 'men', 'trans', 'shemale', 'hotguys', 'guysfuck'];
        
        for (let page = 1; page <= 30; page++) {
            console.log(`Scraping page ${page}...`);
            const url = page === 1 ? 'https://www.freepornmovies.net/sites/' : `https://www.freepornmovies.net/sites/${page}/`;
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(response.data);

            $('.headline').each((i, el) => {
                const name = $(el).find('h2').text().trim();
                const link = $(el).find('a.more').attr('href');
                const videoCountText = $(el).find('a.more span').text().trim();
                const videoCount = parseInt(videoCountText.replace(/[^0-9]/g, '')) || 0;
                
                if (link && link.includes('/sites/')) {
                    const slugMatch = link.match(/\/sites\/([^\/]+)/);
                    if (slugMatch) {
                        const slug = slugMatch[1];
                        const isGay = gayKeywords.some(kw => 
                            name.toLowerCase().includes(kw) || slug.toLowerCase().includes(kw)
                        );
                        if (!isGay && videoCount >= 80) { // Threshold of 80 videos for "banyak"
                            studios.push({ name, slug, videoCount });
                        }
                    }
                }
            });
        }

        // Unique by slug
        const uniqueStudios = [];
        const seen = new Set();
        for (const s of studios) {
            if (!seen.has(s.slug)) {
                seen.add(s.slug);
                uniqueStudios.push(s);
            }
        }

        // Sort by video count descending
        uniqueStudios.sort((a, b) => b.videoCount - a.videoCount);

        fs.writeFileSync('validated_studios.json', JSON.stringify(uniqueStudios, null, 2));
        console.log(`Successfully validated ${uniqueStudios.length} studios.`);
    } catch (e) {
        console.error('Scrape Error:', e.message);
    }
}

scrapeStudios();
