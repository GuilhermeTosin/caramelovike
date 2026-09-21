import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getMessagesForConversation, markConversationAsRead, sendMessage, subscribeToMessages } from "@/services/messages";
import type { ConversationFrontend, MessageFrontend } from "@/types/database";

export type MarketplaceChatListing = {
  id: string;
  title: string;
  price: string;
  imageUrl?: string | null;
  href: string;
  sellerName: string;
};

type MarketplaceChatState = {
  conversation: ConversationFrontend;
  listing: MarketplaceChatListing;
  messages: MessageFrontend[];
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
  closeMarketplaceChat: () => void;
  minimizeMarketplaceChat: () => void;
  restoreMarketplaceChat: () => void;
  sendMarketplaceChatMessage: (text: string) => Promise<boolean>;
};

const MarketplaceChatContext = createContext<MarketplaceChatContextValue | null>(null);

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

  const openMarketplaceChat = useCallback(async ({ conversation, listing }: OpenMarketplaceChatOptions) => {
    const userId = session?.userId;
    if (!userId) {
      toast.error("Entre na sua conta para continuar a conversa.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    unsubscribe();
    setChat({ conversation, listing, messages: [], loading: true, minimized: false, sending: false });

    const [messages] = await Promise.all([
      getMessagesForConversation(conversation.id),
      markConversationAsRead(conversation.id, userId),
    ]);

    if (requestIdRef.current !== requestId) return;

    setChat((current) => current && current.conversation.id === conversation.id
      ? { ...current, messages, loading: false }
      : current);
    refreshUnread();

    const subscription = subscribeToMessages(conversation.id, (incomingMessage) => {
      setChat((current) => {
        if (!current || current.conversation.id !== conversation.id || current.messages.some((message) => message.id === incomingMessage.id)) {
          return current;
        }
        return { ...current, messages: [...current.messages, incomingMessage] };
      });

      if (incomingMessage.senderId !== userId) {
        void markConversationAsRead(conversation.id, userId).then(refreshUnread);
      }
    });

    if (requestIdRef.current === requestId) {
      subscriptionRef.current = subscription;
    } else {
      subscription.unsubscribe();
    }
  }, [refreshUnread, session?.userId, unsubscribe]);

  const sendMarketplaceChatMessage = useCallback(async (text: string) => {
    const userId = session?.userId;
    const conversationId = chat?.conversation.id;
    const trimmedText = text.trim();
    if (!userId || !conversationId || !trimmedText) return false;

    setChat((current) => current ? { ...current, sending: true } : current);
    const message = await sendMessage(conversationId, userId, trimmedText);

    if (!message) {
      toast.error("Nao foi possivel enviar a mensagem.");
      setChat((current) => current && current.conversation.id === conversationId ? { ...current, sending: false } : current);
      return false;
    }

    setChat((current) => {
      if (!current || current.conversation.id !== conversationId || current.messages.some((item) => item.id === message.id)) {
        return current;
      }
      return { ...current, messages: [...current.messages, message], sending: false };
    });
    toast.success("Mensagem enviada.");
    return true;
  }, [chat?.conversation.id, session?.userId]);

  useEffect(() => {
    if (!session?.userId && chat) closeMarketplaceChat();
  }, [chat, closeMarketplaceChat, session?.userId]);

  useEffect(() => () => unsubscribe(), [unsubscribe]);

  return (
    <MarketplaceChatContext.Provider
      value={{
        chat,
        openMarketplaceChat,
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
