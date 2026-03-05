import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch(error){
        throw new ApiError(500, 'Something went wrong while generating refresh and access Token')
    }
}



const registerUser = asyncHandler(async (req, res) => {
    //get user from frontend 
    //validation - not empty 
    // Check user already register or not : user name ,email 
    // check for images ,check for avtar 
    //upload them to cloudinary, avtar 
    // create user object or not - create entry in db 
    // reemove password and refresh token field from response 
    // check for user creation 
    // return res 

    const {fullname, email, username, password } = req.body;

    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, 'User already exits')
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.coverImage[0]?.path;

    // console.log('Avatar', avatarLocalPath)

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverLocalPath);

    // console.log('Avatar field', avatar)

    if(!avatar){
        throw new ApiError(400, 'Avatar field is required')
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        password,
        coverImage: coverImage?.url || "",
        email: email,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, 'Error in registring user')
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const {email, username, password} = req.body;

    if(!(username || email)){
        throw new ApiError(400, 'username or email is required')
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, 'User does not exit')
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    // console.log('isPasswordValid', password, isPasswordValid)
    if(!isPasswordValid){
        throw new ApiError(401, 'Invalid user credentials')
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    
    const logginUser = await User.findById(user._id).select('-password -refreshToken')

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie('accessToken', accessToken, options).cookie('refreshToken', refreshToken, options).json(
        new ApiResponse(200, {
            user: logginUser, accessToken, refreshToken
        }, 'User logged In Successfully')
    )

})

const logoutUser = asyncHandler(async(req, res)=> {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie('accessToken', options).cookie('refreshToken', options).json(new ApiResponse(200, {}, 'User logged Out'))
})

const refreshAccessToken = asyncHandler(async(req, res)=> {
    const { incomingAccessToken } = req.cookie.refreshToken || req.body.refreshToken;
    if(!incomingAccessToken) {
        throw new ApiError(401, 'Unauthorized request')
    }
    try {
        const decodedToken = jwt.verify(incomingAccessToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, 'Invalid user')
        }
    
        if(incomingAccessToken != user?.refreshToken){
            throw new ApiError(401, "Refresh Token Expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {newRefreshToken} = await generateAccessAndRefreshTokens(user?._id);
    
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
            new ApiResponse(
                200, {
                    accessToken, newRefreshToken
                },
                "Access token refresh "
            )
        )
    } catch (error) {
        throw new ApiError(401, "Invalid Token")
    }

    

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}