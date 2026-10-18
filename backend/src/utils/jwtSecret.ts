export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret || secret.length < 32 ||
        secret.includes('replace-with') ||
        secret === 'supersecretjwtkey_replace_in_production') {
        throw new Error('JWT_SECRET must be a unique secret of at least 32 characters');
    }
    return secret;
};
