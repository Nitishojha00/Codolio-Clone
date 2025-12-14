const express = require('express');
const auth = require('../middlewares/auth')
const authRoute =  express.Router();
const {register,login,logout} = require('../controllers/userAuth')

authRoute.post('/register', register);
authRoute.post('/login', login);
authRoute.post('/logout', auth, logout);

module.exports = authRoute;