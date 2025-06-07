const { createApp } = Vue;

createApp({
    data() {
        return {
            newMessage: '',
            messages: [],
            replyToIndex: null,
            change: false,
            replyContent: '',
            articleId: '',
            currentArticleTitle: '', // 用于显示当前文章标题
            isEditing: false,
            editingArticle: {
                _id: null,
                title: '',
                content: '',
                category: '日记',
                published: false
            },
            originalArticleData: null, // 保存原始数据，用于取消编辑时恢复
            vditor: null // Vditor 实例
        };
    },
    methods: {
        // 进入编辑模式
        async enterEditMode() {
            if (!this.articleId) return;

            try {
                // 保存原始数据
                const response = await axios.get(`/api/articles/${this.articleId}`);
                this.originalArticleData = { ...response.data };
                this.editingArticle = { ...response.data };

                this.isEditing = true;

                // 更新URL但不刷新页面
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('edit', 'true');
                window.history.pushState({}, '', newUrl);

                // 初始化编辑器
                await this.$nextTick();
                this.initVditor();

                // 延迟设置内容，确保编辑器完全加载
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
                this.displayArticleContent();
            }
        },

        // 显示文章内容（将Markdown转换为HTML）
        displayArticleContent() {
            if (!this.originalArticleData) return;

            const contentEl = document.getElementById('content');
            if (contentEl) {
                // 使用Vditor的markdown解析功能
                const htmlContent = Vditor.md2html(this.originalArticleData.content || '');
                contentEl.innerHTML = htmlContent;
            }
        },

        // 初始化Vditor编辑器
        initVditor() {
            // 如果编辑器已存在，先销毁
            if (this.vditor) {
                this.vditor.destroy();
                this.vditor = null;
            }

            this.vditor = new Vditor('vditor', {
                height: 400,
                mode: 'wysiwyg', // 可选: 'wysiwyg', 'ir' (即时渲染), 'sv' (分屏预览)
                placeholder: '请输入内容...',
                theme: 'classic',
                icon: 'ant',
                outline: {
                    enable: true,
                    position: 'left'
                },
                cache: {
                    enable: false // 禁用缓存，避免干扰
                },
                after: () => {
                    // 编辑器初始化完成后的回调
                    console.log('Vditor 初始化完成');
                },
                input: (value) => {
                    // 实时更新内容
                    this.editingArticle.content = value;
                },
                upload: {
                    // 如果需要支持图片上传，可以在这里配置
                    accept: 'image/*',
                    url: '/api/upload', // 需要在后端实现上传接口
                    // 暂时禁用上传功能
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

        // 修复 fetchArticleContent 方法 - 这是主要问题所在
        async fetchArticleContent() {
            try {
                const response = await axios.get(`/api/articles/${this.articleId}`);
                const article = response.data;

                document.title = article.title;
                this.currentArticleTitle = article.title;
                this.originalArticleData = { ...article };

                const contentEl = document.getElementById('content');
                if (contentEl) {
                    // 确保使用await等待Markdown转换完成
                    const htmlContent = await Vditor.md2html(article.content || '');
                    contentEl.innerHTML = htmlContent;
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

        // 为编辑模式加载文章
        async loadArticleForEditing(articleId) {
            try {
                const response = await axios.get(`/api/articles/${articleId}`);
                this.editingArticle = response.data;
                this.originalArticleData = { ...response.data };
                this.currentArticleTitle = response.data.title;

                // 设置编辑器内容
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
                alert('保存失败: ' + error.message);
            }
        },

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
                this.originalArticleData.published = response.data.published;
                alert('文章已发布！');
            } catch (error) {
                console.error('发布失败:', error);
                alert('发布失败');
            }
        },

        async unpublishArticle() {
            if (!this.editingArticle._id) {
                return;
            }

            try {
                const response = await axios.post(`/api/articles/${this.editingArticle._id}/publish`, {
                    published: false
                });
                this.editingArticle.published = response.data.published;
                this.originalArticleData.published = response.data.published;
                alert('已取消发布');
            } catch (error) {
                console.error('取消发布失败:', error);
                alert('取消发布失败');
            }
        },

        async fetchMessages() {
            if (!this.articleId) return;

            const res = await axios.get(`http://localhost:3000/messages?articleId=${this.articleId}`);
            this.messages = res.data.map(msg => ({
                ...msg,
                showMenu: false,
                likes: msg.likes || 0,
                replies: msg.replies || []
            }));
        },

        async appear() {
            if (!this.articleId) return;

            const res = await axios.post('http://localhost:3000/messages', {
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
        },

        async deleteMessage(index) {
            const id = this.messages[index]._id;
            await axios.delete(`http://localhost:3000/messages/${id}`);
            this.messages.splice(index, 1);
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

        submitReply(index) {
            if (!this.replyContent.trim()) return;

            const parentId = this.messages[index]._id;

            axios.post('http://localhost:3000/messages', {
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

        toggleTheme() {
            this.change = !this.change;
            document.body.classList.toggle("dark");
        }
    },

    // 组件销毁时清理编辑器
    beforeUnmount() {
        if (this.vditor) {
            this.vditor.destroy();
        }
    },

    mounted() {
        const params = new URLSearchParams(window.location.search);
        this.articleId = params.get("id") || params.get("name") || null;
        this.isEditing = params.get('edit') === 'true';

        if (this.isEditing) {
            // 编辑模式
            if (this.articleId) {
                // 编辑现有文章
                this.loadArticleForEditing(this.articleId);
            } else {
                // 创建新文章
                this.editingArticle = {
                    title: '新文章',
                    content: '',
                    category: '日记',
                    published: false
                };
                this.currentArticleTitle = '新文章';
                this.$nextTick(() => {
                    this.initVditor();
                });
            }
        } else {
            // 浏览模式
            if (this.articleId) {
                // 等待一下再加载文章，确保Vditor库已加载
                setTimeout(() => {
                    this.fetchArticleContent();
                }, 100);
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

}).mount('#app');