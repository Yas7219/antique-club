import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Verified, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/lib/notifications";

const iconFor = (type: string) => {
  if (type === "kyc_approved") return <Verified className="h-4 w-4 text-gold shrink-0" />;
  if (type === "kyc_rejected") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  return <Sparkles className="h-4 w-4 text-gold-dark shrink-0" />;
};

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const NotificationBell = () => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <span className="font-display text-lg">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/40 last:border-0 hover:bg-secondary/50 transition-colors ${
                  n.read ? "" : "bg-secondary/30"
                }`}
              >
                {iconFor(n.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
