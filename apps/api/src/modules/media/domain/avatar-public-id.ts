/** Only delete generated avatar resources owned by this user; external auth images are untouched. */
export function avatarPublicId(image: string | null | undefined, cloud: string, folder: string, userId: string): string | null {
  if (!image) return null;
  try {
    const url = new URL(image);
    const prefix = `/${cloud}/image/upload/`;
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(prefix)) return null;
    const publicId = url.pathname.slice(prefix.length).replace(/^v\d+\//, "").replace(/\.(jpe?g|png|webp)$/i, "");
    const ownerPrefix = `${folder}/avatars/${userId}/`;
    if (!publicId.startsWith(ownerPrefix) || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(publicId.slice(ownerPrefix.length))) return null;
    return publicId;
  } catch { return null; }
}
