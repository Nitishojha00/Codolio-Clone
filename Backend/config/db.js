const mongoose = require('mongoose');

async function main(){
    console.log("mongoose connected")
    await mongoose.connect(process.env.MONGO_URI);
}

module.exports = main;