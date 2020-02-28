const crypto = require('crypto');

const User = require('../models/user');
const bcrypt = require('bcryptjs');

const nodemailer = require('nodemailer');
const sendgridtransport = require('nodemailer-sendgrid-transport');

const { validationResult } = require('express-validator/check');
const transporter = nodemailer.createTransport(sendgridtransport({
    auth : {
        api_key : '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'
    }
}));

exports.getLogin = (req,res,next) => {
    //const isLoggedIn = req.get('Cookie').split('=')[1] === 'true';
    //console.log(req.session.isLoggedIn);
    let message = req.flash('error'); 
    if(message.length > 0)
    {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/login',{
        path : '/login',
        pageTitle : 'Login',
        isAuthenticated : false,
        errorMessage : message,
        oldInput : {
            email : '',
            password : ''
           
        },
        validationErrors : []
    })
}

exports.postLogin =(req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/login',{
            
            path : '/login',
            pageTitle : 'login',
            isAuthenticated : false,
            errorMessage : errors.array()[0].msg,
            oldInput : {
                email : email,
                password : password
            },
            validationErrors : errors.array()
        })
    }
    User.findOne({email : email})
    .then(user => {
        if(!user){
            // req.flash('error','Invalid email or password');
            // return res.redirect('/login');
            return res.status(422).render('auth/login',{
            
                path : '/login',
                pageTitle : 'login',
                isAuthenticated : false,
                errorMessage : 'Invalid email or password',
                oldInput : {
                    email : email,
                    password : password
                },
                validationErrors : []
            })
        }
        bcrypt.compare(password,user.password)
        .then(domatch => {
            if(domatch){
        req.session.isLoggedIn = true;
        req.session.user = user;
        return req.session.save(err => {
            console.log(err);
            res.redirect('/');
        })
            }
            // req.flash('error','Invalid email or password');
            // res.redirect('/login');
            return res.status(422).render('auth/login',{
            
                path : '/login',
                pageTitle : 'login',
                isAuthenticated : false,
                errorMessage : 'Invalid email or password',
                oldInput : {
                    email : email,
                    password : password
                },
                validationErrors : []
            })
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        })
    })
    .catch(err => {
        console.log(err);
    })
   
}

exports.postLogout = (req,res,next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    })
}

exports.getSignup = (req,res,next) => {
    let message = req.flash('error');
    if(message.length > 0)
    {
        message = message[0];
    }
    else{
        message = null;
    }
    res.render('auth/signup',{
        path : '/signup',
        pageTitle : 'SignUp',
        isAuthenticated : false,
        errorMessage : message,
        oldInput : {
            email : '',
            password : '',
            confirmPassword : ''
        },
        validationErrors : []
    })
}

exports.postSignup = (req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;
    
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup',{
            
            path : '/signup',
            pageTitle : 'SignUp',
            isAuthenticated : false,
            errorMessage : errors.array()[0].msg,
            oldInput : {
                email : email,
                password : password,
                confirmPassword : req.body.confirmPassword
            },
            validationErrors : errors.array()
        })
    }
    
         bcrypt.hash(password,12)    // 12 denotes 12 levels of hashing
        .then(hashedPassword => {
            const user = new User({
                email : email,
                password : hashedPassword,
                cart : { items: [] }
            });
         return user.save();
        })
        .then(result => {
            res.redirect('/login');
           return  transporter.sendMail({
                to : email,
                from : 'shop@node-complete.com',
                subject : 'signup succeeded',
                html : '<h1>You successfully signed up<h1>'
            })
           
        })
        .catch(err => {
            console.log(err);
        })
}

exports.getReset = (req,res,next) => {
    let message = req.flash('error');
    if(message.length > 0)
    {
        message = message[0];
    }
    else{
        message = null;
    }
    res.render('auth/reset',{
        path : '/reset',
        pageTitle : 'Reset Password',
        //isAuthenticated : false,
        errorMessage : message
    })
}

exports.postReset = (req,res,next) => {
    const email = req.body.email;
    crypto.randomBytes(32,(err,buffer) => {
        if(err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex'); // hex converts hexadecimal buffer to store  ascii values
         User.findOne({ email : email})
        .then(user => {
            if(!user) {
                req.flash('error','No account with that email found.');
                return res.redirect('/reset');
            }
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000 // 1hr in milliseconds
            return user.save()
            .then(result => {
                res.redirect('/');
                return transporter.sendMail({
                    to : email,
                    from : 'shop@node-complete.com',
                    subject : 'Password reset',
                    html : `You requested a password reset <a href="http://localhost:3000/reset/${token}">click</a>`
                     //<input type="hidden" name="_csrf" value="<%= csrfToken %>">
                    
                })
               .catch(err => {
                   console.log(err);
               })
            })
        })
        .catch(err => {
            console.log(err);
        })                                       
    })
}

exports.getNewPassword = (req,res,next) => {
    const token = req.params.token;
    User.findOne({resetToken : token, resetTokenExpiration : {$gt : Date.now()}})
    .then(user => {
        let message = req.flash('error');
    if(message.length > 0)
    {
        message = message[0];
    }
    else{
        message = null;
    }
    res.render('auth/new-password',{
        path : '/new-password',
        pageTitle : 'New Password',
        //isAuthenticated : false,
        errorMessage : message,
        userId : user._id.toString(),
        token : token
    })
    })
    .catch(err => {
        console.log(err);
    })
    
}

exports.postNewPassword = (req,res,next) => {
    const updatedPassword = req.body.password;
    console.log(updatedPassword);
    const passwordToken = req.body.token;
    const userId = req.body.userId;
    User.findOne({_id : userId ,resetToken : passwordToken, resetTokenExpiration : {$gt : Date.now()} })
    .then(user => {
        return bcrypt.hash(updatedPassword , 12)
        .then(hashedPassword => {
            user.password = hashedPassword;
            user.resetToken = undefined;
            user.resetTokenExpiration = undefined;
            return user.save();
        })
        .catch(err => {
            console.log(err+ 'inner then auth');
        })
        })
    .then(result => {
        res.redirect('/login');
    })
    .catch(err => {
        console.log(err);
    })
}


