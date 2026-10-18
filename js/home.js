document.addEventListener('click', event => {
    const card = event.target.closest('a[data-publication]');
    if (!card || typeof window.gtag !== 'function' || window['ga-disable-G-4NG557NVB4']) return;
    window.gtag('event', 'select_content', {
        content_type: 'publication', item_id: card.dataset.publication,
        publication_id: card.dataset.publication, article_title: card.dataset.title,
        transport_type: 'beacon'
    });
});
