import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicBusinessPathsByIds } from "@/services/businesses";
import { getProfilesByIds } from "@/services/profiles";
import { getMarketplaceListingPathsByIds } from "@/services/marketplace";
import {
  getConversationPartner,
  getConversationsForUser,
  getMessagePageForConversation,
  getUnreadConversationCountsForUser,
  hideConversationForUser,
  markConversationAsRead,
  sendMessage,
  subscribeToConversationUpdates,
  subscribeToMessages,
  subscribeToUserMessages,
} from "@/services/messages";
import { playMessageNotificationSound, prepareMessageNotificationSound } from "@/lib/message-notification-sound";
import type { ConversationFrontend, MessageFrontend } from "@/types/database";

export type MarketplaceChatListing = {
  id: string;
  title: string;
  price: string;
  imageUrl?: string | null;
  href: string;
  sellerName: string;
};

export type MarketplaceChatConversation = {
  conversation: ConversationFrontend;
  partnerName: string;
  partnerAvatar?: string | null;
  contextTitle: string;
  contextSubtitle: string;
  contextImageUrl?: string | null;
  contextHref?: string;
  contextPrice?: string;
  lastMessage?: string;
  lastMessageAt?: string;
};

type MarketplaceChatState = {
  view: "inbox" | "conversation";
  conversations: MarketplaceChatConversation[];
  conversationsLoading: boolean;
  active: MarketplaceChatConversation | null;
  messages: MessageFrontend[];
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  loading: boolean;
  minimized: boolean;
  sending: boolean;
};

type OpenMarketplaceChatOptions = {
  conversation: ConversationFrontend;
  listing: MarketplaceChatListing;
};

type MarketplaceChatContextValue = {
  chat: MarketplaceChatState | null;
  openMarketplaceChat: (options: OpenMarketplaceChatOptions) => Promise<void>;
  openMarketplaceChatInbox: () => Promise<void>;
  selectMarketplaceChat: (conversation: MarketplaceChatConversation) => Promise<void>;
  loadOlderMarketplaceChatMessages: () => Promise<void>;
  backToMarketplaceChatInbox: () => Promise<void>;
  closeMarketplaceChat: () => void;
  minimizeMarketplaceChat: () => void;
  restoreMarketplaceChat: () => void;
  sendMarketplaceChatMessage: (text: string) => Promise<boolean>;
  hideMarketplaceChatConversation: (conversationId: string) => Promise<boolean>;
};

const MarketplaceChatContext = createContext<MarketplaceChatContextValue | null>(null);

function getConversationContext(conversation: ConversationFrontend, partnerName: string) {
  const businessName = conversation.businessName?.trim();
  if (conversation.contextType === "marketplace") {
    return {
      title: (businessName || "").replace(/^Marketplace:\s*/, "").replace(/\s+\[[^\]]+\]$/, "") || "Anúncio do Marketplace",
      subtitle: "Anúncio do Marketplace",
    };
  }
  if (conversation.contextType === "business") {
    return { title: businessName || "Negocio", subtitle: "Negocio" };
  }
  return { title: partnerName || "Conversa antiga", subtitle: "Conversa antiga" };
}

