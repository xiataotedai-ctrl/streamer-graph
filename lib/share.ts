import { GraphData } from './types';

// 将图数据压缩编码为 URL safe string
export function encodeShareData(data: GraphData): string {
  try {
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  } catch {
    return '';
  }
}

export function decodeShareData(encoded: string): GraphData | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function generateShareURL(data: GraphData): string {
  const encoded = encodeShareData(data);
  if (!encoded) return '';
  return `${window.location.origin}?share=${encoded}`;
}

export function readShareFromURL(): GraphData | null {
  const params = new URLSearchParams(window.location.search);
  const shareData = params.get('share');
  if (!shareData) return null;
  return decodeShareData(shareData);
}
