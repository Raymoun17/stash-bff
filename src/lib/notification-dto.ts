type NotificationRecord = {
    id: string;
    type: string;
    watchlistItemId: string;
    payload: unknown;
    readAt: Date | null;
    createdAt: Date;
    watchlistItem: { title: string | null; imageUrl: string | null; retailer: string };
};

export function toNotificationDto(notification: NotificationRecord) {
    return {
        id: notification.id,
        type: notification.type,
        productId: notification.watchlistItemId,
        productTitle: notification.watchlistItem.title ?? "Saved product",
        productImageUrl: notification.watchlistItem.imageUrl,
        retailer: notification.watchlistItem.retailer,
        payload: notification.payload,
        createdAt: notification.createdAt,
        read: notification.readAt !== null,
    };
}
