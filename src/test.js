let redis = require('./redis');
const assert = require('assert');
let Cache = require('./cache');

//registry keys
//0xc287b15ba2147d86a98fcbbf13afc874beff3d9e
//0x0c09614c65251147262c1c6827cd48db5ed423c1

async function test() {
    let res, count, items, keyCount;
    /************************ LRU Cache ********************/
    let lruCache;
    try {
        lruCache = new Cache({ strategy: "lru", maxSize: 1 });
        await lruCache.reset();
        await lruCache.init();
    }
    catch (e) {
        console.log("Error in initializing the cache:", e);
    }
    console.log("Cache is initialized successfully");

     items = lruCache.getAllRegistries();
    assert.strictEqual(items.length, 2, "All Registries are not loaded. Registy Items:" + items.length);
    //console.log(items);

     keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 0, "Redis must be empty. Key count:" + keyCount);

     res = await lruCache.getRegistryItems("0xc287b15ba2147d86a98fcbbf13afc874beff3d9e");
     count = countItems(res[0]);
    assert.strictEqual(count, 10, "There must be 10 items. Item count:" + count);
    assert.strictEqual(res[1], false, "Items are not cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 10, "There must be 10 keys in redis. Key count:" + keyCount);
    console.log("Test 1 passed!");

    res = await lruCache.getRegistryItems("0xc287b15ba2147d86a98fcbbf13afc874beff3d9e");
    count = countItems(res[0]);
    assert.strictEqual(count, 10, "There must be 10 items. Item count:" + count);
    assert.strictEqual(res[1], true, "Items are cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 10, "There must be 10 keys in redis. Key count:" + keyCount);
    console.log("Test 2 passed!");

    res = await lruCache.getRegistryItems("0x0c09614c65251147262c1c6827cd48db5ed423c1");
    count = countItems(res[0]);
    assert.strictEqual(count, 0, "There must be 0 items. Item count:" + count);
    assert.strictEqual(res[1], false, "Items are not cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 0, "There must be 0 keys in redis. Key count:" + keyCount);
    console.log("Test 3 passed!");

    res = await lruCache.getRegistryItems("0x0c09614c65251147262c1c6827cd48db5ed423c1");
    count = countItems(res[0]);
    assert.strictEqual(count, 0, "There must be 0 items. Item count:" + count);
    assert.strictEqual(res[1], true, "Items are not cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 0, "There must be 0 keys in redis. Key count:" + keyCount);
    console.log("Test 4 passed!");

    res = await lruCache.getRegistryItems("0xc287b15ba2147d86a98fcbbf13afc874beff3d9e");
    count = countItems(res[0]);
    assert.strictEqual(count, 10, "There must be 10 items. Item count:" + count);
    assert.strictEqual(res[1], false, "Items are not cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 10, "There must be 10 keys in redis. Key count:" + keyCount);
    console.log("Test 5 passed!");

    /************************ Time Cache ********************/
    let timeCache;
    try {
        timeCache = new Cache({ strategy: "time", timeout: 5 });
        await timeCache.reset();
        await timeCache.init();
    }
    catch (e) {
        console.log("Error in initializing the cache:", e);
    }
    console.log("Cache is initialized successfully");

    items = timeCache.getAllRegistries();
    assert.strictEqual(items.length, 2, "All Registries are not loaded. Registy Items:" + items.length);

    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 0, "Redis must be empty. Key count:" + keyCount);

    res = await timeCache.getRegistryItems("0xc287b15ba2147d86a98fcbbf13afc874beff3d9e");
    count = countItems(res[0]);
    assert.strictEqual(count, 10, "There must be 10 items. Item count:" + count);
    assert.strictEqual(res[1], false, "Items are not cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 10, "There must be 10 keys in redis. Key count:" + keyCount);
    console.log("Test 6 passed!");

    res = await timeCache.getRegistryItems("0xc287b15ba2147d86a98fcbbf13afc874beff3d9e");
    count = countItems(res[0]);
    assert.strictEqual(count, 10, "There must be 10 items. Item count:" + count);
    assert.strictEqual(res[1], true, "Items are not cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 10, "There must be 10 keys in redis. Key count:" + keyCount);
    console.log("Test 7 passed!");

    console.log("Sleep for 8 seconds!");
    await sleep(8000);
    console.log("Wake up!")

    res = await timeCache.getRegistryItems("0xc287b15ba2147d86a98fcbbf13afc874beff3d9e");
    count = countItems(res[0]);
    assert.strictEqual(count, 10, "There must be 10 items. Item count:" + count);
    assert.strictEqual(res[1], false, "Items are not cached.");
    keyCount = await redis.dbsize();
    assert.strictEqual(keyCount, 10, "There must be 10 keys in redis. Key count:" + keyCount);
    console.log("Test 8 passed!");
}

function countItems(items) {
    let count = 0;
    for (key in items)
        count++;
    return count;
}

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

module.exports = test;