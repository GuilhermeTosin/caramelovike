import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageCircle, Minus, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketplaceChat } from "@/contexts/MarketplaceChatContext";
import { getOptimizedImageUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function MarketplaceChatPopup() {
  const { session } = useAuth();
  const { chat, closeMarketplaceChat, minimizeMarketplaceChat, restoreMarketplaceChat, sendMarketplaceChatMessage } = useMarketplaceChat();
  const [draft, setDraft] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container || !chat) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [chat?.conversation.id, chat?.messages.length]);

  if (!chat) return null;

  if (chat.minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-[#203940]/15 bg-white p-2 shadow-2xl">
        <button
          type="button"
          onClick={restoreMarketplaceChat}
          className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-secondary"
          aria-label={`Reabrir conversa com ${chat.listing.sellerName}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eaf3ed] text-[#12633d]"><MessageCircle className="h-4 w-4" aria-hidden="true" /></span>
          <span className="min-w-0">
            <span className="block max-w-48 truncate text-sm font-semibold text-[#203940]">{chat.listing.sellerName}</span>
            <span className="block text-xs text-muted-foreground">Conversa do anuncio</span>
          </span>
        </button>
        <button type="button" onClick={closeMarketplaceChat} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Fechar conversa">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const imageUrl = chat.listing.imageUrl
    ? getOptimizedImageUrl(chat.listing.imageUrl, { width: 96, quality: 65, format: "webp" })
    : null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sent = await sendMarketplaceChatMessage(draft);
    if (sent) setDraft("");
  };

  return (
    <section
      role="dialog"
      aria-label={`Conversa sobre ${chat.listing.title}`}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[min(42rem,calc(100vh-4rem))] max-h-[86vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#203940]/15 bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(42rem,calc(100vh-2rem))] sm:w-[min(25rem,calc(100vw-2rem))] sm:rounded-2xl"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-[#203940] px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Mensagem ao vendedor</p>
          <p className="truncate font-bold">{chat.listing.sellerName}</p>
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

      <Link to={chat.listing.href} className="flex shrink-0 items-center gap-3 border-b border-border bg-[#f8faf8] px-4 py-3 hover:bg-[#eef5ef]">
        {imageUrl ? <img src={imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-muted-foreground"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[#203940]">{chat.listing.title}</span>
          <span className="mt-0.5 block text-sm font-bold text-primary">{chat.listing.price}</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f5f7f6] px-4 py-4" aria-live="polite">
        {chat.loading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando conversa...</p> : null}
        {!chat.loading && !chat.messages.length ? <p className="py-8 text-center text-sm text-muted-foreground">A conversa foi iniciada. Envie uma mensagem para continuar.</p> : null}
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
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escreva uma mensagem..."
          aria-label="Nova mensagem"
          disabled={chat.sending}
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="icon" disabled={chat.sending || !draft.trim()} aria-label="Enviar mensagem">
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
      <p className="shrink-0 bg-white px-4 pb-3 text-center text-[11px] text-muted-foreground">As mensagens tambem ficam disponiveis em Perfil &gt; Mensagens.</p>
    </section>
  );
}
