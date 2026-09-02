import { Link } from "react-router-dom";
import { MapPin, Verified } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/language";

export interface ProductCardData {
  id: string;
  title: string;
  price: number;
  currency: string;
  era?: string | null;
  location?: string | null;
  images: string[];
  category_slug?: string | null;
  profiles?: { username: string; verified: boolean } | null;
}

const ProductCard = ({ product }: { product: ProductCardData }) => {
  const img = product.images?.[0] || "/placeholder.svg";
  const { format } = useCurrency();
  const { t } = useLanguage();
  return (
    <Link to={`/product/${product.id}`} className="group frame-card block overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={img}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.era && (
          <span className="absolute left-3 top-3 font-serif-cap text-[10px] bg-ink/85 text-gold px-2.5 py-1 rounded-sm backdrop-blur">
            {product.era}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-xl leading-tight line-clamp-1 group-hover:text-gold-dark transition-colors">{product.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <div className="font-serif-cap text-xs text-muted-foreground flex items-center gap-1">
            {product.location && <><MapPin className="h-3 w-3" /> {product.location}</>}
          </div>
          <div className="font-display text-lg font-semibold text-gold-dark">
            {format(product.price, product.currency)}
          </div>
        </div>
        {product.profiles && (
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{t("pc_by")} @{product.profiles.username}</span>
            {product.profiles.verified && <Verified className="h-3.5 w-3.5 text-gold" />}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
