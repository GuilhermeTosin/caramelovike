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
          <h2 className="text-2xl font-bold text-foreground mb-4">Mensagens</h2>
          {conversations.length === 0 ? (
            <Card className="p-6 text-center border-border">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  type="button"
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedConv?.id === conv.id
                      ? "bg-amber-100/80 border-amber-300 shadow-sm"
                      : "bg-card border-border hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 border border-border">
                      {conversationPartners[conv.id]?.avatar ? (
                        <img
                          src={conversationPartners[conv.id].avatar}
                          alt={conversationPartners[conv.id]?.name || "Contato"}
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
                        <p className="font-semibold text-sm truncate">
                          {conversationPartners[conv.id]?.name || conv.businessName || "Conversa"}
                        </p>
                        {conv.lastMessageAt ? (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(conv.lastMessageAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        ) : null}
                      </div>
                      {conv.businessName ? (
                        <p className="text-[11px] text-primary/80 truncate mt-0.5">
                          Em: {conv.businessName}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage || "Clique para ver mensagens"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedConv ? (
            <Card className="border-border h-[500px] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <p className="font-semibold text-sm">
                  {selectedConv.businessName || "Conversa"}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 -my-2"
                  onClick={() => onDeleteConversation(selectedConv.id)}
                >
                  <Trash2 className="w-4 h-4" />
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
                    Nenhuma mensagem ainda. Envie a primeira!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
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
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!messageText.trim() || sendingMsg}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          ) : (
            <Card className="border-border h-[500px] flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Selecione uma conversa</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
