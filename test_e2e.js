const { startAddon } = require('./index');

// Helper to shuffle array and pick N elements
function getRandomElements(arr, n) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

(async () => {
    console.log('--- STARTING FPM-ADDON DYNAMIC E2E INTEGRATION CHECK ---');
    try {
        const addonInterface = await startAddon();
        
        // 1. Check Catalog
        console.log('\n1. TESTING CATALOG HANDLER...');
        const testCatalogId = 'fpm_trending';
        console.log(`Testing catalog: ${testCatalogId}`);
        
        const catalogResult = await addonInterface.get('catalog', 'movie', testCatalogId);
        console.log('Metas found in catalog:', catalogResult?.metas?.length);
        if (!catalogResult?.metas || catalogResult.metas.length === 0) {
            console.error('FAIL: No metas found in catalog!');
            process.exit(1);
        }

        // Pick 3 random test items
        const testItems = getRandomElements(catalogResult.metas, 3);
        console.log(`\nRandomly selected 3 titles to test:`);
        testItems.forEach((item, index) => console.log(`  ${index + 1}. ${item.name} (${item.id}) - Type: ${item.type}`));

        for (let i = 0; i < testItems.length; i++) {
            const item = testItems[i];
            console.log(`\n========================================`);
            console.log(`TESTING ITEM ${i + 1}/${testItems.length}: ${item.name}`);
            console.log(`========================================`);

            // 2. Check Meta
            console.log('\n2. TESTING META HANDLER...');
            const metaResult = await addonInterface.get('meta', item.type, item.id);
            console.log('Meta Name:', metaResult?.meta?.name);
            console.log('Meta Description:', metaResult?.meta?.description ? metaResult.meta.description.slice(0, 100) + '...' : 'N/A');

            // 3. Check Streams
            console.log('\n3. TESTING STREAM HANDLER...');
            const streamResult = await addonInterface.get('stream', item.type, item.id);
            console.log('Streams found:', streamResult?.streams?.length || 0);
            if (streamResult?.streams && streamResult.streams.length > 0) {
                console.log('First stream name:', streamResult.streams[0].name.replace(/\n/g, ' '));
                console.log('First stream title (excerpt):', streamResult.streams[0].title.split('\n')[0]);
                console.log('First stream url:', streamResult.streams[0].url.slice(0, 90));
            } else {
                console.log('No streams resolved (normal if no active sources exist)');
            }
        }

        console.log('\n--- FPM-ADDON E2E CHECK COMPLETED ---');
    } catch (err) {
        console.error('FPM-ADDON E2E CHECK ERROR:', err);
        process.exit(1);
    }
})();
