import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.freepornmovies.net';
const UA_LONG = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_SHORT = 'Mozilla/5.0';

const manifest = {"id":"org.stremio.freepornmovies","version":"1.10.0","name":"Free Porn Movies","description":"Clean Scraper for FreePornMovies.net","resources":["catalog","stream","meta"],"types":["movie"],"catalogs":[{"id":"fpm_latest","name":"Latest","type":"movie","extra":[{"name":"genre","options":["Anytime","Last 3 days","This week","This month","Last 3 months","Last 6 months"]},{"name":"skip"}]},{"id":"fpm_trending","name":"Trending","type":"movie","extra":[{"name":"genre","options":["Today","This Week","This Month","All Time"]},{"name":"skip"}]},{"id":"fpm_top_rated","name":"Top Rated","type":"movie","extra":[{"name":"genre","options":["This Week","All Time","This Month","Today"]},{"name":"skip"}]},{"id":"fpm_most_viewed","name":"Most Popular","type":"movie","extra":[{"name":"genre","options":["All Time","This Month","This Week","Today"]},{"name":"skip"}]},{"id":"fpm_categories","name":"Categories","type":"movie","extra":[{"name":"genre","isRequired":true,"options":["Amateur","Asian","Babe","Bdsm","Big Ass","Big Tits","Bisexual","Blonde","Blowjob","Bondage","Brunette","Casting","Creampie","Cumshot","Deepthroat","Ebony","Fetish","Fingering","Fisting","Gangbang","Group Sex","Hairy Pussy","Handjob","Interracial","Latina","Lesbian","Long Hair","Masturbation","Mature","Milf","Orgy","Outdoor","Pov","Public","Redhead","Russian","Shemale","Small Tits","Squirt","Stockings","Threesome","Vintage"]},{"name":"skip"}]},{"id":"fpm_studios","name":"Studios","type":"movie","extra":[{"name":"genre","isRequired":true,"options":["Brazzers","Digital Playground","Mofos","Twistys","Babes","Fake Hub","Public Agent","Property Sex","Fake Taxi","Vixen","Tushy","Blacked","Deeper","Slayed","Tushy Raw","Blacked Raw","Pure Taboo","Girlsway","Burning Angel","21Naturals","21Sextury","Fantasy Massage","TransAngels","Evil Angel","Bang Bros","BangBus","Pawg","Ass Traffic","Big Mouthfuls","Elegant Angel","New Sensations","Girlfriends Films","Sweet Sinner","Zero Tolerance","Devil's Film","Penthouse","Dogfart Network","Mylf","Cherry Poptart","Team Skeet","Dane Jones","Naughty America","Reality Kings","SexArt","RK Prime","HentaiPros","MET ART","Tiny 4K","Oldje","Wow Girls","Private","Nubile Films","Passion HD","HardX","Dorcel Club","BLACKED","Family Therapy","Blacks on Blondes","Exxxtra Small","Perv Mom","Lesbea","Sinful XXX","Wake up n Fuck","Bratty Sis","Elegant Raw","TUSHY RAW","Grandmams","Monsters of Cock","Brown Bunnies","Teens Love Huge Cocks","Dad Crush","MYLF X Series","Lubed","We Live Together","Fake Hostel","DarkX","BangBros 18","Holed","Glory Hole","Casting Couch - X","Teen Pies","My Family Pies","Fitness Rooms","Spy Fam","Tonight’s Girlfriend","Mom Is Horny","Mom Comes First","Daughter Swap","Pinko Tgirls","LesbianX","Latina GirlX","Anal Mom","Beauty and the Senior","Futanari XXX","Moms Bang Teens","Mom Swap","Shoplyfter","Moms Lick Teens","Lets Try Anal","Slayed","Modern Day Sins","intimatePOV","Petite POV","Caught Fapping","POV Dreams","Bratty MILF","Milfty","Got Mylf","Lil Humpers","Parasited","Crazy College GFs","ZeroTolerance","Hot TS","Caprice Divas","Look At Her Now"]},{"name":"skip"}]}]};

