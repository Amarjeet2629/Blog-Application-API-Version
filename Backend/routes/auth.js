const express = require('express');
const User = require('../models/user');

const router = express.Router();

const { body } = require('express-validator/check');
const authController = require('../controllers/auth');

router.put('/signup', [
    body('email', 'Not a valid E-mail').trim().isEmail().normalizeEmail()
    .custom((value, { req }) => {
        return User.findOne({email: value}).then(userDoc => {
            if(userDoc){
                return Promise.reject('Email already exists');
            }
        })
    }),
    body('password').trim().isLength({min: 6}),
    body('name').trim().not().isEmpty()
], authController.signup);

router.post('/login', [
    body('email', 'Not a valid E-mail').trim().isEmail().normalizeEmail(),
    body('password').trim()
] ,authController.login);
module.exports  = router;