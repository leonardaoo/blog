// 自动加载日记列表并插入到 index.html 中
//从本地上传文章改为在线编辑文章
/*
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
*/

window.addEventListener('DOMContentLoaded', () => {
    fetch('/api/articles?category=日记')
        .then(res => res.json())
        .then(articles => {
            const container = document.getElementById('diary-list');
            if (!container) return;

            articles.forEach(article => {
                const articleEl = document.createElement('article');
                articleEl.innerHTML = `
                    <h2>
                        <a href="/article.html?id=${article._id}">${article.title}</a>
                    </h2>
                `;
                container.appendChild(articleEl);
            });
        })
        .catch(err => {
            console.error('加载日记列表失败:', err);
        });
});