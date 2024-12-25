
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function randomLetterGenerator() {
    const length = 20
    const charset = "QWERTYUIOPASDFGHJKLZXCVBNMabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal as string;
}

export default randomLetterGenerator;

// نام‌گذاری با UUID
// const fileName = `${uuidv4()}.mp4`;

// // نام‌گذاری با SHA256
// const fileNameHash = `${crypto.createHash('sha256').update('video1.mp4').digest('hex')}.mp4`;

// console.log(fileName); // مثال: 3d8e5d5c-5a7a-4267-b125-89e2e8a2b7d9.mp4
// console.log(fileNameHash); // مثال: c6f53a85c7c63b1d9a8f99d920ac6b2.mp4