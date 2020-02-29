const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 2;
exports.getProducts = (req, res, next) => {
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
    return Product.find()
  .skip((page-1)*ITEMS_PER_PAGE)
  .limit(2)
  })
  .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All products',
        path: '/products',
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
  // Product.find()
  //   .then(products => {
  //     // console.log(products);
  //     // console.log(req.session.user);
  //     res.render('shop/product-list', {
  //       prods: products,
  //       pageTitle: 'All Products',
  //       path: '/products',
  //       isAuthenticated : req.session.isLoggedIn
  //     });
  //   })
  //   .catch(err => {
  //     console.log(err);
  //   });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.find({_id : prodId})
    .then(product => {
      console.log(product);
      res.render('shop/product-detail', {
        product: product[0],
        pageTitle: product[0].title,
        path: '/products',
        isAuthenticated : req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
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
    return Product.find()
  .skip((page-1)*ITEMS_PER_PAGE)
  .limit(1)
  })
  .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
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
};

exports.getCart = (req, res, next) => {
  //console.log(req.session.user);
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      //console.log(products);
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        isAuthenticated : req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        isAuthenticated : req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getInvoice = (req,res,next) => {
  const orderId = req.params.orderId;
  
  Order.findById(orderId)
  .then(order => {
    //console.log(order);
    if(!order)
    {
      return next(new Error('No order found'));
    }
     if(req.user._id.toString() !== order.user.userId.toString())
     {
       return next(new Error('Not authorized'));
     }

    const invoiceName = 'invoice-'+ orderId + '.pdf';
    const invoicePath = path.join('data','invoices',invoiceName);


    res.setHeader('Content-Type' , 'application/pdf');
    res.setHeader('Content-Disposition','inline; filename=" ' + invoiceName + ' "');// alternate template strings
     const pdfDoc = new PDFDocument();
     pdfDoc.pipe(fs.createWriteStream(invoicePath));
     pdfDoc.pipe(res);

     pdfDoc.fontSize(26).text('Invoice',{
       underline : true
     });

     pdfDoc.text('--------------------------------------------------');

     let totalPrice = 0;
     order.products.forEach(prod => {
       totalPrice = totalPrice + prod.quantity * prod.product.price;
       pdfDoc.fontSize(14).text(prod.product.title + ' - '+prod.quantity +' x '+ '$ ' + prod.product.price);
     })

     pdfDoc.text('-------------------------------------------------');
     pdfDoc.text('Total Price - '+ '$' + totalPrice);
     pdfDoc.end();
     
    //  fs.readFile(invoicePath,(err,data) => {
    //   if(err)
    //   {
    //     return next(err);
    //   }
    //   res.setHeader('Content-Type' , 'application/pdf');
    //   res.setHeader('Content-Disposition','inline; filename="' + invoiceName + '"');
    //   res.send(data);
    // });

    // const file = fs.createReadStream(invoicePath);
    //   res.setHeader('Content-Type' , 'application/pdf');
    //   res.setHeader('Content-Disposition','attachment; filename="' + invoiceName + '"');
    //   file.pipe(res);
    
  }).catch(err => {
    console.log(err);
  })
 
}

// const fs = require('fs');
// const path = require('path');

// const Product = require('../models/product');
// const Order = require('../models/order');

// exports.getProducts = (req, res, next) => {
//   Product.find()
//     .then(products => {
//       console.log(products);
//       res.render('shop/product-list', {
//         prods: products,
//         pageTitle: 'All Products',
//         path: '/products'
//       });
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.getProduct = (req, res, next) => {
//   const prodId = req.params.productId;
//   Product.findById(prodId)
//     .then(product => {
//       res.render('shop/product-detail', {
//         product: product,
//         pageTitle: product.title,
//         path: '/products'
//       });
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.getIndex = (req, res, next) => {
//   Product.find()
//     .then(products => {
//       res.render('shop/index', {
//         prods: products,
//         pageTitle: 'Shop',
//         path: '/'
//       });
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.getCart = (req, res, next) => {
//   req.user
//     .populate('cart.items.productId')
//     .execPopulate()
//     .then(user => {
//       const products = user.cart.items;
//       res.render('shop/cart', {
//         path: '/cart',
//         pageTitle: 'Your Cart',
//         products: products
//       });
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.postCart = (req, res, next) => {
//   const prodId = req.body.productId;
//   Product.findById(prodId)
//     .then(product => {
//       return req.user.addToCart(product);
//     })
//     .then(result => {
//       console.log(result);
//       res.redirect('/cart');
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.postCartDeleteProduct = (req, res, next) => {
//   const prodId = req.body.productId;
//   req.user
//     .removeFromCart(prodId)
//     .then(result => {
//       res.redirect('/cart');
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.postOrder = (req, res, next) => {
//   req.user
//     .populate('cart.items.productId')
//     .execPopulate()
//     .then(user => {
//       const products = user.cart.items.map(i => {
//         return { quantity: i.quantity, product: { ...i.productId._doc } };
//       });
//       const order = new Order({
//         user: {
//           email: req.user.email,
//           userId: req.user
//         },
//         products: products
//       });
//       return order.save();
//     })
//     .then(result => {
//       return req.user.clearCart();
//     })
//     .then(() => {
//       res.redirect('/orders');
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.getOrders = (req, res, next) => {
//   Order.find({ 'user.userId': req.user._id })
//     .then(orders => {
//       res.render('shop/orders', {
//         path: '/orders',
//         pageTitle: 'Your Orders',
//         orders: orders
//       });
//     })
//     .catch(err => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

// exports.getInvoice = (req, res, next) => {
//   const orderId = req.params.orderId;
//   Order.findById(orderId)
//     .then(order => {
//       if (!order) {
//         return next(new Error('No order found.'));
//       }
//       if (order.user.userId.toString() !== req.user._id.toString()) {
//         return next(new Error('Unauthorized'));
//       }
//       const invoiceName = 'invoice-' + orderId + '.pdf';
//       const invoicePath = path.join('data', 'invoices', invoiceName);
//       fs.readFile(invoicePath, (err, data) => {
//         if (err) {
//           return next(err);
//         }
//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader(
//           'Content-Disposition',
//           'inline'
//         );
//         res.send(data);
//       });
//     })
//     .catch(err => next(err));
// };
