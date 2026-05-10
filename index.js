const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.freepornmovies.net';

const builder = new addonBuilder(require('./manifest.json'));

// 1. Catalog Handler
builder.defineCatalogHandler(async (args) => {
    const metas = [];
    const skip = parseInt(args.extra.skip) || 0;
    
    try {
        let url;
        let isSpecialCatalog = false;
        let itemsPerPage = 24;

        // Routing & Pagination Logic
        if (args.id === 'fpm_latest') {
            if (args.extra && args.extra.search) {
                url = `${BASE_URL}/search/?q=${encodeURIComponent(args.extra.search)}`;
            } else {
                const pageNo = Math.floor(skip / 24) + 1;
                url = pageNo === 1 ? `${BASE_URL}/latest-updates/` : `${BASE_URL}/latest-updates/${pageNo}/`;
            }
        } else if (args.id === 'fpm_top_rated') {
            const pageNo = Math.floor(skip / 24) + 1;
            url = pageNo === 1 ? `${BASE_URL}/top-rated/` : `${BASE_URL}/top-rated/${pageNo}/`;
        } else if (args.id === 'fpm_most_viewed') {
            const pageNo = Math.floor(skip / 24) + 1;
            url = pageNo === 1 ? `${BASE_URL}/most-popular/` : `${BASE_URL}/most-popular/${pageNo}/`;
        } else if (args.id === 'fpm_categories') {
            // Categories punya banyak item (~359), tapi sepertinya tidak dipaginate per 24. 
            // Namun kita tetap dukung skip jika website mendukung /categories/2/
            const pageNo = Math.floor(skip / 24) + 1;
            url = pageNo === 1 ? `${BASE_URL}/categories/` : `${BASE_URL}/categories/${pageNo}/`;
            isSpecialCatalog = true;
        } else if (args.id === 'fpm_pornstars') {
            const pageNo = Math.floor(skip / 24) + 1;
            url = pageNo === 1 ? `${BASE_URL}/models/` : `${BASE_URL}/models/${pageNo}/`;
            isSpecialCatalog = true;
        } else if (args.id === 'fpm_porn_sites') {
            const pageNo = Math.floor(skip / 24) + 1;
            url = pageNo === 1 ? `${BASE_URL}/sites/` : `${BASE_URL}/sites/${pageNo}/`;
            isSpecialCatalog = true;
        }

        if (!url) return { metas: [] };

        const response = await axios.get(url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);

        if (isSpecialCatalog) {
            // Parsing untuk daftar Kategori/Bintang/Situs
            const items = $('.list-categories .item, .list-models .item, .list-sponsors .item, .list-sponsors .headline');
            
            items.each((i, el) => {
                let title = $(el).find('.title, strong, h2').text().trim();
                let thumb = $(el).find('img').attr('data-original') || $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
                let link = $(el).find('a').attr('href') || $(el).attr('href');

                // Khusus untuk Sites/Studios yang tidak punya gambar langsung di list
                if (args.id === 'fpm_porn_sites' && !thumb) {
                    thumb = 'https://www.freepornmovies.net/img/logo.dark.svg'; // Placeholder logo
                }

                if (title && link) {
                    metas.push({
                        id: `fpm_browse_${args.id}_${i}_${skip}`,
                        type: 'movie',
                        name: title,
                        poster: thumb,
                        description: `Browse videos from ${title}`
                    });
                }
            });
        } else {
            $('.list-videos .item').each((j, el) => {
                const title = $(el).find('.title').text().trim();
                let link = $(el).find('a').attr('href');
                const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src');
                
                if (link && link.includes('/videos/')) {
                    const videoIdMatch = link.match(/\/videos\/([^\/]+)/);
                    if (videoIdMatch) {
                        metas.push({
                            id: `fpm_${videoIdMatch[1]}`,
                            type: 'movie',
                            name: title,
                            poster: thumb,
                            background: thumb,
                        });
                    }
                }
            });
        }

        return { metas };
    } catch (e) {
        console.error('Catalog Error:', e.message);
        return { metas: [] };
    }
});

// 2. Meta Handler
builder.defineMetaHandler(async (args) => {
    if (args.id.startsWith('fpm_') && !args.id.includes('_browse_')) {
        const id = args.id.replace('fpm_', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;

        try {
            const response = await axios.get(videoUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(response.data);
            
            const title = $('.headline h1').text().trim() || $('meta[property="og:title"]').attr('content');
            const thumb = $('meta[property="og:image"]').attr('content');
            const description = $('meta[property="og:description"]').attr('content') || 'Watch high quality video on FreePornMovies';
            
            // Ambil genre/tags
            const genres = [];
            $('.models__item span').each((i, el) => genres.push($(el).text().trim()));

            return {
                meta: {
                    id: args.id,
                    type: 'movie',
                    name: title,
                    poster: thumb,
                    background: thumb,
                    description: description,
                    genres: genres
                }
            };
        } catch (e) {
            console.error('Meta Error:', e.message);
        }
    }
    
    // Fallback minimal agar tidak error jika diklik
    return {
        meta: {
            id: args.id,
            type: 'movie',
            name: 'Video Detail',
            description: 'Loading details...'
        }
    };
});

// 3. Stream Handler
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
