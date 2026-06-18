import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, Loader2 } from "lucide-react";

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

    // Check if already installed (standalone mode)
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="w-5 h-5 text-green-500" />
            App Installed
          </CardTitle>
          <CardDescription>
            FieldFlow Pro is installed on this device. Open it from your home screen for quick access.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isInstallable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="w-5 h-5 text-slate-400" />
            Install App
          </CardTitle>
          <CardDescription>
            To install FieldFlow Pro on your device, open this page in Chrome or Safari and look for the install option in your browser menu.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
          <Download className="w-5 h-5" />
          Install FieldFlow Pro
        </CardTitle>
        <CardDescription className="text-blue-600">
          Add FieldFlow Pro to your home screen for quick access — works offline and feels like a native app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleInstall}
          disabled={installing}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {installing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Installing...</>
          ) : (
            <><Download className="w-4 h-4" /> Install App</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}