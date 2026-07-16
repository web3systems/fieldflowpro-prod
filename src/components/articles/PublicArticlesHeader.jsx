import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function PublicArticlesHeader() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setAuthed).catch(() => setAuthed(false));
  }, []);

  const handleSignIn = () => {
    if (authed) {
      window.location.href = "/Dashboard";
    } else {
      base44.auth.redirectToLogin(`${window.location.origin}/Dashboard`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center">
          <img
            src="https://media.base44.com/images/public/69b20e4261ce8a3e5bf093b0/408bce6f6_LGipynfh-removebg-preview.png"
            alt="FieldFlow Pro"
            className="h-14 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/Articles" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Articles</Link>
          <Button variant="ghost" size="sm" onClick={handleSignIn}>{authed ? "Dashboard" : "Sign In"}</Button>
          {!authed && (
            <Link to="/Register"><Button size="sm" className="bg-blue-600 hover:bg-blue-700">Start Free Trial</Button></Link>
          )}
        </div>
      </div>
    </header>
  );
}