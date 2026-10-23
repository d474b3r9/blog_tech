import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'Blog', href: getBlogPermalink() },
    { text: 'CV', href: getPermalink('/cv') },
    { text: 'À propos', href: getPermalink('/about') },
  ],
  actions: [],
};

export const footerData = {
  links: [],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/d474b3r9' },
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: 'https://www.linkedin.com/in/jonathan-cattelain' },
  ],
  footNote: `DataStart · Tous droits réservés.`,
};
