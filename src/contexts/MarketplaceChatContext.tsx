import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getProfilesByIds } from "@/services/profiles";
import {
  getConversationPartner,
  getConversationsForUser,
  getMessagePageForConversation,
  markConversationAsRead,
  sendMessage,
  subscribeToMessages,
} from "@/services/messages";
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
};

const MarketplaceChatContext = createContext<MarketplaceChatContextValue | null>(null);

function getConversationContext(conversation: ConversationFrontend, partnerName: string) {
  const businessName = conversation.businessName?.trim();
  if (conversation.contextType === "marketplace") {
    return {
      title: (businessName || "").replace(/^Marketplace:\s*/, "").replace(/\s+\[[^\]]+\]$/, "") || "Anuncio do Marketplace",
      subtitle: "Anuncio do Marketplace",
    };
  }
  if (conversation.contextType === "business") {
    return { title: businessName || "Negocio", subtitle: "Negocio" };
  }
  return { title: partnerName || "Conversa antiga", subtitle: "Conversa antiga" };
}

async function buildConversationItems(conversations: ConversationFrontend[], userId: string) {
  const partnerIds = conversations.map((conversation) => getConversationPartner(conversation, userId));
  const profiles = await getProfilesByIds(partnerIds);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return conversations.map((conversation) => {
    const partnerId = getConversationPartner(conversation, userId);
    const profile = profilesById.get(partnerId);
    const partnerName = profile?.name?.trim() || conversation.businessName?.trim() || "Contato";
    const context = getConversationContext(conversation, partnerName);
    return {
      conversation,
      partnerName,
      partnerAvatar: profile?.avatar || null,
      contextTitle: context.title,
      contextSubtitle: context.subtitle,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    } satisfies MarketplaceChatConversation;
  });
}

export function MarketplaceChatProvider({ children }: { children: ReactNode }) {
  const { session, refreshUnread } = useAuth();
  const [chat, setChat] = useState<MarketplaceChatState | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof subscribeToMessages> | null>(null);
  const requestIdRef = useRef(0);

  const unsubscribe = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
  }, []);

  const closeMarketplaceChat = useCallback(() => {
    requestIdRef.current += 1;
    unsubscribe();
    setChat(null);
  }, [unsubscribe]);

  const openMarketplaceChatInbox = useCallback(async () => {
    const userId = session?.userId;
    if (!userId) {
      toast.error("Entre na sua conta para ver suas mensagens.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    unsubscribe();
    setChat({ view: "inbox", conversations: [], conversationsLoading: true, active: null, messages: [], hasMoreMessages: false, loadingOlderMessages: false, loading: false, minimized: false, sending: false });

    const conversations = await getConversationsForUser(userId);
    const items = await buildConversationItems(conversations, userId);
    if (requestIdRef.current !== requestId) return;

    setChat((current) => current && requestIdRef.current === requestId
      ? { ...current, conversations: items, conversationsLoading: false }
      : current);
  }, [session?.userId, unsubscribe]);

  const selectMarketplaceChat = useCallback(async (conversationItem: MarketplaceChatConversation) => {
    const userId = session?.userId;
    if (!userId) {
      toast.error("Entre na sua conta para continuar a conversa.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    unsubscribe();
    setChat((current) => {
      const conversations = current?.conversations.some((item) => item.conversation.id === conversationItem.conversation.id)
        ? current.conversations
        : [conversationItem, ...(current?.conversations || [])];
      return {
        view: "conversation",
        conversations,
        conversationsLoading: false,
        active: conversationItem,
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
        return { ...current, messages: [...current.messages, incomingMessage] };
      });

      if (incomingMessage.senderId !== userId) {
        void markConversationAsRead(conversationItem.conversation.id, userId).then(refreshUnread);
      }
    });

    if (requestIdRef.current === requestId) subscriptionRef.current = subscription;
    else subscription.unsubscribe();
  }, [refreshUnread, session?.userId, unsubscribe]);

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
      contextSubtitle: "Anuncio do Marketplace",
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
        ? { ...item, lastMessage: message.text, lastMessageAt: message.createdAt }
        : item;
      return {
        ...current,
        messages: [...current.messages, message],
        active: updateItem(current.active),
        conversations: current.conversations.map(updateItem),
        sending: false,
      };
    });
    toast.success("Mensagem enviada.");
    return true;
  }, [chat?.active?.conversation.id, session?.userId]);

  useEffect(() => {
    if (!session?.userId && chat) closeMarketplaceChat();
  }, [chat, closeMarketplaceChat, session?.userId]);

  useEffect(() => () => unsubscribe(), [unsubscribe]);

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
