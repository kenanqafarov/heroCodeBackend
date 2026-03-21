import Match from '../models/Match';
const waitingQueue = [];
export const joinQueue = async (req, res) => {
    try {
        const userId = req.user.id;
        const activeMatch = await Match.findOne({
            $or: [{ player1Id: userId }, { player2Id: userId }],
            status: { $in: ['Waiting', 'Active'] }
        });
        if (activeMatch) {
            return res.json({ success: true, data: activeMatch, message: 'Artıq aktiv matçınız var.' });
        }
        if (waitingQueue.includes(userId)) {
            return res.status(400).json({ success: false, message: 'Artıq növbədəsiniz' });
        }
        const opponentId = waitingQueue.find((id) => id !== userId);
        if (opponentId) {
            const idx = waitingQueue.indexOf(opponentId);
            if (idx !== -1)
                waitingQueue.splice(idx, 1);
            const match = await Match.create({
                player1Id: opponentId,
                player2Id: userId,
                status: 'Active',
            });
            return res.json({ success: true, data: match, message: 'Match tapıldı' });
        }
        waitingQueue.push(userId);
        return res.json({ success: true, message: 'Queue-yə qoşuldunuz. Rəqib gözlənilir.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const leaveQueue = async (req, res) => {
    const idx = waitingQueue.indexOf(req.user.id);
    if (idx !== -1)
        waitingQueue.splice(idx, 1);
    res.json({ success: true, message: 'Queue-dən çıxdınız' });
};
export const getMyMatch = async (req, res) => {
    try {
        const match = await Match.findOne({
            $or: [
                { player1Id: req.user.id },
                { player2Id: req.user.id }
            ],
            status: { $in: ['Waiting', 'Active'] }
        });
        if (!match) {
            return res.json({ success: true, data: null });
        }
        res.json({ success: true, data: match });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const attack = async (req, res) => {
    try {
        const { damage = 10 } = req.body;
        const userId = req.user.id;
        const match = await Match.findOne({
            $or: [{ player1Id: userId }, { player2Id: userId }],
            status: 'Active'
        });
        if (!match) {
            return res.status(404).json({ success: false, message: 'Aktiv matç tapılmadı' });
        }
        if (match.player1Id.toString() === userId) {
            match.player2Health = Math.max(0, match.player2Health - damage);
        }
        else {
            match.player1Health = Math.max(0, match.player1Health - damage);
        }
        if (match.player1Health <= 0 || match.player2Health <= 0) {
            match.status = 'Finished';
            match.winnerId = match.player1Health > 0 ? match.player1Id : match.player2Id;
            match.endedAt = new Date();
        }
        await match.save();
        res.json({ success: true, data: match });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const leaveMatch = async (req, res) => {
    try {
        const match = await Match.findOneAndUpdate({ $or: [{ player1Id: req.user.id }, { player2Id: req.user.id }], status: 'Active' }, { status: 'Finished', endedAt: new Date() }, { new: true });
        if (!match) {
            return res.status(404).json({ success: false, message: 'Aktiv matç tapılmadı' });
        }
        res.json({ success: true, message: 'Matçdan çıxdınız' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
export const startGameQuestions = async (req, res) => {
    try {
        // Realda DB-dən çəkmək olar, indi sadəcə mock
        const mockQuestions = [
            { id: "q1", description: "Verilmiş ədədi 2-yə vur", functionSignature: "function attack(a) {}", testCases: [{ input: 5, output: 10 }] },
            { id: "q2", description: "Ən böyük ədədi tap", functionSignature: "function attack(arr)", testCases: [{ input: [3, 1, 4], output: 4 }] }
        ];
        res.json({ success: true, data: mockQuestions });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
//# sourceMappingURL=matchmaking.controller.js.map