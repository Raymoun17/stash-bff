import { NotFoundError } from "../lib/http-error";
import { NotificationRepository } from "../repositories/notification.repository";

export class NotificationService {
    static list(userId: string) {
        return NotificationRepository.list(userId);
    }

    static async markRead(userId: string, id: string) {
        const result = await NotificationRepository.markRead(id, userId, new Date());
        if (result.count === 0) throw new NotFoundError("Notification not found");
        return { updated: true };
    }

    static async dismiss(userId: string, id: string) {
        const result = await NotificationRepository.dismiss(id, userId, new Date());
        if (result.count === 0) throw new NotFoundError("Notification not found");
        return { dismissed: true };
    }

    static async dismissAll(userId: string) {
        const result = await NotificationRepository.dismissAll(userId, new Date());
        return { dismissed: result.count };
    }
}
