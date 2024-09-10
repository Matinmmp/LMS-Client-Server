const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { app } from "./app";
import connectDB from './utils/db';
require('dotenv').config();


const fs = require('fs');


const client = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT,
    credentials: {
        accessKeyId: process.env.LIARA_ACCESS_KEY,
        secretAccessKey: process.env.LIARA_SECRET_KEY
    }
})

const fileName = 'images.jpg';
const filePath = `./${fileName}`


app.listen(process.env.PORT, async () => {
    console.log('Server is listening on port: ' + process.env.PORT);
    connectDB();

    // const params = {
    //     Bucket: process.env.LIARA_BUCKET_NAME,
    //     Key: 'images.jpg3'
    // }
    // try {
    //     const command = new GetObjectCommand(params);
    //     const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // لینک معتبر به مدت 1 ساعت
    //     console.log('Presigned URL:', url);
    // } catch (error) {
    //     console.log('Error generating presigned URL:', error);
    // }

    // client.send(new DeleteObjectCommand(params), (error:any, data:any) => {
    //     if (error) {
    //         console.log(error);
    //     } else {
    //         console.log("File deleted successfully");
    //     }
    // });

    // fs.readFile(filePath, async (err: any, fileContent: any) => {
    //     if (err) {
    //         console.error('Error reading the file:', err);
    //         return;
    //     }

    //     const params = {
    //         Body: fileContent,
    //         Bucket: process.env.LIARA_BUCKET_NAME,
    //         Key: `${fileName}3`,
    //         ACL: 'public-read'
    //     };

    //     try {
    //         await client.send(new PutObjectCommand(params));
    //         console.log('File uploaded successfully');
    //     } catch (error) {
    //         console.log('Error uploading file:', error);
    //     }
    // });
});