
(function () {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();


    const map = {
        'members.html': 'members',
        'points.html' : 'points',
        'coupons.html': 'coupons'
    };
    const currentKey = map[file];

    document.querySelectorAll('.menu a').forEach(a => {
        a.classList.toggle('active', a.dataset.key === currentKey);
    });
})();
