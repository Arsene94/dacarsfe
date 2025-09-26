import type { Metadata } from "next";
import { ensureAbsoluteUrl } from "@/lib/seo/structuredData";
import { buildCanonicalUrl } from "@/lib/seo/url";
import { siteMetadata } from "@/lib/seo/siteMetadata";

type SocialImageInput = {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
};

type OpenGraphType =
    | "article"
    | "book"
    | "music.song"
    | "music.album"
    | "music.playlist"
    | "music.radio_station"
    | "profile"
    | "website"
    | "video.tv_show"
    | "video.other"
    | "video.movie"
    | "video.episode";

type BuildMetadataOptions = {
    title: string;
    description: string;
    path?: string;
    keywords?: readonly string[];
    image?: SocialImageInput;
    openGraphTitle?: string;
    twitterTitle?: string;
    openGraphType?: OpenGraphType;
    noIndex?: boolean;
    robots?: Metadata["robots"];
};

export const buildMetadata = (options: BuildMetadataOptions): Metadata => {
    const canonicalUrl = options.path
        ? buildCanonicalUrl(options.path)
        : siteMetadata.siteUrl;

    const image = options.image ?? siteMetadata.defaultSocialImage;
    const imageUrl = ensureAbsoluteUrl(image.src, siteMetadata.siteUrl);
    const imageAlt = image.alt ?? siteMetadata.defaultSocialImage.alt;

    const keywordsSource = options.keywords ?? siteMetadata.keywords;
    const keywords = keywordsSource.length > 0 ? [...keywordsSource] : undefined;
    const openGraphTitle = options.openGraphTitle ?? options.title;
    const twitterTitle = options.twitterTitle ?? openGraphTitle;

    const robots: Metadata["robots"] = options.robots
        ?? (options.noIndex
            ? {
                  index: false,
                  follow: false,
                  googleBot: {
                      index: false,
                      follow: false,
                  },
              }
            : siteMetadata.robots);

    const openGraphType: OpenGraphType = options.openGraphType ?? "website";

    return {
        title: options.title,
        description: options.description,
        keywords,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            type: openGraphType,
            locale: siteMetadata.locale,
            url: canonicalUrl,
            siteName: siteMetadata.siteName,
            title: openGraphTitle,
            description: options.description,
            images: [
                {
                    url: imageUrl,
                    width: image.width ?? siteMetadata.defaultSocialImage.width,
                    height: image.height ?? siteMetadata.defaultSocialImage.height,
                    alt: imageAlt,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: twitterTitle,
            description: options.description,
            images: [imageUrl],
        },
        robots,
    };
};
