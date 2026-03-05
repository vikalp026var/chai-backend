import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
})

const uploadCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;
        // console.log('Avatar in cloudinary', localFilePath)
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        //file has been upload successfully 
        // console.log("file is upload successfully", response.url);
        
        if(fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response;
    }catch(error){
        console.error("Error uploading to Cloudinary:", error);
        if(localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}

export {uploadCloudinary};