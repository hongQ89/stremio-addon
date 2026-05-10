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
            const pageNo = Math.floor(skip / 24) + 1;
            url = pageNo === 1 ? `${BASE_URL}/categories/` : `${BASE_URL}/categories/${pageNo}/`;
            isSpecialCatalog = true;
        } else if (args.id.startsWith('fpm_studio_')) {
            const slug = args.id.replace('fpm_studio_', '');
            const pageNo = Math.floor(skip / 24) + 1;
            url = pageNo === 1 ? `${BASE_URL}/sites/${slug}/` : `${BASE_URL}/sites/${slug}/latest-updates/${pageNo}/`;
        }

        if (!url) return { metas: [] };

        const response = await axios.get(url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);

        if (isSpecialCatalog) {
            // Parsing untuk daftar Kategori
            $('.list-categories .item').each((i, el) => {
                let title = $(el).find('.title, strong').text().trim();
                let thumb = $(el).find('img').attr('data-original') || $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
                let link = $(el).find('a').attr('href') || $(el).attr('href');

                if (title && link) {
                    metas.push({
                        id: `fpm_browse_${args.id}_${i}_${skip}`,
                        type: 'movie',
                        name: title,
                        poster: thumb,
                        description: `Browse ${title}`
                    });
                }
            });
        } else {
            // Parsing standar untuk daftar Video (Latest, Top, atau Studio)
            $('.list-videos .item').each((j, el) => {
                const title = $(el).find('.title').text().trim();
                let link = $(el).find('a').attr('href');
                const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src') || $(el).find('img').attr('data-original');
                
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
            const response = await axios.get(videoUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
            });
            const html = response.data;
            const streams = [];

            const fileMatches = html.match(/https:\/\/www\.freepornmovies\.net\/get_file\/[^\s"']+/g) || [];
            
            const qualities = [
                { label: '4K/2160p', key: '_2160m.mp4' },
                { label: '720p', key: '_720m.mp4' },
                { label: '480p', key: '_480m.mp4' }
            ];

            const seenQualities = new Set();

            for (const q of qualities) {
                const link = fileMatches.find(l => l.includes(q.key));
                
                if (link && !seenQualities.has(q.label)) {
                    seenQualities.add(q.label);
                    
                    try {
                        const cleanLink = link.replace(/[",]$/, ''); 
                        const res = await axios.get(cleanLink, {
                            maxRedirects: 0,
                            validateStatus: null,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Referer': videoUrl
                            }
                        });

                        const finalUrl = res.headers.location || cleanLink;

                        streams.push({
                            title: `FPM - ${q.label}`,
                            url: finalUrl,
                            behaviorHints: {
                                notSearchable: true,
                                proxyHeaders: {
                                    "request": {
                                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                        "Referer": videoUrl
                                    }
                                }
                            }
                        });
                    } catch (err) {
                        console.error(`Failed to resolve ${q.label}:`, err.message);
                    }
                }
            }
            
            return { streams };
        } catch (e) {
            console.error('Stream Error:', e.message);
        }
    }
    return { streams: [] };
});

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon started on port ${PORT}`);
console.log(`Manifest: http://localhost:${PORT}/manifest.json`);
