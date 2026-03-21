import User from '../models/User';
/**
 * XP artırma və səviyyə (level) yüksəltmə məntiqi
 *
 * Mövcud sistemdə sadə formada işləyir:
 *   - Hər 1000 XP → +1 level
 *   - Level artanda bonus XP və ya başqa mükafat əlavə oluna bilər
 */
export class XpService {
    /**
     * İstifadəçiyə XP əlavə edir və lazım gələrsə səviyyəsini yüksəldir
     * @param userId MongoDB _id (string)
     * @param xpAmount əlavə olunacaq XP miqdarı (müsbət ədəd)
     * @returns yenilənmiş user obyekti və ya null (tapılmasa)
     */
    static async addXp(userId, xpAmount) {
        if (xpAmount <= 0) {
            throw new Error('XP mənfi və ya sıfır ola bilməz');
        }
        const user = await User.findById(userId);
        if (!user)
            return null;
        const oldLevel = user.level;
        // XP əlavə et
        user.xp += xpAmount;
        // Level hesablama (sadə formula: hər 1000 XP = +1 level)
        // Daha mürəkkəb formula istəsən (məsələn exponential) sonra dəyişə bilərik
        const newLevel = Math.floor(user.xp / 1000) + 1;
        if (newLevel > oldLevel) {
            user.level = newLevel;
            // Level artanda bonus əlavə etmək istəsən buraya yaz
            // məsələn: user.xp += 200; // level-up bonusu
            console.log(`User ${user.username || user.email} level up: ${oldLevel} → ${newLevel}`);
        }
        await user.save();
        return {
            user,
            levelUp: newLevel > oldLevel
        };
    }
    /**
     * Match qələbəsi üçün XP ver (məsələn 500 XP + bonus)
     */
    static async awardMatchWin(userId) {
        // Qələbə üçün baza 500 XP + cari level-ə görə kiçik bonus
        const baseXp = 500;
        const user = await User.findById(userId);
        if (!user)
            throw new Error('User tapılmadı');
        const bonus = Math.floor(user.level * 20); // məsələn hər level üçün +20 XP
        return this.addXp(userId, baseXp + bonus);
    }
    /**
     * Tapşırıq / test keçdikdə kiçik XP mükafatı
     */
    static async awardTaskComplete(userId, difficulty = 'medium') {
        const xpMap = { easy: 150, medium: 300, hard: 600 };
        return this.addXp(userId, xpMap[difficulty]);
    }
    /**
     * Cari XP və level-ə əsasən növbəti level üçün nə qədər XP lazım olduğunu hesabla
     */
    static getNextLevelProgress(user) {
        const currentXp = user.xp;
        const currentLevel = user.level;
        const requiredForNext = (currentLevel) * 1000; // sadə formula
        const progress = currentXp % 1000;
        const percent = Math.min(99.9, (progress / 1000) * 100);
        return {
            currentXp: progress,
            requiredXp: 1000,
            progressPercent: percent
        };
    }
}
//# sourceMappingURL=xp.service.js.map