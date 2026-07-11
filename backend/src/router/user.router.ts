import {Router} from 'express';
import asyncHandler from 'express-async-handler';
import { UserController } from '../controller/user.controller';
import authMiddleware from '../middleware/auth.middleware';
const route=Router();

route.use(authMiddleware);

route.get("/get-user/:userId",asyncHandler(UserController.getById));
route.get("/get-all-users",asyncHandler(UserController.getAll));
route.get("/paginated",asyncHandler(UserController.getPaginated));
route.put("/update-user/:userId",asyncHandler(UserController.updateUser));
route.put("/update-user-email-notification",asyncHandler(UserController.updateUserEmailNotification));
route.delete("/delete-user/:userid",asyncHandler(UserController.deleteUser));

export default route;