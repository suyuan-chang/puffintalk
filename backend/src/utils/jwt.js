const JWT_SECRET = process.env.JWT_SECRET || 'puffintalk_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
