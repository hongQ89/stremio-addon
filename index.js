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

        try {
            let url;
            if (args.extra && args.extra.search) {
                // Search Mode
                url = `${BASE_URL}/search/?q=${encodeURIComponent(args.extra.search)}`;
            } else {
                // Home Mode with Pagination
                const skip = args.extra.skip || 0;
                const page = Math.floor(skip / 24) + 1;
                url = page === 1 ? `${BASE_URL}/latest-updates/` : `${BASE_URL}/latest-updates/${page}/`;
            }

            const response = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(response.data);
            
            // Gunakan selector yang lebih spesifik untuk daftar utama
            // Di halaman utama/kategori: #list_videos_latest_videos_list_items
            // Di halaman search: .list-videos
            const selector = args.extra.search ? '.list-videos .item' : '#list_videos_latest_videos_list_items .item, .list-videos .item';

            $(selector).each((j, el) => {
                const title = $(el).find('.title').text().trim();
                const link = $(el).find('a').attr('href');
                const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src');
                
                if (link && link.includes('/videos/')) {
                    const videoId = link.split('/videos/')[1].split('/')[0];
                    const fullId = `fpm_${videoId}`;

                    // HANYA tambahkan jika ID belum pernah terlihat (mencegah stuck karena duplikat)
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
            });

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
