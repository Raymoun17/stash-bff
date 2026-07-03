import { SignJWT, jwtVerify } from "jose";
import { UnauthorizedError } from "../lib/http-error";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
}

export type AccessTokenPayload = {
    sub: string;
    username: string;
};

export class TokenService {
    static async createAccessToken(payload: AccessTokenPayload) {
        return new SignJWT({
            username: payload.username,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(payload.sub)
            .setIssuedAt()
            .setExpirationTime(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m")
            .sign(secret);
    }

    static async verifyAccessToken(token: string) {
        try {
            const result = await jwtVerify(token, secret);

            const userId = result.payload.sub;
            const username = result.payload.username;

            if (!userId || typeof username !== "string") {
                throw new UnauthorizedError("Invalid access token");
            }

            return {
                id: userId,
                username,
            };
        } catch {
            throw new UnauthorizedError("Invalid or expired access token");
        }
    }

    static createRefreshToken() {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        return Buffer.from(bytes).toString("base64url");
    }

    static async hashRefreshToken(refreshToken: string) {
        const data = new TextEncoder().encode(refreshToken);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Buffer.from(hashBuffer).toString("base64url");
    }
}
