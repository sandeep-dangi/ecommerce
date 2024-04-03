const { generateToken } = require("../config/jwtToken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongodbid = require("../utils/validateMongodbid");
const { generateRefreshToken } = require("../config/refreshtoken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("./emailCtrl");

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
          validateMongodbid(_id);
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
    validateMongodbid(id);

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
    validateMongodbid(id);

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
    validateMongodbid(id);
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
    validateMongodbid(id);
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
    validateMongodbid(_id);
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
     resetPassword
    };




// validateMongodbid(id);....kr diya in sb me0
// updatedUser
// deleteaUser
// getaUser
// blockUser
// unblockUser