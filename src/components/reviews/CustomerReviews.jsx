import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star, MessageSquare, Mail, Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const methodIcons = {
  email: <Mail className="w-3 h-3" />,
  sms: <MessageSquare className="w-3 h-3" />,
  both: <Send className="w-3 h-3" />,
};

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
        />
      ))}
    </div>
  );
}

export default function CustomerReviews({ customerId, companyId, onRequestReview }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    base44.entities.Review.filter({ customer_id: customerId })
      .then(r => setReviews(r.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Reviews ({reviews.length})
        </h3>
        <button
          onClick={onRequestReview}
          className="text-xs px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
        >
          <Star className="w-3.5 h-3.5" /> Request Review
        </button>
      </div>

      {loading ? (
        <div className="py-4 text-center text-slate-400 text-sm">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="py-6 text-center text-slate-400">
          <Star className="w-8 h-8 mx-auto mb-2 text-slate-200" />
          <p className="text-sm">No reviews yet.</p>
          <p className="text-xs text-slate-400 mt-1">Send a review request to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="border border-slate-100 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {review.rating ? (
                    <StarDisplay rating={review.rating} />
                  ) : (
                    <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 border flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Awaiting response
                    </Badge>
                  )}
                  <Badge className={`text-xs flex items-center gap-1 ${review.status === "responded" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {methodIcons[review.sent_via]} {review.sent_via}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">
                  {review.sent_at ? format(new Date(review.sent_at), "MMM d, yyyy") : ""}
                </p>
              </div>
              {review.review_text && (
                <p className="text-sm text-slate-700 mt-1 italic">"{review.review_text}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}