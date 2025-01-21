import { AdminJSOptions } from "adminjs";
import CategoryResource from "./CategoryOptions.js";


const AdminOptions: AdminJSOptions = {
    resources: [
        CategoryResource
    ],
    branding: {
        companyName: 'آکادمی من', // نام شرکت در پنل ادمین
        logo: 'https://buckettest.storage.c2.liara.space/images/logo-main.png', // لوگو شرکت
    },
};

export default AdminOptions;