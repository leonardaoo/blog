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
    content: String,
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // 父评论ID
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// 获取评论树
app.get('/messages', async (req, res) => {
    const flatMessages = await Message.find().sort({ createdAt: 1 });

    const map = {};
    flatMessages.forEach(msg => map[msg._id] = { ...msg.toObject(), replies: [] });

    const tree = [];
    flatMessages.forEach(msg => {
        if (msg.parentId) {
            map[msg.parentId]?.replies.push(map[msg._id]);
        } else {
            tree.push(map[msg._id]);
        }
    });

    res.json(tree);
});

// 添加评论或子评论
app.post('/messages', async (req, res) => {
    const { content, parentId } = req.body;
    const message = new Message({ content, parentId: parentId || null });
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

// 点赞评论
app.post('/messages/:id/like', async (req, res) => {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Not found' });

    message.likes += 1;
    await message.save();
    res.json({ success: true, likes: message.likes });
});


// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});





const path = require("path");

// 挂载 HTML 目录为根目录
app.use(express.static(path.join(__dirname, '../client/HTML')));

// 挂载 CSS、JS 目录
app.use('/CSS', express.static(path.join(__dirname, '../client/CSS')));
app.use('/JS', express.static(path.join(__dirname, '../client/JS')));

// 根路径返回 index.html（也可以省略）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/HTML/index.html'));
});
