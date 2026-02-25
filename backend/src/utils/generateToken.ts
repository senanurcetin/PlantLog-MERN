import jwt from 'jsonwebtoken';

const generateToken = (id: string): string => {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkey_replace_in_production';
    const expiresIn = (process.env.JWT_EXPIRE || '30d') as jwt.SignOptions['expiresIn'];

    return jwt.sign({ id }, secret, {
        expiresIn,
    });
};

export default generateToken;
