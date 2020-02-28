const Product = require('../models/product');
const { validationResult} = require('express-validator/check');
const mongoose = require('mongoose');
const User=  require('../models/user');

const fileHelper = require('../util/file');
exports.getAddProduct = (req, res, next) => {
  if(!req.session.isLoggedIn)
  {
    return res.redirect('/login');
  }
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    isAuthenticated : req.session.isLoggedIn,
    hasError : false,
    errorMessage : '',
    validationErrors : []
  });
};

exports.postAddProduct = (req, res, next) => {
 
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  console.log(req.file);
  if(!image)
  {
    return res.render('admin/edit-product',{
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      isAuthenticated : req.session.isLoggedIn,
      hasError : true,
      errorMessage : 'Attached file is not an image',
      product : {
        title : title,
        price : price,
        description : description
        
      }
      ,
      validationErrors : []
    })
  
  }

  const imageUrl = image.path;
  const errors = validationResult(req);
  console.log(errors.array());
  if(!errors.isEmpty())
  {
    return res.render('admin/edit-product',{
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      isAuthenticated : req.session.isLoggedIn,
      hasError : true,
      errorMessage : errors.array()[0].msg,
      product : {
        title : title,
        imageUrl : imageUrl,
        price : price,
        description : description
        
      }
      ,
      validationErrors : errors.array()
    })
  }
  
  const product = new Product({
  
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      // throw new Error('Database operation failed')
      // console.log(err);
      // return res.status(500).render('admin/edit-product',{
      //   pageTitle: 'Add Product',
      //   path: '/admin/add-product',
      //   editing: false,
      //   isAuthenticated : req.session.isLoggedIn,
      //   hasError : true,
      //   errorMessage : 'Database operation failed, please try again',
      //   product : {
      //     title : title,
      //     imageUrl : imageUrl,
      //     price : price,
      //     description : description
          
      //   },
      //   validationErrors : []
        
      // })
      const error = new Error(err);
      error.httpStatusCode = 500;
      
      return next(error);
      //res.render('/500');
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        isAuthenticated : req.session.isLoggedIn,
        errorMessage : '',
        validationErrors : []
      });
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;


  const errors = validationResult(req);



  if(!errors.isEmpty())
  {
    return res.render('admin/edit-product',{
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: true,
      isAuthenticated : req.session.isLoggedIn,
      hasError : true,
      errorMessage : errors.array()[0].msg,
      product : {
        title : updatedTitle ,
        imageUrl : updatedImageUrl,
        price : updatedPrice ,
        description : updatedDesc
        
      },
      validationErrors : errors.array()
    })
  }

  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString())
      {
        return res.redirect('/');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image)
      {
        fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
      }
      return product.save()
      .then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      })
    })
    .catch(err => console.log(err));
};

exports.getProducts = (req, res, next) => {
  const ITEMS_PER_PAGE = 1;
  const page = +req.query.page || 1;
  console.log(page);
  // if(!page)
  // {
  //   page = 1;
  // }
  let totalItems;

  Product.find().count()
  .then(numProducts => {
    totalItems = numProducts;
    console.log(totalItems);
    return Product.find({userId : req.user._id})
  .skip((page-1)*ITEMS_PER_PAGE)
  .limit(1)
  })
  .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin products',
        path: '/admin/products',
        currentPage : page,
        hasNextPage : ITEMS_PER_PAGE*page < totalItems,
        hasPreviousPage : page > 1,
        nextPage : page +1,
        previousPage : page - 1,
        lastPage : Math.ceil(totalItems / ITEMS_PER_PAGE),
        isAuthenticated : req.session.isLoggedIn,
        csrfToken : req.csrfToken()
      });
    })
    .catch(err => {
      console.log(err);
    });
  // Product.find({userId : req.user._id})
  //   // .select('title price -_id')
  //   // .populate('userId', 'name')
  //   .then(products => {
  //     if(products)
  //     console.log(products);
  //     res.render('admin/products', {
  //       prods: products,
  //       pageTitle: 'Admin Products',
  //       path: '/admin/products',
  //       isAuthenticated : req.session.isLoggedIn
  //     });
  //   })
  //   .catch(err => console.log(err));
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
  .then(product => {
    if(!product) {
      return next(new Error('Product not found'));
    }
    return fileHelper.deleteFile(product.imageUrl);
  })
  .then(result => {
    Product.deleteOne({_id : prodId, userId : req.user._id})
    .then(() => {
      req.user.removeFromCart(prodId)
      .then(result => {

        console.log('DESTROYED PRODUCT');
      res.status(200).json({
        message : 'Success!'
      })
      })
      
    })
  })
  .catch(err => {
    res.status(200).json({
      message : 'Deleting product failed!'
    })
  });
};
