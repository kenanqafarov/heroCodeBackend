import User from '../models/User';
import Match from '../models/Match';
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, data: users });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const getAllMatches = async (req, res) => {
    try {
        const matches = await Match.find()
            .populate('player1Id player2Id winnerId', 'username email');
        res.json({ success: true, data: matches });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı' });
        res.json({ success: true, message: 'İstifadəçi silindi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
//# sourceMappingURL=admin.controller.js.map