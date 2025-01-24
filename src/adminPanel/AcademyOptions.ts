// import { ResourceOptions } from "adminjs";
// import AcademyModel from "../models/academy.model.js";
// import { Components } from "./components/Components.js";


// const AcademyResourceOptions: ResourceOptions = {
//     navigation: {
//         name: "آکادمی‌ها",
//         icon: "Tags",
//     },
//     listProperties: ["engName", "faName", "rating", "totalStudents", "totalTeachers", "totalCourses"], // نمایش فیلدها در لیست
//     filterProperties: ["engName", "faName"], // فیلتر کردن بر اساس نام انگلیسی یا فارسی
//     editProperties: ["engName", "faName", "tags", "description", "longDescription", "courses", "teachers"], // فیلدهای قابل ویرایش
//     showProperties: ["engName", "faName", "tags", "description"], // فیلدهای قابل مشاهده

//     actions: {
//         new: {
//             before: async (request) => {
//                 // if (request.payload?.avatar) {
//                 //     const { avatar } = request.payload;
//                 //     const buffer = Buffer.from(avatar.split(",")[1], "base64");
//                 //     const imageName = `${uuidv4()}.png`;

//                 //     const imageUrl = await uploadFileToS3(buffer, imageName);

//                 //     request.payload.avatar = { imageName, imageUrl };
//                 // }
//                 console.log('new', request)
//                 return request;
//             },
//         },
//         edit: {
//             before: async (request, context) => {
//                 // const academy = await AcademyModel.findById(context.record?.id);

//                 // if (request.payload?.avatar && typeof request.payload.avatar === "string") {
//                 //     const { avatar } = request.payload;
//                 //     const buffer = Buffer.from(avatar.split(",")[1], "base64");
//                 //     const imageName = `${uuidv4()}.jpg`;

//                 //     const imageUrl = await uploadFileToS3(buffer, imageName);

//                 //     // حذف تصویر قبلی
//                 //     if (academy?.avatar?.imageName) {
//                 //         await deleteFileFromS3(academy.avatar.imageName);
//                 //     }

//                 //     request.payload.avatar = { imageName, imageUrl };
//                 // }
//                 console.log('edit', request)
//                 console.log('edit', context)

//                 return request;
//             },
//         },
//     },

//     properties: {
//         courses: {
//             type: "reference",
//             isArray: true,
//             reference: "Course",
//             isVisible: {
//                 list: false, // در لیست نمایش داده نشود
//                 filter: true, // در فیلتر نمایش داده شود
//                 show: true, // در نمایش جزئیات نمایش داده شود
//                 edit: true, // در فرم ویرایش نمایش داده شود
//             },
//             isTitle: false,
//         },
//         teachers: {
//             type: "reference",
//             isArray: true,
//             reference: "Teacher",
//             isVisible: {
//                 list: false, // در لیست نمایش داده نشود
//                 filter: true, // در فیلتر نمایش داده شود
//                 show: true, // در نمایش جزئیات نمایش داده شود
//                 edit: true, // در فرم ویرایش نمایش داده شود
//             },
//             isTitle: false,
//         },
//         seoMeta: {
//             type: "mixed",
//             isVisible: { list: false, show: true, edit: true },
//         },

//         longDescription: {
//             type: "richtext",
//             components: {
//                 edit: Components.DescriptionInput, // Custom rich text editor for editing
                
//               },
            
//             isVisible: { list: false, show: true, edit: true },
//         },
//     },


// };

// export default {
//     resource: AcademyModel,
//     options: AcademyResourceOptions,
// };
