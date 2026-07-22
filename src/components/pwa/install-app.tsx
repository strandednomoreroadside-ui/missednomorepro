"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function InstallApp({ prominent = false }: { prominent?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone());
    const capture = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const finish = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", finish);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", finish);
    };
  }, []);

  if (installed || (!promptEvent && !ios)) return null;

  async function install() {
    if (ios) {
      setShowIosHelp((value) => !value);
      return;
    }
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  return (
    <div
      className={cn(
        prominent && "rounded-2xl border border-cyan/25 bg-cyan/5 p-4"
      )}
    >
      <Button
        type="button"
        variant={prominent ? "default" : "outline"}
        onClick={install}
        className={cn("min-h-11", prominent ? "w-full" : "w-full")}
      >
        <Download aria-hidden />
        Install app
      </Button>
      {showIosHelp && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground" role="status">
          <Share className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden />
          In Safari, tap Share, then choose <strong className="text-foreground">Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}

