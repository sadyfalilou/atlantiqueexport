import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Les images produit seront servies depuis Supabase Storage.
      // Le domaine réel est ajouté ici une fois le projet Supabase créé.
    ],
  },
};

export default withNextIntl(nextConfig);
