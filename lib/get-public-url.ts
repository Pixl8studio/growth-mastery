/**
 * Helper function for generating public page URLs on the client
 */

export function getPublicPageUrlClient(
    username: string,
    vanitySlug: string | null
): string | null {
    if (!vanitySlug || !username) return null;
    return `${window.location.origin}/${username}/${vanitySlug}`;
}
