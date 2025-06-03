const { createApp } = Vue;

createApp({
    data() {
        return {
            newMessage: '',
            messages: [],
            replyToIndex: null, // 当前在回复哪一条
            change: false, // 你原来的 toggleTheme 使用
            replyContent: '',  // ✨ 补上这个

        };
    },
    methods: {
        async fetchMessages() {
            const res = await axios.get('http://localhost:3000/messages');
            this.messages = res.data.map(msg => ({
                ...msg,
                showMenu: false,
                likes: msg.likes || 0,
                replies: msg.replies || []
            }));
        }
        ,
        async appear() {
            const res = await axios.post('http://localhost:3000/messages', {
                content: this.newMessage
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
                parentId: parentId
            }).then(res => {
                // 将返回的新子评论添加到该父评论的 replies 数组中
                this.messages[index].replies.push({
                    ...res.data,
                    replies: [], // 子评论的子评论为空数组
                    username:"当前用户"
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
        this.fetchMessages(); // 页面加载时获取留言
    }
}).mount('#app');