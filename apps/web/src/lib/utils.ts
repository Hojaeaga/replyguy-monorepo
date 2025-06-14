import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
type FrameMetadata = {
  accountAssociation?: {
    header: string;
    payload: string;
    signature: string;
  };
  frame: {
    version: string;
    description: string;
    name: string;
    iconUrl: string;
    tagline: string;
    homeUrl: string;
    imageUrl: string;
    buttonTitle: string;
    splashImageUrl: string;
    splashBackgroundColor: string;
    primaryCategory: string;
    webhookUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogImageUrl: string;
    heroImageUrl: string;
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getFarcasterMetadata(): Promise<FrameMetadata> {
  // First check for FRAME_METADATA in .env and use that if it exists
  if (process.env.FRAME_METADATA) {
    try {
      const metadata = JSON.parse(process.env.FRAME_METADATA);
      console.log("Using pre-signed frame metadata from environment");
      return metadata;
    } catch (error) {
      console.warn("Failed to parse FRAME_METADATA from environment:", error);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_URL not configured");
  }

  const accountAssociation = {
    header:
      "eyJmaWQiOjE0NTgyLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4RTc0NzUyQTZlQTgyOWJmMEY0N0Q4ODMzRjVjMEY5MDMwYWIyMTU1MyJ9",
    payload: "eyJkb21haW4iOiJyZXBseWd1eS5tZWdhYnl0ZTB4Lnh5eiJ9",
    signature:
      "MHhjMDVjMTkyZTgyYzFmOGVmM2M3YzE4NTExMjdiMmFhZjYyMjZiZmYzMDYzNTM5ZTE2ODI5ZmE4NmE0YjkxYjg2MTBkOGU5M2JmMzBhMDA5ZTljMzMwMjE3OTA3NmM3NDYzYmE0NTc0MzBmZDU0MTk2ZTIwZDNhMDVlMWUyOTkzNjFj",
  };

  // Determine webhook URL based on whether Neynar is enabled
  const neynarApiKey = process.env.NEYNAR_API_KEY;
  const neynarClientId = process.env.NEYNAR_CLIENT_ID;
  const webhookUrl =
    neynarApiKey && neynarClientId
      ? `https://api.neynar.com/f/app/${neynarClientId}/event`
      : `${appUrl}/api/webhook`;

  const imageUrl = `${appUrl}/full_logo.png`;
  const logoUrl = `${appUrl}/logo.png`;
  const description =
    "Get the most relevant content discovery on your each cast.";
  const ogTitle = "ReplyGuy";
  const buttonTitle = "Get my reply guy!";
  const name = "ReplyGuy";
  const primaryCategory = "social";
  const tagline = "Your 24x7 reply guy";

  return {
    accountAssociation,
    frame: {
      version: "1",
      name,
      iconUrl: logoUrl,
      heroImageUrl: imageUrl,
      homeUrl: appUrl,
      description,
      tagline,
      imageUrl,
      buttonTitle,
      splashImageUrl: logoUrl,
      splashBackgroundColor: "#f7f7f7",
      webhookUrl,
      ogDescription: description,
      ogImageUrl: imageUrl,
      ogTitle,
      primaryCategory,
    },
  };
}
