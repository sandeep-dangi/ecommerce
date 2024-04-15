const { generateToken } = require("../config/jwtToken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const { generateRefreshToken } = require("../config/refreshtoken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("./emailCtrl");

const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const Order = require("../models/orderModel");
const uniqid = require("uniqid");

const createUser = asyncHandler(async (req,res) => {
    const email = req.body.email;
    const findUser = await User.findOne({email: email});
    if(!findUser){
        // Create a new user
        const newUser =await User.create(req.body);
        res.json(newUser);
    }
    else 
    {
        // res.json({
        //     msg: "User Already Exists",
        //     success: false,
        // });
        throw new Error('User Already Exists');
    }
});


//creating login controller
const loginUserCtrl = asyncHandler(async (req , res) => {
    const { email,password } = req.body;
    // console.log(email, password);
    // for this i need to create Router...authRoute

    // we have to....check if user exists or not
    const findUser = await User.findOne({ email });
            // if user found we have to check password also
    if(findUser && (await findUser.isPasswordMatched(password))) {

        const refreshToken = await generateRefreshToken(findUser?._id);
                        // we have generated refresh token now we need to update it
        const updateuser = await User.findByIdAndUpdate(
            findUser.id,
            {
                refreshToken: refreshToken,
            },
            { new: true }
        );
        // now we have to set the fresh token in the cookies
        res.cookie("refreshToken",refreshToken,{
            httpOnly: true,
            maxAge: 72 * 60 * 60 * 1000,
        });

        // res.json(findUser);

        res.json({
            _id: findUser?._id,
            firstname: findUser?.firstname,
            lastname:findUser?.lastname,
            email: findUser?.email,
            mobile: findUser?.mobile,
            token: generateToken(findUser?._id),
        });
    } else {
        throw new Error("Invalid Credentials");
    }

});


//admin login .............copy from loginUserCtrl
const loginAdmin = asyncHandler(async (req , res) => {
    const { email,password } = req.body;
    // console.log(email, password);
    // for this i need to create Router...authRoute

    // we have to....check if user exists or not
    const findAdmin = await User.findOne({ email });

    if(findAdmin.role !== "admin") throw new Error("Not Authorized");

            // if user found we have to check password also
    if(findAdmin && (await findAdmin.isPasswordMatched(password))) {

        const refreshToken = await generateRefreshToken(findAdmin?._id);
                        // we have generated refresh token now we need to update it
        const updateuser = await User.findByIdAndUpdate(
            findAdmin.id,
            {
                refreshToken: refreshToken,
            },
            { new: true }
        );
        // now we have to set the fresh token in the cookies
        res.cookie("refreshToken",refreshToken,{
            httpOnly: true,
            maxAge: 72 * 60 * 60 * 1000,
        });

        // res.json(findUser);

        res.json({
            _id: findAdmin?._id,
            firstname: findAdmin?.firstname,
            lastname:findAdmin?.lastname,
            email: findAdmin?.email,
            mobile: findAdmin?.mobile,
            token: generateToken(findAdmin?._id),
        });
    } else {
        throw new Error("Invalid Credentials");
    }

});


// create a function....handle refresh token
const handleRefreshToken = asyncHandler(async (req,res) => {
    const cookie = req.cookies;
   // console.log(cookie);

    if(!cookie?.refreshToken) throw new Error('No Refresh Token in Cookies');
    const refreshToken = cookie.refreshToken;
    // console.log(refreshToken);
    const user = await User.findOne({ refreshToken });
    
    // if we don't find the user then
    if(!user) throw new Error(" No Refresh token present in db or not matched");
        //    and if find the refreshtoken in db or find refreshtoken in cookies.......then we need to verfy that refreshtoken
    jwt.verify(refreshToken,process.env.JWT_SECRET,(err, decoded) => {
        // console.log(decoded); so we use id...
        if(err || user.id !== decoded.id) {
            throw new Error("There is something wrong with refresh token");
        }
        const accessToken = generateToken(user?._id)
        res.json({ accessToken });
    });
    
});

//we need to handle logout also
// logout functionality
const logout = asyncHandler(async (req,res) => {

    const cookie = req.cookies;                        //again we need to check the cookies
    if(!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
    const refreshToken = cookie.refreshToken;
                
    const user = await User.findOne({ refreshToken });
    if(!user) {
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
        });
        return res.sendStatus(204);   //which is forbidden
    }
    await User.findOneAndUpdate({refreshToken}, {
        refreshToken: "",
    });
    
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
    });
    res.sendStatus(204);  //forbidden

});


// Update a user
const updatedUser = asyncHandler(async (req,res) => {
    //1.  const { id } = req.params;
          const { _id } =  req.user;
          validateMongodbId(_id);
    // console.log(req.user);   we will getting user on console
    
    try {
        //2. const updatedUser = await User.findByIdAndUpdate(id , {
            const updatedUser = await User.findByIdAndUpdate(_id , {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
        mobile: req?.body?.mobile,
                                    // to prevent the errors...we do?
    },
    {
        new:true,
    }
    );
    res.json(updatedUser);
    }
    catch(error) {
        throw new Error(error);
    }
});

