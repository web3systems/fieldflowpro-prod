import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Services have moved to the Price Book.
// This redirect ensures any old bookmarks or links still work.
export default function Services() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/PriceBook", { replace: true }); }, []);
  return null;
}