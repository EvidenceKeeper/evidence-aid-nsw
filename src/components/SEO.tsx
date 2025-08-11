import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title: string;
  description?: string;
}

export const SEO = ({ title, description }: SEOProps) => {
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      {description && (
        <meta property="og:description" content={description} />
      )}
      <meta property="og:type" content="website" />
    </Helmet>
  );
};