//save user Adderess

const saveAddress = asyncHandler(async (req,res) => {
    const { _id } = req.user;
    validateMongodbId(_id);
    //below copy from updatedUser
    try {
        //2. const updatedUser = await User.findByIdAndUpdate(id , {
        const updatedUser = await User.findByIdAndUpdate(
        _id,
        {
        address: req?.body?.address,
    },
    {
        new:true,
    }
    );
    res.json(updatedUser);
    }
    catch(error) {
        throw new Error(error);
    }
});


//get all users
const getallUser = asyncHandler(async (req,res) => {
    try {
        const getUsers = await User.find();
        res.json(getUsers);
    }
    catch(error) {
        throw new Error(error);
    }
});

//get a single user

const getaUser = asyncHandler(async (req,res) => {
    const { id } = req.params;
    // console.log(id);
    validateMongodbId(id);

    try 
    {                                    
                    // we need to pass id simply in ...findById( )
         const getaUser = await User.findById(id);  
        res.json({
            getaUser,
        }); 
    } 
    catch(error) {
        throw new Error(error);
    }
});

const deleteaUser = asyncHandler(async (req,res) => {
    const { id } = req.params;
    // console.log(id);
    validateMongodbId(id);

    try 
    {                                    
                    // we need to pass id simply in ...findById( )
         const deleteaUser = await User.findByIdAndDelete(id);  
        res.json({
            deleteaUser,
        }); 
    } 
    catch(error) {
        throw new Error(error);
    }
});

const blockUser = asyncHandler(async (req,res) => {
    const {id} = req.params;
    validateMongodbId(id);
    try {
        const block = await User.findByIdAndUpdate(id , 
        {
            isBlocked: true,
        },
        {
            new: true,
        }
      );

      res.json({
        message: "User Blocked",
      });

    }
    catch(error){
        throw new Error(error);
    }
});
const unblockUser = asyncHandler(async (req,res) => {
    const {id} = req.params;
    validateMongodbId(id);
    try {
        const unblock = await User.findByIdAndUpdate(id , 
        {
            isBlocked: false,
        },
        {
            new: true,
        }
      );

      res.json({
        message: "User UnBlocked",
      });

    }
    catch(error){
        throw new Error(error);
    }
});

const updatePassword = asyncHandler(async (req,res) => {
    const { _id } = req.user;
    const { password } = req.body;  //password that we need to update for the particular user
    validateMongodbId(_id);
    const user = await User.findById(_id);
    if(password) {
        user.password = password;       //after this line new thing...we need to update the password and save it
        const updatedPassword = await user.save();           
        res.json(updatedPassword);
    }
    else
    {
        res.json(user);
    }
});

//for email intergration......generate our token
const forgotPasswordToken = asyncHandler(async (req,res) => {
        // lets create our token generate functunality
        const { email } = req.body;      //to generate token we need email 
        const user = await User.findOne({ email });
        if(!user) throw new Error("User not found with this email");
        try {             // and if we find the user then
            // with the help of userModel.js ke under createPasswordResetToken method h....we will create our token  here
            const token = await user.createPasswordResetToken();
            await user.save();

            const resetURL = `Hi, Please follow this link to reset your password. This link is valid till 10 minutes from now. <a href='http://localhost:5000/api/user/reset-password/${token}'> Click Here </a>`;
      
      //we need to create that dataObject with the help of this data(which is in emailCtrl.js)
            const data = {
                to: email,
                text: "Hey User",
                subject: "Forgot Password Link",
                htm: resetURL,

            };
            sendEmail(data);    // import sendEmail and pass data
            res.json(token);   //it will give you a token
        }
        catch (error) {
            throw new Error(error);
        }
});

const resetPassword = asyncHandler(async (req,res) => {
    const { password } = req.body;
    const { token }  = req.params;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gte: Date.now() },  // here we are checking bcoz our token get expired in 10 min
    });
    if(!user) throw new Error("Token Expired , Please try again later");
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined; // both are undefined bcoz our password is changed so dont need it
    await user.save();
    return res.json(user);
});

const getWishlist = asyncHandler(async (req,res) => {
    // we need to find the user wishlist
    const { _id } = req.user;
    validateMongodbId(_id);
    try
    {
        //with the help of id .... we need to find the user
        const findUser = await User.findById(_id).populate("wishlist");
        res.json(findUser);
    }
    catch (error) {
        throw new Error(error);
    }
});


