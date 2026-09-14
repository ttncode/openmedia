import { ImageResponse } from "next/og";
import { BRAND_INK, BRAND_MIST, BRAND_TEAL, brandSvg } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon(): ImageResponse {
  const source = `data:image/svg+xml;base64,${Buffer.from(brandSvg({ frame: BRAND_MIST, wave: BRAND_TEAL, background: BRAND_INK })).toString("base64")}`;
  return new ImageResponse(
    <img src={source} width={180} height={180} alt="" />,
    size,
  );
}
