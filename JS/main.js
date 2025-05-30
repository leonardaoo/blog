const { createApp } = Vue;

createApp({
    data() {
        return {
            newMessage: '',
            messages: []
        };
    },
    methods: {
        async fetchMessages() {
            const res = await axios.get('http://localhost:3000/messages');
            this.messages = res.data;
        },
        async appear() {
            const res = await axios.post('http://localhost:3000/messages', {
                content: this.newMessage
            });
            this.messages.push(res.data);
            this.newMessage = '';
        },
        async deleteMessage(index) {
            const id = this.messages[index]._id; // 改为使用 _id 而不是 id
            await axios.delete(`http://localhost:3000/messages/${id}`);
            this.messages.splice(index, 1);
        },
        toggleTheme() {
            this.change = !this.change;
            document.body.classList.toggle("dark");
        }
    },


    mounted() {
        this.fetchMessages(); // 页面加载时获取留言
    }
}).mount('#app');