const userCart = asyncHandler(async (req,res) => {
    // res.send("Hello from cart");
    if (!req.user) {
        return res.status(401).json({ message: "User is not authenticated" });
    }
    const { cart } = req.body;
    const { _id } = req.user;
    validateMongodbId(_id);
    
    try
    {
        let products = [];

        const user = await User.findById(_id);
        // check if user already have product in cart
        const alreadyExistCart = await Cart.findOne({ orderby:user._id });
        if(alreadyExistCart) {
            alreadyExistCart.remove();
        }

        for(let i=0;i<cart.length;i++)
        {
            let object = {};
            object.product = cart[i]._id;
            object.count = cart[i].count;
            object.color = cart[i].color;

            // now we have to calculate our price and  find our price
            let getPrice = await Product.findById(cart[i]._id).select("price").exec();
            object.price = getPrice.price;
            products.push(object);
        }

        let cartTotal = 0;
        for(let i=0;i<products.length;i++)
        {
            cartTotal = cartTotal + products[i].price * products[i].count;       
        }
        console.log(products, cartTotal);

        let newCart = await new Cart({
            products,
            cartTotal,
            orderby: user._id,
        }).save();
        res.json(newCart);
    }
    catch (error) {
        throw new Error(error);
    }
});


const getUserCart = asyncHandler(async (req,res) => {
    const { _id } = req.user;
    validateMongodbId(_id);

    try
    {
        const cart = await Cart.findOne({ orderby: _id });
        res.json(cart);
    }
    catch (error) {
        throw new Error(error);
    }
});


const emptyCart = asyncHandler(async (req,res) => {
    // we need to find the user......copy getUserCart
    const { _id } = req.user;
    validateMongodbId(_id);

    try
    {
        const user = await User.findOne({ _id });
        const cart = await Cart.findOneAndRemove({ orderby: user._id });  //find cart 
        res.json(cart);
    }
    catch (error) {
        throw new Error(error);
    }
});



const applyCoupon = asyncHandler(async (req, res) => {
    const { coupon } = req.body;
    const { _id } = req.user;
    validateMongodbId(_id);
    const validCoupon = await Coupon.findOne({ name: coupon });
    if (validCoupon === null) {
      throw new Error("Invalid Coupon");
    }
    const user = await User.findOne({ _id });
    let { cartTotal } = await Cart.findOne({
      orderby: user._id,
    }).populate("products.product");
    let totalAfterDiscount = (
      cartTotal -
      (cartTotal * validCoupon.discount) / 100
    ).toFixed(2);
    await Cart.findOneAndUpdate(
      { orderby: user._id },
      { totalAfterDiscount },
      { new: true }
    );
    res.json(totalAfterDiscount);
  });
  
  const createOrder = asyncHandler(async (req, res) => {
    const { COD, couponApplied } = req.body;
    const { _id } = req.user;
    validateMongodbId(_id);
    try {
      if (!COD) throw new Error("Create cash order failed");
      const user = await User.findById(_id);
      let userCart = await Cart.findOne({ orderby: user._id });
      let finalAmount = 0;
      if (couponApplied && userCart.totalAfterDiscount) {
        finalAmount = userCart.totalAfterDiscount;
      } else {
        finalAmount = userCart.cartTotal;
      }
  
      let newOrder = await new Order({
        products: userCart.products,
        paymentIntent: {
          id: uniqid(),
          method: "COD",
          amount: finalAmount,
          status: "Cash on Delivery",
          created: Date.now(),
          currency: "usd",
        },
        orderby: user._id,
        orderStatus: "Cash on Delivery",
      }).save();
      let update = userCart.products.map((item) => {
        return {
          updateOne: {
            filter: { _id: item.product._id },
            update: { $inc: { quantity: -item.count, sold: +item.count } },
          },
        };
      });
      const updated = await Product.bulkWrite(update, {});
      res.json({ message: "success" });
    } catch (error) {
      throw new Error(error);
    }
  });

const getOrders = asyncHandler(async (req,res) => {
    const { _id } = req.user;
    validateMongodbId(_id);
    
    try
    {
       const userorders = await Order.findOne({ orderby: _id })
           .populate("products.product")
           .exec();
       res.json(userorders);

    } catch (error) {
        throw new Error(error);
    }
});

const updateOrderStatus = asyncHandler(async (req,res) => {
    const { status } = req.body;
    const { id } = req.params;
    validateMongodbId(id);

    try
    {
        const updateOrderStatus = await Order.findByIdAndUpdate(   //orderModel.js m dekho kya update krna h....orderStatus and paymentIntent
        id, 
       {
             orderStatus: status,
             paymentIntent: {
             status: status,
              },
        },
        { new: true }
        );  
        res.json(updateOrderStatus);
    }
    catch (error) {
        throw new Error(error);
    }
});
 

module.exports = {
        createUser ,
        loginUserCtrl , 
        getallUser , 
        getaUser , 
        deleteaUser ,
        updatedUser ,
        blockUser , 
        unblockUser ,
        handleRefreshToken,
        logout,
        updatePassword,
        forgotPasswordToken,
        resetPassword,
   
        loginAdmin,
        getWishlist,
        saveAddress,
   
        userCart,
        getUserCart, 
        emptyCart,

        applyCoupon,
        createOrder,
        getOrders,

        updateOrderStatus,
       };
   
   
   



// validateMongodbid(id);....kr diya in sb me0
// updatedUser
// deleteaUser
// getaUser
// blockUser
// unblockUser