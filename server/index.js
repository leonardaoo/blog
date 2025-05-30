const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 初始化 express 应用
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB 连接（本地或云端）
mongoose.connect('mongodb://127.0.0.1:27017/blog-messages', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// 定义 Schema 和 Model
const messageSchema = new mongoose.Schema({
    content: String
});
const Message = mongoose.model('Message', messageSchema);

// 获取所有留言
app.get('/messages', async (req, res) => {
    const messages = await Message.find();
    res.json(messages);
});

// 新建留言
app.post('/messages', async (req, res) => {
    const message = new Message({ content: req.body.content });
    await message.save();
    res.json(message);
});

// 删除留言
app.delete('/messages/:id', async (req, res) => {
    try {
        const result = await Message.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Message not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Invalid ID format' });
    }
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});








const path = require("path");

// 托管静态资源（调整路径为你的前端文件存放目录）
app.use(express.static(path.join(__dirname, "../HTML"))); // 托管整个 HTML 目录
app.use(express.static(path.join(__dirname, "../")));     // 托管项目根目录（可选）

// 根路由处理器
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../HTML/index.html'));
});