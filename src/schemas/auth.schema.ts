import { z } from "zod";

const usernameSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Username may only contain letters, numbers, and underscores");

export const registerSchema = z.object({
    username: usernameSchema,
    password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
    username: usernameSchema,
    password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
