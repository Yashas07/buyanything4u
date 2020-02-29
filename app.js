const path = require('path');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const errorController = require('./controllers/error');
const User = require('./models/user');

//MONGODB_USER=shreyas MONGODB_PASSWORD=NRXAmiWlaDuuXqtq MONGODB_DEFAULT_DATABASE=shop
//MONGODB_USER = 'shreyas',MONGODB_PASSWORD = 'NRXAmiWlaDuuXqtq',MONGODB_DEFAULT_DATABASE = 'shop';
const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0-pydiw.mongodb.net/${process.env.MONGODB_DEFAULT_DATABASE}?retryWrites=true&w=majority`
const app = express();


console.log(process.env.NODE_ENV);
const store = new MongoDBStore({
  uri : MONGODB_URI,
  collection : 'sessions'
});

const fileStorage = multer.diskStorage({
  destination : (req,file,cb) => {
    cb(null, 'images')
  },
  filename : (req,file,cb) => {
    cb(null, Date.now() + file.originalname)
  }
})

const fileFilter = (req,file,cb) => {
  if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png')
{
  cb(null,true);
}
  else {
  cb(null,false);
  }
}
 const csrfProtection = csrf(); 

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLog = fs.createWriteStream(path.join(__dirname,'access.log'),
{
  flags : 'a' //append but not override
})
app.use(helmet());
app.use(compression());
app.use(morgan('combined', {stream : accessLog}));
//app.use(morgan('combined'));
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(multer({storage : fileStorage , fileFilter : fileFilter}).single('image'));

app.use(multer({storage : fileStorage ,  fileFilter : fileFilter}).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname,'images')));
app.use('/products/images',express.static(path.join(__dirname,'images')));
app.use(session({ secret : 'my secret',resave: false ,saveUninitialized : false , store : store,cookie : {
  expires : Date.now() + 30000
}}));

app.use(csrfProtection);
app.use(flash());
app.use((req, res, next) => {
  if(!req.session.user)
  {
     next();
    
  }
  else {
    User.findById(req.session.user._id)
    .then(user => {
      if(!user){
        return next();
      }
      //console.log(req.session.user._id);
      //console.log(user);
      req.user = user;
      //console.log(user);
      next();
    })
    .catch(err => {
      throw new Error(err);
    });
  }
  
    
});

app.use((req,res,next) => {
  app.locals.isAuthenticated = req.session.isLoggedIn;
  app.locals.csrfToken = req.csrfToken();
  next();
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);


app.get('/500',errorController.get500);



app.use(errorController.get404);

app.use((error,req,res,next) => {
  res.redirect('/500');
})




mongoose
  .connect(
    MONGODB_URI
  )
  .then(result => {
    app.listen(process.env.PORT);
  })
  .catch(err => {
    console.log(err);
  });
