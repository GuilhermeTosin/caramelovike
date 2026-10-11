import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getProfilesByIds } from "@/services/profiles";
import {
  getConversationPartner,
  getConversationsForUser,
  getUnreadConversationCountsForUser,
  getMessagesForConversation,
  hideConversationForUser,
  markConversationAsRead,
  sendMessage,
  subscribeToConversationUpdates,
  subscribeToMessages,
} from "@/services/messages";
import { deleteReview, getReviewsByUser, updateReview } from "@/services/businesses";
import type {
  ConfirmDeleteReviewState,
  ConversationPartnerMap,
  EditingReviewState,
  GivenReviewWithBusiness,
} from "@/pages/user-profile/types";
import type { ConversationFrontend, MessageFrontend, Review } from "@/types/database";

type UseInboxAndReviewsOptions = {
  sessionUserId?: string;
  refreshUnread: () => void;
};

export function useInboxAndReviews({ sessionUserId, refreshUnread }: UseInboxAndReviewsOptions) {
  const [conversations, setConversations] = useState<ConversationFrontend[]>([]);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const [conversationPartners, setConversationPartners] = useState<ConversationPartnerMap>({});
  const [selectedConv, setSelectedConv] = useState<ConversationFrontend | null>(null);
  const selectedConvRef = useRef(selectedConv);
  selectedConvRef.current = selectedConv;
  const [messages, setMessages] = useState<MessageFrontend[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [givenReviews, setGivenReviews] = useState<GivenReviewWithBusiness[]>([]);
  const [subAvaliacoesTab, setSubAvaliacoesTab] = useState("recebidas");
  const [editingReview, setEditingReview] = useState<EditingReviewState | null>(null);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState<ConfirmDeleteReviewState | null>(null);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (!sessionUserId) {
      setConversations([]);
      setConversationPartners({});
      setSelectedConv(null);
      setMessages([]);
      setGivenReviews([]);
      return;
    }

    let cancelled = false;
    let conversationsLoaded = false;
    let conversationLoadInFlight = false;
    let reloadAfterCurrent = false;
    let hasSubscribed = false;

    const reloadConversations = async () => {
      if (conversationLoadInFlight) {
        reloadAfterCurrent = true;
        return;
      }
      conversationLoadInFlight = true;
      try {
        const nextConversations = await getConversationsForUser(sessionUserId);
        if (cancelled) return;
        setConversations(nextConversations);
        conversationsLoaded = true;
      } finally {
        conversationLoadInFlight = false;
        if (reloadAfterCurrent && !cancelled) {
          reloadAfterCurrent = false;
          void reloadConversations();
        }
      }
    };

    const inboxSubscription = subscribeToConversationUpdates(
      "profile",
      sessionUserId,
      (update) => {
        if (cancelled) return;
        if (!conversationsLoaded || !conversationsRef.current.some((conversation) => conversation.id === update.id)) {
          void reloadConversations();
          return;
        }

        setConversations((current) => current
          .map((conversation) => conversation.id === update.id
            ? {
              ...conversation,
              lastMessage: update.lastMessage ?? conversation.lastMessage,
              lastMessageAt: update.lastMessageAt ?? conversation.lastMessageAt,
            }
            : conversation)
          .sort((first, second) => Date.parse(second.lastMessageAt || second.createdAt) - Date.parse(first.lastMessageAt || first.createdAt)));
        setSelectedConv((current) => current?.id === update.id
          ? {
            ...current,
            lastMessage: update.lastMessage ?? current.lastMessage,
            lastMessageAt: update.lastMessageAt ?? current.lastMessageAt,
          }
          : current);

        void getUnreadConversationCountsForUser(sessionUserId).then((counts) => {
          if (cancelled) return;
          const unreadCount = selectedConvRef.current?.id === update.id ? 0 : counts.get(update.id) || 0;
          setConversations((current) => current.map((conversation) => conversation.id === update.id
            ? { ...conversation, unreadCount }
            : conversation));
        });
      },
      (status) => {
        if (status === "SUBSCRIBED") {
          if (hasSubscribed && conversationsLoaded) void reloadConversations();
          hasSubscribed = true;
        }
      }
    );

    void reloadConversations();
    void getReviewsByUser(sessionUserId).then((reviews) => {
      if (!cancelled) setGivenReviews(reviews as GivenReviewWithBusiness[]);
    });

    return () => {
      cancelled = true;
      inboxSubscription.unsubscribe();
    };
  }, [refreshUnread, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || conversations.length === 0) return;
    let cancelled = false;

    const loadPartners = async () => {
      const partnerIds = conversations
        .map((conv) => getConversationPartner(conv, sessionUserId))
        .filter((id): id is string => !!id);
      const profiles = await getProfilesByIds(partnerIds);
      const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
      const entries = conversations.map((conv) => {
        const partnerId = getConversationPartner(conv, sessionUserId);
        const profile = partnerId ? profilesById.get(partnerId) : undefined;
        return [
          conv.id,
          {
            name: profile?.name || (conv.closedAt ? "Responsável anterior" : conv.businessName) || "Contato",
            avatar: profile?.avatar || "",
          },
        ] as const;
      });
      if (cancelled) return;
      setConversationPartners(Object.fromEntries(entries));
    };

    void loadPartners();
    return () => {
      cancelled = true;
    };
  }, [conversations, sessionUserId]);

  useEffect(() => {
    return () => {
      if (activeSubscription) {
        activeSubscription.unsubscribe();
      }
    };
  }, [activeSubscription]);

  const handleSelectConversation = async (conversation: ConversationFrontend) => {
    if (!sessionUserId) return;
    if (activeSubscription) {
      activeSubscription.unsubscribe();
    }

    setSelectedConv(conversation);
    setConversations((current) => current.map((item) => item.id === conversation.id
      ? { ...item, unreadCount: 0 }
      : item));
    const nextMessages = await getMessagesForConversation(conversation.id);
    setMessages(nextMessages);

    const subscription = subscribeToMessages(conversation.id, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((message) => message.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setConversations((current) => current
        .map((item) => item.id === conversation.id
          ? { ...item, lastMessage: newMessage.text, lastMessageAt: newMessage.createdAt, unreadCount: 0 }
          : item)
        .sort((first, second) => Date.parse(second.lastMessageAt || second.createdAt) - Date.parse(first.lastMessageAt || first.createdAt)));
      if (newMessage.senderId !== sessionUserId) {
        void markConversationAsRead(conversation.id, sessionUserId).then(refreshUnread);
      }
    });
    setActiveSubscription(subscription);

    await markConversationAsRead(conversation.id, sessionUserId);
    refreshUnread();
  };

  const handleSendMessage = async () => {
    if (!sessionUserId || !selectedConv || !messageText.trim()) return;
    if (selectedConv.closedAt) {
      toast.info("Esta conversa foi encerrada. Inicie uma nova pela página do negócio.");
      return;
    }
    setSendingMsg(true);
    const message = await sendMessage(selectedConv.id, sessionUserId, messageText.trim());
    if (message) {
      setMessages((prev) => [...prev, message]);
      setMessageText("");
      const nextConversations = await getConversationsForUser(sessionUserId);
      setConversations(nextConversations);
    }
    setSendingMsg(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm("Remover esta conversa da sua caixa de entrada? O outro participante manterá o histórico, e a conversa poderá reaparecer quando alguém enviar uma nova mensagem.")) return;

    const ok = await hideConversationForUser(conversationId);
    if (!ok) {
      toast.error("Não foi possível remover a conversa da sua caixa de entrada.");
      return;
    }

    toast.success("Conversa removida da sua caixa de entrada.");
    setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
    if (selectedConv?.id === conversationId) {
      activeSubscription?.unsubscribe();
      setActiveSubscription(null);
      setSelectedConv(null);
      setMessages([]);
    }
    refreshUnread();
  };

  const handleStartEditReview = (
    review: Review & { businessName: string; businessSlug: string; businessId: string }
  ) => {
    setEditingReview({
      review,
      rating: review.rating,
      comment: review.comment,
      saving: false,
    });
  };

  const handleSaveEditReview = async () => {
    if (!editingReview) return;
    setEditingReview({ ...editingReview, saving: true });
    const ok = await updateReview(editingReview.review.id, {
      rating: editingReview.rating as 1 | 2 | 3 | 4 | 5,
      comment: editingReview.comment,
    });
    if (!ok) {
      toast.error("Erro ao atualizar avaliacao.");
      setEditingReview({ ...editingReview, saving: false });
      return;
    }

    setGivenReviews((prev) =>
      prev.map((review) =>
        review.id === editingReview.review.id
          ? { ...review, rating: editingReview.rating as 1 | 2 | 3 | 4 | 5, comment: editingReview.comment }
          : review
      )
    );
    toast.success("Avaliacao atualizada!");
    setEditingReview(null);
  };

  const handleDeleteReview = async () => {
    if (!confirmDeleteReview) return;
    const ok = await deleteReview(confirmDeleteReview.reviewId);
    if (!ok) {
      toast.error("Erro ao remover avaliacao.");
      setConfirmDeleteReview(null);
      return;
    }

    setGivenReviews((prev) => prev.filter((review) => review.id !== confirmDeleteReview.reviewId));
    toast.success("Avaliacao removida!");
    setConfirmDeleteReview(null);
  };

  return {
    conversations,
    conversationPartners,
    selectedConv,
    messages,
    messageText,
    sendingMsg,
    messagesEndRef,
    messagesContainerRef,
    givenReviews,
    subAvaliacoesTab,
    editingReview,
    confirmDeleteReview,
    setMessageText,
    setSubAvaliacoesTab,
    setEditingReview,
    setConfirmDeleteReview,
    handleSelectConversation,
    handleSendMessage,
    handleDeleteConversation,
    handleStartEditReview,
    handleSaveEditReview,
    handleDeleteReview,
  };
}
