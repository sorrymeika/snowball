import HomeController from "./home/controllers/HomeController";

export default {
    '/': HomeController,
    '/test': import("../Test"),
};