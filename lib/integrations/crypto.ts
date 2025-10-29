/**
 * Token Encryption/Decryption Utilities
 *
 * Secure encryption for OAuth tokens before storing in database.
 */

import crypto from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
        env.INTEGRATION_ENCRYPTION_KEY!,
        salt,
        100000,
        KEY_LENGTH,
        "sha256"
    );
}

export function encryptToken(token: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, "hex")]);
    return combined.toString("base64");
}

export function decryptToken(encryptedToken: string): string {
    const combined = Buffer.from(encryptedToken, "base64");

    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
        SALT_LENGTH + IV_LENGTH,
        SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = getKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}