async function buildConversationItems(conversations: ConversationFrontend[], userId: string) {
  const partnerIds = conversations.map((conversation) => getConversationPartner(conversation, userId));
  const listingIds = conversations
    .filter((conversation) => conversation.contextType === "marketplace" && conversation.marketplaceListingId)
    .map((conversation) => conversation.marketplaceListingId!);
  const businessIds = conversations
    .filter((conversation) => conversation.contextType !== "marketplace" && conversation.businessId)
    .map((conversation) => conversation.businessId!);
  const [profiles, listingPaths, businessPaths] = await Promise.all([
    getProfilesByIds(partnerIds),
    getMarketplaceListingPathsByIds(listingIds),
    getPublicBusinessPathsByIds(businessIds),
  ]);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return conversations.map((conversation) => {
    const partnerId = getConversationPartner(conversation, userId);
    const profile = profilesById.get(partnerId);
    const partnerName = profile?.name?.trim()
      || (conversation.closedAt ? "Responsável anterior" : conversation.businessName?.trim())
      || "Contato";
    const context = getConversationContext(conversation, partnerName);
    return {
      conversation,
      partnerName,
      partnerAvatar: profile?.avatar || null,
      contextTitle: context.title,
      contextSubtitle: context.subtitle,
      contextHref: conversation.contextType === "marketplace" && conversation.marketplaceListingId
        ? listingPaths.get(conversation.marketplaceListingId)
        : conversation.businessId
          ? businessPaths.get(conversation.businessId)
          : undefined,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    } satisfies MarketplaceChatConversation;
  }).sort((first, second) => {
    const firstActivity = Date.parse(first.lastMessageAt || first.conversation.createdAt) || 0;
    const secondActivity = Date.parse(second.lastMessageAt || second.conversation.createdAt) || 0;
    return secondActivity - firstActivity;
  });
}

