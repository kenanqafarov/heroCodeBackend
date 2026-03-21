import jwt from 'jsonwebtoken';
export const protect = (req, res, next) => {
    let token = req.headers.authorization?.startsWith('Bearer')
        ? req.headers.authorization.split(' ')[1]
        : null;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token tələb olunur' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, isAdmin: !!decoded.isAdmin };
        next();
    }
    catch (err) {
        return res.status(401).json({ success: false, message: 'Etibarsız token' });
    }
};
export const adminOnly = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ success: false, message: 'Yalnız admin icazəsi ilə' });
    }
    next();
};
//# sourceMappingURL=admin.middleware.js.map