export function withBase(path) {
  return import.meta.env.BASE_URL + String(path).replace(/^\/+/, "");
}
