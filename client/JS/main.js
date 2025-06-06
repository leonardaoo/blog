const { createApp } = Vue;

createApp({
    data() {
        return {
            newMessage: '',
            messages: [],
            replyToIndex: null, // 当前在回复哪一条
            change: false, // 你原来的 toggleTheme 使用
            replyContent: '',  // ✨ 补上这个
            articleId: '', // 👈 新增字段
        };
    },
    methods: {
        async fetchMessages() {
            const res = await axios.get(`http://localhost:3000/messages?articleId=${this.articleId}`);
            this.messages = res.data.map(msg => ({
                ...msg,
                showMenu: false,
                likes: msg.likes || 0,
                replies: msg.replies || []
            }));
        }
        
        ,
        async appear() {
            console.log("提交留言时的 articleId 是：", this.articleId); // 👈 加这一句

            const res = await axios.post('http://localhost:3000/messages', {
                content: this.newMessage,
                username: "当前用户",
                articleId: this.articleId // 👈 加上这行
            });
            this.messages.push({
                ...res.data,
                showMenu: false,
                likes: 0,
                replies: []
            });
            this.newMessage = '';
        }
        
        ,
        async deleteMessage(index) {
            const id = this.messages[index]._id; // 改为使用 _id 而不是 id
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
                articleId: this.articleId // 👈 也加上这行
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
        }
        
        ,

        toggleTheme() {
            this.change = !this.change;
            document.body.classList.toggle("dark");
        }
    },


    mounted() {
        const params = new URLSearchParams(window.location.search);
        this.articleId = params.get("name") || "未命名文章"; // 默认值
        document.title = `${this.articleId} - 我的个人博客`;

        // 加载文件时检查是否存在
        fetch(`/diary/${this.articleId}.md`)
            .then(response => {
                if (!response.ok) {
                    document.title = "我的个人博客"; // 回退到默认标题
                    throw new Error('文件不存在');
                }
                return response.text();
            })
            .then(markdown => {
                document.getElementById('content').innerHTML = marked.parse(markdown);
            })
            .catch(err => {
                console.error(err);
                document.getElementById('content').innerHTML = `
              <p class="error">文章加载失败，请检查链接是否正确</p>
            `;
            });

        this.fetchMessages();
    }
    
}).mount('#app');