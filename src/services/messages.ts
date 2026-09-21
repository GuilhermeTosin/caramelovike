import { supabase } from "@/lib/supabase";
import type {
  Conversation,
  ConversationParticipant,
  Message,
  ConversationFrontend,
  MessageFrontend,
} from "@/types/database";

export type ConversationContext =
  | { type: "business" }
  | { type: "marketplace"; listingId: string };

export type MessagePage = {
  messages: MessageFrontend[];
  hasMore: boolean;
};

export async function getOrCreateConversation(
  senderId: string,
  receiverId: string,
  businessId?: string,
  businessName?: string,
  context?: ConversationContext
): Promise<ConversationFrontend | null> {
  if (!senderId || !receiverId) {
    console.error("[getOrCreateConversation] IDs ausentes:", { senderId, receiverId });
    return null;
  }

  const requestedContext = context || (businessId ? { type: "business" as const } : undefined);
  const requestedContextType = requestedContext?.type || "legacy";
  const requestedMarketplaceListingId = requestedContext?.type === "marketplace"
    ? requestedContext.listingId
    : null;

  // Buscar conversas existentes entre os dois participantes. O contexto e
  // parte da identidade: um anuncio nao pode reutilizar o chat do negocio.
  const { data: existing } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", senderId);

  if (existing && existing.length > 0) {
    const senderConvIds = existing.map((cp) => cp.conversation_id);
    const { data: receiverParticipation } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", receiverId)
      .in("conversation_id", senderConvIds);

    if (receiverParticipation && receiverParticipation.length > 0) {
      const sharedConvIds = receiverParticipation.map((cp) => cp.conversation_id);
      const { data: conversations, error: errConvSelect } = await supabase
        .from("conversations")
        .select("*")
        .in("id", sharedConvIds);

      if (errConvSelect) {
        console.error("[getOrCreateConversation] Erro ao buscar conversa existente:", errConvSelect);
      }

      const matchingConversation = (conversations as Conversation[] | null)?.find((conversation) => {
        if (requestedContextType === "business") {
          return conversation.context_type === "business" && conversation.business_id === businessId;
        }
        if (requestedContextType === "marketplace") {
          return conversation.context_type === "marketplace"
            && conversation.marketplace_listing_id === requestedMarketplaceListingId;
        }
        return (conversation.context_type === "legacy" || !conversation.context_type)
          && !conversation.business_id
          && (conversation.business_name || null) === (businessName?.trim() || null);
      });

      if (matchingConversation) {
        return toConversationFrontend(matchingConversation, [senderId, receiverId]);
      }
    }
  }

  // Verificar se o destinatário existe como profile
  const { data: receiverProfile, error: errProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", receiverId)
    .maybeSingle();

  if (errProfile) {
    console.error("[getOrCreateConversation] Erro ao buscar perfil do destinatário:", errProfile);
    return null;
  }

  if (!receiverProfile) {
    console.error("[getOrCreateConversation] Destinatário não encontrado em profiles:", receiverId);
    return null;
  }

  // Criar nova conversa via RPC (mais robusto com RLS). Contextos atuais usam
  // uma RPC dedicada; a antiga fica somente como fallback de compatibilidade.
  const rpcResult = requestedContextType === "legacy"
    ? await supabase.rpc("create_conversation_with_participants", {
        p_business_id: null,
        p_business_name: businessName || null,
        p_participant_ids: [senderId, receiverId],
      })
    : await supabase.rpc("create_conversation_with_context", {
        p_business_id: requestedContextType === "business" ? businessId || null : null,
        p_business_name: businessName || null,
        p_participant_ids: [senderId, receiverId],
        p_context_type: requestedContextType,
        p_marketplace_listing_id: requestedMarketplaceListingId,
      });
  const { data: convId, error: errRpc } = rpcResult;

  if (errRpc || !convId) {
    console.error("[getOrCreateConversation] Erro ao criar conversa via RPC:", errRpc);
    return null;
  }

  // Buscar a conversa criada para retornar o objeto completo
  const { data: newConv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", convId)
    .single();

  return toConversationFrontend(newConv as Conversation, [senderId, receiverId]);
}

export async function getConversationsForUser(
  userId: string
): Promise<ConversationFrontend[]> {
  const { data: participations } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!participations || participations.length === 0) return [];

  const convIds = participations.map((cp) => cp.conversation_id);

  const [{ data: conversations }, { data: allParticipants }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, business_id, business_name, context_type, marketplace_listing_id, last_message, last_message_at, created_at")
      .in("id", convIds)
      .order("last_message_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds),
  ]);

  if (!conversations) return [];

  // Buscar participantes de todas as conversas
  const participantsByConv = new Map<string, string[]>();
  (allParticipants || []).forEach((cp: ConversationParticipant) => {
    const list = participantsByConv.get(cp.conversation_id) || [];
    list.push(cp.user_id);
    participantsByConv.set(cp.conversation_id, list);
  });

  return (conversations as Conversation[]).map((c) =>
    toConversationFrontend(c, participantsByConv.get(c.id) || [])
  );
}

export async function getMessagesForConversation(
  conversationId: string
): Promise<MessageFrontend[]> {
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, text, created_at, read")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!msgs) return [];

  return mapMessagesToFrontend(msgs as Message[]);
}

export async function getMessagePageForConversation(
  conversationId: string,
  options: { before?: string; limit?: number } = {}
): Promise<MessagePage> {
  const limit = Math.min(Math.max(options.limit || 50, 1), 100);
  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, text, created_at, read")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options.before) {
    query = query.lt("created_at", options.before);
  }

  const { data: msgs, error } = await query;
  if (error) {
    console.error("[getMessagePageForConversation] Erro ao buscar mensagens:", error);
    return { messages: [], hasMore: false };
  }

  const rows = (msgs || []) as Message[];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();
  return {
    messages: await mapMessagesToFrontend(page),
    hasMore,
  };
}

