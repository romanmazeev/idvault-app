import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(projectRoot, 'dist');
const sharedRoot = resolve(projectRoot, 'site/shared');
const homeRoot = resolve(projectRoot, 'site/home');

const pages = [
  {
    file: 'index.html',
    home: './',
    skipTarget: '#main',
    skipLabel: 'Skip to content',
    styles: ['./apple.css', './common.css'],
  },
  {
    file: 'privacy-policy/index.html',
    home: '../',
    skipTarget: '#policy-content',
    skipLabel: 'Skip to policy',
    active: 'privacy',
    styles: ['../styles.css', '../common.css'],
  },
  {
    file: 'support/index.html',
    home: '../',
    skipTarget: '#support-content',
    skipLabel: 'Skip to support',
    active: 'support',
    styles: ['../styles.css', '../common.css'],
  },
];

const readTemplate = (name) => readFile(resolve(sharedRoot, name), 'utf8');
const readHomeTemplate = (name) => readFile(resolve(homeRoot, name), 'utf8');
const [{ highlights, privacyFacts }, { appStoreUrl, supportEmail }, headerTemplate, footerTemplate, highlightTemplate, privacyFactTemplate] = await Promise.all([
  import('../site/home/content.mjs'),
  import('../site/config.mjs'),
  readTemplate('header.html'),
  readTemplate('footer.html'),
  readHomeTemplate('highlight-card.html'),
  readHomeTemplate('privacy-fact.html'),
]);

function renderValues(template, values) {
  return template.trim().replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template value: ${key}`);
    return values[key];
  });
}

function render(template, page) {
  const values = {
    home: page.home,
    appStoreUrl,
    supportEmail,
    skipTarget: page.skipTarget,
    skipLabel: page.skipLabel,
    overviewCurrent: page.active === 'overview' ? ' aria-current="page"' : '',
    privacyCurrent: page.active === 'privacy' ? ' aria-current="page"' : '',
    supportCurrent: page.active === 'support' ? ' aria-current="page"' : '',
  };
  return renderValues(template, values);
}

function renderCollection(name, template, items) {
  const renderedItems = items.map((item) => renderValues(template, item)).join('\n');
  return `<!-- site:${name} -->\n${renderedItems}\n<!-- /site:${name} -->`;
}

function replaceSharedBlock(html, name, replacement, fallbackPattern) {
  const marker = new RegExp(`<!-- site:${name} -->[\\s\\S]*?<!-- \\/site:${name} -->`);
  if (marker.test(html)) return html.replace(marker, replacement);
  if (fallbackPattern?.test(html)) return html.replace(fallbackPattern, replacement);
  throw new Error(`Could not find ${name} block in page`);
}

for (const page of pages) {
  const path = resolve(distRoot, page.file);
  let html = await readFile(path, 'utf8');
  if (page.file === 'index.html') {
    html = replaceSharedBlock(
      html,
      'highlight-cards',
      renderCollection('highlight-cards', highlightTemplate, highlights),
    );
    html = replaceSharedBlock(
      html,
      'privacy-facts',
      renderCollection('privacy-facts', privacyFactTemplate, privacyFacts),
    );
  }
  if (page.file === 'privacy-policy/index.html') {
    html = replaceSharedBlock(
      html,
      'policy-email',
      `<!-- site:policy-email -->${supportEmail}<!-- /site:policy-email -->`,
    );
  }
  html = replaceSharedBlock(
    html,
    'header',
    render(headerTemplate, page),
    /<a class="skip-link"[\s\S]*?<header class="site-header">[\s\S]*?<\/header>/,
  );
  html = replaceSharedBlock(
    html,
    'footer',
    render(footerTemplate, page),
    /<footer class="site-footer"[\s\S]*?<\/footer>/,
  );

  html = html.replaceAll('{{appStoreUrl}}', appStoreUrl);
  html = html.replaceAll('{{supportEmail}}', supportEmail);
  html = html.replace(/href="https:\/\/apps\.apple\.com\/[^\"]+"/g, `href="${appStoreUrl}"`);
  html = html.replace(/mailto:[^"?\s]+/g, `mailto:${supportEmail}`);

  const stylesheetLinks = page.styles
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join('\n');
  const stylesheetPattern = /<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?\s*>(?:\s*<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?\s*>)*/g;
  let stylesheetCount = 0;
  html = html.replace(stylesheetPattern, () => {
    stylesheetCount += 1;
    return stylesheetCount === 1 ? stylesheetLinks : '';
  });
  if (stylesheetCount === 0) throw new Error(`Could not find stylesheet link in ${page.file}`);
  html = html.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n');
  await writeFile(path, html);
}

await copyFile(resolve(sharedRoot, 'site.css'), resolve(distRoot, 'common.css'));
console.log(`Built ${pages.length} pages with shared navigation, controls, and footer.`);
