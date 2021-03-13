const express = require('express');

const bodyParser = require('body-parser');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');


const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { diskStorage } = require('multer');

const MONGODB_URI = 'mongodb://sha256:sha256@cluster0-shard-00-00.h3uaf.mongodb.net:27017,cluster0-shard-00-01.h3uaf.mongodb.net:27017,cluster0-shard-00-02.h3uaf.mongodb.net:27017/API?ssl=true&replicaSet=atlas-deri93-shard-0&authSource=admin&retryWrites=true&w=majority';


const app = express();

// app.use(bodyParser.urlencoded()):
const fileStorage = multer.diskStorage({
  filename: (req, file, cb) => {
      cb(null, new Date().toISOString() + '-' + file.originalname);
  },
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
})

const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg'){
    cb(null, true);
  }
  else
    cb(null, false);
}
app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter: fileFilter}).single('image'));

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
})

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode;
    const message = error.message;
    res.status(status).json({
        message: message,
        error: error.data,
    });

})

mongoose
  .connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(result => {
    console.log('Connection Successful !!!');
    const server = app.listen(8080);
    const io = require('./socket').init(server);
    io.on('connection', socket => {
      console.log('Client connected');
    });
  })
  .catch(err => {
    console.log(err);
  });