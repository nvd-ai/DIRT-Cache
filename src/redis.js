let redis = require('async-redis');
let client = redis.createClient({
    port: 16259,
    host: 'redis-16259.c60.us-west-1-2.ec2.cloud.redislabs.com',
    password: 'ZXt3BgxZq3libwqQLhA5QXzDypuxaccf',
});
client.on('error', function (err) {
    console.log('Something went wrong ', err)
});

module.exports = client;

// Test Connection
// client.set('my test key', 'my test value', redis.print);
// client.get('my test key', function (error, result) {
//     if (error) throw error;
//     console.log('GET result ->', result);
//     client.del('my test key');
// });