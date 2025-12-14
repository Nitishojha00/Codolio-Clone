const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
    
    username: process.env.REDIS_USER_NAME,
    password: process.env.REDIS_USER_PASS,
    socket: {
        host: process.env.REDIS_USER_HOST,
        port: process.env.REDIS_USER_PORT
    }
});

module.exports = redisClient;

