import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Detect iOS (iPhone/iPad Safari) - does not support beforeinstallprompt */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // iOS: check legacy standalone flag (Safari when added to home screen)
    if ((navigator as { standalone?: boolean }).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Check if app was previously installed
    if (localStorage.getItem("pwa-installed") === "true") {
      setIsInstalled(true);
      return;
    }

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // iOS: Show prompt after short delay (Safari has no beforeinstallprompt)
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }

    // Android/Chrome: Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      localStorage.setItem("pwa-installed", "true");
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || !showPrompt || sessionStorage.getItem("pwa-prompt-dismissed") === "true") {
    return null;
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIOSDevice ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            Install SOFTPRO Finance
          </DialogTitle>
          <DialogDescription asChild>
            {isIOSDevice ? (
              <div className="space-y-3 text-sm">
                <p>Add this app to your Home Screen for quick access and a better experience.</p>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                  <li>Tap <strong>Add</strong> in the top right</li>
                </ol>
              </div>
            ) : (
              <p>Install this app on your device for a better experience. It works offline and loads faster!</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          {!isIOSDevice && (
            <Button onClick={handleInstall} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          )}
          <Button variant="outline" onClick={handleDismiss} className="w-full">
            <X className="mr-2 h-4 w-4" />
            {isIOSDevice ? "Got it" : "Not Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