export function MarketplaceChatProvider({ children }: { children: ReactNode }) {
  const { session, refreshUnread } = useAuth();
  const [chat, setChat] = useState<MarketplaceChatState | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof subscribeToMessages> | null>(null);
  const inboxSubscriptionRef = useRef<ReturnType<typeof subscribeToConversationUpdates> | null>(null);
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const requestIdRef = useRef(0);
  const inboxLoadedRef = useRef(false);
  const inboxNeedsRefreshRef = useRef(false);
  const inboxStartupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inboxRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unsubscribe = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
  }, []);

  const unsubscribeInbox = useCallback(() => {
    inboxSubscriptionRef.current?.unsubscribe();
    inboxSubscriptionRef.current = null;
    if (inboxStartupTimerRef.current) clearTimeout(inboxStartupTimerRef.current);
    if (inboxRefreshTimerRef.current) clearTimeout(inboxRefreshTimerRef.current);
    inboxStartupTimerRef.current = null;
    inboxRefreshTimerRef.current = null;
    inboxLoadedRef.current = false;
    inboxNeedsRefreshRef.current = false;
  }, []);

  useEffect(() => {
    prepareMessageNotificationSound();
  }, []);

  useEffect(() => {
    const userId = session?.userId;
    if (!userId) return;

    const seenMessageIds = new Set<string>();
    const notificationSubscription = subscribeToUserMessages(userId, (message) => {
      if (message.senderId === userId || seenMessageIds.has(message.id)) return;
      seenMessageIds.add(message.id);
      if (seenMessageIds.size > 100) seenMessageIds.delete(seenMessageIds.values().next().value!);

      playMessageNotificationSound();

      const current = chatRef.current;
      const inboxIsHandlingUpdate = current?.view === "inbox";
      const activeConversationIsHandlingUpdate = current?.view === "conversation"
        && current.active?.conversation.id === message.conversationId;
      if (inboxIsHandlingUpdate || activeConversationIsHandlingUpdate) return;

      if (notificationRefreshTimerRef.current) clearTimeout(notificationRefreshTimerRef.current);
      notificationRefreshTimerRef.current = setTimeout(() => {
        notificationRefreshTimerRef.current = null;
        refreshUnread();
      }, 180);
    });

    return () => {
      notificationSubscription.unsubscribe();
      if (notificationRefreshTimerRef.current) clearTimeout(notificationRefreshTimerRef.current);
      notificationRefreshTimerRef.current = null;
    };
  }, [refreshUnread, session?.userId]);

  const refreshConversationInbox = useCallback(async (userId: string, requestId: number) => {
    const conversations = await getConversationsForUser(userId);
    const items = await buildConversationItems(conversations, userId);
    if (requestIdRef.current !== requestId) return;

    inboxLoadedRef.current = true;
    setChat((current) => current?.view === "inbox"
      ? { ...current, conversations: items, conversationsLoading: false }
      : current);
    refreshUnread();

    if (inboxNeedsRefreshRef.current) {
      inboxNeedsRefreshRef.current = false;
      if (inboxRefreshTimerRef.current) clearTimeout(inboxRefreshTimerRef.current);
      inboxRefreshTimerRef.current = setTimeout(() => {
        void refreshConversationInbox(userId, requestId);
      }, 100);
    }
  }, [refreshUnread]);

  const handleInboxConversationUpdate = useCallback((update: { id: string; lastMessage: string | null; lastMessageAt: string | null }) => {
    const userId = session?.userId;
    const current = chatRef.current;
    if (!userId || current?.view !== "inbox") return;

    const existing = current.conversations.some((item) => item.conversation.id === update.id);
    if (!inboxLoadedRef.current || !existing) {
      inboxNeedsRefreshRef.current = true;
      if (inboxLoadedRef.current) {
        if (inboxRefreshTimerRef.current) clearTimeout(inboxRefreshTimerRef.current);
        const requestId = requestIdRef.current;
        inboxRefreshTimerRef.current = setTimeout(() => {
          void refreshConversationInbox(userId, requestId);
        }, 150);
      }
      return;
    }

    setChat((state) => {
      if (state?.view !== "inbox") return state;
      return {
        ...state,
        conversations: state.conversations
          .map((item) => item.conversation.id === update.id
            ? {
              ...item,
              lastMessage: update.lastMessage ?? item.lastMessage,
              lastMessageAt: update.lastMessageAt ?? item.lastMessageAt,
              conversation: {
                ...item.conversation,
                lastMessage: update.lastMessage ?? item.conversation.lastMessage,
                lastMessageAt: update.lastMessageAt ?? item.conversation.lastMessageAt,
              },
            }
            : item)
          .sort((first, second) => Date.parse(second.lastMessageAt || second.conversation.createdAt) - Date.parse(first.lastMessageAt || first.conversation.createdAt)),
      };
    });

    void getUnreadConversationCountsForUser(userId).then((counts) => {
      setChat((state) => state?.view === "inbox"
        ? {
          ...state,
          conversations: state.conversations.map((item) => item.conversation.id === update.id
            ? { ...item, conversation: { ...item.conversation, unreadCount: counts.get(update.id) || 0 } }
            : item),
        }
        : state);
      refreshUnread();
    });
  }, [refreshConversationInbox, refreshUnread, session?.userId]);

  const closeMarketplaceChat = useCallback(() => {
    requestIdRef.current += 1;
    unsubscribe();
    unsubscribeInbox();
    setChat(null);
  }, [unsubscribe, unsubscribeInbox]);

  const openMarketplaceChatInbox = useCallback(async () => {
    const userId = session?.userId;
    if (!userId) {
      toast.error("Entre na sua conta para ver suas mensagens.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    unsubscribe();
    unsubscribeInbox();
    setChat({ view: "inbox", conversations: [], conversationsLoading: true, active: null, messages: [], hasMoreMessages: false, loadingOlderMessages: false, loading: false, minimized: false, sending: false });
    inboxLoadedRef.current = false;
    inboxNeedsRefreshRef.current = false;
    const loadInbox = () => {
      if (inboxStartupTimerRef.current) clearTimeout(inboxStartupTimerRef.current);
      inboxStartupTimerRef.current = null;
      void refreshConversationInbox(userId, requestId);
    };
    inboxSubscriptionRef.current = subscribeToConversationUpdates(
      "popup",
      userId,
      handleInboxConversationUpdate,
      (status) => {
        if (status === "SUBSCRIBED" || (!inboxLoadedRef.current && (status === "CHANNEL_ERROR" || status === "TIMED_OUT"))) loadInbox();
      }
    );
    inboxStartupTimerRef.current = setTimeout(loadInbox, 2500);
  }, [handleInboxConversationUpdate, refreshConversationInbox, session?.userId, unsubscribe, unsubscribeInbox]);

  const selectMarketplaceChat = useCallback(async (conversationItem: MarketplaceChatConversation) => {
    const userId = session?.userId;
    if (!userId) {
      toast.error("Entre na sua conta para continuar a conversa.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    unsubscribe();
    unsubscribeInbox();
    const readConversationItem = {
      ...conversationItem,
      conversation: { ...conversationItem.conversation, unreadCount: 0 },
    };
    setChat((current) => {
      const existing = current?.conversations.some((item) => item.conversation.id === conversationItem.conversation.id);
      const conversations = existing
        ? current!.conversations.map((item) => item.conversation.id === conversationItem.conversation.id ? readConversationItem : item)
        : [readConversationItem, ...(current?.conversations || [])];
      return {
        view: "conversation",
        conversations,
        conversationsLoading: false,
        active: readConversationItem,
        messages: [],
        hasMoreMessages: false,
        loadingOlderMessages: false,
        loading: true,
        minimized: false,
        sending: false,
      };
    });

    const [{ messages, hasMore }] = await Promise.all([
      getMessagePageForConversation(conversationItem.conversation.id),
      markConversationAsRead(conversationItem.conversation.id, userId),
    ]);
    if (requestIdRef.current !== requestId) return;

    setChat((current) => current && current.active?.conversation.id === conversationItem.conversation.id
      ? { ...current, messages, hasMoreMessages: hasMore, loadingOlderMessages: false, loading: false }
      : current);
    refreshUnread();

    const subscription = subscribeToMessages(conversationItem.conversation.id, (incomingMessage) => {
      setChat((current) => {
        if (!current || current.active?.conversation.id !== conversationItem.conversation.id || current.messages.some((message) => message.id === incomingMessage.id)) {
          return current;
        }
        const updateItem = (item: MarketplaceChatConversation) => item.conversation.id === conversationItem.conversation.id
          ? {
            ...item,
            lastMessage: incomingMessage.text,
            lastMessageAt: incomingMessage.createdAt,
            conversation: {
              ...item.conversation,
              lastMessage: incomingMessage.text,
              lastMessageAt: incomingMessage.createdAt,
              unreadCount: 0,
            },
          }
          : item;
        return {
          ...current,
          messages: [...current.messages, incomingMessage],
          active: updateItem(current.active),
          conversations: current.conversations.map(updateItem).sort((first, second) =>
            Date.parse(second.lastMessageAt || second.conversation.createdAt) - Date.parse(first.lastMessageAt || first.conversation.createdAt)),
        };
      });

      if (incomingMessage.senderId !== userId) {
        void markConversationAsRead(conversationItem.conversation.id, userId).then(refreshUnread);
      }
    });

    if (requestIdRef.current === requestId) subscriptionRef.current = subscription;
    else subscription.unsubscribe();
  }, [refreshUnread, session?.userId, unsubscribe, unsubscribeInbox]);

  const loadOlderMarketplaceChatMessages = useCallback(async () => {
    const conversationId = chat?.active?.conversation.id;
    const oldestMessageAt = chat?.messages[0]?.createdAt;
    if (!conversationId || !oldestMessageAt || !chat.hasMoreMessages || chat.loadingOlderMessages) return;

    setChat((current) => current && current.active?.conversation.id === conversationId
      ? { ...current, loadingOlderMessages: true }
      : current);

    const page = await getMessagePageForConversation(conversationId, { before: oldestMessageAt });
    setChat((current) => {
      if (!current || current.active?.conversation.id !== conversationId) return current;
      const existingIds = new Set(current.messages.map((message) => message.id));
      const olderMessages = page.messages.filter((message) => !existingIds.has(message.id));
      return {
        ...current,
        messages: [...olderMessages, ...current.messages],
        hasMoreMessages: page.hasMore,
        loadingOlderMessages: false,
      };
    });
  }, [chat?.active?.conversation.id, chat?.hasMoreMessages, chat?.loadingOlderMessages, chat?.messages, session?.userId]);

  const openMarketplaceChat = useCallback(async ({ conversation, listing }: OpenMarketplaceChatOptions) => {
    const conversationItem: MarketplaceChatConversation = {
      conversation,
      partnerName: listing.sellerName,
      contextTitle: listing.title,
      contextSubtitle: "Anúncio do Marketplace",
      contextImageUrl: listing.imageUrl,
      contextHref: listing.href,
      contextPrice: listing.price,
    };
    await selectMarketplaceChat(conversationItem);
  }, [selectMarketplaceChat]);

  const backToMarketplaceChatInbox = useCallback(async () => {
    await openMarketplaceChatInbox();
  }, [openMarketplaceChatInbox]);

  const sendMarketplaceChatMessage = useCallback(async (text: string) => {
    const userId = session?.userId;
    const conversationId = chat?.active?.conversation.id;
    const trimmedText = text.trim();
    if (!userId || !conversationId || !trimmedText) return false;
    if (chat?.active?.conversation.closedAt) {
      toast.info("Esta conversa foi encerrada. Inicie uma nova pela página do negócio.");
      return false;
    }

    setChat((current) => current ? { ...current, sending: true } : current);
    const message = await sendMessage(conversationId, userId, trimmedText);

    if (!message) {
      toast.error("Nao foi possivel enviar a mensagem.");
      setChat((current) => current && current.active?.conversation.id === conversationId ? { ...current, sending: false } : current);
      return false;
    }

    setChat((current) => {
      if (!current || current.active?.conversation.id !== conversationId || current.messages.some((item) => item.id === message.id)) {
        return current;
      }
      const updateItem = (item: MarketplaceChatConversation) => item.conversation.id === conversationId
        ? {
          ...item,
          lastMessage: message.text,
          lastMessageAt: message.createdAt,
          conversation: {
            ...item.conversation,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            unreadCount: 0,
          },
        }
        : item;
      return {
        ...current,
        messages: [...current.messages, message],
        active: updateItem(current.active),
        conversations: current.conversations.map(updateItem).sort((first, second) =>
          Date.parse(second.lastMessageAt || second.conversation.createdAt) - Date.parse(first.lastMessageAt || first.conversation.createdAt)),
        sending: false,
      };
    });
    toast.success("Mensagem enviada.");
    return true;
  }, [chat?.active?.conversation.id, session?.userId]);

  const hideMarketplaceChatConversation = useCallback(async (conversationId: string) => {
    if (!session?.userId) {
      toast.error("Entre na sua conta para remover uma conversa.");
      return false;
    }

    const hidden = await hideConversationForUser(conversationId);
    if (!hidden) {
      toast.error("Nao foi possivel remover a conversa. Tente novamente.");
      return false;
    }

    if (chat?.active?.conversation.id === conversationId) unsubscribe();
    setChat((current) => current ? {
      ...current,
      conversations: current.conversations.filter((item) => item.conversation.id !== conversationId),
      ...(current.active?.conversation.id === conversationId
        ? { view: "inbox" as const, active: null, messages: [], loading: false }
        : {}),
    } : current);
    refreshUnread();
    toast.success("Conversa removida da sua caixa de entrada.");
    return true;
  }, [chat?.active?.conversation.id, refreshUnread, session?.userId, unsubscribe]);

  useEffect(() => {
    if (!session?.userId && chat) closeMarketplaceChat();
  }, [chat, closeMarketplaceChat, session?.userId]);

  useEffect(() => () => {
    unsubscribe();
    unsubscribeInbox();
  }, [unsubscribe, unsubscribeInbox]);

  return (
    <MarketplaceChatContext.Provider
      value={{
        chat,
        openMarketplaceChat,
        openMarketplaceChatInbox,
        selectMarketplaceChat,
        loadOlderMarketplaceChatMessages,
        backToMarketplaceChatInbox,
        closeMarketplaceChat,
        minimizeMarketplaceChat: () => setChat((current) => current ? { ...current, minimized: true } : current),
        restoreMarketplaceChat: () => setChat((current) => current ? { ...current, minimized: false } : current),
        sendMarketplaceChatMessage,
        hideMarketplaceChatConversation,
      }}
    >
      {children}
    </MarketplaceChatContext.Provider>
  );
}

export function useMarketplaceChat() {
  const context = useContext(MarketplaceChatContext);
  if (!context) throw new Error("useMarketplaceChat deve ser usado dentro de MarketplaceChatProvider");
  return context;
}
