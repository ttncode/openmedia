import { ImageResponse } from "next/og";
import {
  BRAND_INK,
  BRAND_MIST,
  BRAND_TEAL,
  PWA_ICON_SIZES,
  brandSvg,
} from "@/lib/brand";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): Array<{ size: string }> {
  return PWA_ICON_SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
): Promise<Response> {
  const { size } = await context.params;
  const pixels = PWA_ICON_SIZES.find((candidate) => String(candidate) === size);
  if (pixels === undefined) return new Response(null, { status: 404 });
  const source = `data:image/svg+xml;base64,${Buffer.from(brandSvg({ frame: BRAND_MIST, wave: BRAND_TEAL, background: BRAND_INK })).toString("base64")}`;
  return new ImageResponse(
    <img src={source} width={pixels} height={pixels} alt="" />,
    { width: pixels, height: pixels },
  );
}
