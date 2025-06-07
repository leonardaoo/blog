const { createApp } = Vue;

createApp({
    data() {
        return {
            articles: []
        };
    },
    methods: {
        async fetchArticles() {
            try {
                // 修改这里获取所有文章（包括未发布的）
                const response = await axios.get('/api/articles/all');
                this.articles = response.data;
            } catch (error) {
                console.error('获取文章列表失败:', error);
                alert('获取文章列表失败');
            }
        },
        newArticle() {
            // 跳转到编辑页面（新建模式）
            window.location.href = '/article.html?edit=true';
        },
        editArticle(id) {
            // 跳转到编辑页面（编辑模式）
            window.location.href = `/article.html?id=${id}&edit=true`;
        },
        async togglePublish(article) {
            try {
                const response = await axios.post(`/api/articles/${article._id}/publish`, {
                    published: !article.published
                });
                // 更新本地数据
                article.published = response.data.published;
            } catch (error) {
                console.error('更新发布状态失败:', error);
                alert('操作失败，请重试');
            }
        }
    },
    mounted() {
        this.fetchArticles();
    }
}).mount('#app');