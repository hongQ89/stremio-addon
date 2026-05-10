const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.freepornmovies.net';

const builder = new addonBuilder(require('./manifest.json'));

// 1. Catalog Handler
builder.defineCatalogHandler(async (args) => {
    if (args.id === 'fpm_latest') {
        const metas = [];
        const seenIds = new Set();
        const skip = parseInt(args.extra.skip) || 0;
        
        // Agar Stremio lancar scroll, kita ambil 4 halaman sekaligus (~96 video)
        // Ini memberikan "buffer" yang cukup untuk memicu auto-load halaman berikutnya
        const startPage = Math.floor(skip / 24) + 1;

        try {
            const fetchPage = async (pageNo) => {
                let url;
                if (args.extra && args.extra.search) {
                    url = `${BASE_URL}/search/?q=${encodeURIComponent(args.extra.search)}&from=${(pageNo - 1) * 24 + 1}`;
                } else {
                    url = pageNo === 1 ? `${BASE_URL}/latest-updates/` : `${BASE_URL}/latest-updates/${pageNo}/`;
                }

                const response = await axios.get(url, { 
                    timeout: 8000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
                const $ = cheerio.load(response.data);
                
                $('.list-videos .item').each((j, el) => {
                    const title = $(el).find('.title').text().trim();
                    let link = $(el).find('a').attr('href');
                    const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src');
                    
                    if (link && link.includes('/videos/')) {
                        // Bersihkan link agar konsisten
                        const videoIdMatch = link.match(/\/videos\/([^\/]+)/);
                        if (videoIdMatch) {
                            const videoId = videoIdMatch[1];
                            const fullId = `fpm_${videoId}`;

                            if (!seenIds.has(fullId) && title) {
                                seenIds.add(fullId);
                                metas.push({
                                    id: fullId,
                                    type: 'movie',
                                    name: title,
                                    poster: thumb,
                                    background: thumb,
                                });
                            }
                        }
                    }
                });
            };

            // Ambil 4 halaman berurutan (paralel agar cepat)
            const pagesToFetch = [startPage, startPage + 1, startPage + 2, startPage + 3];
            await Promise.all(pagesToFetch.map(p => fetchPage(p).catch(() => {})));

            return { metas };
        } catch (e) {
            console.error('Catalog Error:', e.message);
            return { metas: [] };
        }
    }
    return { metas: [] };
});

// 2. Stream Handler
builder.defineStreamHandler(async (args) => {
    if (args.id.startsWith('fpm_')) {
        const id = args.id.replace('fpm_', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;

        try {
            // Step 1: Get Video Page to find Embed URL
            const videoPage = await axios.get(videoUrl);
            const $ = cheerio.load(videoPage.data);
            
            // Look for embedUrl in JSON-LD or script
            let embedUrl = $('script[type="application/ld+json"]').html();
            if (embedUrl) {
                const json = JSON.parse(embedUrl);
                embedUrl = json.embedUrl;
            }

            if (!embedUrl) {
                // Fallback: use default embed pattern
                const objectId = videoPage.data.match(/videoId: '(\d+)'/);
                if (objectId) embedUrl = `${BASE_URL}/embed/${objectId[1]}`;
            }

            if (embedUrl) {
                // Step 2: Get Embed Page to find MP4 source
                const embedPage = await axios.get(embedUrl);
                
                // Extract video source using regex from flashvars
                const sources = [];
                const regex480 = /video_alt_url:\s*'([^']+)'/;
                const match480 = embedPage.data.match(regex480);
                
                if (match480) {
                    sources.push({
                        title: '480p',
                        url: match480[1]
                    });
                }

                // Add more logic here to find 720p/1080p if available in the same way
                
                return { streams: sources };
            }

        } catch (e) {
            console.error(e);
        }
    }
    return { streams: [] };
});

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon started on port ${PORT}`);
console.log(`Manifest: http://localhost:${PORT}/manifest.json`);
