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
        // 取消编辑
        // 取消编辑
        // 优化后的 cancelEdit 方法
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
        // 显示文章内容
        async displayArticleContent() {
            if (!this.originalArticleData) {
                // 如果没有原始数据，重新获取
                await this.fetchArticleContent();
                return;
            }

            const contentEl = document.getElementById('content');
            if (contentEl) {
                // 关键修改：await Vditor.md2html 的结果
                const htmlContent = await Vditor.md2html(this.originalArticleData.content || '');
                contentEl.innerHTML = htmlContent;
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


        // 在 main.js 中添加以下方法

        // 生成文章大纲
        generateOutline(htmlContent) {
            // 直接操作页面上的标题元素，而不是解析的DOM片段
            const headings = document.querySelectorAll('#content h1, #content h2, #content h3, #content h4, #content h5, #content h6');

            const outline = [];
            headings.forEach((heading, index) => {
                const level = parseInt(heading.tagName.charAt(1));
                const text = heading.textContent.trim();
                const id = `heading-${index}`;

                // 直接给页面上的标题元素添加ID
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

        // 修改后的 renderOutline 方法
        renderOutline(outline) {
            const outlineContainer = document.getElementById('outline-container');
            const outlineSidebar = document.querySelector('.outline-sidebar');

            // 如果没有标题或只有一个标题，隐藏整个侧边栏
            if (!outline || outline.length <= 1) {
                if (outlineSidebar) {
                    outlineSidebar.style.display = 'none';
                }
                return;
            }

            // 有多个标题时显示侧边栏
            if (outlineSidebar) {
                outlineSidebar.style.display = 'block';
            }

            if (!outlineContainer) return;

            let html = '<div class="outline-header">📋 文章目录</div><ul class="outline-list">';

            outline.forEach(item => {
                const indent = (item.level - 1) * 20; // 每级缩进20px
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

            // 添加点击事件
            this.addOutlineClickHandlers();
        },

        // 高亮当前标题
        highlightCurrentHeading(activeId) {
            // 移除所有活跃状态
            document.querySelectorAll('.outline-link').forEach(link => {
                link.classList.remove('active');
            });

            // 添加当前活跃状态
            const activeLink = document.querySelector(`a[href="#${activeId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        },

        // 监听滚动，自动高亮当前所在的标题
        initScrollSpy() {
            let ticking = false;

            const updateActiveHeading = () => {
                const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                let activeHeading = null;

                headings.forEach(heading => {
                    const rect = heading.getBoundingClientRect();
                    const offsetTop = rect.top + scrollTop;

                    if (offsetTop <= scrollTop + 100) { // 100px的偏移量
                        activeHeading = heading;
                    }
                });

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
        },

        // 修复后的 displayArticleContent 方法
        async displayArticleContent() {
            if (!this.originalArticleData) {
                await this.fetchArticleContent();
                return;
            }

            const contentEl = document.getElementById('content');
            if (contentEl) {
                // 修复：使用 this.originalArticleData 而不是 article
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

        // 修复后的 fetchArticleContent 方法
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

        // 切换主题
        toggleTheme() {
            this.change = !this.change;
            document.body.classList.toggle("dark");
        }
    },

    beforeUnmount() {
        if (this.vditor) {
            this.vditor.destroy();
        }
    },

    mounted() {
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

}).mount('#app');