let Dirt = require("@dirt/lib/dist/services/Dirt");
let Web3 = require("web3");
let { PerformanceObserver, performance } = require('perf_hooks');

const rootAddress = "0xDb1E8F93854cbC9272dA69544Fc62E5d4511c7D1";

function RegistryData(reg) {
    this.data = {
        address: reg.address,
        name: reg.name,
        vote_style: reg.vote_style,
        timestamp: reg.timestamp
    }

    this.isCached = false;
    this.lruNode = null;
    this.readLock = false;
}

function DirtClient() {
    this.web3Instance = null;
    this.web3Provider = null;
    this.dirt = null;
    this.registries = null;
}

DirtClient.prototype = {
    init: async function () {
        console.log("Initializing Dirt Client");
        this.initWeb3();
        this.initDirtClient();
        await this.loadRegistries();
        //TODO: implement updating registries on certain intervals/events
    },

    initWeb3: function () {
        console.log("instantiate Web3");
        this.web3Provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/dbc711d305cb457da66a9950fa847c61');
        this.web3Instance = new Web3(this.web3Provider);
    },

    initDirtClient: function () {
        this.dirt = new Dirt.Dirt({ web3: { instance: this.web3Instance, provider: this.web3Provider }, rootAddress: rootAddress });
    },

    loadRegistries: async function () {
        console.log("Load Registries");
        await this.dirt.load();
        this.registries = {};
        let rootEnumerator = this.dirt.Root.getEnumerator();
        let rootNext = await rootEnumerator.next();
        while (rootNext) {
            let reg = rootEnumerator.current;
            this.registries[reg.address] = new RegistryData(reg);
            rootNext = await rootEnumerator.next();
        }
    },

    getRegistry: async function (address) {
        let items = {};
        let dirtRegistry = await this.dirt.getRegistryAtAddress(address, "ChallengeableRegistry"/*"Stakeable"*/);
        let enumerator = dirtRegistry.getEnumerator();
        let regNext = await enumerator.next();

        while (regNext) {
            let regItem = enumerator.current;
            items[regItem.key] = regItem;
            //console.log("Registry Item:", regItem);

            regNext = await enumerator.next();
        }

        return items;
    }
}

module.exports = DirtClient;