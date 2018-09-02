let http = require('http');
let test = require('./test');
let Cache = require('./cache');
let cache;

async function listRegistries(req, res) {
    let regs = cache.getAllRegistries();
    console.log("\nRegistries:", regs);
    return regs;
};

async function getRegistryById(regId) {
    let res = await cache.getRegistryItems(regId);
    console.log("\nRegistry Items:", regId, res[0]);
    return res[0];
}

async function createServer() {
    cache = new Cache({ strategy: "lru"/*| "time" */ });
    await cache.init();

    http.createServer(async function (request, response) {
        let url = request.url;
        let parts = url.split("/");
        console.log('request: ', url, typeof (url), url.length);
        let out;
        if (url == "/registries")
            out = await listRegistries(request, response);

        else if (parts.length == 3 && parts[1] == "registries")
            out = await getRegistryById(parts[2]);
        else out = "Not found";
        response.write(JSON.stringify(out));
        response.end();
    }).listen(8200);
}

//createServer();
test();