async function mapMessagesToFrontend(msgs: Message[]): Promise<MessageFrontend[]> {
  if (!msgs.length) return [];

  // Buscar nomes dos remetentes somente para a pagina carregada.
  const senderIds = [...new Set((msgs as Message[]).map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", senderIds);

  const senderNames = new Map(
    (profiles || []).map((p: { id: string; name: string }) => [p.id, p.name])
  );

  return msgs.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderName: senderNames.get(m.sender_id) || "Usuário",
    text: m.text,
    createdAt: m.created_at,
    read: m.read,
  }));
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<MessageFrontend | null> {
  const { data: msg } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      text,
    })
    .select()
    .single();

  if (!msg) return null;

  // Buscar nome do remetente
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", senderId)
    .maybeSingle();

  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    senderId: msg.sender_id,
    senderName: profile?.name || "Usuário",
    text: msg.text,
    createdAt: msg.created_at,
    read: msg.read,
  };
}

export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("read", false);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { data: participations } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!participations || participations.length === 0) return 0;

  const convIds = participations.map((cp) => cp.conversation_id);

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .eq("read", false);

  return count || 0;
}

export function getConversationPartner(
  conversation: ConversationFrontend,
  userId: string
): string {
  return conversation.participants.find((p) => p !== userId) || "";
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: MessageFrontend) => void
) {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Buscar nome do remetente para a nova mensagem
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", payload.new.sender_id)
          .maybeSingle();

        const messageFrontend: MessageFrontend = {
          id: payload.new.id,
          conversationId: payload.new.conversation_id,
          senderId: payload.new.sender_id,
          senderName: profile?.name || "Usuário",
          text: payload.new.text,
          createdAt: payload.new.created_at,
          read: payload.new.read,
        };
        onMessage(messageFrontend);
      }
    )
    .subscribe();
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    console.error("[deleteConversation] Erro ao deletar conversa:", error);
    return false;
  }
  return true;
}

function toConversationFrontend(
  conv: Conversation,
  participants: string[]
): ConversationFrontend {
  return {
    id: conv.id,
    participants,
    businessId: conv.business_id || undefined,
    businessName: conv.business_name || undefined,
    contextType: conv.context_type || "legacy",
    marketplaceListingId: conv.marketplace_listing_id || undefined,
    lastMessage: conv.last_message || undefined,
    lastMessageAt: conv.last_message_at || undefined,
    createdAt: conv.created_at,
  };
}
