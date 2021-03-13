const express = require('express');

const {check, body} = require('express-validator/check');

const router = express.Router();

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');

router.get('/posts', isAuth, feedController.getPost);

router.post('/post', [
    body('title', 'Must be 5 characters long and must not contain special characters').trim().isLength({min: 5}),
    body('content', 'Must be 5 characters long').trim().isLength({min: 5})
],
isAuth, feedController.postcreatePost);

router.get('/post/:postId', isAuth, feedController.getPostDetail);

router.put('/post/:postId', [
    body('title', 'Must be 5 characters long and must not contain special characters').trim().isLength({min: 5}),
    body('content', 'Must be 5 characters long').trim().isLength({min: 5})
], isAuth, feedController.putUpdatePost);

router.delete('/post/:postId', isAuth, feedController.deletePost);
module.exports = router;