const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require("path");

// 示例一个假的 ObjectId 字符串，长度24位十六进制
const fakeAuthorId = new mongoose.Types.ObjectId();

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
    articleId: String,
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    likes: { type: Number, default: 0 },
    username: { type: String, default: "匿名用户" },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

const articleSchema = new mongoose.Schema({
    title: String,
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    published: { type: Boolean, default: false }
});

const Article = mongoose.model('Article', articleSchema);

// 静态文件服务 - 移到前面
app.use(express.static(path.join(__dirname, '../client/HTML')));
app.use('/CSS', express.static(path.join(__dirname, '../client/CSS')));
app.use('/JS', express.static(path.join(__dirname, '../client/JS')));
app.use('/files', express.static(path.join(__dirname, '../files')));
app.use('/diary', express.static(path.join(__dirname, '../../diary')));

// API 路由
// 获取评论树
app.get('/messages', async (req, res) => {
    const { articleId } = req.query;

    if (!articleId) {
        return res.json([]);
    }

    const flatMessages = await Message.find({ articleId }).sort({ createdAt: 1 });

    const map = {};
    flatMessages.forEach(msg => {
        map[msg._id.toString()] = {
            ...msg.toObject(),
            username: msg.username || "匿名用户",
            replies: []
        };
    });

    const tree = [];
    flatMessages.forEach(msg => {
        const id = msg._id.toString();
        if (msg.parentId) {
            const parentId = msg.parentId.toString();
            if (map[parentId]) {
                map[parentId].replies.push(map[id]);
            } else {
                tree.push(map[id]);
            }
        } else {
            tree.push(map[id]);
        }
    });

    res.json(tree);
});

// 添加评论或子评论
app.post('/messages', async (req, res) => {
    const { content, parentId, username, articleId } = req.body;
    const message = new Message({
        content,
        parentId: parentId || null,
        username: username || "匿名用户",
        articleId
    });
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

// 文章相关API
// 获取所有文章（管理用）
app.get('/api/articles/all', async (req, res) => {
    try {
        const { category } = req.query;
        const query = {};
        if (category) query.category = category;

        const articles = await Article.find(query).sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        console.error('获取文章列表失败:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 获取文章列表（支持按分类筛选）
app.get('/api/articles', async (req, res) => {
    try {
        const { category } = req.query;
        const query = { published: true };
        if (category) query.category = category;

        const articles = await Article.find(query).sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        console.error('获取文章失败:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 获取单篇文章
app.get('/api/articles/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid article ID' });
        }

        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ error: 'Article not found' });
        res.json(article);
    } catch (error) {
        console.error('获取单篇文章失败:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 创建文章
app.post('/api/articles', async (req, res) => {
    try {
        const { title, content, category, published } = req.body;

        const article = new Article({
            title,
            content,
            category,
            published: published || false,
            author: fakeAuthorId
        });

        await article.save();
        res.json(article);
    } catch (error) {
        console.error('创建文章失败:', error);
        res.status(500).json({ error: '创建文章失败: ' + error.message });
    }
});

// 更新现有文章
app.put('/api/articles/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid article ID' });
        }

        const { title, content, category, published } = req.body;

        const article = await Article.findByIdAndUpdate(
            req.params.id,
            {
                title,
                content,
                category,
                published,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!article) {
            return res.status(404).json({ error: '文章不存在' });
        }

        res.json(article);
    } catch (error) {
        console.error('更新文章失败:', error);
        res.status(500).json({ error: '更新文章失败: ' + error.message });
    }
});

// 发布/取消发布文章
app.post('/api/articles/:id/publish', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid article ID' });
        }

        const { published } = req.body;
        const article = await Article.findByIdAndUpdate(
            req.params.id,
            { published, updatedAt: Date.now() },
            { new: true }
        );

        if (!article) {
            return res.status(404).json({ error: '文章不存在' });
        }

        res.json(article);
    } catch (error) {
        console.error('发布状态更新失败:', error);
        res.status(500).json({ error: '发布状态更新失败: ' + error.message });
    }
});

// 删除文章 - 关键修复
app.delete('/api/articles/:id', async (req, res) => {
    try {
        console.log('收到删除请求，文章ID:', req.params.id);

        // 检查是否是有效的ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.log('无效的文章ID格式:', req.params.id);
            return res.status(400).json({ error: 'Invalid article ID format' });
        }

        // 查找并删除文章
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
            console.log('文章不存在:', req.params.id);
            return res.status(404).json({ error: 'Article not found' });
        }

        console.log('文章删除成功:', article.title);

        // 同时删除该文章的所有评论
        const deletedMessages = await Message.deleteMany({
            $or: [
                { articleId: req.params.id },
                { articleId: req.params.id.toString() }
            ]
        });

        console.log('删除相关评论数量:', deletedMessages.deletedCount);

        res.json({
            success: true,
            message: 'Article and related comments deleted successfully',
            deletedArticle: article.title,
            deletedCommentsCount: deletedMessages.deletedCount
        });

    } catch (error) {
        console.error('删除文章时发生错误:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// 获取日记列表
app.get('/api/list-diaries', (req, res) => {
    const diaryDir = path.join(__dirname, '../../diary');
    fs.readdir(diaryDir, (err, files) => {
        if (err) return res.status(500).json({ error: '读取失败' });

        const mdFiles = files
            .filter(file => file.endsWith('.md'))
            .map(file => file.replace('.md', ''))
            .sort()
            .reverse();

        res.json(mdFiles);
    });
});

// 根路径返回 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/HTML/index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理 - 放在最后
app.use((req, res) => {
    console.log('404 - 未找到路由:', req.method, req.url);
    res.status(404).json({ error: 'Route not found: ' + req.method + ' ' + req.url });
});

// 初始化测试数据
async function initTestData() {
    try {
        const count = await Article.countDocuments();
        if (count === 0) {
            await Article.create([
                {
                    title: "测试文章1",
                    content: "这是第一篇测试文章",
                    category: "日记",
                    published: true,
                    author: fakeAuthorId
                },
                {
                    title: "测试文章2",
                    content: "这是第二篇测试文章",
                    category: "政治",
                    published: false,
                    author: fakeAuthorId
                }
            ]);
            console.log("添加了测试文章");
        }
    } catch (error) {
        console.error('初始化测试数据失败:', error);
    }
}

// 数据库连接
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    initTestData();
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB连接错误:', err);
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('API routes available:');
    console.log('- GET /api/articles/all');
    console.log('- GET /api/articles/:id');
    console.log('- POST /api/articles');
    console.log('- PUT /api/articles/:id');
    console.log('- DELETE /api/articles/:id');
    console.log('- POST /api/articles/:id/publish');
});