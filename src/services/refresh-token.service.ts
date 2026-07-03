import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { UnauthorizedError } from "../lib/http-error";
import { TokenService } from "./token.service";

const REFRESH_TOKEN_EXPIRES_DAYS = Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30
);

export class RefreshTokenService {
    static async create(userId: string) {
        const refreshToken = TokenService.createRefreshToken();
        const tokenHash = await TokenService.hashRefreshToken(refreshToken);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

        await RefreshTokenRepository.create({
            userId,
            tokenHash,
            expiresAt,
        });

        return refreshToken;
    }

    static async rotate(oldRefreshToken: string) {
        const oldHash = await TokenService.hashRefreshToken(oldRefreshToken);

        const existing = await RefreshTokenRepository.findValidByHash(oldHash);

        if (!existing) {
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        await RefreshTokenRepository.revokeByHash(oldHash);

        const newRefreshToken = await this.create(existing.userId);

        return {
            user: {
                id: existing.user.id,
                username: existing.user.username,
            },
            refreshToken: newRefreshToken,
        };
    }

    static async revoke(refreshToken: string) {
        const tokenHash = await TokenService.hashRefreshToken(refreshToken);
        await RefreshTokenRepository.revokeByHash(tokenHash);
    }
}
