import { Router } from "express";
import { login, logout, register, session } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, registerSchema } from "../schemas/requests.js";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), asyncHandler(login));
authRouter.post("/register", validate(registerSchema), asyncHandler(register));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/session", authenticate, asyncHandler(session));
