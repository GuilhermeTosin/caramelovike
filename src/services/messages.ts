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

export class ConversationStartError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "ConversationStartError";
  }
}

export type MessagePage = {
  messages: MessageFrontend[];
  hasMore: boolean;
};

export type ConversationActivityUpdate = {
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export type IncomingMessageNotification = {
  id: string;
  conversationId: string;
  senderId: string;
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
        if (conversation.closed_at) return false;
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

      if (matchingConversation && requestedContextType === "legacy") {
        return toConversationFrontend(matchingConversation, [senderId, receiverId]);
      }
    }
  }

  // A RPC valida a identidade do destinatario contra o dono atual do recurso;
  // nao depender de public_profiles para autorizar ou iniciar a conversa.
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

  if (errRpc) {
    console.error("[getOrCreateConversation] Erro ao criar conversa via RPC:", errRpc);
    throw new ConversationStartError(errRpc.message, errRpc.code);
  }
  if (!convId) throw new ConversationStartError("A RPC de conversa nao retornou um identificador.");

  // Buscar a conversa criada para retornar o objeto completo
  const { data: newConv, error: newConvError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", convId)
    .single();

  if (newConvError || !newConv) {
    console.error("[getOrCreateConversation] Erro ao carregar conversa criada:", newConvError);
    throw new ConversationStartError(newConvError?.message || "A conversa criada nao foi retornada.", newConvError?.code);
  }

  return toConversationFrontend(newConv as Conversation, [senderId, receiverId]);
}

async function getVisibleConversationIds(userId: string): Promise<string[]> {
  const { data: visibleParticipations, error: visibilityError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("hidden_at", null);

  if (!visibilityError) return (visibleParticipations || []).map((row) => row.conversation_id);

  // Keep existing inboxes readable during rollout if the additive migration
  // has not reached this database yet. No hidden rows exist before the column.
  if (visibilityError.code === "42703" || visibilityError.code === "PGRST204") {
    const { data: legacyParticipations, error: legacyError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);
    if (!legacyError) return (legacyParticipations || []).map((row) => row.conversation_id);
  }

  console.error("[getVisibleConversationIds] Erro ao carregar participacoes:", visibilityError);
  return [];
}

export async function getUnreadConversationCountsForUser(userId: string, conversationIds?: string[]): Promise<Map<string, number>> {
  const { data: unreadRows, error: unreadRpcError } = await supabase.rpc("get_my_unread_conversation_counts");
  if (!unreadRpcError) {
    const rows = (unreadRows || []) as { conversation_id: string; unread_count: number | string | null }[];
    return new Map<string, number>(rows.map((row) => [row.conversation_id, Number(row.unread_count) || 0]));
  }

  const ids = conversationIds || await getVisibleConversationIds(userId);
  if (ids.length === 0) return new Map<string, number>();

  // Fallback keeps unread markers functional during deployment of migration 00062.
  const { data: unreadMessages, error: unreadMessagesError } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", ids)
    .neq("sender_id", userId)
    .eq("read", false);

  if (unreadMessagesError) {
    console.error("[getUnreadConversationCountsForUser] Erro ao carregar nao lidas:", unreadMessagesError);
    return new Map<string, number>();
  }

  const counts = new Map<string, number>();
  (unreadMessages || []).forEach((row) => counts.set(row.conversation_id, (counts.get(row.conversation_id) || 0) + 1));
  return counts;
}

export async function getConversationsForUser(
  userId: string
): Promise<ConversationFrontend[]> {
  const convIds = await getVisibleConversationIds(userId);

  if (convIds.length === 0) return [];

  const [{ data: conversations }, { data: allParticipants }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, business_id, business_name, context_type, marketplace_listing_id, initiator_id, closed_at, closed_reason, last_message, last_message_at, created_at")
      .in("id", convIds)
      .order("last_message_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds),
  ]);

  if (!conversations) return [];
  const unreadCounts = await getUnreadConversationCountsForUser(userId, convIds);

  // Buscar participantes de todas as conversas
  const participantsByConv = new Map<string, string[]>();
  (allParticipants || []).forEach((cp: ConversationParticipant) => {
    const list = participantsByConv.get(cp.conversation_id) || [];
    list.push(cp.user_id);
    participantsByConv.set(cp.conversation_id, list);
  });

  return (conversations as Conversation[])
    .map((conversation) => ({
      ...toConversationFrontend(conversation, participantsByConv.get(conversation.id) || []),
      unreadCount: unreadCounts.get(conversation.id) || 0,
    }))
    .sort((first, second) => {
      const firstActivity = Date.parse(first.lastMessageAt || first.createdAt) || 0;
      const secondActivity = Date.parse(second.lastMessageAt || second.createdAt) || 0;
      return secondActivity - firstActivity;
    });
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
    .from("public_profiles")
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
    .from("public_profiles")
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
  const unreadCounts = await getUnreadConversationCountsForUser(userId);
  return [...unreadCounts.values()].reduce((total, count) => total + count, 0);
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
          .from("public_profiles")
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

export function subscribeToConversationUpdates(
  scope: "popup" | "profile",
  userId: string,
  onUpdate: (update: ConversationActivityUpdate) => void,
  onStatus?: (status: string) => void
) {
  return supabase
    .channel(`conversation-inbox:${scope}:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
      },
      (payload) => {
        const row = payload.new as {
          id?: unknown;
          last_message?: unknown;
          last_message_at?: unknown;
        };
        if (typeof row.id !== "string") return;
        onUpdate({
          id: row.id,
          lastMessage: typeof row.last_message === "string" ? row.last_message : null,
          lastMessageAt: typeof row.last_message_at === "string" ? row.last_message_at : null,
        });
      }
    )
    .subscribe((status) => onStatus?.(status));
}

export function subscribeToUserMessages(
  userId: string,
  onMessage: (message: IncomingMessageNotification) => void
) {
  return supabase
    .channel(`user-message-notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const row = payload.new as {
          id?: unknown;
          conversation_id?: unknown;
          sender_id?: unknown;
        };
        if (typeof row.id !== "string" || typeof row.conversation_id !== "string" || typeof row.sender_id !== "string") return;
        onMessage({ id: row.id, conversationId: row.conversation_id, senderId: row.sender_id });
      }
    )
    .subscribe();
}

export async function hideConversationForUser(conversationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("hide_conversation_for_user", {
    p_conversation_id: conversationId,
  });
  if (error) {
    console.error("[hideConversationForUser] Erro ao ocultar conversa:", error);
    return false;
  }
  return data === true;
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
    closedAt: conv.closed_at || undefined,
    lastMessage: conv.last_message || undefined,
    lastMessageAt: conv.last_message_at || undefined,
    createdAt: conv.created_at,
  };
}
