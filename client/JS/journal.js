// 自动加载日记列表并插入到 index.html 中
window.addEventListener('DOMContentLoaded', () => {
    fetch('/api/list-diaries')
        .then(res => res.json())
        .then(dates => {
            const container = document.getElementById('diary-list');
            if (!container) return;

            dates.forEach(date => {
                const article = document.createElement('article');
                article.innerHTML = `<h2><a href="/article.html?name=${date}">${date}</a></h2>`;
                container.appendChild(article);
            });
        })
        .catch(err => {
            console.error('加载日记列表失败:', err);
        });
});
