/** Checks a URL hostname against exact allowed domains and their subdomains. */
export function isAllowedByDomain(url: string, allowedDomains: string[]): boolean {
  const hostname = getHostname(url);
  if (!hostname) return false;

  return allowedDomains.some((domain) => {
    const allowedHostname = getHostname(domain);
    return (
      allowedHostname !== null &&
      (hostname === allowedHostname || hostname.endsWith(`.${allowedHostname}`))
    );
  });
}

function getHostname(value: string): string | null {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}
