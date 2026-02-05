import crypto from 'crypto';

export function random(len: number): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const randomBytes = crypto.randomBytes(len);
    let result = "";

    for (let i = 0; i < len; i++) {
        result += chars[randomBytes[i] % chars.length];
    }

    return result;
}
