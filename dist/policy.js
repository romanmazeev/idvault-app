const policyNav = document.querySelector('.policy-nav');

if (policyNav) {
  const entries = Array.from(policyNav.querySelectorAll('a[href^="#"]'), (link) => ({
    link,
    section: document.getElementById(link.hash.slice(1)),
  })).filter(({ section }) => section);

  const page = document.documentElement;
  let currentLink;
  let frame;

  function updatePolicyLocation() {
    frame = undefined;
    const scrollPadding = parseFloat(getComputedStyle(page).scrollPaddingTop);
    const scrollMargin = parseFloat(getComputedStyle(entries[0].section).scrollMarginTop);
    const readingLine = scrollPadding + scrollMargin + 2;
    const atBottom = window.scrollY + page.clientHeight >= page.scrollHeight - 2;

    let entry = entries.findLast(({ section }) => section.getBoundingClientRect().top <= readingLine);
    if (atBottom) {
      // The final anchors can share the same scroll position on a tall screen.
      entry = entries.find(({ link, section }) =>
        link.hash === location.hash &&
        section.getBoundingClientRect().top >= readingLine &&
        section.getBoundingClientRect().top < page.clientHeight
      ) ?? entries.at(-1);
    }

    if (entry?.link === currentLink) return;
    currentLink?.removeAttribute('aria-current');
    currentLink = entry?.link;
    currentLink?.setAttribute('aria-current', 'location');
  }

  function schedulePolicyLocation() {
    frame ??= requestAnimationFrame(updatePolicyLocation);
  }

  if (entries.length) {
    window.addEventListener('scroll', schedulePolicyLocation, { passive: true });
    window.addEventListener('resize', schedulePolicyLocation);
    window.addEventListener('hashchange', schedulePolicyLocation);
    window.addEventListener('pageshow', schedulePolicyLocation);
    schedulePolicyLocation();
  }
}