async function handleCatalog(args) {
    const skip = parseInt(args.extra.skip) || 0;
    const pageNo = Math.floor(skip / 24) + 1;
    const genre = args.extra.genre;
    try {
        let url;
        if (args.id === 'fpm_latest') {
            let path = 'latest-updates';
            if (genre === 'Last 3 days') path = 'latest-updates/3-days';
            else if (genre === 'This week') path = 'latest-updates/this-week';
            else if (genre === 'This month') path = 'latest-updates/this-month';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_trending') {
            let path = 'most-popular/today';
            if (genre === 'This Week') path = 'most-popular/week';
            else if (genre === 'This Month') path = 'most-popular/month';
            else if (genre === 'All Time') path = 'most-popular/all';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_top_rated') {
            let path = 'top-rated/week';
            if (genre === 'All Time') path = 'top-rated/all';
            else if (genre === 'This Month') path = 'top-rated/month';
            else if (genre === 'Today') path = 'top-rated/today';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_most_viewed') {
            let path = 'most-popular/all';
            if (genre === 'This Month') path = 'most-popular/month';
            else if (genre === 'This Week') path = 'most-popular/week';
            else if (genre === 'Today') path = 'most-popular/today';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_categories') {
            const slug = genre.toLowerCase().replace(/ /g, '-');
            url = pageNo === 1 ? `${BASE_URL}/categories/${slug}/` : `${BASE_URL}/categories/${slug}/${pageNo}/`;
        } else if (args.id === 'fpm_studios') {
            const slug = genre.toLowerCase().replace(/ /g, '-').replace('brazzers', 'brazzers2');
            url = pageNo === 1 ? `${BASE_URL}/sites/${slug}/` : `${BASE_URL}/sites/${slug}/${pageNo}/`;
        }

        if (!url) return { metas: [] };

        const res = await fetch(url, { headers: { 'User-Agent': UA_SHORT } });
        const html = await res.text();
        const $ = cheerio.load(html);
        const metas = [];

        $('.list-videos .item').each((i, el) => {
            const title = $(el).find('.title').text().trim();
            const link = $(el).find('a').attr('href');
            const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src');
            if (link && link.includes('/videos/')) {
                const id = link.match(/\/videos\/([^\/]+)/)?.[1];
                if (id) metas.push({ id: `fpm_${id}`, type: 'movie', name: title, poster: thumb, background: thumb });
            }
        });
        return { metas };
    } catch (e) { return { metas: [] }; }
}

async function handleMeta(args) {
    const id = args.id.replace('fpm_', '');
    const url = `${BASE_URL}/videos/${id}/`;
    try {
        const res = await fetch(url, { headers: { 'User-Agent': UA_SHORT } });
        const html = await res.text();
        const $ = cheerio.load(html);
        return {
            meta: {
                id: args.id,
                type: 'movie',
                name: $('.headline h1').text().trim() || $('meta[property="og:title"]').attr('content'),
                poster: $('meta[property="og:image"]').attr('content'),
                background: $('meta[property="og:image"]').attr('content'),
                description: $('meta[property="og:description"]').attr('content')
            }
        };
    } catch (e) { return { meta: { id: args.id, type: 'movie', name: 'Loading...' } }; }
}

async function handleStream(args) {
    const id = args.id.replace('fpm_', '');
    const videoUrl = `${BASE_URL}/videos/${id}/`;
    try {
        const res = await fetch(videoUrl, { headers: { 'User-Agent': UA_LONG, 'Referer': BASE_URL } });
        const html = await res.text();
        const $ = cheerio.load(html);

        const title = $('.headline h1').text().trim();
        const duration = $('.duration').first().text().replace('Full Video', '').trim() || 'N/A';
        const studio = $('.btn_sponsor').first().text().trim() || 'N/A';
        const models = $('.models__item').map((i, el) => $(el).text().trim()).get().filter(m => m && m !== studio).join(', ') || 'N/A';
        const tags = $('.hidden_tags .item a').map((i, el) => $(el).text().trim()).get().slice(0, 5).join(', ') || 'N/A';

        const fileMatches = html.match(/https:\/\/www\.freepornmovies\.net\/get_file\/[^\s"']+/g) || [];
        const qualities = [{ label: '4K', key: '_2160m.mp4', res: '2160p' }, { label: 'HD', key: '_720m.mp4', res: '720p' }, { label: 'SD', key: '_480m.mp4', res: '480p' }];

        const streamPromises = qualities.map(async (q) => {
            const link = fileMatches.find(l => l.includes(q.key));
            if (!link) return null;
            const clean = link.replace(/[",]$/, '');

            const r = await fetch(clean, { 
                method: 'GET', 
                redirect: 'manual', 
                headers: { 'User-Agent': UA_SHORT, 'Referer': videoUrl } 
            });
            const finalUrl = r.headers.get('location') || clean;

            const richTitle = [
                title,
                '',
                `📺 Res: ${q.res} • MP4`,
                `⏱️ Dur: ${duration}`,
                `🎬 Studio: ${studio}`,
                `👥 Models: ${models}`,
                `🏷️ Tags: ${tags}`,
                '',
                '✅ Verified Stream │ ✍️ @Pongky.Ir'
            ].join('\n');

            return {
                name: `FPM • ${q.label}\n${q.res}`,
                title: richTitle,
                url: finalUrl,
                behaviorHints: {
                    proxyHeaders: { "request": { "User-Agent": UA_SHORT, "Referer": videoUrl } }
                }
            };
        });

        const streams = (await Promise.all(streamPromises)).filter(s => s !== null);
        return { streams };
    } catch (e) { return { streams: [] }; }
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === '/manifest.json' || path === '/') {
            return new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        const parts = path.split('/');
        const resource = parts[1];
        const type = parts[2];
        const id = parts[3] ? decodeURIComponent(parts[3]).replace('.json', '') : null;
        
        let result = { metas: [] };
        if (resource === 'catalog') result = await handleCatalog({ id, type, extra: Object.fromEntries(url.searchParams) });
        else if (resource === 'meta') result = await handleMeta({ id, type });
        else if (resource === 'stream') result = await handleStream({ id, type });
        
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
};
