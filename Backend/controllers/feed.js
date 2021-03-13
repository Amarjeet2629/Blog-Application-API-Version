const { red } = require('chalk');
const {validationResult} = require('express-validator/check'); 
const post = require('../models/post');
const fs = require('fs');
const path = require('path');
const Post = require('../models/post');
const NUMBER_OF_POST_PER_PAGE = 2;
const User = require('../models/user');
const io = require('../socket');


exports.getPost = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    try {
    const  postCount = await Post.find().countDocuments();
    const posts = await Post.find().populate('creator').skip((currentPage-1)*NUMBER_OF_POST_PER_PAGE).limit(NUMBER_OF_POST_PER_PAGE).sort({createdAt: -1});
    return res.status(200).json({
        posts: posts,
        totalItems: postCount
     });
    }
    catch (err) {
        if(!err.statusCode){
          err.statusCode = 500;
        }
        next(err);
    }
};

exports.postcreatePost = (req, res, next) => {
    const title = req.body.title;
    const content = req.body.content;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        throw error;
    }
    if(!req.file){
        const error = new Error('Image not found');
        error.statusCode = 422;
        throw error;
    }
    const imageUrl = req.file.path;
    const userId = req.userId;
    let postId;
    let creator;
    const post = new Post({
        title: title,
        content:content,
        imageUrl: imageUrl,
        creator: userId
    });
    post.save()
    .then(post => { 
        io.getIO().emit('posts', { action: 'create', post: post})
        return User.findOne({_id: userId});
    })
    .then(userDoc => {
        creator = userDoc;
        userDoc.posts.push(post);
        return userDoc.save();
    })
    .then(result => {
        res.status(201).json({
            message: 'Post created successfully',
            post: post,
            creator: {_id: creator._id, name: creator.name}
        });
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    });
    // create post in db
}

exports.getPostDetail = (req, res, next)=>{
    const postId = req.params.postId;
    Post.findOne({_id: postId}).then(post => {
        if(!post){
            const error = new Error('No such post exits');
            throw error;
        }
        res.status(200).json({
            message: 'Post fetched Properly',
            post: post
        });

    }).catch(err => {
        if(!err.statusCode){
            err.statusCode  = 500;
        }
        next(err);
    })
}

exports.putUpdatePost = (req, res, next) => {
    const postId = req.params.postId;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if(req.file){
        imageUrl = req.file.path;
    }
    if(!imageUrl){
        const err = new Error('Image not found');
        err.statusCode = 422;
        throw err;
    }
    Post.findById(postId).populate('creator').then(post => {
        if(!post){
            const error = new Error('No such post exits');
            error.statusCode = 404;
            throw error;
        }
        if(post.creator._id.toString() !== req.userId.toString()){
            const err = new Error('Not Authorised');
            err.statusCode = 403;
            throw err;
        }
        if(imageUrl !== post.imageUrl){
            fileRemover(post.imageUrl);
        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        return post.save()
    })
    .then(result => {
        io.getIO().emit('posts', {action: 'update', post: result});
        res.status(200).json({
            message: 'POST UPDATED',
            post: result
        })
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode  = 500;
        }
        next(err);
    })
};

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    let imageUrl;
    Post.findById(postId).then(post => {
        // Check for logged user
        if(!post){
            const error = new Error('No such post exits');
            error.statusCode = 404;
            throw error;
        }
        if(post.creator.toString() !== req.userId.toString()){
            const err = new Error('Not Authorized');
            err.statusCode = 403;
            throw err;
        }
        imageUrl = post.imageUrl
        return Post.findByIdAndRemove(postId);
    })
    .then(result => {
        console.log(result);
        fileRemover(imageUrl);
        return User.findById(req.userId);
    })
    .then(userDoc => {
        userDoc.posts.pull(postId);
        return userDoc.save();
    })
    .then(result => {
        io.getIO().emit('posts', {action: 'delete', post: postId});
        return res.status(201).json({
            message: 'POST DELETED SUCCESSFULLY',
        });
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode  = 500;
        }
        next(err);
    })
}

const fileRemover = (filePath) => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => {
        console.log(err);
    });
}
