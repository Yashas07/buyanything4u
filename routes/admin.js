const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');

const { check , body} = require('express-validator/check');

const router = express.Router();

const isAuth = require('../middleware/is-Auth');

// /admin/add-product => GET
router.get('/add-product',
isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products',isAuth,
 adminController.getProducts);

///admin/add-product => POST
router.post('/add-product',isAuth,
body('title').isString().trim().isLength({min : 3 })
.withMessage('Enter a valid title'),

// body('imageUrl').isURL()
// .withMessage('Enter a valid image url'),
body('price')
.isLength({min : 1})
.withMessage('Enter a valid price'),
body('description')
.isLength({min : 1 , max : 400})
.withMessage('Enter a valid description'), adminController.postAddProduct);

//router.post('/add-product',isAuth,adminController.postAddProduct);

router.get('/edit-product/:productId',isAuth, adminController.getEditProduct);

router.post('/edit-product',isAuth,
body('title').isAlphanumeric().trim().isLength({min : 3 })
.withMessage('Enter a valid title'),

// body('imageUrl').isURL()
// .withMessage('Enter a valid image url'),
body('price')
.isLength({min : 1})
.withMessage('Enter a valid price'),
body('description')
.isLength({min : 1 , max : 400})
.withMessage('Enter a valid description'), adminController.postEditProduct);

router.delete('/product/:productId',isAuth, adminController.deleteProduct);

// delete request is like POST and GET requests.
// The difference is that delete request is sent from the client side javascript code
// unlike get and post requests which were used for clicking the links
// and submitting the forms
module.exports = router;
