const { createApp } = Vue;

// 创建 Vue 应用实例
const vueApp = createApp({
    data() {
        return {
            // 文章相关
            articles: [],
            currentCategory: '', // 当前页面分类，由具体页面设置

            // 评论相关
            newMessage: '',
            messages: [],
            replyToIndex: null,
            replyContent: '',

            // 主题相关
            change: false,

            // 文章详情页相关
            articleId: '',
            currentArticleTitle: '',
            isEditing: false,
            editingArticle: {
                _id: null,
                title: '',
                content: '',
                category: '日记',
                published: false
            },
            originalArticleData: null,
            vditor: null
        };
    },
    methods: {
        // ==================== 文章列表相关方法 ====================

        // 获取文章列表 - 只获取当前分类的文章
        async fetchArticles() {
            if (!this.currentCategory) return;

            try {
                console.log('获取文章列表，分类:', this.currentCategory);
                const response = await axios.get(`/api/articles/all?category=${this.currentCategory}`);
                this.articles = response.data;
                console.log(`获取到的${this.currentCategory}文章:`, this.articles);
            } catch (error) {
                console.error('获取文章列表失败:', error);
            }
        },

        createNewArticle() {
            // 新建文章时传递当前分类
            window.location.href = `/article.html?edit=true&category=${this.currentCategory}`;
        },

        editArticle(id) {
            window.location.href = `/article.html?id=${id}&edit=true`;
        },

        async publishArticle(article) {
            try {
                const response = await axios.post(`/api/articles/${article._id}/publish`, {
                    published: true
                });
                article.published = response.data.published;
                console.log('发布成功');
            } catch (error) {
                console.error('发布失败:', error);
                alert('发布失败，请重试');
            }
        },

        async unpublishArticle(article) {
            try {
                const response = await axios.post(`/api/articles/${article._id}/publish`, {
                    published: false
                });
                article.published = response.data.published;
                console.log('取消发布成功');
            } catch (error) {
                console.error('取消发布失败:', error);
                alert('取消发布失败，请重试');
            }
        },

        async deleteArticle(article) {
            const userConfirmed = window.confirm(`确定要删除文章"${article.title}"吗？此操作不可恢复。`);
            if (!userConfirmed) {
                return;
            }

            try {
                console.log('正在删除文章:', article._id);
                const deleteUrl = `/api/articles/${article._id}`;
                const response = await axios.delete(deleteUrl);
                console.log('删除响应:', response.data);

                // 从本地数组中移除
                const index = this.articles.findIndex(a => a._id === article._id);
                if (index > -1) {
                    this.articles.splice(index, 1);
                }

                alert('文章删除成功！');
            } catch (error) {
                console.error('删除失败:', error);
                let errorMessage = '删除失败: ';
                if (error.response) {
                    errorMessage += error.response.data?.error || error.response.statusText || '未知错误';
                } else if (error.request) {
                    errorMessage += '网络请求失败，请检查服务器是否运行';
                } else {
                    errorMessage += error.message;
                }
                alert(errorMessage);
            }
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },

        // ==================== 文章编辑相关方法 ====================

        // 进入编辑模式
        async enterEditMode() {
            if (!this.articleId) return;

            try {
                const response = await axios.get(`/api/articles/${this.articleId}`);
                this.originalArticleData = { ...response.data };
                this.editingArticle = { ...response.data };

                this.isEditing = true;

                const newUrl = new URL(window.location);
                newUrl.searchParams.set('edit', 'true');
                window.history.pushState({}, '', newUrl);

                await this.$nextTick();
                this.initVditor();

                setTimeout(() => {
                    if (this.vditor) {
                        this.vditor.setValue(this.editingArticle.content || '');
                    }
                }, 500);

            } catch (error) {
                console.error('进入编辑模式失败:', error);
                alert('无法进入编辑模式');
            }
        },

        // 取消编辑
        cancelEdit() {
            if (confirm('确定要取消编辑吗？未保存的更改将丢失。')) {
                this.isEditing = false;

                // 恢复原始数据
                if (this.originalArticleData) {
                    this.editingArticle = { ...this.originalArticleData };
                }

                // 更新URL
                const newUrl = new URL(window.location);
                newUrl.searchParams.delete('edit');
                window.history.pushState({}, '', newUrl);

                // 销毁编辑器
                if (this.vditor) {
                    this.vditor.destroy();
                    this.vditor = null;
                }

                // 重新显示文章内容
                this.$nextTick(() => {
                    this.displayArticleContent();
                });
            }
        },

        // 显示文章内容
        async displayArticleContent() {
            if (!this.originalArticleData) {
                await this.fetchArticleContent();
                return;
            }

            const contentEl = document.getElementById('content');
            if (contentEl) {
                const htmlContent = await Vditor.md2html(this.originalArticleData.content || '');
                contentEl.innerHTML = htmlContent;

                // 等待DOM更新后再生成大纲
                this.$nextTick(() => {
                    const outline = this.generateOutline();
                    this.renderOutline(outline);
                    this.initScrollSpy();
                });
            }
        },

        // 初始化编辑器
        initVditor() {
            if (this.vditor) {
                this.vditor.destroy();
                this.vditor = null;
            }

            this.vditor = new Vditor('vditor', {
                height: 400,
                mode: 'wysiwyg',
                placeholder: '请输入内容...',
                theme: 'classic',
                icon: 'ant',
                outline: {
                    enable: true,
                    position: 'left'
                },
                cache: {
                    enable: false
                },
                after: () => {
                    console.log('Vditor 初始化完成');
                },
                input: (value) => {
                    this.editingArticle.content = value;
                },
                upload: {
                    accept: 'image/*',
                    url: '/api/upload',
                    handler: null
                },
                toolbar: [
                    'emoji',
                    'headings',
                    'bold',
                    'italic',
                    'strike',
                    '|',
                    'line',
                    'quote',
                    'list',
                    'ordered-list',
                    'check',
                    'outdent',
                    'indent',
                    '|',
                    'code',
                    'inline-code',
                    'insert-before',
                    'insert-after',
                    '|',
                    'table',
                    'link',
                    '|',
                    'undo',
                    'redo',
                    '|',
                    'edit-mode',
                    'content-theme',
                    'code-theme',
                    'export',
                    'outline',
                    'preview',
                    'fullscreen'
                ]
            });
        },

        // 加载文章内容
        async fetchArticleContent() {
            try {
                const response = await axios.get(`/api/articles/${this.articleId}`);
                const article = response.data;

                document.title = article.title;
                this.currentArticleTitle = article.title;
                this.originalArticleData = { ...article };

                const contentEl = document.getElementById('content');
                if (contentEl) {
                    const htmlContent = await Vditor.md2html(article.content || '');
                    contentEl.innerHTML = htmlContent;

                    // 等待DOM更新后再生成大纲
                    this.$nextTick(() => {
                        const outline = this.generateOutline();
                        this.renderOutline(outline);
                        this.initScrollSpy();
                    });
                }

            } catch (error) {
                console.error('加载文章失败:', error);
                this.currentArticleTitle = '文章加载失败';
                const contentEl = document.getElementById('content');
                if (contentEl) {
                    contentEl.innerHTML = '<p class="error">文章加载失败</p>';
                }
            }
        },

        // 编辑模式加载文章
        async loadArticleForEditing(articleId) {
            try {
                const response = await axios.get(`/api/articles/${articleId}`);
                this.editingArticle = response.data;
                this.originalArticleData = { ...response.data };
                this.currentArticleTitle = response.data.title;

                await this.$nextTick();
                this.initVditor();

                setTimeout(() => {
                    if (this.vditor) {
                        this.vditor.setValue(this.editingArticle.content || '');
                    }
                }, 500);
            } catch (error) {
                console.error('加载文章失败:', error);
                alert('加载文章失败');
            }
        },

        // 保存文章
        async saveArticle() {
            if (!this.editingArticle.title.trim()) {
                alert('请输入文章标题');
                return;
            }

            try {
                const content = this.vditor ? this.vditor.getValue() : this.editingArticle.content;
                const articleData = {
                    title: this.editingArticle.title,
                    content: content,
                    category: this.editingArticle.category,
                    published: this.editingArticle.published
                };

                const url = this.editingArticle._id
                    ? `/api/articles/${this.editingArticle._id}`
                    : '/api/articles';

                const method = this.editingArticle._id ? 'put' : 'post';

                const response = await axios({
                    method,
                    url,
                    data: articleData
                });

                // 更新本地数据
                this.editingArticle = response.data;
                this.originalArticleData = { ...response.data };
                this.currentArticleTitle = response.data.title;
                document.title = response.data.title;

                // 如果是新文章，更新URL
                if (!this.articleId) {
                    this.articleId = response.data._id;
                    const newUrl = new URL(window.location);
                    newUrl.searchParams.set('id', this.articleId);
                    window.history.pushState({}, '', newUrl);
                }

                alert('保存成功！');
                return response.data;
            } catch (error) {
                console.error('保存失败:', error);
                alert('保存失败: ' + (error.response?.data?.error || error.message));
            }
        },

        // 保存并发布文章
        async saveAndPublishArticle() {
            try {
                // 先保存文章
                const savedArticle = await this.saveArticle();
                if (!savedArticle) return;

                // 再发布文章
                await this.publishArticle();
            } catch (error) {
                console.error('保存并发布失败:', error);
                alert('保存并发布失败');
            }
        },

        // 发布文章
        async publishArticle() {
            if (!this.editingArticle._id) {
                alert('请先保存文章');
                return;
            }

            try {
                const response = await axios.post(`/api/articles/${this.editingArticle._id}/publish`, {
                    published: true
                });
                this.editingArticle.published = response.data.published;
                if (this.originalArticleData) {
                    this.originalArticleData.published = response.data.published;
                }
                alert('文章已发布！');
            } catch (error) {
                console.error('发布失败:', error);
                alert('发布失败: ' + (error.response?.data?.error || error.message));
            }
        },

        // 取消发布
        async unpublishArticle() {
            if (!this.editingArticle._id) {
                return;
            }

            try {
                const response = await axios.post(`/api/articles/${this.editingArticle._id}/publish`, {
                    published: false
                });
                this.editingArticle.published = response.data.published;
                if (this.originalArticleData) {
                    this.originalArticleData.published = response.data.published;
                }
                alert('已取消发布');
            } catch (error) {
                console.error('取消发布失败:', error);
                alert('取消发布失败: ' + (error.response?.data?.error || error.message));
            }
        },

        // ==================== 大纲相关方法 ====================

        // ==================== 大纲相关方法 ====================

        // 生成文章大纲
        generateOutline(htmlContent) {
            const headings = document.querySelectorAll('#content h1, #content h2, #content h3, #content h4, #content h5, #content h6');

            const outline = [];
            headings.forEach((heading, index) => {
                const level = parseInt(heading.tagName.charAt(1));
                const text = heading.textContent.trim();
                const id = `heading-${index}`;

                heading.id = id;

                outline.push({
                    id,
                    text,
                    level,
                    element: heading
                });
            });

            return outline;
        },

        // 渲染大纲
        renderOutline(outline) {
            const outlineContainer = document.getElementById('outline-container');
            const outlineSidebar = document.querySelector('.outline-sidebar');

            if (!outline || outline.length <= 1) {
                if (outlineSidebar) {
                    outlineSidebar.style.display = 'none';
                }
                return;
            }

            if (outlineSidebar) {
                outlineSidebar.style.display = 'block';
            }

            if (!outlineContainer) return;

            let html = '<div class="outline-header">📋 文章目录</div><ul class="outline-list">';

            outline.forEach(item => {
                const indent = (item.level - 1) * 20;
                html += `
            <li class="outline-item" style="margin-left: ${indent}px;">
                <a href="#${item.id}" class="outline-link" data-level="${item.level}">
                    ${item.text}
                </a>
            </li>
        `;
            });

            html += '</ul>';
            outlineContainer.innerHTML = html;

            this.addOutlineClickHandlers();
        },

        // 添加大纲点击事件处理
        addOutlineClickHandlers() {
            document.querySelectorAll('.outline-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);

                    if (targetElement) {
                        // 立即设置高亮状态
                        this.highlightCurrentHeading(targetId);

                        // 设置标志，暂时禁用滚动监听
                        this.isScrollingToTarget = true;

                        // 滚动到目标位置
                        targetElement.scrollIntoView({ behavior: 'smooth' });

                        // 监听滚动结束事件
                        this.waitForScrollEnd(() => {
                            this.isScrollingToTarget = false;
                            // 滚动结束后再次确认高亮状态
                            this.highlightCurrentHeading(targetId);
                        });
                    }
                });
            });
        },

        // 等待滚动结束的辅助方法
        waitForScrollEnd(callback) {
            let scrollTimeout;
            let lastScrollTop = window.pageYOffset;

            const checkScrollEnd = () => {
                const currentScrollTop = window.pageYOffset;
                if (currentScrollTop === lastScrollTop) {
                    callback();
                } else {
                    lastScrollTop = currentScrollTop;
                    scrollTimeout = setTimeout(checkScrollEnd, 100);
                }
            };

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(checkScrollEnd, 100);
        },

        // 高亮当前标题
        highlightCurrentHeading(activeId) {
            document.querySelectorAll('.outline-link').forEach(link => {
                link.classList.remove('active');
            });

            const activeLink = document.querySelector(`a[href="#${activeId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        },

        // 监听滚动，自动高亮当前所在的标题
        initScrollSpy() {
            // 初始化标志
            this.isScrollingToTarget = false;
            let ticking = false;

            const updateActiveHeading = () => {
                // 如果正在执行点击跳转，跳过滚动监听更新
                if (this.isScrollingToTarget) {
                    ticking = false;
                    return;
                }

                const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                let activeHeading = null;

                // 改进算法：找到最接近当前视口顶部的标题
                headings.forEach(heading => {
                    const rect = heading.getBoundingClientRect();
                    // 使用更精确的判断条件
                    if (rect.top <= 150) { // 给一些缓冲区域
                        activeHeading = heading;
                    }
                });

                // 如果没有找到合适的标题，使用第一个标题
                if (!activeHeading && headings.length > 0) {
                    activeHeading = headings[0];
                }

                if (activeHeading && activeHeading.id) {
                    this.highlightCurrentHeading(activeHeading.id);
                }

                ticking = false;
            };

            const onScroll = () => {
                if (!ticking) {
                    requestAnimationFrame(updateActiveHeading);
                    ticking = true;
                }
            };

            window.addEventListener('scroll', onScroll);

            // 初始化时也执行一次
            updateActiveHeading();
        },

        // ==================== 评论相关方法 ====================

        // 获取评论
        async fetchMessages() {
            if (!this.articleId) return;

            try {
                const res = await axios.get(`/messages?articleId=${this.articleId}`);
                this.messages = res.data.map(msg => ({
                    ...msg,
                    showMenu: false,
                    likes: msg.likes || 0,
                    replies: msg.replies || []
                }));
            } catch (error) {
                console.error('获取评论失败:', error);
            }
        },

        // 添加评论
        async appear() {
            if (!this.articleId) return;

            try {
                const res = await axios.post('/messages', {
                    content: this.newMessage,
                    username: "当前用户",
                    articleId: this.articleId
                });
                this.messages.push({
                    ...res.data,
                    showMenu: false,
                    likes: 0,
                    replies: []
                });
                this.newMessage = '';
            } catch (error) {
                console.error('添加评论失败:', error);
            }
        },

        // 删除评论
        async deleteMessage(index) {
            const id = this.messages[index]._id;
            try {
                await axios.delete(`/messages/${id}`);
                this.messages.splice(index, 1);
            } catch (error) {
                console.error('删除评论失败:', error);
                alert('删除评论失败');
            }
        },

        toggleMenu(index) {
            this.messages[index].showMenu = !this.messages[index].showMenu;
        },

        likeMessage(index) {
            this.messages[index].likes += 1;
            this.messages[index].showMenu = false;
        },

        setReplyTo(index) {
            this.replyToIndex = index;
            this.messages[index].showMenu = false;
        },

        // 提交回复
        submitReply(index) {
            if (!this.replyContent.trim()) return;

            const parentId = this.messages[index]._id;

            axios.post('/messages', {
                content: this.replyContent,
                parentId: parentId,
                username: "当前用户",
                articleId: this.articleId
            }).then(res => {
                this.messages[index].replies.push({
                    ...res.data,
                    replies: []
                });

                this.replyContent = '';
                this.replyToIndex = null;
            }).catch(err => {
                console.error('提交子评论失败', err);
            });
        },

        // ==================== 主题切换 ====================

        toggleTheme() {
            this.change = !this.change;
            document.body.classList.toggle("dark");
            localStorage.setItem('theme', this.change ? 'dark' : 'light');
        }
    },

    beforeUnmount() {
        if (this.vditor) {
            this.vditor.destroy();
        }
    },

    mounted() {
        // 恢复主题状态
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.change = true;
            document.body.classList.add('dark');
        } else {
            this.change = false;
            document.body.classList.remove('dark');
        }

        // 检查当前页面类型
        const currentPath = window.location.pathname;

        // 如果是文章详情页
        if (currentPath.includes('article.html')) {
            const params = new URLSearchParams(window.location.search);
            this.articleId = params.get("id") || params.get("name") || null;
            this.isEditing = params.get('edit') === 'true';
            const defaultCategory = params.get('category') || '日记';

            if (this.isEditing) {
                if (this.articleId) {
                    // 编辑现有文章
                    this.loadArticleForEditing(this.articleId);
                } else {
                    // 创建新文章
                    this.editingArticle = {
                        title: '',
                        content: '',
                        category: defaultCategory,
                        published: false
                    };
                    this.currentArticleTitle = '新文章';
                    this.$nextTick(() => {
                        this.initVditor();
                    });
                }
            } else {
                if (this.articleId) {
                    this.fetchArticleContent();
                } else {
                    const contentEl = document.getElementById('content');
                    if (contentEl) {
                        contentEl.innerHTML = '<p class="error">未指定文章</p>';
                    }
                }
            }

            // 获取评论
            if (this.articleId) {
                this.fetchMessages();
            }
        }
        // 其他页面由各自的初始化代码处理
    }
});

// 挂载应用并暴露给全局
const app = vueApp.mount('#app');
window.vueApp = app;