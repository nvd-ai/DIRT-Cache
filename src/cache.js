let redis = require('./redis');
let DirtClient = require('./client');
let lru = require('./lru');

let MAX_REG_COUNT = 1000;
let REG_TIMEOUT = 12;//12 seconds

function Cache(params) {
    this.isInitialized = false;
    if (params.strategy == "time") {
        this.strategy = params.strategy;
        if (typeof params.timeout != "undefined")
            REG_TIMEOUT = params.timeout;
    }
    else if (params.strategy == "lru") {
        this.strategy = params.strategy;
        if (typeof params.maxSize != "undefined")
            MAX_REG_COUNT = params.maxSize;
    }
    else throw "Cache strategy is unknown!";

    this.size = 0;
    this.dirt = new DirtClient();
    this.lru = new lru();
}

Cache.prototype = {
    init: async function () {
        let keyCount = await redis.dbsize();
        console.log("Redis # of Keys:", keyCount);

        await this.dirt.init();
        this.isInitialized = true;
    },

    getAllRegistries: function () {
        let regs = this.dirt.registries;
        let items = [];
        for (let key in regs) {
            let reg = regs[key];
            items.push(reg.data);
        }
        return items;
    },

    invalidate: async function (regKey, retryInterval) {
        let reg = this.dirt.registries[regKey];
        if (reg.readLock) {
            if (typeof retryInterval != "number")
                retryInterval = 5;//0.5second
            console.log("Registry is locked for reading. Try in " + retryInterval + " ms.");

            return new Promise(resolve => {
                setTimeout(async () => {
                    await this.invalidate(regKey, retryInterval * 2);
                    resolve();
                }, retryInterval);
            })
        }
        reg.readLock = true;
        reg.isCached = false;
        let count = await this.removeItems(regKey);
        reg.readLock = false;
        console.log("Removed ", count, " items.");
    },

    invalidateOnTime: function (regKey) {
        setTimeout(() => {
            console.log("Invalidation timer triggered for:", regKey);
            this.invalidate(regKey);
        }, REG_TIMEOUT * 1000);
    },

    loadRegistryInCache: async function (regKey) {
        console.log("Wait for Dirt client to load registry items...");
        items = await this.dirt.getRegistry(regKey);
        console.log("Registry items are loaded. Writing them to Redis...");
        //console.log(items);
        let count = 0;
        for (key in items) {
            let item = items[key];
            await this.setItem(item);
            count++;
        }
        console.log("Wrote " + count + " items to Redis.");

        let reg = this.dirt.registries[regKey];
        reg.isCached = true;

        this.size++;
        return count;
    },

    getRegistryItems: async function (regKey) {
        console.log("Get registry items at address:", regKey);
        //if it is cached and cache is valid, return it from the cache
        let items = null;
        let reg = this.dirt.registries[regKey];
        let isCached = reg.isCached;
        if (isCached) {
            console.log("Items are cached.");
            console.log("Read items from Redis.");
            items = await this.getAllItems(regKey);
        }

        //otherwise get it from dirt client and store it in the cache
        else {
            console.log("Items are not cached.")
            if (this.size == MAX_REG_COUNT && this.strategy == "lru") {
                console.log("Cache is full (lru strategy).");
                let reg = this.lru.remove();//remove the lru registry
                //console.log("reg is:", reg);
                console.log("Remove items for the lru registry at:", reg.data.address);
                this.invalidate(reg.data.address);
            }

            console.log("Cache items for registry ", regKey);
            let count = await this.loadRegistryInCache(regKey);
            console.log(count + " items are cached.");

            if (this.strategy == "time") {
                console.log("Set cache invalidation timer (time strategy).")
                this.invalidateOnTime(regKey);
            }

            //TODO: Replace below. Use reg to produce the JSON object.
            console.log("Read items from Redis.");
            items = await this.getAllItems(regKey);
        }

        //console.log("items are:", items);

        console.log("Update lru list");
        this.lru.access(reg);


        return [items, isCached];
    },

    /********** Items ************/

    setItem: async function (regItem) {
        let key = regItem.origin + "-" + regItem.key;
        let value = {
            value: regItem.value,
            timestamp: regItem.timestamp
        };
        await redis.set(key, JSON.stringify(value));
    },

    getItem: async function (itemKey) {
        let valStr = await redis.get(itemKey);
        //console.log("itemKey:", itemKey, ", valStr:", valStr);
        if (valStr) {
            let value = JSON.parse(valStr);
            var keyParts = itemKey.split("-");
            value.origin = keyParts[0];
            value.key = keyParts[1];
            return value;
        }
        else return null;
    },

    getAllItems: async function (regKey, retryInterval) {
        let reg = this.dirt.registries[regKey];
        if (reg.readLock) {
            if (typeof retryInterval != "number")
                retryInterval = 5;//0.5second
            console.log("Registry is locked. Try in " + retryInterval + " ms.");

            return new Promise(resolve => {
                setTimeout(async () => {
                    await this.getAllItems(regKey, retryInterval * 2);
                    resolve();
                }, retryInterval);
            })
        }

        reg.readLock = true;

        //return all keys starting with /regKey/ pattern
        let items = {};
        let itemKeys = await redis.keys(regKey + "*");
        //console.log("itemKeys:", itemKeys, itemKeys.length);
        for (var i = 0; i < itemKeys.length; i++) {
            let itemKey = itemKeys[i];
            let item = await this.getItem(itemKey);
            //console.log("Cached item is:", item);
            items[item.key] = item;
        }

        reg.readLock = false;
        return items;
    },

    removeItems: async function (regKey) {
        //return all keys starting with /regKey/ pattern
        let count = 0;
        let items = {};
        let itemKeys = await redis.keys(regKey + "*");
        for (var i = 0; i < itemKeys.length; i++) {
            let itemKey = itemKeys[i];
            await redis.del(itemKey);
            count++;
        }
        this.size--;
        return count;
    },

    reset: async function () {
        await redis.flushdb();
        this.size = 0;
    }
}

module.exports = Cache;