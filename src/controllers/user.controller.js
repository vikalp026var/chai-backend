import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

    const {fullName, email, userName, password } = req.body
    console.log('email', email);

    if(
        [fullName, email, userName, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, 'User already exits')
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverLocalPath);

    if(!avatar){
        throw new ApiError(400, 'Avatar field is required')
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
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

    return ApiResponse(201).json(ApiResponse(200, createdUser, "User Registred Successfully"))


})

export default registerUser