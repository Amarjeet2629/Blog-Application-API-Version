const User = require('../models/user');
const bcyrpt = require('bcryptjs');
const { validationResult } = require('express-validator/check');
const jwt = require('jsonwebtoken');

exports.signup = (req, res, next) => {
    const error = validationResult(req);
    if(!error.isEmpty()){
        const err = new Error('Validation failed, entered data is incorrect');
        err.statusCode = 422;
        err.data = error.array()
        throw err;
    }
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    bcyrpt.hash(password, 12)
    .then(hashedPassword => {
        const userDoc = new User({
        email:email, 
        password: hashedPassword, 
        name: name, 
        });
        return userDoc.save();
    })
    .then(userDoc => {
        console.log('USER CREATED');
        console.log(userDoc);
        res.status(201).json({
            message: 'USER CREATED SUCCESSFULLY',
            userId: userDoc._id,
        })
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    });
    
};

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let user;
    User.findOne({email: email}).then(userDoc => {
        if(!userDoc){
         const err = new Error('Validation failed, Account with this email does not exist');
         err.statusCode = 401;
        //  err.data = error.array()
         throw err;
        }
        user = userDoc;
        return bcyrpt.compare(password, userDoc.password);
    })
    .then(result => {
        if(!result){
            const err = new Error('Password not matched :(');
            err.statusCode = 401;
            throw err;
        }
        const token = jwt.sign({
            email: user.email,
            userId: user._id.toString()
        }, 'thisisalongsecretkeytoprotecttheprivacyofseveralusers' ,{ expiresIn: '1h' });

        return res.status(200).json({
            token: token,
            userId: user._id.toString()
        })
        
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    })
};