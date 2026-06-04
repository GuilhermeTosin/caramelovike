import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getProfileById } from "@/services/profiles";
import {
  deleteConversation,
  getConversationPartner,
  getConversationsForUser,
  getMessagesForConversation,
  markConversationAsRead,
  sendMessage,
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
  const [conversationPartners, setConversationPartners] = useState<ConversationPartnerMap>({});
  const [selectedConv, setSelectedConv] = useState<ConversationFrontend | null>(null);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    void getConversationsForUser(sessionUserId).then(setConversations);
    void getReviewsByUser(sessionUserId).then((reviews) => {
      setGivenReviews(reviews as GivenReviewWithBusiness[]);
    });
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || conversations.length === 0) return;
    let cancelled = false;

    const loadPartners = async () => {
      const entries = await Promise.all(
        conversations.map(async (conv) => {
          const partnerId = getConversationPartner(conv, sessionUserId);
          if (!partnerId) {
            return [conv.id, { name: conv.businessName || "Contato", avatar: "" }] as const;
          }
          const profile = await getProfileById(partnerId);
          return [
            conv.id,
            {
              name: profile?.name || conv.businessName || "Contato",
              avatar: profile?.avatar || "",
            },
          ] as const;
        })
      );
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
    const nextMessages = await getMessagesForConversation(conversation.id);
    setMessages(nextMessages);

    const subscription = subscribeToMessages(conversation.id, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((message) => message.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });
    setActiveSubscription(subscription);

    await markConversationAsRead(conversation.id, sessionUserId);
    refreshUnread();
  };

  const handleSendMessage = async () => {
    if (!sessionUserId || !selectedConv || !messageText.trim()) return;
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
    if (!confirm("Tem certeza que deseja apagar esta conversa?")) return;

    const ok = await deleteConversation(conversationId);
    if (!ok) {
      toast.error("Erro ao apagar conversa");
      return;
    }

    toast.success("Conversa apagada");
    setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
    if (selectedConv?.id === conversationId) {
      setSelectedConv(null);
      setMessages([]);
    }
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
