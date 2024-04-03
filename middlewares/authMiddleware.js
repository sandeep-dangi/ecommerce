const User = require('../models/userModel');
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const { request } = require('express');

const authMiddleware = asyncHandler(async (req, res, next) => {
    let token;
    if(req?.headers?.authorization?.startsWith("Bearer")) {
        token =  req.headers.authorization.split(" ")[1];
                    // split(" ") converted it into array and we need the 2nd value

        try {
            if(token)
            {   
                    // if token is there then ............we are verfying the token....token we get from header
                const decoded  = jwt.verify(token , process.env.JWT_SECRET);    
                // console.log(decoded);    user ki id mili jis user ka token tha

                const user = await User.findById(decoded?.id);
                req.user = user;
                next();


            }
        }
        catch(error)
        {
            throw new Error("Not Authorized token expired, Please Login again");
        }
    }
    else
    {
        throw new Error(" There is no token is attached to the header");
    }
});

const isAdmin = asyncHandler(async (req, res, next) => {
    // console.log(req.user);
     const { email } = req.user;
    // then we will find the user
     const adminUser = await User.findOne({ email });
     if(adminUser.role !== "admin"){
        throw new Error('You are not an admin');
     }
     else{
        next();
        // it will pass the request
     }
});


module.exports = { authMiddleware , isAdmin };

