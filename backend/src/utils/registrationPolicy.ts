/** Self-service operator signup is opt-in in any production environment. */
export const isSelfRegistrationEnabled = (): boolean => {
    if (process.env.REGISTRATION_ENABLED === 'true') return true;
    if (process.env.REGISTRATION_ENABLED === 'false') return false;
    return process.env.NODE_ENV !== 'production';
};
