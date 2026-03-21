import User from '../models/User';
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı' });
        res.json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const updateCharacter = async (req, res) => {
    try {
        const { gender, emotion, clothing, hairColor, skin, clothingColor, username } = req.body;
        const user = await User.findById(req.user.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı' });
        // Character fields güncəllə
        if (gender)
            user.character.gender = gender;
        if (emotion)
            user.character.emotion = emotion;
        if (clothing)
            user.character.clothing = clothing;
        if (hairColor)
            user.character.hairColor = hairColor;
        if (skin)
            user.character.skin = skin;
        if (clothingColor)
            user.character.clothingColor = clothingColor;
        if (username) {
            // Character username unikallığını yoxla
            const existingUser = await User.findOne({ 'character.username': username, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Bu personaj adı artıq istifadə olunub' });
            }
            user.character.username = username;
        }
        await user.save();
        res.json({ success: true, data: user.character });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -email');
        if (!user)
            return res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı' });
        res.json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
//# sourceMappingURL=user.controller.js.map