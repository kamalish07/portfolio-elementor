const fs = require('fs');
const path = require('path');

const WEBSITE_DIR = path.join(__dirname, 'website');
const BLOCKS_FILE = path.join(WEBSITE_DIR, 'content', 'blocks.json');

// We will replace the entire blocks.json with a rich set of pages
const newBlocks = {
  pages: {
    home: {
      migrated: true,
      sections: [
        {
          id: 's_hero', type: 'section', layoutMode: 'auto', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: 0, paddingY: 0, bg: 'var(--ploy-background-primary)',
          blocks: [
            {
              id: 'c_hero_txt', type: 'container', width: 50, layoutMode: 'auto', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 28, padding: 64,
              blocks: [
                { id: 'b_h1', type: 'text', tag: 'h1', text: 'Hi, I’m Kamalish', size: 60, weight: 600, font: 'playfair' },
                { id: 'b_p1', type: 'text', tag: 'p', text: 'An aspiring product manager at IIT Madras, working at the intersection of product strategy, user experience, and visual storytelling.', size: 18, color: 'var(--ploy-text-secondary)' },
                { id: 'b_btn', type: 'button', text: 'See projects', url: '#work', width: 100, align: 'left' }
              ]
            },
            {
              id: 'c_hero_img', type: 'container', width: 50, layoutMode: 'auto', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 0, padding: 0,
              blocks: [
                { id: 'b_img1', type: 'image', src: 'assets/images/hero-desk.webp', alt: 'Editorial desk', width: 100, radius: 0, height: 680, objectFit: 'cover' }
              ]
            }
          ]
        },
        {
          id: 's_practice', type: 'section', layoutMode: 'auto', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: 16, paddingY: 64, bg: 'var(--ploy-background-primary)',
          blocks: [
            { id: 'c_p1', type: 'container', width: 25, layoutMode: 'auto', flexDirection: 'column', gap: 8, padding: 16, blocks: [
              { id: 't1', type: 'text', tag: 'h2', text: 'Ps', size: 36, font: 'playfair' },
              { id: 't2', type: 'text', tag: 'h3', text: 'Product strategy', size: 14, weight: 600 },
              { id: 't3', type: 'text', tag: 'p', text: 'Requirements, roadmaps & metrics', size: 12, color: 'var(--ploy-text-secondary)' }
            ]},
            { id: 'c_p2', type: 'container', width: 25, layoutMode: 'auto', flexDirection: 'column', gap: 8, padding: 16, blocks: [
              { id: 't4', type: 'text', tag: 'h2', text: 'Ux', size: 36, font: 'playfair' },
              { id: 't5', type: 'text', tag: 'h3', text: 'UX & flows', size: 14, weight: 600 },
              { id: 't6', type: 'text', tag: 'p', text: 'Research translated into clarity', size: 12, color: 'var(--ploy-text-secondary)' }
            ]},
            { id: 'c_p3', type: 'container', width: 25, layoutMode: 'auto', flexDirection: 'column', gap: 8, padding: 16, blocks: [
              { id: 't7', type: 'text', tag: 'h2', text: 'Gt', size: 36, font: 'playfair' },
              { id: 't8', type: 'text', tag: 'h3', text: 'GTM thinking', size: 14, weight: 600 },
              { id: 't9', type: 'text', tag: 'p', text: 'Markets, positioning & growth', size: 12, color: 'var(--ploy-text-secondary)' }
            ]},
            { id: 'c_p4', type: 'container', width: 25, layoutMode: 'auto', flexDirection: 'column', gap: 8, padding: 16, blocks: [
              { id: 't10', type: 'text', tag: 'h2', text: 'Vc', size: 36, font: 'playfair' },
              { id: 't11', type: 'text', tag: 'h3', text: 'Visual craft', size: 14, weight: 600 },
              { id: 't12', type: 'text', tag: 'p', text: 'Decks and systems that communicate', size: 12, color: 'var(--ploy-text-secondary)' }
            ]}
          ]
        },
        {
          id: 's_projects', type: 'section', layoutMode: 'auto', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, paddingY: 80, bg: 'var(--ploy-background-primary)', maxWidth: 1152,
          blocks: [
            { id: 't_proj', type: 'text', tag: 'h2', text: 'Selected work across product and visual design.', size: 48, font: 'playfair', width: 100 },
            { id: 'c_proj_grid', type: 'container', width: 100, layoutMode: 'auto', flexDirection: 'row', gap: 20, blocks: [
              { id: 'c_card1', type: 'container', width: 33, layoutMode: 'auto', flexDirection: 'column', gap: 0, bg: 'var(--ploy-background-secondary)', radius: 8, blocks: [
                { id: 'i_c1', type: 'image', src: 'assets/images/wireframes-cover.webp', width: 100, height: 240, objectFit: 'cover' },
                { id: 'c_c1b', type: 'container', width: 100, layoutMode: 'auto', flexDirection: 'column', gap: 12, padding: 24, blocks: [
                  { id: 't_c1d', type: 'text', tag: 'small', text: 'UX structure & interaction', color: 'var(--ploy-text-secondary)' },
                  { id: 't_c1t', type: 'text', tag: 'h3', text: 'Product Wireframes', size: 28, font: 'playfair' },
                  { id: 't_c1s', type: 'text', tag: 'p', text: 'Early-stage flows translated into clear, reviewable interface systems.', size: 14, color: 'var(--ploy-text-secondary)' }
                ]}
              ]},
              { id: 'c_card2', type: 'container', width: 33, layoutMode: 'auto', flexDirection: 'column', gap: 0, bg: 'var(--ploy-background-secondary)', radius: 8, blocks: [
                { id: 'i_c2', type: 'image', src: 'assets/images/decks-cover.webp', width: 100, height: 240, objectFit: 'cover' },
                { id: 'c_c2b', type: 'container', width: 100, layoutMode: 'auto', flexDirection: 'column', gap: 12, padding: 24, blocks: [
                  { id: 't_c2d', type: 'text', tag: 'small', text: 'Narrative & presentation design', color: 'var(--ploy-text-secondary)' },
                  { id: 't_c2t', type: 'text', tag: 'h3', text: 'Product Decks', size: 28, font: 'playfair' },
                  { id: 't_c2s', type: 'text', tag: 'p', text: 'Complex product ideas shaped into focused stories people can follow.', size: 14, color: 'var(--ploy-text-secondary)' }
                ]}
              ]},
              { id: 'c_card3', type: 'container', width: 33, layoutMode: 'auto', flexDirection: 'column', gap: 0, bg: 'var(--ploy-background-secondary)', radius: 8, blocks: [
                { id: 'i_c3', type: 'image', src: 'assets/images/visual-systems-cover.webp', width: 100, height: 240, objectFit: 'cover' },
                { id: 'c_c3b', type: 'container', width: 100, layoutMode: 'auto', flexDirection: 'column', gap: 12, padding: 24, blocks: [
                  { id: 't_c3d', type: 'text', tag: 'small', text: 'Graphic design & identity', color: 'var(--ploy-text-secondary)' },
                  { id: 't_c3t', type: 'text', tag: 'h3', text: 'Visual Systems', size: 28, font: 'playfair' },
                  { id: 't_c3s', type: 'text', tag: 'p', text: 'Graphic languages built to stay coherent across formats and moments.', size: 14, color: 'var(--ploy-text-secondary)' }
                ]}
              ]}
            ]}
          ]
        },
        {
          id: 's_footer', type: 'section', layoutMode: 'auto', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 56, paddingY: 96, bg: 'var(--ploy-background-inverse)', maxWidth: 1152,
          blocks: [
            { id: 'c_f_left', type: 'container', width: 60, layoutMode: 'auto', flexDirection: 'column', gap: 24, blocks: [
              { id: 't_f1', type: 'text', tag: 'h2', text: 'Clear thinking deserves a clear form.', size: 48, font: 'playfair', color: 'var(--ploy-text-inverse)' },
              { id: 't_f2', type: 'text', tag: 'p', text: 'This portfolio is designed to grow with real decks, wireframes, visual systems, and detailed project stories.', size: 16, color: 'var(--ploy-text-inverse-secondary)' }
            ]},
            { id: 'c_f_right', type: 'container', width: 40, layoutMode: 'auto', flexDirection: 'column', gap: 16, blocks: [
              { id: 't_f3', type: 'text', tag: 'p', text: '[Selected work](#work)', size: 14, color: 'var(--ploy-text-inverse)' },
              { id: 't_f4', type: 'text', tag: 'p', text: '[Experience](#experience)', size: 14, color: 'var(--ploy-text-inverse)' },
              { id: 't_f5', type: 'text', tag: 'p', text: '[Home](./)', size: 14, color: 'var(--ploy-text-inverse)' },
              { id: 't_f6', type: 'text', tag: 'small', text: '© 2026 Kamalish', size: 12, color: 'var(--ploy-text-inverse-secondary)' }
            ]}
          ]
        }
      ]
    }
  }
};

fs.writeFileSync(BLOCKS_FILE, JSON.stringify(newBlocks, null, 2), 'utf8');
console.log('Migrated blocks.json to new JSON structure.');

const htmlFiles = [
  'index.html',
  'work/about-me/index.html',
  'work/product-decks/index.html',
  'work/product-wireframes/index.html',
  'work/visual-systems/index.html'
];

htmlFiles.forEach(file => {
  const p = path.join(WEBSITE_DIR, file);
  if (!fs.existsSync(p)) return;
  
  let html = fs.readFileSync(p, 'utf8');
  
  // Regex to remove anything that looks like a default section or footer.
  // We'll just replace everything between <header ...> and </main> with just <div class="custom-sections" data-page="..."></div>
  // Wait, the header is also hardcoded. We can make the header a section too later, but for now we'll leave header, and just gut the body.
  
  // A safer approach for the regex: remove all <section data-default-section="..."> ... </section>
  // and <footer ...> ... </footer>
  
  html = html.replace(/<section[^>]*data-default-section[^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/<footer[^>]*data-default-section[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // If there are any stray <template> blocks inside sections, they're gone.
  
  fs.writeFileSync(p, html, 'utf8');
  console.log('Cleaned HTML in', file);
});

console.log('Done Migration.');
