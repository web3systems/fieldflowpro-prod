import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  }

  if (installed) {
    return (
      <Button disabled className="gap-2 rounded-full px-5" variant="outline">
        <Download className="w-4 h-4" /> App Installed
      </Button>
    );
  }

  if (!isInstallable) {
    return (
      <Button disabled className="gap-2 rounded-full px-5" variant="outline">
        <Download className="w-4 h-4" /> Install App (unsupported browser)
      </Button>
    );
  }

  return (
    <Button
      onClick={handleInstall}
      disabled={installing}
      className="gap-2 rounded-full px-5 bg-blue-600 hover:bg-blue-700"
    >
      {installing ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Installing...</>
      ) : (
        <><Download className="w-4 h-4" /> Install App</>
      )}
    </Button>
  );
}