import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ArticleCard } from "@/components/ArticleCard";

export default function RelatedArticles({ slug }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/articles/${slug}/related`)
      .then(({ data }) => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <section className="bg-[#f5f5f7] py-20 mt-16" data-testid="related-articles">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="label-eyebrow mb-3">También puedes leer</div>
            <h2 className="h-display text-3xl md:text-4xl">Sigue tirando del hilo</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {items.map((a) => <ArticleCard key={a.slug} article={a} />)}
        </div>
      </div>
    </section>
  );
}
