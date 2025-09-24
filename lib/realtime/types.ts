export type RealtimeNotification =
  | {
      type: "connected";
      timestamp: string;
    }
  | {
      type: "direct_message";
      conversationId: string;
      messageId: string;
      body: string;
      sender: {
        id: string;
        name: string;
      };
      createdAt: string;
    }
  | {
      type: "badge_awarded";
      awardId: string;
      badge: {
        code: string;
        name: string;
        description: string | null;
      };
      reason?: string | null;
      awardedAt: string;
    };
