import jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwtSecret';

const generateToken = (id: string): string => {
    const secret = getJwtSecret();
    const expiresIn = (process.env.JWT_EXPIRE || '30d') as jwt.SignOptions['expiresIn'];

    return jwt.sign({ id }, secret, {
        expiresIn,
    });
};

export default generateToken;
