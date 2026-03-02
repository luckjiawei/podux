import md5 from "md5";

/**
 * Generate Gravatar URL from email address
 * @param email - User's email address
 * @param size - Image size in pixels (default: 80)
 * @param defaultImage - Default image type if email has no gravatar
 *                       Options: 'mp' (mystery person), 'identicon', 'monsterid', 'wavatar', 'retro', 'robohash', 'blank'
 * @returns Gravatar URL
 */
export function getGravatarUrl(
  email: string,
  size: number = 80,
  defaultImage: string = "mp"
): string {
  const trimmedEmail = email?.trim().toLowerCase() || "";
  const hash = md5(trimmedEmail);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

export default getGravatarUrl;
