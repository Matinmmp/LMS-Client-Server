import { ResourceOptions } from "adminjs";
import CategoryModel from "../models/category.model.js";

const CategoryResourceOptions: ResourceOptions = {
    navigation: {
        name: "دسته‌بندی‌ها",
        icon: "Tags",
    },
    listProperties: ["name"], // فقط نام در لیست نمایش داده شود
    filterProperties: ["name"], // فیلتر کردن بر اساس نام
    editProperties: ["name", "parentCategoryId"], // فیلدهای قابل ویرایش
    showProperties: ["name", "parentCategoryId"], // فیلدهای قابل مشاهده
    properties: {
        parentCategoryId: {
            type: "reference", // نوع مرجع برای ارتباط با مدل دیگر
            reference: "Category", // مرجع به مدل دسته‌بندی
            isVisible: {
                list: false, // در لیست نمایش داده نشود
                filter: true, // در فیلتر نمایش داده شود
                show: true, // در نمایش جزئیات نمایش داده شود
                edit: true, // در فرم ویرایش نمایش داده شود
            },
            isTitle: false, // این فیلد به‌عنوان عنوان اصلی استفاده نمی‌شود
        },
    },
};

export default {
    resource: CategoryModel,
    options: CategoryResourceOptions,
};
