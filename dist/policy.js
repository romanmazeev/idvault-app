const policyNav = document.querySelector('.policy-nav');

if (policyNav) {
  const entries = Array.from(policyNav.querySelectorAll('a[href^="#"]'), (link) => ({
    link,
    section: document.getElementById(link.hash.slice(1)),
  })).filter(({ section }) => section);

  const page = document.documentElement;
  let currentLink;
  let frame;
  let requestedEntry = entries.find(({ link }) => link.hash === location.hash);
  let reachedAnchor = false;

  function updatePolicyLocation() {
    frame = undefined;
    const scrollPadding = parseFloat(getComputedStyle(page).scrollPaddingTop);
    const scrollMargin = parseFloat(getComputedStyle(entries[0].section).scrollMarginTop);
    const anchorOffset = scrollPadding + scrollMargin;
    const viewportHeight = page.clientHeight;
    const maxScroll = Math.max(0, page.scrollHeight - viewportHeight);
    const scrollY = Math.max(0, Math.min(maxScroll, window.scrollY));
    const sections = entries.map((entry) => ({
      ...entry,
      start: window.scrollY + entry.section.getBoundingClientRect().top - anchorOffset,
    }));
    const lastStart = sections.at(-1).start;
    let readingPosition = scrollY;

    if (lastStart > maxScroll && maxScroll > 0) {
      // Compress the final section starts into the available scroll range.
      const endRangeStart = sections.findLast(({ start }) =>
        start <= maxScroll - viewportHeight / 4
      )?.start ?? 0;
      if (scrollY > endRangeStart) {
        const progress = (scrollY - endRangeStart) / (maxScroll - endRangeStart);
        readingPosition = endRangeStart + progress * (lastStart - endRangeStart);
      }
    }

    let entry = sections.findLast(({ start }) => start <= readingPosition + 2);

    if (requestedEntry) {
      const anchorY = sections.find(({ link }) => link === requestedEntry.link).start;
      const destination = Math.max(0, Math.min(maxScroll, anchorY));

      if (Math.abs(scrollY - destination) <= 2) {
        entry = requestedEntry;
        reachedAnchor = true;
      } else if (reachedAnchor) {
        requestedEntry = undefined;
      }
    }

    if (entry?.link === currentLink) return;
    currentLink?.removeAttribute('aria-current');
    currentLink = entry?.link;
    if (!currentLink) return;

    currentLink.setAttribute('aria-current', 'location');
    if (policyNav.scrollHeight <= policyNav.clientHeight) return;

    // Scroll only the table of contents to keep the current link in view.
    const linkBounds = currentLink.getBoundingClientRect();
    const navTop = policyNav.getBoundingClientRect().top + policyNav.clientTop;
    const navBottom = navTop + policyNav.clientHeight;
    if (linkBounds.top < navTop) {
      policyNav.scrollTop += linkBounds.top - navTop;
    } else if (linkBounds.bottom > navBottom) {
      policyNav.scrollTop += Math.ceil(linkBounds.bottom - navBottom);
    }
  }

  function schedulePolicyLocation() {
    frame ??= requestAnimationFrame(updatePolicyLocation);
  }

  function selectAnchor(hash) {
    requestedEntry = entries.find(({ link }) => link.hash === hash);
    reachedAnchor = false;
    schedulePolicyLocation();
  }

  function resumeScrollTracking(event) {
    if (!requestedEntry || policyNav.contains(event.target)) return;

    requestedEntry = undefined;
    schedulePolicyLocation();
  }

  if (entries.length) {
    window.addEventListener('scroll', schedulePolicyLocation, { passive: true });
    window.addEventListener('wheel', (event) => {
      if (event.deltaY && !event.ctrlKey) resumeScrollTracking(event);
    }, { passive: true });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'End') resumeScrollTracking(event);
    });
    window.addEventListener('resize', schedulePolicyLocation);
    window.addEventListener('hashchange', () => selectAnchor(location.hash));
    policyNav.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      selectAnchor(link.hash);
    });
    window.addEventListener('pageshow', schedulePolicyLocation);
    schedulePolicyLocation();
  }
}
