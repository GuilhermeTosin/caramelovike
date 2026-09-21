import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, MessageCircle, Minus, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketplaceChat } from "@/contexts/MarketplaceChatContext";
import { getOptimizedImageUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatConversationDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ConversationAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return imageUrl ? (
    <img src={getOptimizedImageUrl(imageUrl, { width: 96, quality: 65, format: "webp" })} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" loading="lazy" />
  ) : (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf3ed] text-sm font-bold text-[#12633d]">{name.charAt(0).toUpperCase()}</span>
  );
}

export default function MarketplaceChatPopup() {
  const { session } = useAuth();
  const {
    chat,
    selectMarketplaceChat,
    loadOlderMarketplaceChatMessages,
    backToMarketplaceChatInbox,
    closeMarketplaceChat,
    minimizeMarketplaceChat,
    restoreMarketplaceChat,
    sendMarketplaceChatMessage,
  } = useMarketplaceChat();
  const [draft, setDraft] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const preservedScrollRef = useRef<{ height: number; top: number } | null>(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container || !chat || chat.view !== "conversation") return;
    if (preservedScrollRef.current) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [chat?.view, chat?.active?.conversation.id, chat?.messages.length]);

  if (!chat) return null;

  const minimizedLabel = chat.view === "inbox" ? "Mensagens" : chat.active?.partnerName || "Mensagens";
  if (chat.minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-[#203940]/15 bg-white p-2 shadow-2xl">
        <button
          type="button"
          onClick={restoreMarketplaceChat}
          className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-secondary"
          aria-label={`Reabrir ${minimizedLabel}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eaf3ed] text-[#12633d]"><MessageCircle className="h-4 w-4" aria-hidden="true" /></span>
          <span className="min-w-0">
            <span className="block max-w-48 truncate text-sm font-semibold text-[#203940]">{minimizedLabel}</span>
            <span className="block text-xs text-muted-foreground">Mensagens</span>
          </span>
        </button>
        <button type="button" onClick={closeMarketplaceChat} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Fechar mensagens">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (chat.view === "inbox") {
    return (
      <section role="dialog" aria-label="Mensagens" className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[min(42rem,calc(100vh-4rem))] max-h-[86vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#203940]/15 bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(42rem,calc(100vh-2rem))] sm:w-[min(25rem,calc(100vw-2rem))] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#203940]/15 bg-[#203940] px-4 py-3 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Caixa de entrada</p>
            <p className="font-bold">Mensagens</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={minimizeMarketplaceChat} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Minimizar mensagens">
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={closeMarketplaceChat} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Fechar mensagens">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7f6] p-3">
          {chat.conversationsLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Carregando conversas...</p> : null}
          {!chat.conversationsLoading && !chat.conversations.length ? (
            <div className="px-4 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eaf3ed] text-[#12633d]"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>
              <p className="mt-4 font-semibold text-[#203940]">Nenhuma conversa ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">Suas mensagens para negocios e anuncios aparecerao aqui.</p>
            </div>
          ) : null}
          {!chat.conversationsLoading && chat.conversations.map((item) => (
            <button
              key={item.conversation.id}
              type="button"
              onClick={() => void selectMarketplaceChat(item)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white"
            >
              <ConversationAvatar name={item.partnerName} imageUrl={item.partnerAvatar} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-[#203940]">{item.contextTitle}</span>
                  {item.lastMessageAt ? <span className="shrink-0 text-[10px] text-muted-foreground">{formatConversationDate(item.lastMessageAt)}</span> : null}
                </span>
                <span className="block truncate text-xs text-primary">{item.contextSubtitle} · {item.partnerName}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{item.lastMessage || "Nenhuma mensagem enviada ainda"}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="shrink-0 border-t border-border bg-white px-4 py-3 text-center">
          <Link to="/perfil?tab=mensagens" onClick={closeMarketplaceChat} className="text-xs font-semibold text-primary hover:underline">Abrir Perfil &gt; Mensagens</Link>
        </div>
      </section>
    );
  }

  const active = chat.active;
  if (!active) return null;
  const contextImageUrl = active.contextImageUrl || active.partnerAvatar;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sent = await sendMarketplaceChatMessage(draft);
    if (sent) setDraft("");
  };

  const loadOlderMessages = async () => {
    const container = messagesRef.current;
    if (container) {
      preservedScrollRef.current = { height: container.scrollHeight, top: container.scrollTop };
    }
    await loadOlderMarketplaceChatMessages();
    requestAnimationFrame(() => {
      const currentContainer = messagesRef.current;
      const previousScroll = preservedScrollRef.current;
      if (currentContainer && previousScroll) {
        currentContainer.scrollTop = currentContainer.scrollHeight - previousScroll.height + previousScroll.top;
      }
      preservedScrollRef.current = null;
    });
  };

  const contextContent = (
    <>
      {contextImageUrl ? <img src={getOptimizedImageUrl(contextImageUrl, { width: 96, quality: 65, format: "webp" })} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-muted-foreground"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#203940]">{active.contextTitle}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{active.contextSubtitle} · {active.partnerName}</span>
        {active.contextPrice ? <span className="mt-0.5 block text-sm font-bold text-primary">{active.contextPrice}</span> : null}
      </span>
      {active.contextHref ? <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
    </>
  );

  return (
    <section role="dialog" aria-label={`Conversa com ${active.partnerName}`} className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[min(42rem,calc(100vh-4rem))] max-h-[86vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#203940]/15 bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(42rem,calc(100vh-2rem))] sm:w-[min(25rem,calc(100vw-2rem))] sm:rounded-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#203940]/15 bg-[#203940] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => void backToMarketplaceChatInbox()} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Voltar para todas as mensagens">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Conversa</p>
            <p className="truncate font-bold">{active.partnerName}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={minimizeMarketplaceChat} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Minimizar conversa">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={closeMarketplaceChat} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Fechar conversa">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {active.contextHref ? <Link to={active.contextHref} className="flex shrink-0 items-center gap-3 border-b border-border bg-[#f8faf8] px-4 py-3 hover:bg-[#eef5ef]">{contextContent}</Link> : <div className="flex shrink-0 items-center gap-3 border-b border-border bg-[#f8faf8] px-4 py-3">{contextContent}</div>}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f5f7f6] px-4 py-4" ref={messagesRef} aria-live="polite">
        {chat.loading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando conversa...</p> : null}
        {!chat.loading && !chat.messages.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mensagem nesta conversa ainda.</p> : null}
        {!chat.loading && chat.hasMoreMessages ? (
          <button
            type="button"
            onClick={() => void loadOlderMessages()}
            disabled={chat.loadingOlderMessages}
            className="mx-auto block rounded-full border border-[#12633d]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#12633d] hover:bg-[#eaf3ed] disabled:cursor-wait disabled:opacity-60"
          >
            {chat.loadingOlderMessages ? "Carregando mensagens anteriores..." : "Carregar mensagens anteriores"}
          </button>
        ) : null}
        {chat.messages.map((item) => {
          const isMine = item.senderId === session?.userId;
          return (
            <div key={item.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${isMine ? "rounded-br-sm bg-[#12633d] text-white" : "rounded-bl-sm bg-white text-[#203940]"}`}>
                <p className="whitespace-pre-wrap break-words">{item.text}</p>
                <p className={`mt-1 text-[10px] ${isMine ? "text-white/70" : "text-muted-foreground"}`}>{formatMessageTime(item.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(event) => void submit(event)} className="flex shrink-0 items-center gap-2 border-t border-border bg-white p-3">
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva uma mensagem..." aria-label="Nova mensagem" disabled={chat.sending} className="min-w-0 flex-1" />
        <Button type="submit" size="icon" disabled={chat.sending || !draft.trim()} aria-label="Enviar mensagem"><Send className="h-4 w-4" aria-hidden="true" /></Button>
      </form>
      <p className="shrink-0 bg-white px-4 pb-3 text-center text-[11px] text-muted-foreground">As mensagens tambem ficam disponiveis em Perfil &gt; Mensagens.</p>
    </section>
  );
}
