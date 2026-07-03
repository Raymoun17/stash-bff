import argon2 from "argon2";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";
import { UserRepository } from "../repositories/user.repository";
import { ConflictError, UnauthorizedError } from "../lib/http-error";
import { TokenService } from "./token.service";
import { RefreshTokenService } from "./refresh-token.service";

function safeUser(user: { id: string; username: string }) {
    return {
        id: user.id,
        username: user.username,
    };
}

export class AuthService {
    static async register(input: RegisterInput) {
        const existingUser = await UserRepository.findByUsername(input.username);

        if (existingUser) {
            throw new ConflictError("Username is already registered");
        }

        const passwordHash = await argon2.hash(input.password);

        const user = await UserRepository.create({
            username: input.username,
            passwordHash,
        });

        const accessToken = await TokenService.createAccessToken({
            sub: user.id,
            username: user.username,
        });

        const refreshToken = await RefreshTokenService.create(user.id);

        return {
            user: safeUser(user),
            accessToken,
            refreshToken,
        };
    }

    static async login(input: LoginInput) {
        const user = await UserRepository.findByUsername(input.username);

        if (!user) {
            throw new UnauthorizedError("Invalid username or password");
        }

        const validPassword = await argon2.verify(
            user.passwordHash,
            input.password
        );

        if (!validPassword) {
            throw new UnauthorizedError("Invalid username or password");
        }

        const accessToken = await TokenService.createAccessToken({
            sub: user.id,
            username: user.username,
        });

        const refreshToken = await RefreshTokenService.create(user.id);

        return {
            user: safeUser(user),
            accessToken,
            refreshToken,
        };
    }

    static async refresh(refreshToken: string) {
        const rotated = await RefreshTokenService.rotate(refreshToken);

        const accessToken = await TokenService.createAccessToken({
            sub: rotated.user.id,
            username: rotated.user.username,
        });

        return {
            user: rotated.user,
            accessToken,
            refreshToken: rotated.refreshToken,
        };
    }

    static async logout(refreshToken: string | undefined) {
        if (!refreshToken) {
            return;
        }

        await RefreshTokenService.revoke(refreshToken);
    }
}
