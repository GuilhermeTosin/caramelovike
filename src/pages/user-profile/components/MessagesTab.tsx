import type { RefObject } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import type {
  ConversationPartnerMap,
  MessagesTabConversation,
  MessagesTabMessage,
} from "@/pages/user-profile/types";

function formatConversationDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type MessagesTabProps = {
  conversations: MessagesTabConversation[];
  conversationPartners: ConversationPartnerMap;
  selectedConv: MessagesTabConversation | null;
  messages: MessagesTabMessage[];
  currentUserId: string;
  messageText: string;
  sendingMsg: boolean;
  messagesContainerRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  onSelectConversation: (conversation: MessagesTabConversation) => void;
  onDeleteConversation: (conversationId: string) => void;
  onMessageTextChange: (value: string) => void;
  onSendMessage: () => void;
};

export default function MessagesTab({
  conversations,
  conversationPartners,
  selectedConv,
  messages,
  currentUserId,
  messageText,
  sendingMsg,
  messagesContainerRef,
  messagesEndRef,
  onSelectConversation,
  onDeleteConversation,
  onMessageTextChange,
  onSendMessage,
}: MessagesTabProps) {
  return (
    <TabsContent value="mensagens" className="mt-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold text-foreground mb-4">{"Mensagens"}</h2>
          {conversations.length === 0 ? (
            <Card className="p-6 text-center border-border">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{"Nenhuma conversa ainda."}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const partnerName = conversationPartners[conv.id]?.name;
                const conversationName = conv.contextType === "legacy"
                  ? partnerName || "Conversa antiga"
                  : partnerName || conv.businessName || "Conversa";
                const contextLabel = conv.contextType === "legacy"
                  ? "Conversa antiga"
                  : conv.businessName;
                const unreadCount = conv.unreadCount || 0;

                return (
                <button
                  type="button"
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  aria-label={`${unreadCount ? `${unreadCount} mensagens não lidas. ` : ""}${conversationName}`}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedConv?.id === conv.id
                      ? "bg-amber-100/80 border-amber-300 shadow-sm"
                      : unreadCount
                        ? "bg-[#eaf3ed] border-[#12633d]/25 shadow-sm hover:bg-[#e2efe6]"
                        : "bg-card border-border hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 border border-border">
                      {conversationPartners[conv.id]?.avatar ? (
                        <img
                          src={conversationPartners[conv.id].avatar}
                            alt={conversationPartners[conv.id]?.name || ("Contato")}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                          {(conversationPartners[conv.id]?.name || conv.businessName || "C").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${unreadCount ? "font-extrabold text-[#203940]" : "font-semibold"}`}>
                          {conversationName}
                        </p>
                        <span className="flex shrink-0 items-center gap-1.5">
                        {unreadCount ? (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#12633d] px-1.5 text-[10px] font-bold text-white" aria-label={`${unreadCount} não lidas`}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                        {conv.closedAt ? (
                          <span className="text-[11px] text-amber-800 whitespace-nowrap">Encerrada</span>
                        ) : conv.lastMessageAt ? (
                          <span className={`text-[11px] whitespace-nowrap ${unreadCount ? "font-bold text-[#12633d]" : "text-muted-foreground"}`}>
                            {formatConversationDate(conv.lastMessageAt)}
                          </span>
                        ) : null}
                        </span>
                      </div>
                      {contextLabel ? (
                        <p className="text-[11px] text-primary/80 truncate mt-0.5">
                          Em: {contextLabel}
                        </p>
                      ) : null}
                      <p className={`text-xs truncate mt-0.5 ${unreadCount ? "font-semibold text-[#203940]" : "text-muted-foreground"}`}>
                          {conv.lastMessage || ("Clique para ver mensagens")}
                      </p>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedConv ? (
            <Card className="border-border h-[500px] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <p className="font-semibold text-sm">
                  {selectedConv.contextType === "legacy"
                    ? "Conversa antiga"
                    : selectedConv.businessName || "Conversa"}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 -my-2"
                  onClick={() => onDeleteConversation(selectedConv.id)}
                  aria-label="Remover conversa da minha caixa de entrada"
                  title="Remover conversa da minha caixa de entrada"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        msg.senderId === currentUserId
                          ? "bg-amber-500 text-white rounded-br-sm"
                          : "bg-secondary rounded-bl-sm"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === currentUserId ? "text-white/70" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    {selectedConv.closedAt
                      ? "Esta conversa foi encerrada após a mudança de responsável."
                      : "Nenhuma mensagem ainda. Envie a primeira!"}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {selectedConv.closedAt ? (
                <p role="status" className="border-t border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  Conversa encerrada por mudança de responsável. Para falar com o responsável atual, inicie uma nova conversa pela página do negócio.
                </p>
              ) : (
                <div className="p-4 border-t border-border">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={messageText}
                      onChange={(e) => onMessageTextChange(e.target.value)}
                      placeholder={"Digite sua mensagem..."}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!messageText.trim() || sendingMsg}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          ) : (
            <Card className="border-border h-[500px] flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{"Selecione uma conversa"}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
